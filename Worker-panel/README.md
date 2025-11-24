
  # Worker Panel

  Worker interface for Prince Engineering operations (production logging, portal access).

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## PWA & Icons

  This panel is installable as a web app. The manifest (`public/manifest.json`) and service worker (`public/sw.js`) enable:
  - Home screen installation (Chrome/Android, Safari/iOS)
  - Basic offline shell caching
  - Multi-size icons and maskable icon for adaptive launchers

  ### Generate Icons
  1. Place `prince_logo.png` at repo root.
  2. Run: `npm install` then `npm run icons` (this uses `scripts/generate-icons.js`).
  3. Icons written to `public/icons/` and manifest is updated automatically.
  4. Commit & redeploy. Remove any previous home screen shortcut and re-add.

  ### Service Worker
  The SW caches only the app shell to avoid stale icon/manifest caching. Adjust strategies in `public/sw.js` if richer offline support is required.

  ### Troubleshooting Icon Display
  - Clear site data & uninstall old shortcut before testing updates.
  - Ensure all generated icon files are deployed (visit `/icons/prince-192.png`).
  - Use DevTools Application > Manifest panel to confirm icon set recognition.

  