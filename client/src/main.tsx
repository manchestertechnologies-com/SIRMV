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
    .then(({ registerSW }) => registerSW({ immediate: true }))
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
