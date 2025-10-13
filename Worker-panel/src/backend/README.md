This folder previously contained a duplicate development backend. The real backend now lives at the repository root: `../backend`.

It has been removed to avoid confusion. If you need to run the API, use the root backend:

- cd ../../../../backend
- npm install
- npm run dev

Frontends should target the API base URL (e.g., http://localhost:5000/api) configured in their respective services.
