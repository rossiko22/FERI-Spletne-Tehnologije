import { useEffect, useRef, useState } from 'react';
import { getAll, put, remove, uid } from './idb';
import { sync as syncApi } from './api';

export type QueueItem = {
  id: string;
  kind: 'create' | 'update' | 'delete';
  entity: 'workout' | 'meal' | 'habit' | 'goal' | 'habitLog';
  payload: unknown;
  createdAt: number;
};

export type SyncState = 'online' | 'offline' | 'syncing';

async function checkOnline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3000);

  try {
    const r = await fetch(`/api/health?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-store' },
      signal: controller.signal,
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function enqueue(item: Omit<QueueItem, 'id' | 'createdAt'>) {
  await put('syncQueue', { ...item, id: uid(), createdAt: Date.now() });
  window.dispatchEvent(new Event('fb_sync_change'));
  window.dispatchEvent(new CustomEvent('fb_queued', {
    detail: { entity: item.entity, kind: item.kind }
  }));
}

// Poskusi API klic — če uspe, ne enqueue. Če ne uspe (offline), enqueue.
export async function withSync<T>(
  apiCall: () => Promise<T>,
  queueItem: Omit<QueueItem, 'id' | 'createdAt'>
): Promise<void> {
  try {
    await apiCall();
    // Online — API uspel, ne dodaj v queue
  } catch (err: unknown) {
    // Če je auth napaka (401) ali server napaka (5xx) — ne dodaj v queue
    // Samo če je network napaka (offline) — dodaj v queue
    const isNetworkError = err instanceof TypeError && err.message.includes('fetch');
    const isAuthError = err instanceof Error && err.message.includes('401');
    
    if (isNetworkError && !isAuthError) {
      await enqueue(queueItem);
    } else if (!isAuthError) {
      // Poskusi checkOnline — če offline, enqueue
      const online = await checkOnline();
      if (!online) await enqueue(queueItem);
    }
  }
}

export function useSync() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [state, setState] = useState<SyncState>(() =>
    typeof navigator === 'undefined' || navigator.onLine ? 'online' : 'offline'
  );
  const [lastSync, setLastSync] = useState<number | null>(null);
  const drainingRef = useRef(false);

  const refresh = async () => setPending(await getAll<QueueItem>('syncQueue'));

  const drain = async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    const isOnline = await checkOnline();
    setOnline(isOnline);

    if (!isOnline) {
      setState('offline');
      await refresh();
      drainingRef.current = false;
      return;
    }

    const queue = await getAll<QueueItem>('syncQueue');
    if (queue.length === 0) {
      setState('online');
      setPending([]);
      drainingRef.current = false;
      return;
    }

    setState('syncing');
    try {
      const r = await syncApi.drain(queue);
      for (const result of r.results) {
        if (result.status === 'applied' || result.status === 'skipped') {
          await remove('syncQueue', result.id);
        }
      }
      setLastSync(Date.now());
      setState('online');
      setPending([]);
    } catch (err: unknown) {
      console.warn('[sync] drain failed', err);
      const stillOnline = await checkOnline();
      setState(stillOnline ? 'online' : 'offline');
      setOnline(stillOnline);
      if (!stillOnline) {
        window.dispatchEvent(new CustomEvent('fb_sync_error', { detail: err }));
      }
    } finally {
      await refresh();
      drainingRef.current = false;
    }
  };

  useEffect(() => {
    refresh();
    const markOnline = () => {
      setOnline(true);
      setState('online');
      drain();
    };
    const markOffline = () => {
      setOnline(false);
      setState('offline');
      refresh();
    };
    const onChange = () => {
      refresh();
      if (navigator.onLine) drain();
    };

    checkOnline().then((isOnline) => {
      setOnline(isOnline);
      setState(isOnline ? 'online' : 'offline');
      if (isOnline) drain();
    });

    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    window.addEventListener('fb_sync_change', onChange);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
      window.removeEventListener('fb_sync_change', onChange);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      const isOnline = await checkOnline();
      setOnline(isOnline);
      if (isOnline) {
        setState('online');
        drain();
      } else {
        setState('offline');
      }
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  return { online, state, pending, lastSync, forceSync: drain };
}
