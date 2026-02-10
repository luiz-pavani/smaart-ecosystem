# SMAART PRO Ecosystem - Deployment Guide

## 🎯 Deployment Map

| Component | Local Path | Hostinger Path | Public URL | Status |
|-----------|-----------|----------------|------------|--------|
| Master LP | `lp/main/` | `public_html/` | https://smaartpro.com | 🔴 Pending |
| VAR LP | `lp/var/` | `public_html/var/` | https://smaartpro.com/var/ | 🔴 Pending |
| VAR App | `apps/var-app/` | `public_html/varapp/` | https://smaartpro.com/varapp/ | ✅ Deployed |
| J1 LP | `lp/j1/` | `public_html/j1/` | https://smaartpro.com/j1/ | 🔴 Pending |
| J1 App | `apps/j1-app/` | Vercel | https://j1.smaartpro.com | 🔴 Pending |
| TITAN LP | `lp/titan/` | `public_html/titan/` | https://smaartpro.com/titan/ | 🔴 Pending |
| TITAN App | `apps/titan/` | Vercel | https://titan.smaartpro.com | 🔴 Pending |
| Judolingo LP | `lp/judolingo/` | judolingo.com root | https://judolingo.com | 🔴 Pending |
| Judolingo App | `apps/judolingo/` | judolingo.com root | https://judolingo.com | ✅ Files Ready |
| Profep Max | `profep-max/` | Vercel | https://profepmax.com.br | 🔴 Pending |

---

## 📦 HOSTINGER DEPLOYMENTS

### 🔧 Prerequisites
- Git installed on Hostinger (via SSH)
- Repository: https://github.com/luiz-pavani/smaart-ecosystem.git
- SSH access to Hostinger panel

### Method 1: Manual File Upload (Recommended for Landing Pages)

#### 1. Master Landing Page (smaartpro.com)
```bash
# Local: Upload lp/main/ contents to Hostinger
# Destination: public_html/ (root)
# Files: index.html, style.css
```

**Hostinger Steps:**
1. Go to File Manager → domains/smaartpro.com/public_html/
2. Upload `lp/main/index.html` → public_html/index.html
3. Upload `lp/main/style.css` → public_html/style.css
4. Verify: https://smaartpro.com

---

#### 2. VAR Landing Page (smaartpro.com/var/)
```bash
# Destination: public_html/var/
```

**Hostinger Steps:**
1. Create folder: public_html/var/
2. Upload all files from `lp/var/` to public_html/var/
3. Verify: https://smaartpro.com/var/

---

#### 3. J1 Landing Page (smaartpro.com/j1/)
```bash
# Destination: public_html/j1/
```

**Hostinger Steps:**
1. Create folder: public_html/j1/
2. Upload `lp/j1/index.html` → public_html/j1/index.html
3. Upload `lp/j1/style.css` → public_html/j1/style.css
4. Verify: https://smaartpro.com/j1/

---

#### 4. TITAN Landing Page (smaartpro.com/titan/)
```bash
# Destination: public_html/titan/
```

**Hostinger Steps:**
1. Create folder: public_html/titan/
2. Upload `lp/titan/index.html` → public_html/titan/index.html
3. Upload `lp/titan/style.css` → public_html/titan/style.css
4. Verify: https://smaartpro.com/titan/

---

#### 5. Judolingo Landing Page (judolingo.com)
```bash
# Destination: judolingo.com public_html/ (already has WordPress files)
```

**Hostinger Steps:**
1. Go to File Manager → domains/judolingo.com/public_html/
2. Create folder: public_html/lp/
3. Upload `lp/judolingo/index.html` → public_html/lp/index.html
4. Upload `lp/judolingo/style.css` → public_html/lp/style.css
5. Verify: https://judolingo.com/lp/
6. *Note: WordPress app already in root (index.php takes precedence)*

**OR** - If you want LP as homepage:
1. Rename index.php → index-wp.php
2. Upload lp/judolingo/index.html → public_html/index.html
3. Upload lp/judolingo/style.css → public_html/style.css

---

### Method 2: Git Clone (Advanced - For Full Apps)

```bash
# SSH into Hostinger
cd ~/domains/smaartpro.com/public_html

# Clone repository
git clone https://github.com/luiz-pavani/smaart-ecosystem.git temp_deploy

# Copy specific folders
cp -r temp_deploy/lp/main/* ./
mkdir -p var j1 titan
cp -r temp_deploy/lp/var/* ./var/
cp -r temp_deploy/lp/j1/* ./j1/
cp -r temp_deploy/lp/titan/* ./titan/

# Cleanup
rm -rf temp_deploy
```

---

## 🚀 VERCEL DEPLOYMENTS

