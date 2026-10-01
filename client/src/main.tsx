import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// Registers our custom service worker (client/src/sw.ts) and keeps it updated.
// Registration itself is silent/automatic — this only makes the background
// service available; the actual Notification permission prompt only ever
// happens when the user clicks "Enable Notifications" in Settings.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true });

      // Safety net for a recurring deploy-visibility problem: registerType
      // 'autoUpdate' installs and activates a new service worker in the
      // background (sw.ts already calls skipWaiting()+clientsClaim()), but
      // an already-open tab keeps running the OLD JS it already loaded into
      // memory until something reloads it — so right after a real deploy,
      // the page can still look completely unchanged even though the new
      // worker is already in control. Force exactly one reload the moment
      // that handover happens, so a visible deploy is never silently masked
      // by a stale tab.
      let reloadedForNewWorker = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadedForNewWorker) return;
        reloadedForNewWorker = true;
        window.location.reload();
      });
    })
    .catch(() => {
      // Not fatal — the app works fine as a plain website without the service worker.
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
