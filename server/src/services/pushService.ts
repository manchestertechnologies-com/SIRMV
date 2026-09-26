// Reusable Web Push sending service (VAPID). Nothing here trusts frontend
// input directly — callers always pass a userId that already came from the
// authenticated JWT, never from a request body.
import webpush from 'web-push';
import { query, execute } from '../database/pgDb';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sirmv.edu.in';

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('[pushService] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set — push notifications are disabled.');
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export type NotificationType =
  | 'timetable'
  | 'timetable_conflict'
  | 'announcement'
  | 'assignment'
  | 'exam'
  | 'result'
  | 'attendance'
  | 'question_paper'
  | 'system';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: { type: NotificationType; id?: string };
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToSubscriptionRow(sub: SubscriptionRow, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth }
  };
  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/badge-72.png',
      data: payload.data || {}
    }));
  } catch (err: any) {
    const statusCode = err?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription is gone (browser unsubscribed, uninstalled, etc.) — clean it up.
      await execute(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]).catch(() => {});
      console.warn(`[pushService] Removed expired/invalid subscription ${sub.id} (status ${statusCode}).`);
    } else {
      console.error(`[pushService] Failed to send push to subscription ${sub.id}:`, err?.message || err);
    }
  }
}

/** Sends to every active device/subscription belonging to one user. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subs = await query<SubscriptionRow>(`SELECT * FROM push_subscriptions WHERE user_id = $1`, [userId]);
  await Promise.all(subs.map((s) => sendToSubscriptionRow(s, payload)));
}

/** Sends the same payload to several users at once (e.g. every teacher affected by a timetable publish). */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;
  const subs = await query<SubscriptionRow>(`SELECT * FROM push_subscriptions WHERE user_id = ANY($1::text[])`, [userIds]);
  await Promise.all(subs.map((s) => sendToSubscriptionRow(s, payload)));
}

/** Sends to one specific subscription row (rarely needed directly, but kept for completeness). */
export async function sendPushToSubscription(subscriptionId: string, payload: PushPayload): Promise<void> {
  const sub = await query<SubscriptionRow>(`SELECT * FROM push_subscriptions WHERE id = $1`, [subscriptionId]);
  if (sub.length === 0) return;
  await sendToSubscriptionRow(sub[0], payload);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
