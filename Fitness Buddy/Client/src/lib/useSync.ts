// Sync queue + drain — OWNER: Ana.
//
// Every offline mutation pushes into the syncQueue IndexedDB store via
// `enqueue()`. When the browser is online, the queue drains by POSTing the
// events to /api/sync/drain.

import { useEffect, useState } from 'react';
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

export async function enqueue(item: Omit<QueueItem, 'id' | 'createdAt'>) {
  await put('syncQueue', { ...item, id: uid(), createdAt: Date.now() });
  window.dispatchEvent(new Event('fb_sync_change'));
}

export function useSync() {
  const [online, setOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [state, setState] = useState<SyncState>('online');
  const [lastSync, setLastSync] = useState<number | null>(null);

  const refresh = async () => setPending(await getAll<QueueItem>('syncQueue'));

  useEffect(() => {
    refresh();
    const on = () => { setOnline(true); setState('online'); };
    const off = () => { setOnline(false); setState('offline'); };
    const change = () => refresh();
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('fb_sync_change', change);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('fb_sync_change', change);
    };
  }, []);

  const drain = async () => {
    const queue = await getAll<QueueItem>('syncQueue');
    if (queue.length === 0) { setState(online ? 'online' : 'offline'); return; }
    setState('syncing');
    try {
      const r = await syncApi.drain(queue);
      // remove only successfully-applied events so failed ones get retried
      for (const result of r.results) {
        if (result.status === 'applied') await remove('syncQueue', result.id);
      }
      setLastSync(Date.now());
    } catch (err) {
      console.warn('[sync] drain failed', err);
    } finally {
      await refresh();
      setState(online ? 'online' : 'offline');
    }
  };

  useEffect(() => {
    if (online && pending.length > 0) drain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pending.length]);

  // 60s heartbeat
  useEffect(() => {
    const id = setInterval(() => { if (online) drain(); }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return { online, state, pending, lastSync, forceSync: drain };
}
