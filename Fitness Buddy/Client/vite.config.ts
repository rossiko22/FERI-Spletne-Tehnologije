import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { VitePWA } from 'vite-plugin-pwa';

// SPA mode — no SSR, no TanStack Start, no Cloudflare. Produces a fully
// self-contained `dist/` (bundled JS + CSS + service worker + manifest).
//
// Service worker is the school's PWA requirement. We use the "injectManifest"
// strategy so Ana can write the SW logic directly in src/sw.ts.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    TanStackRouterVite({
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false, // we register manually from main.tsx
      manifest: false,        // we ship our own public/manifest.webmanifest
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Optional dev convenience: forward /api/* to Express so the client can
      // use relative URLs in dev. In prod, use VITE_API_URL.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
