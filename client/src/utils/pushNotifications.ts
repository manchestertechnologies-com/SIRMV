// Client-side Web Push helper. Covers every state the spec calls out:
// default / granted / denied / unsupported / permission revoked / subscription unavailable.
import { apiFetch } from '../services/api';

export type PushSupportState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getPushSupportState(): PushSupportState {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushSupportState; // 'default' | 'granted' | 'denied'
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/** Registered once at app load (main.tsx) via vite-plugin-pwa's virtual:pwa-register — this
 *  just gives the rest of the app a handle to the same registration. */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
  } catch {
    return null;
  }
}

export interface EnableResult {
  success: boolean;
  state: PushSupportState;
  message: string;
}

/** The full "Enable Notifications" flow: permission -> subscribe -> send to backend. */
export async function enablePushNotifications(): Promise<EnableResult> {
  const support = getPushSupportState();
  if (support === 'unsupported') {
    return { success: false, state: 'unsupported', message: 'Push notifications are not supported in this browser. On iPhone/iPad, add this site to your Home Screen first (Share → Add to Home Screen), then try again from the installed app.' };
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return { success: false, state: support, message: 'Could not register the background service needed for notifications. Try reloading the page.' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission === 'denied') {
    return { success: false, state: 'denied', message: 'Notifications are blocked for this site. Enable them from your browser/device settings, then try again.' };
  }

  try {
    const { publicKey } = await apiFetch<{ publicKey: string }>('/notifications/vapid-public-key');
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
      });
    }

    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { success: false, state: 'granted', message: 'Subscription is missing required data — try again.' };
    }

    await apiFetch('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        platform: navigator.platform || undefined
      })
    });

    return { success: true, state: 'granted', message: 'Notifications enabled on this device.' };
  } catch (err: any) {
    return { success: false, state: permission as PushSupportState, message: err.message || 'Could not complete the subscription. Please try again.' };
  }
}

/** Removes just this device's subscription (not every device the user has). */
export async function disablePushNotifications(): Promise<EnableResult> {
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    try {
      await apiFetch('/notifications/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) });
    } catch {
      // Even if the backend call fails, still unsubscribe locally so the UI reflects reality.
    }
    await subscription.unsubscribe();
  }

  return { success: true, state: getPushSupportState(), message: 'Notifications disabled on this device.' };
}

export interface PushStatus {
  supportState: PushSupportState;
  subscribedOnThisDevice: boolean;
  deviceCountForUser: number;
}

/** Combines local browser state with the backend's record of this user's subscriptions. */
export async function getPushStatus(): Promise<PushStatus> {
  const supportState = getPushSupportState();
  let subscribedOnThisDevice = false;
  if (supportState !== 'unsupported') {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    subscribedOnThisDevice = !!subscription;
  }

  let deviceCountForUser = 0;
  try {
    const res = await apiFetch<{ subscribed: boolean; deviceCount: number }>('/notifications/status');
    deviceCountForUser = res.deviceCount;
  } catch {
    // Not logged in yet, or offline — leave at 0, UI treats this as "unknown/disabled".
  }

  return { supportState, subscribedOnThisDevice, deviceCountForUser };
}
