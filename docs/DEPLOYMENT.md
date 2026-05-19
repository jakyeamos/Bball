# NBA Draft Simulator - Deployment Guide

Complete guide for deploying the NBA Draft Simulator to production.

## 📋 Table of Contents

1. [Quick Deploy Options](#quick-deploy-options)
2. [Environment Variables](#environment-variables)
3. [Platform-Specific Guides](#platform-specific-guides)
4. [Docker Deployment](#docker-deployment)
5. [Manual VPS Deployment](#manual-vps-deployment)
6. [Production Checklist](#production-checklist)

---

## 🚀 Quick Deploy Options

### **Option 1: Separate Services (Recommended)**
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Backend**: Railway, Render, or Fly.io
- **Why**: Easier scaling, better performance, free tiers available

### **Option 2: All-in-One**
- **Single Server**: DigitalOcean, AWS, or any VPS with Docker
- **Why**: Lower cost, simpler architecture

### **Option 3: Docker Compose**
- **Any Docker Host**: Railway, Render, DigitalOcean App Platform
- **Why**: Consistent across environments, easy rollback

---

## 🔐 Environment Variables

### Backend (.env)
```env
# Required
NODE_ENV=production
PORT=3001
CLIENT_URL=https://your-frontend-url.com
SESSION_SECRET=your-super-secret-key-min-32-chars

# Optional
PYTHON_PATH=/usr/bin/python3
```

**Generate secure session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (.env.production)
```env
VITE_SERVER_URL=https://your-backend-url.com
```

---

## 🌐 Platform-Specific Guides

### **Frontend: Vercel** (Recommended - Free)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/nba-draft-sim.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repo
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: repo root
     - **Build Command**: `pnpm --filter @nba-draft-sim/shared build && pnpm --filter nba-draft-sim-client build`
     - **Output Directory**: `client/dist`
     - **Install Command**: `pnpm install --frozen-lockfile`
   - **Environment Variables**:
     - `VITE_SERVER_URL`: `https://your-backend-url.railway.app`
   - Click "Deploy"

3. **Done!** Your frontend is live at `your-app.vercel.app`

---

### **Backend: Railway** (Recommended - $5/month)

1. **Push to GitHub** (same as above)

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repo
   - Railway will auto-detect the `railway.json` config
   - **Environment Variables** (Settings → Variables):
     ```
     NODE_ENV=production
     PORT=3001
     CLIENT_URL=https://your-app.vercel.app
     SESSION_SECRET=<generated-secret>
     ```
   - Click "Deploy"

3. **Get Public URL**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - Copy the URL (e.g., `your-app.railway.app`)

4. **Update Frontend**
   - Go back to Vercel
   - Settings → Environment Variables
   - Update `VITE_SERVER_URL` to Railway URL
   - Redeploy frontend

---

### **Backend: Render** (Free tier available)

1. **Create `render.yaml`** (already in project)

2. **Deploy to Render**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect GitHub repo
   - Configure:
     - **Name**: nba-draft-sim-backend
     - **Environment**: Node
     - **Region**: Choose closest to users
     - **Branch**: main
     - **Root Directory**: repo root
     - **Build Command**: `pnpm --filter @nba-draft-sim/shared build && pnpm --filter nba-draft-sim-server build`
     - **Start Command**: `pnpm --filter nba-draft-sim-server start`
   - **Environment Variables**: Same as Railway
   - Click "Create Web Service"

3. **Copy URL** and update frontend (same as Railway)

---

### **Frontend: Netlify** (Alternative - Free)

1. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - New site from Git → GitHub
   - Select repo
   - Configure:
     - **Base directory**: repo root
     - **Build command**: `pnpm --filter @nba-draft-sim/shared build && pnpm --filter nba-draft-sim-client build`
     - **Publish directory**: `client/dist`
   - **Environment Variables**:
     - `VITE_SERVER_URL`: Your backend URL
   - Deploy

---

## 🐳 Docker Deployment

### **Option 1: Docker Compose (Easiest)**

1. **Clone repo on server**
   ```bash
   git clone https://github.com/yourusername/nba-draft-sim.git
   cd nba-draft-sim
   ```

2. **Create production .env**
   ```bash
   cp server/.env.example server/.env
   # Edit with production values
   nano server/.env
   ```

3. **Build and run**
   ```bash
   docker-compose up -d --build
   ```

4. **View logs**
   ```bash
   docker-compose logs -f
   ```

5. **Stop**
   ```bash
   docker-compose down
   ```

**Ports:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

### **Option 2: Separate Containers**

**Backend:**
```bash
cd nba-draft-sim
docker build -f server/Dockerfile -t nba-draft-backend .
docker run -d -p 3001:3001 \
  -e NODE_ENV=production \
  -e CLIENT_URL=https://your-frontend.com \
  -e SESSION_SECRET=your-secret \
  --name nba-backend \
  nba-draft-backend
```

**Frontend:**
```bash
docker build -f client/Dockerfile \
  --build-arg VITE_SERVER_URL=https://your-backend.com \
  -t nba-draft-frontend .
docker run -d -p 3000:80 \
  --name nba-frontend \
  nba-draft-frontend
```

---

## 🖥️ Manual VPS Deployment

### **Requirements**
- Ubuntu 22.04 or similar
- Node.js 18+
- nginx (for reverse proxy)
- PM2 (for process management)

### **1. Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install PM2 globally
pnpm add -g pm2

# Optional: Install Python for stats scraper
sudo apt install -y python3 python3-pip
```

### **2. Clone and Build**
```bash
# Clone repo
git clone https://github.com/yourusername/nba-draft-sim.git
cd nba-draft-sim

# Install dependencies and build shared types/backend
pnpm install --frozen-lockfile
pnpm --filter @nba-draft-sim/shared build
pnpm --filter nba-draft-sim-server build

# Optional: Install Python dependencies
pip3 install -r requirements.txt

# Build frontend
pnpm --filter nba-draft-sim-client build
```

### **3. Configure Environment**
```bash
# Backend
cd server
cp .env.example .env
nano .env
# Set production values
```

### **4. Start Backend with PM2**
```bash
cd server
pm2 start dist/index.js --name nba-draft-backend
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### **5. Configure nginx**
```bash
sudo nano /etc/nginx/sites-available/nba-draft-sim
```

**Add this configuration:**
```nginx
# Backend server
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}

# Frontend server
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/nba-draft-sim/client/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/nba-draft-sim /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **6. Setup SSL with Let's Encrypt**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
sudo systemctl restart nginx
```

### **7. Setup Firewall**
```bash
sudo ufw allow 22   # SSH
sudo ufw allow 80   # HTTP
sudo ufw allow 443  # HTTPS
sudo ufw enable
```

---

## ✅ Production Checklist

### **Before Deploying**
- [ ] Generate secure `SESSION_SECRET`
- [ ] Update `CLIENT_URL` to production frontend URL
- [ ] Update `VITE_SERVER_URL` to production backend URL
- [ ] Set `NODE_ENV=production`
- [ ] Test locally with production builds
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Review security headers

### **After Deploying**
- [ ] Test all features (lobby, draft, simulation)
- [ ] Check WebSocket connections work
- [ ] Monitor logs for errors
- [ ] Test on mobile devices
- [ ] Setup monitoring/alerts (optional)
- [ ] Configure backups (if using database later)
- [ ] Load test with multiple users

### **Performance Optimization**
- [ ] Enable gzip compression
- [ ] Setup CDN for static assets (optional)
- [ ] Configure caching headers
- [ ] Monitor memory usage
- [ ] Setup log rotation

---

## 🔍 Troubleshooting

### **WebSocket Connection Fails**
- Check CORS settings match frontend URL
- Verify backend is accessible
- Check firewall allows WebSocket connections
- Ensure nginx proxy configuration is correct

### **Build Fails**
- Ensure shared types are built first
- Check Node.js version (need 18+)
- Clear `node_modules` and reinstall

### **Frontend Can't Connect to Backend**
- Check `VITE_SERVER_URL` environment variable
- Verify backend is running and accessible
- Check network/firewall rules
- Look at browser console for CORS errors

---

## 📊 Monitoring (Optional)

### **PM2 Monitoring**
```bash
pm2 monit
pm2 logs nba-draft-backend
```

### **Log Files**
```bash
# Backend logs
tail -f server/logs/*.log

# nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🎯 Recommended Setup

**For Quick Launch:**
- Frontend: **Vercel** (free)
- Backend: **Railway** ($5/month)
- Total: **$5/month**, 5 minutes to deploy

**For Production Scale:**
- Frontend: **Vercel** or **Cloudflare Pages**
- Backend: **Railway** or **Render**
- Database: **Redis Cloud** (when you add persistence)
- Total: **$10-20/month**

**For Full Control:**
- VPS: **DigitalOcean Droplet** ($6/month)
- Manual deployment with nginx + PM2
- Setup monitoring and backups
- Total: **$6/month** + your time

---

## 🚨 Security Notes

1. **Always use HTTPS in production**
2. **Generate strong SESSION_SECRET** (32+ random chars)
3. **Keep dependencies updated**: `pnpm audit`
4. **Enable rate limiting** (add later if needed)
5. **Monitor for attacks** (check logs regularly)
6. **Backup configuration** (save .env securely)

---

## 📞 Support

Having issues? Check:
1. Server logs: `pm2 logs` or `docker-compose logs`
2. Browser console for frontend errors
3. Network tab for WebSocket connection status
4. `/health` endpoint on backend

---

**Ready to deploy!** Follow the platform guide that matches your preference. Most users should start with Vercel + Railway for the easiest experience.
