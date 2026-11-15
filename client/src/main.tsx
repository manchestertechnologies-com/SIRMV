import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { initUiEffects } from './utils/uiEffects';
import { initSelectMenu } from './utils/selectMenu';
import { initScrollReveal } from './utils/scrollReveal';

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

// boxes below the fold rise into view as you scroll to them; nothing on screen is delayed
initScrollReveal();
initUiEffects();
initSelectMenu();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CallProvider>
        <App />
      </CallProvider>
    </AuthProvider>
  </StrictMode>,
);

// load every portrait picture in the background so faces appear instantly wherever they are used
try {
  const names = ['ms17', 'ms18', 'ms17b', 'fs18', 'fs17', 'fs18b', 'mp42', 'mp52', 'mp52b', 'mp47', 'fp42', 'fp49', 'mt58', 'mt45', 'ft30', 'ft30b', 'fa50', 'fa48'];
  const warm = () => names.forEach((n) => { [n, `${n}-f`].forEach((x) => { const i = new Image(); i.decoding = 'async'; i.src = `/portraits/${x}.webp`; }); });
  (window as any).requestIdleCallback ? (window as any).requestIdleCallback(warm, { timeout: 1500 }) : setTimeout(warm, 600);
} catch { /* ignore */ }
