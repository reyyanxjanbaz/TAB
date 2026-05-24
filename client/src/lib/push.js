import { api } from './api';
import { urlB64ToUint8Array } from './utils';

export async function requestPushPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission === 'denied') return;
  if (Notification.permission === 'granted') {
    await subscribePush();
    return;
  }
  // Don't prompt immediately — let the user experience the app first
}

export async function promptPushPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  return subscribePush();
}

async function subscribePush() {
  try {
    const { key } = await api.getVapidKey();
    if (!key) return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key),
      });
    }
    await api.subscribePush(sub.toJSON());
    return true;
  } catch (e) {
    console.warn('Push subscription failed:', e);
    return false;
  }
}
