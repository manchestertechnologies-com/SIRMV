import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // We own the push/notificationclick logic, so the service worker is our own
      // source file (src/sw.ts) — the plugin only injects the precache manifest
      // into it and manages registration/updates. It never generates a second,
      // conflicting worker.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false, // we register it ourselves in main.tsx (see registerSW below)
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      manifest: {
        name: 'SIR MV PU College - Campus ERP',
        short_name: 'SIR MV ERP',
        description: 'Institutional management ERP for SIR MV PU College',
        start_url: '/',
        display: 'standalone',
        background_color: '#ebe7de',
        theme_color: '#fdfcf9',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      injectManifest: {
        // Keep the precache list tight — this app is mostly API-driven, not a static
        // content site, so we don't want to precache every route's JS eagerly.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
