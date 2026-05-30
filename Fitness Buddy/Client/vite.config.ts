import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    TanStackRouterVite({
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
    }),
    VitePWA({
      // InjectManifest = mi pišemo SW sami, plugin samo vstavi seznam datotek
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        swDest: 'dist/sw.js',
        // transformers.js ships ~23 MB of ONNX runtime wasm. Don't precache
        // it (would blow past Workbox's 2 MB-per-asset limit); it's fetched
        // on demand the first time offline voice is preloaded.
        globIgnores: ['**/*.wasm'],
      },
      manifest: false,
      devOptions: {
        // SW disabled in dev — it was serving a stale cached bundle and hiding
        // source changes. Offline still works in production builds (npm run build).
        enabled: false,
        type: 'module',
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
