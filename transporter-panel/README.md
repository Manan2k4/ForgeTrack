# Transporter Panel

A minimal Vite + React UI to submit Transporter logs (Outside Rod/Pin) to the Admin backend at `/api/transporter-logs`.

## PWA & Icons

This panel is installable as a Progressive Web App (PWA). It includes:

- `public/manifest.json` with multi-size + maskable icons
- `public/sw.js` lightweight shell caching service worker
- Auto-generated icons from the root `prince_logo.png`

### Generate / Refresh Icons

If you change `prince_logo.png` at the workspace root, regenerate icons:

```bat
cd transporter-panel
npm run icons
```

This creates/updates files in `public/icons/` and rewrites the `icons` array in `public/manifest.json`.

### Install Instructions

1. Run dev server (`npm run dev`).
2. Visit in Chrome, Edge, or mobile browser.
3. Open Lighthouse / Application tab to confirm manifest + SW.
4. Use browser "Install App" (or Add to Home Screen on mobile) after a fresh load.
5. If icon or name is stale, Clear Storage (Application tab) or on mobile: remove app, clear site data, reload, then reinstall.

### Service Worker Scope

The service worker only caches the minimal shell (`/` + `/index.html`). Dynamic API responses are fetched network-first to avoid stale data.

### Environment Variable

Configure backend API base via `VITE_API_URL` in `.env` (e.g. `VITE_API_URL=https://your-backend.example.com`).

## Quick start (Windows cmd)

```bat
cd "Transporter-panel"
npm install
npm run dev
```

Open http://localhost:3002 and paste a valid Bearer token (from Admin or Worker login) into the token field, then submit a transporter log.

You can configure API URL via `VITE_API_URL` env var.
