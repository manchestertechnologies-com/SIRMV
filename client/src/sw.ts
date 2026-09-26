/// <reference lib="webworker" />
// Custom service worker source for vite-plugin-pwa (injectManifest strategy).
// The plugin injects the precache manifest at self.__WB_MANIFEST; everything
// else here (push + notificationclick) is our own runtime logic per the
// PWA + Web Push spec: real OS notifications, working while the site/PWA
// is closed, and type-based deep-linking on tap.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Maps a notification's `data.type` to the existing in-app tab that should
// open when it's tapped — reusing App.tsx's real tab ids, not new pages.
const TYPE_TO_TAB: Record<string, string> = {
  timetable: 'timetable',
  timetable_conflict: 'timetable-generator',
  announcement: 'noticeboard',
  assignment: 'tests',
  exam: 'tests',
  result: 'board-marks',
  attendance: 'attendance',
  question_paper: 'questions',
  system: 'dashboard-home'
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: { type?: string; id?: string };
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = { title: 'SIR MV PU College', body: 'You have a new notification.' };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // Not JSON (shouldn't happen from our own backend) — fall back to a plain text body.
    if (event.data) payload.body = event.data.text();
  }

  const type = payload.data?.type || 'system';
  const id = payload.data?.id || '';
  // `tag` + `renotify:false` collapses repeat pushes for the same event into one
  // notification instead of stacking duplicates (per "do not create duplicate
  // notifications" — e.g. a retried publish for the same draft/timetable id).
  const tag = id ? `${type}-${id}` : undefined;

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/badge-72.png',
      data: { type, id },
      tag
      // renotify defaults to false, which is what we want: a repeat push with the
      // same tag silently replaces the existing notification instead of duplicating it.
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data || {}) as { type?: string; id?: string };
  const targetTab = TYPE_TO_TAB[data.type || 'system'] || 'dashboard-home';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // If a tab is already open, focus it and tell the app which tab to switch to.
      for (const client of allClients) {
        if ('focus' in client) {
          await (client as WindowClient).focus();
          client.postMessage({ type: 'PUSH_NOTIFICATION_CLICK', targetTab, notificationType: data.type, id: data.id });
          return;
        }
      }

      // Otherwise open a new window/PWA instance and let it read the target from the URL.
      const url = `/?openTab=${encodeURIComponent(targetTab)}`;
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});
