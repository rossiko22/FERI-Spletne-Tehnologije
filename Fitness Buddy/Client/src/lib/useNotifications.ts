// Web Push subscription hook. OWNER: Ana.
//
// Flow on first opt-in:
//   1. Ask for Notification permission.
//   2. Fetch VAPID public key from /api/notifications/public-key.
//   3. Subscribe via the active service worker's PushManager.
//   4. POST the subscription to /api/notifications/subscribe.

import { useCallback, useEffect, useState } from 'react';
import { notifications as notifApi } from './api';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return new Uint8Array(Array.from(raw, (c) => c.charCodeAt(0)));
}

export function useNotifications() {
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    supported ? Notification.permission : 'unsupported',
  );
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!supported || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub)),
    );
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;
    const { publicKey } = await notifApi.publicKey();
    if (!publicKey) {
      console.warn('[push] server has no VAPID_PUBLIC_KEY — set it in ExpressJS/.env');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await notifApi.subscribe(sub.toJSON());
    setSubscribed(true);
  }, [supported]);

  const sendTest = useCallback(async () => {
    await notifApi.test();
  }, []);

  return { supported, permission, subscribed, enable, sendTest };
}
