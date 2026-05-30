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
      console.log('1. start');
      const { publicKey } = await notifApi.publicKey();
      console.log('2. publicKey:', publicKey);
      if (!publicKey) throw new Error('no VAPID key');
      const perm = await Notification.requestPermission();
      console.log('3. permission:', perm);
      if (perm !== 'granted') throw new Error('permission denied');
      console.log('4. waiting for SW...');
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 5000))
      ]) as ServiceWorkerRegistration;
      console.log('5. SW ready');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      console.log('6. subscribed:', sub.endpoint);
      await notifApi.subscribe(sub.toJSON());
      console.log('7. server notified');
      setSubscribed(true);
    } catch (e: unknown) {
      console.error('ERROR:', e);
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
