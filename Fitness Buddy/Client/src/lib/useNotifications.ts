import { useEffect, useState } from 'react';
import { notifications as notifApi } from './api';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  const arr     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

export function useNotifications() {
  const [supported,  setSupported]  = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    );
  }, []);

  const subscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const { publicKey } = await notifApi.publicKey();
      if (!publicKey) throw new Error('VAPID public key ni nastavljen na strežniku');

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') throw new Error('Dovoljenje zavrnjeno');

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await notifApi.subscribe(sub.toJSON());
      setSubscribed(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Napaka');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await notifApi.unsubscribe();
      setSubscribed(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Napaka');
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    try {
      await notifApi.test();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Napaka');
    }
  };

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe, sendTest };
}
