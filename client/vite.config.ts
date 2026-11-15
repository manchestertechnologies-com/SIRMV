import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { loadEnv, type Plugin } from 'vite';

// Absolute URLs (canonical, og:image, sitemap, structured data) only make sense once the
// real domain is known, so they are injected from VITE_SITE_URL instead of being guessed.
function siteMeta(env: Record<string, string>): Plugin {
  const site = (env.VITE_SITE_URL || '').replace(/\/$/, '');
  return {
    name: 'site-meta',
    transformIndexHtml() {
      if (!site) return [];
      const org: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: 'SIR MV PU College',
        url: site,
        logo: `${site}/icons/icon-512.png`
      };
      if (env.VITE_ORG_PHONE) org.telephone = env.VITE_ORG_PHONE;
      if (env.VITE_ORG_ADDRESS) org.address = { '@type': 'PostalAddress', streetAddress: env.VITE_ORG_ADDRESS };
      if (env.VITE_ORG_SOCIAL) org.sameAs = env.VITE_ORG_SOCIAL.split(',').map((u) => u.trim());
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: `${site}/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: `${site}/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image', content: `${site}/og-image.png` }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:image', content: `${site}/og-image.png` }, injectTo: 'head' },
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(org), injectTo: 'head' }
      ];
    },
    generateBundle() {
      if (!site) return;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc></url>\n</urlset>\n` });
    }
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    siteMeta(loadEnv(mode, process.cwd(), 'VITE_')),
    tailwindcss(),
    VitePWA({
      // sw.ts owns push handling; the plugin only injects the precache manifest.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      manifest: {
        name: 'SIR MV PU College - Campus ERP',
        short_name: 'SIRMV ERP',
        description: 'Attendance, timetable, exams, hostel outpass and parent voice calls for SIR MV PU College.',
        id: '/',
        start_url: '/',
        scope: '/',
        lang: 'en-IN',
        categories: ['education', 'productivity'],
        display: 'standalone',
        orientation: 'any',
        background_color: '#ebe7de',
        theme_color: '#a3161b',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (/node_modules\/(react|react-dom|scheduler|react-is|use-sync-external-store)\//.test(id) || id.includes('commonjsHelpers') || id.includes('rolldown')) return 'react';
          if (id.includes('preload-helper')) return 'react';
          if (id.includes('node_modules/lucide-react') || id.includes('createLucideIcon')) return 'lucide';
          if (id.includes('node_modules/three') || id.includes('@react-three') || id.includes('components/three/') || /components\/(ExamFloor3D|HostelFloor3D|ExamSeatingView3D)/.test(id)) return 'three';
        }
      }
    }
  },
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
}));
