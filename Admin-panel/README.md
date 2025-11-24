
  # Admin Panel Development

  This is a code bundle for Admin Panel Development. The original project is available at https://www.figma.com/design/uhQcKYeAX6Rjn8TupU2Z1w/Admin-Panel-Development.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
  ## Password Encryption Key
  
  The backend encrypts a reversible snapshot of each employee password (for admin viewing) using **AES-256-GCM**. You MUST set an environment variable before starting the server:
  
  - `PASSWORD_ENC_KEY` = a 32+ character secret (recommended 64 random hex chars)
  
  Example (PowerShell / Windows CMD):
  
  ```bash
  set PASSWORD_ENC_KEY=3b0f8d1a6e7c4f9d2a5b8e1c7f0a3d6b9c2e5f8a1d4c7e0f3b6a9c2e5f8a1d4
  ```
  
  If this key is missing or shorter than 32 chars:
  - New passwords will NOT store an encrypted snapshot.
  - Admin password view endpoint will return an error.
  
  Rotate the key carefully: changing it invalidates existing encrypted snapshots. To recover viewing capability after rotation, force employees to reset their passwords (admin edit) so new snapshots are generated under the new key.

  ## Deploying to Netlify

  1. Backend first: Deploy the Express API (in `src/backend` or separate repo) to a service like Render, Railway, Azure Web App, or similar. Note the live base URL (e.g. `https://forgetrack-api.example.com/api`).
  2. Set environment variable in Netlify UI: `VITE_API_URL = https://forgetrack-api.example.com/api`.
  3. Trigger build: Netlify runs `npm run build` (see `netlify.toml`). Output folder `dist` is published.
  4. SPA routing: Already configured via Netlify redirects to serve `index.html` for all paths.
  5. Cache control & security headers: Basic headers are declared in `netlify.toml`; adjust if you add a service worker strategy.

  ### Quick Deploy Steps (CLI)
  ```bash
  # Inside Admin-panel folder
  npm install
  npm run build
  # Deploy (requires Netlify CLI installed and site linked)
  netlify deploy --prod --dir=dist
  ```

  ### Environment Variables Summary
  - `VITE_API_URL` (frontend build-time) points to deployed backend.
  - `PASSWORD_ENC_KEY` (backend runtime only) DO NOT set on frontend.
  - Never expose `PASSWORD_ENC_KEY` to Netlify; it belongs only on the backend host.

  ### Common Deployment Pitfalls
  - 404s on refresh: fixed by SPA redirect in `netlify.toml`.
  - CORS errors: ensure backend sets `Access-Control-Allow-Origin` to your Netlify domain or `*` for development.
  - Wrong API URL after deploy: verify `import.meta.env.VITE_API_URL` value via browser console (check built code) and Netlify env settings.
  - Password view failing: confirm backend has correct `PASSWORD_ENC_KEY` (>=32 chars) and that new employee passwords were saved after the key existed.

  
  ## Audit Logging
  
  Each admin password view request is logged to the server console with a `[AUDIT]` prefix. For production, persist these events to a secure collection or external log store (e.g. Azure Monitor, CloudWatch) and monitor for unusual access patterns.

  ## PWA / Home Screen Icon

    To enable installation as a web app and show your custom icon:
    1. Create a folder `Admin-panel/public/icons/`.
    2. Generate square PNGs (transparent or solid brand background) at sizes:
      72, 96, 128, 144, 152, 192, 256, 384, 512.
      Name them exactly: `prince-72.png`, `prince-96.png`, etc.
    3. The manifest now references all these sizes for better device compatibility.
    4. Optional: create a maskable icon variant with extra safe padding (leave 12-15% margin) and assign `purpose: "maskable"`.
    5. Service worker avoids precaching icons so updates appear immediately after a reload.
    6. After deployment, Chrome (Android): open site → overflow menu → Add to Home screen. If the icon shows a blank letter, clear site data (Settings → Site settings → Storage) and retry.

  Optional improvements:
  - Add dedicated maskable and monochrome icons for newer Android launchers.
  - Precache more static assets in `sw.js` (but keep icons out to avoid staleness).
  - Use Workbox for advanced strategies.
  - Provide separate dark/light theme colors in manifest.
  
  ### CLI Icon Generation
  A script `scripts/generate-icons.js` now creates all required sizes from the root `prince_logo.png`:
  1. Ensure `prince_logo.png` exists at repository root (`SGP-3/prince_logo.png`).
  2. Install dependencies (sharp): `npm install` (inside `Admin-panel`).
  3. Run: `npm run icons`
  4. Script outputs icons into `public/icons/` and rewrites `public/manifest.json` icons array.
  5. Commit & redeploy; remove old home-screen shortcut and re-add.
  
  If the source image is not square, the script pads it with brand background color (#0b3d91). Maskable icon is generated with safe padding. Replace background or adjust padding by editing the script.

  
  