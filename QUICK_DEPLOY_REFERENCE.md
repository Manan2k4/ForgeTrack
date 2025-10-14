# 🚀 Quick Deploy Reference - Copy & Paste Values

## 📋 Netlify Environment Variables

### All Three Sites (Admin, Worker, Transporter)
Add this exact environment variable to each site:

**Key:**
```
VITE_API_URL
```

**Value:**
```
https://forgetrack-backend-wk3o.onrender.com/api
```

---

## 🔧 Render Backend Environment Variable

### FRONTEND_URLS
Add or update this environment variable on your Render backend service:

**Key:**
```
FRONTEND_URLS
```

**Value (copy exactly, no spaces after commas):**
```
https://admin-princeengg.netlify.app,https://worker-princeengg.netlify.app,https://transport-princeengg.netlify.app
```

---

## ✅ Deployment Order

1. ✅ **Netlify Sites**: Add `VITE_API_URL` to all 3 sites → Redeploy each
2. ✅ **Render Backend**: Update `FRONTEND_URLS` → Save (auto-redeploys)
3. ✅ **Test**: Login to each panel and verify data loads

---

## 🔗 Quick Links

- **Admin Panel**: https://admin-princeengg.netlify.app
- **Worker Panel**: https://worker-princeengg.netlify.app
- **Transporter Panel**: https://transport-princeengg.netlify.app
- **Backend Health**: https://forgetrack-backend-wk3o.onrender.com/api/health
- **Netlify Dashboard**: https://app.netlify.com/
- **Render Dashboard**: https://dashboard.render.com/

---

## 🔐 Test Credentials

**Admin Login:**
- Username: `admin8829`
- Password: `admin8829`

---

## 🐛 Quick Troubleshooting

**If data doesn't load after redeploying:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check DevTools Console for CORS errors
3. Clear Service Worker cache: DevTools → Application → Service Workers → Unregister
4. Verify Netlify build logs show `VITE_API_URL` was loaded
5. Check Render backend is running and healthy at `/api/health`

**If CORS errors appear:**
- Verify `FRONTEND_URLS` on Render has **no trailing slashes**
- Ensure **no spaces** after commas in the FRONTEND_URLS value
- Wait 2-3 minutes after Render redeploy for changes to take effect
