# public/

Static files served as-is by Vite.

**Needed icons** (Ana — generate from a single source image, e.g. via
<https://realfavicongenerator.net> or `npx pwa-asset-generator`):

- `icon-192.png` — 192×192, maskable + any
- `icon-512.png` — 512×512, maskable + any

Both are referenced by `manifest.webmanifest` and `index.html`. Without them
the PWA installs but shows a broken icon on the home screen.
