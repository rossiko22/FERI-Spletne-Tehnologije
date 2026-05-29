import { useEffect, useState } from 'react';

export type NotifEntry = {
  id: string;
  title: string;
  body?: string;
  url: string;
  timestamp: number;
  read: boolean;
};

const STORAGE_KEY = 'fb_notifications';

function load(): NotifEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(items: NotifEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
}

export function addNotification(title: string, body?: string, url = '/') {
  const entry: NotifEntry = {
    id: `${Date.now()}-${Math.random()}`,
    title,
    body,
    url,
    timestamp: Date.now(),
    read: false,
  };
  const updated = [entry, ...load()];
  save(updated);
  window.dispatchEvent(new Event('fb_notif_change'));
}

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<NotifEntry[]>(load);

  const refresh = () => setNotifications(load());

  useEffect(() => {
    // SW message listener
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'PUSH_RECEIVED') return;
      const n = event.data.notification;
      addNotification(n.title, n.body, n.url);
    };
    navigator.serviceWorker?.addEventListener('message', handler);

    // Lokalni event listener
    const onChange = () => refresh();
    window.addEventListener('fb_notif_change', onChange);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handler);
      window.removeEventListener('fb_notif_change', onChange);
    };
  }, []);

  const markAllRead = () => {
    const updated = load().map((n) => ({ ...n, read: true }));
    save(updated);
    setNotifications(updated);
  };

  const clear = () => {
    save([]);
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, clear, refresh };
}