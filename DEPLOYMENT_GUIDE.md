# 🚀 ForgeTrack Deployment Guide

## 📋 Current Configuration

### Netlify Sites
- **Admin Panel**: `https://admin-princeengg.netlify.app`
- **Worker Panel**: `https://worker-princeengg.netlify.app`
- **Transporter Panel**: `https://transport-princeengg.netlify.app`

### Backend
- **Render Backend**: `https://forgetrack-backend-wk3o.onrender.com`

---

## 🔧 Step 1: Configure Netlify Environment Variables

You need to add the backend API URL to each Netlify site's environment variables.

### For Admin Panel Site
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Select your **admin-princeengg** site
3. Navigate to **Site configuration** → **Environment variables**
4. Click **Add a variable**
   - **Key**: `VITE_API_URL`
   - **Value**: `https://forgetrack-backend-wk3o.onrender.com/api`
5. Click **Create variable**

### For Worker Panel Site
1. Select your **worker-princeengg** site
2. Navigate to **Site configuration** → **Environment variables**
3. Click **Add a variable**
   - **Key**: `VITE_API_URL`
   - **Value**: `https://forgetrack-backend-wk3o.onrender.com/api`
4. Click **Create variable**

### For Transporter Panel Site
1. Select your **transport-princeengg** site
2. Navigate to **Site configuration** → **Environment variables**
3. Click **Add a variable**
   - **Key**: `VITE_API_URL`
   - **Value**: `https://forgetrack-backend-wk3o.onrender.com/api`
4. Click **Create variable**

---

## 🔄 Step 2: Update Backend CORS Configuration

Your backend needs to allow requests from all three Netlify domains.

### On Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your **forgetrack-backend-wk3o** service
3. Navigate to **Environment** tab
4. Find the `FRONTEND_URLS` variable (or add it if it doesn't exist)
5. Update its value to:
   ```
   https://admin-princeengg.netlify.app,https://worker-princeengg.netlify.app,https://transport-princeengg.netlify.app
   ```
   ⚠️ **Important**: 
   - No spaces after commas
   - No trailing slashes on URLs
   - Use exact domain names (with or without www based on your Netlify config)

6. Click **Save Changes**

### Verify Other Environment Variables
Make sure these are also set on Render:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: A secure random string (at least 32 characters)
- `NODE_ENV`: `production`

---

## 🚀 Step 3: Redeploy Everything

### Redeploy Netlify Sites (in order)
1. **Admin Panel**:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**
   - Wait for build to complete (should take 2-3 minutes)

2. **Worker Panel**:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**
   - Wait for build to complete

3. **Transporter Panel**:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**
   - Wait for build to complete

### Redeploy Render Backend
1. After updating `FRONTEND_URLS`, Render should automatically redeploy
2. If not, go to your service and click **Manual Deploy** → **Deploy latest commit**
3. Wait for deployment to complete (may take 3-5 minutes for free tier)

---

## ✅ Step 4: Verification Checklist

After all deployments complete, verify each site:

### Admin Panel (`admin-princeengg.netlify.app`)
- [ ] Site loads without errors
- [ ] Can login with admin credentials (admin8829/admin8829)
- [ ] Dashboard shows data (employees, products, logs)
- [ ] Open browser DevTools → Network tab, verify API calls go to Render
- [ ] No CORS errors in Console

### Worker Panel (`worker-princeengg.netlify.app`)
- [ ] Site loads without errors
- [ ] Can login with an active employee account
- [ ] Products load correctly
- [ ] Service Worker loads (no MIME type errors)
- [ ] Can create work logs
- [ ] No CORS errors in Console

### Transporter Panel (`transport-princeengg.netlify.app`)
- [ ] Site loads without errors
- [ ] Can login with an active employee account
- [ ] Can create transporter logs
- [ ] No CORS errors in Console

### Backend Health Check
- [ ] Visit `https://forgetrack-backend-wk3o.onrender.com/api/health`
- [ ] Should return: `{"status":"ok","database":"connected"}`

---

## 🐛 Troubleshooting

### If Admin/Worker/Transporter shows "Failed to fetch" or "Network Error"
1. **Check CORS**: Open DevTools Console, look for CORS errors
2. **Verify env variable**: In Netlify build logs, search for "VITE_API_URL" to confirm it was loaded
3. **Clear cache**: 
   - On Netlify: Trigger deploy → "Clear cache and deploy"
   - In browser: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear Service Worker: DevTools → Application → Service Workers → Unregister

### If backend shows "Not allowed by CORS"
1. Double-check `FRONTEND_URLS` on Render has **exact** domain names (no typos, no trailing slashes)
2. Make sure to save and redeploy backend after changing env variables
3. Test with curl:
   ```bash
   curl -H "Origin: https://admin-princeengg.netlify.app" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        https://forgetrack-backend-wk3o.onrender.com/api/auth/me -v
   ```
   Should see `Access-Control-Allow-Origin: https://admin-princeengg.netlify.app` in response headers

### If login doesn't work
1. Verify JWT_SECRET is set on Render
2. Run the admin setup script on Render:
   ```bash
   node backend/scripts/setAdmin.js
   ```
3. Check MongoDB Atlas to ensure database is accessible

### Service Worker MIME errors (Worker Panel)
- Already fixed in `netlify.toml` with explicit `/sw.js` and `/manifest.json` routes
- If error persists, clear cache and redeploy

---

## 🔐 Admin Credentials

**Default Admin Account** (if needed):
- Username: `admin8829`
- Password: `admin8829`

⚠️ **Change these immediately after first login in production!**

---

## 📝 Summary of Changes Made

1. ✅ Updated `Admin-panel/.env` to point to Render backend
2. ✅ Added `netlify.toml` for all three panels with correct build configs
3. ✅ Fixed Worker Service Worker MIME type issues
4. ✅ Unified API base URL configuration across all panels
5. ✅ Created proper CORS configuration for all domains

---

## 🎯 Expected Result

After following all steps:
- ✅ All three panels load and authenticate successfully
- ✅ Data displays correctly (employees, products, work logs)
- ✅ No CORS or network errors
- ✅ Service Workers load properly on Worker panel
- ✅ Backend processes requests from all three domains

---

## 📞 Need Help?

If you encounter issues:
1. Check browser DevTools Console for specific errors
2. Review Netlify build logs for build failures
3. Check Render logs for backend errors
4. Verify all environment variables are exactly as specified above
