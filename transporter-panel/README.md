# Transporter Panel

A minimal Vite + React UI to submit Transporter logs (Outside Rod/Pin) to the Admin backend at `/api/transporter-logs`.

## Quick start (Windows cmd)

```bat
cd "Transporter-panel"
npm install
npm run dev
```

Open http://localhost:3002 and paste a valid Bearer token (from Admin or Worker login) into the token field, then submit a transporter log.

You can configure API URL via `VITE_API_URL` env var.