### Prerequisites
- Vercel CLI: `npm install -g vercel`
- Vercel account linked to GitHub
- Login: `vercel login`

### 1. J1 Analytics App
```bash
cd apps/j1-app
vercel --prod --build-env VITE_API_URL=https://api.smaartpro.com
```

**Custom Domain Settings:**
- Production URL: https://j1.smaartpro.com
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

---

### 2. TITAN Management System
```bash
cd apps/titan
vercel --prod
```

**Environment Variables Required:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SAFE2PAY_TOKEN=your_safe2pay_token
SAFE2PAY_SECRET=your_safe2pay_secret
RESEND_API_KEY=your_resend_key
```

**Custom Domain Settings:**
- Production URL: https://titan.smaartpro.com
- Framework: Next.js
- Build Command: `next build`
- Output Directory: `.next`

---

### 3. Profep Max
```bash
cd profep-max
vercel --prod
```

**Environment Variables Required:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SAFE2PAY_TOKEN=your_safe2pay_token
SAFE2PAY_SECRET=your_safe2pay_secret
RESEND_API_KEY=your_resend_key
```

**Custom Domain Settings:**
- Production URL: https://profepmax.com.br
- Framework: Next.js
- Build Command: `next build`
- Output Directory: `.next`

---

## 🔄 Quick Deploy Commands

### Deploy All Landing Pages (Hostinger)
```bash
# From local smaart-ecosystem directory

# 1. Create deployment package
mkdir -p deploy_package/smaartpro
cp lp/main/index.html lp/main/style.css deploy_package/smaartpro/
mkdir -p deploy_package/smaartpro/var deploy_package/smaartpro/j1 deploy_package/smaartpro/titan
cp -r lp/var/* deploy_package/smaartpro/var/
cp -r lp/j1/* deploy_package/smaartpro/j1/
cp -r lp/titan/* deploy_package/smaartpro/titan/

# 2. Create zip
cd deploy_package
zip -r smaartpro_lps.zip smaartpro/

# 3. Upload smaartpro_lps.zip to Hostinger File Manager
# 4. Extract in public_html/
```

### Deploy All Apps (Vercel)
```bash
# J1 App
cd apps/j1-app && vercel --prod && cd ../..

# TITAN App
cd apps/titan && vercel --prod && cd ../..

# Profep Max
cd profep-max && vercel --prod && cd ../..
```

---

## 🔗 Update Master LP Links

After deployment, update button links in `lp/main/index.html`:

```html
<!-- Current Links -->
<a href="https://smaartpro.com/varapp/">VAR System</a>
<a href="https://j1.smaartpro.com">J1 Analytics</a>
<a href="https://titan.smaartpro.com">TITAN</a>
<a href="https://judolingo.com">Judolingo</a>
<a href="https://profepmax.com.br">Profep Max</a>
```

---

## ✅ Post-Deployment Checklist

### For Each Landing Page:
- [ ] Files uploaded correctly
- [ ] index.html loads without errors
- [ ] CSS styles apply correctly
- [ ] All fonts load (Google Fonts)
- [ ] Buttons link to correct URLs
- [ ] Mobile responsive design works
- [ ] HTTPS enabled

### For Each App:
- [ ] Environment variables configured
- [ ] Build completes successfully
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Database connections working
- [ ] API endpoints responding
- [ ] Authentication functional

---

## 📝 Maintenance

### Update Landing Pages
```bash
# 1. Edit files locally in lp/
# 2. Test locally
# 3. Commit and push to GitHub
git add lp/
git commit -m "Update landing pages"
git push

# 4. Re-upload changed files to Hostinger
```

### Update Apps
```bash
# 1. Make changes locally
# 2. Commit and push to GitHub
# 3. Vercel auto-deploys from main branch
# OR manually: vercel --prod
```

---

## 🆘 Troubleshooting

### Landing Page Issues
- **404 Not Found**: Check file path in Hostinger File Manager
- **Styles not loading**: Verify style.css is in same directory
- **Fonts not loading**: Check Google Fonts CDN links
- **Mobile issues**: Test CSS media queries

### App Deployment Issues
- **Vercel Build Failed**: Check `package.json` scripts
- **Environment Variables**: Verify in Vercel dashboard
- **Domain Not Working**: Check DNS settings (CNAME records)
- **API Errors**: Check CORS settings and API URLs

---

## 📞 Support

- GitHub Issues: https://github.com/luiz-pavani/smaart-ecosystem/issues
- Hostinger Support: Panel → Help Center
- Vercel Support: https://vercel.com/support

---

**Last Updated**: February 10, 2026
**Repository**: https://github.com/luiz-pavani/smaart-ecosystem
