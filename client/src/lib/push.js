import { api } from './api.js';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    return { ok: false, reason: ios ? 'On iPhone, tap Share → Add to Home Screen, then open OffGuard from your home screen.' : 'This browser does not support push notifications.' };
  }
  if (!window.isSecureContext) return { ok: false, reason: 'Push needs HTTPS (or localhost).' };
  return { ok: true };
}

export async function currentSubscription() {
  if (!pushSupport().ok) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Ask permission, subscribe this device, and register the commute with the server. */
export async function subscribeCommute({ fromExit, toExit }) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings.');
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await api.get('/api/push/public-key');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  return api.post('/api/push/subscribe', { subscription: sub.toJSON(), fromExit, toExit });
}

export async function unsubscribeCommute() {
  const sub = await currentSubscription();
  if (!sub) return;
  await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint });
  await sub.unsubscribe();
}
