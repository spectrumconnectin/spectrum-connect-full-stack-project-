/**
 * Browser Web Push helpers — register the service worker, subscribe/unsubscribe,
 * and sync the subscription with the backend. Client-side only.
 */
import { push } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = (await navigator.serviceWorker.getRegistration('/sw.js')) || (await navigator.serviceWorker.getRegistration());
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Request permission, subscribe, and register with the backend. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'unsupported' };

  let keyInfo: { enabled: boolean; public_key: string };
  try {
    keyInfo = await push.publicKey();
  } catch {
    return { ok: false, error: 'server-error' };
  }
  if (!keyInfo.enabled || !keyInfo.public_key) return { ok: false, error: 'server-disabled' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'denied' };

  try {
    const reg = await getRegistration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyInfo.public_key) as BufferSource,
      });
    }
    const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
    if (!json.keys?.p256dh || !json.keys?.auth) return { ok: false, error: 'subscribe-failed' };
    await push.subscribe({ endpoint: sub.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'subscribe-failed' };
  }
}

/** Unsubscribe locally and remove from the backend. */
export async function disablePush(): Promise<void> {
  try {
    const reg = (await navigator.serviceWorker.getRegistration('/sw.js')) || (await navigator.serviceWorker.getRegistration());
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      try { await push.unsubscribe(sub.endpoint); } catch { /* ignore */ }
      await sub.unsubscribe();
    }
  } catch { /* ignore */ }
}

export async function sendTestPush(): Promise<number> {
  try { const r = await push.test(); return r.delivered ?? 0; } catch { return 0; }
}
