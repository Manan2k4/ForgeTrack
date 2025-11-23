
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
  
  