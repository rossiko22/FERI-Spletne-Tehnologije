// Generic IndexedDB-backed React store hook. Same shape as Lovable's prototype.
// Each owner can hook server sync into the add/del/update calls via enqueue()
// from useSync (Ana wires this in).

import { useCallback, useEffect, useState } from 'react';
import { getAll, put, remove, uid, type StoreName } from './idb';

export function useStore<T extends { id: string }>(store: StoreName) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getAll<T>(store);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setReady(true);
    }
  }, [store]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const h = () => refresh();
    window.addEventListener('fb_refresh', h);
    return () => window.removeEventListener('fb_refresh', h);
  }, [refresh]);

  const add = useCallback(async (value: Omit<T, 'id'>) => {
    const item = { ...value, id: uid() } as T;
    await put(store, item);
    await refresh();
    return item;
  }, [store, refresh]);

  const del = useCallback(async (id: string) => {
    await remove(store, id);
    await refresh();
  }, [store, refresh]);

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    const current = items.find((x) => x.id === id);
    if (!current) return;
    const next = { ...current, ...patch, id } as T;
    await put(store, next);
    await refresh();
    return next;
  }, [items, store, refresh]);

  return { items, ready, add, del, update, refresh };
}
