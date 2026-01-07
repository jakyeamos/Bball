# 🚀 Quick Deploy Guide - 5 Minutes to Live!

Get your NBA Draft Simulator live in 5 minutes with the easiest setup.

## ⚡ Fastest Method: Vercel + Railway

### **Step 1: Push to GitHub** (2 minutes)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nba-draft-sim.git
git push -u origin main
```

---

### **Step 2: Deploy Backend to Railway** (2 minutes)

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `nba-draft-sim` repository
5. Railway auto-detects configuration ✨
6. Add environment variables:
   - Click **"Variables"** tab
   - Add:
     ```
     NODE_ENV=production
     CLIENT_URL=https://YOUR-APP.vercel.app (we'll update this)
     SESSION_SECRET=<paste the secret you'll generate below>
     ```
7. Generate SESSION_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy output and paste as SESSION_SECRET
8. Click **"Deploy"**
9. Go to **Settings → Networking → Generate Domain**
10. **Copy the URL** (e.g., `nba-draft-sim.railway.app`)

✅ **Backend is live!**

---

### **Step 3: Deploy Frontend to Vercel** (1 minute)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"New Project"** → Import your repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**:
     ```
     cd ../shared && npm install && npm run build && cd ../client && npm install && npm run build
     ```
   - **Output Directory**: `client/dist`
   - **Install Command**: `npm install`
5. Add environment variable:
   - **Key**: `VITE_SERVER_URL`
   - **Value**: `https://YOUR-APP.railway.app` (your Railway URL from Step 2)
6. Click **"Deploy"**
7. Wait ~2 minutes for build
8. **Copy your Vercel URL** (e.g., `nba-draft-sim.vercel.app`)

✅ **Frontend is live!**

---

### **Step 4: Update Backend CLIENT_URL** (30 seconds)

1. Go back to Railway
2. Click your project → **Variables**
3. Update `CLIENT_URL` to your Vercel URL from Step 3
4. Click **"Redeploy"** (top right)

✅ **Done!**

---

## 🎉 Your App is Live!

Visit your Vercel URL and start drafting!

**URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.railway.app`

---

## 💰 Cost

- **Vercel**: FREE forever
- **Railway**: $5/month (includes $5 free credit)
- **Total**: ~$5/month

---

## 🐛 Troubleshooting

### "Can't connect to backend"
1. Check `VITE_SERVER_URL` in Vercel settings
2. Verify Railway app is running (check logs)
3. Make sure CLIENT_URL in Railway matches your Vercel URL

### "Build failed"
1. Check build logs in Vercel/Railway
2. Ensure build commands are correct
3. Make sure shared types are built first

### "WebSocket not connecting"
1. Verify Railway URL is accessible
2. Check CORS settings match
3. Look at browser console for errors

---

## ✅ Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Railway deployed with environment variables
- [ ] Vercel deployed with VITE_SERVER_URL
- [ ] Updated Railway CLIENT_URL to Vercel URL
- [ ] Tested: Can create lobby
- [ ] Tested: Can join lobby
- [ ] Tested: Draft works
- [ ] Tested: Simulation runs

---

## 🎯 Next Steps

Your app is live! You can now:
- Share the URL with friends
- Create a custom domain (Vercel settings)
- Monitor usage (Railway/Vercel dashboards)
- Scale up if needed (Railway plans)

---

## 📚 More Options

Want different hosting? See **DEPLOYMENT.md** for:
- Render (alternative to Railway)
- Netlify (alternative to Vercel)
- Docker deployment
- VPS deployment with nginx
- Self-hosting options

---

**Need help?** Check logs:
- Railway: Click "Deployments" → "View Logs"
- Vercel: Click deployment → "Logs"
