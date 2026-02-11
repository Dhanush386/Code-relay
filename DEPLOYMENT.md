# Deployment Guide: CodeExam Platform

This guide covers deploying the CodeExam platform to production using Vercel (frontend) and Render (backend).

## Prerequisites

- GitHub account (for code repository)
- Vercel account (free tier) - [vercel.com](https://vercel.com)
- Render account (free tier) - [render.com](https://render.com)

## Step 1: Push Code to GitHub

1. Create a new GitHub repository (public or private)
2. Push your code:
```bash
cd c:\Users\dhanu\OneDrive\Desktop\CV
git init
git add .
git commit -m "Initial commit - CodeExam platform"
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Render

### 2.1 Create PostgreSQL Database

1. Go to [render.com](https://render.com) and log in
2. Click **"New +"** → **"PostgreSQL"**
3. Configure database:
   - **Name**: `codeexam-db`
   - **Database**: `codeexam`
   - **User**: (auto-generated)
   - **Region**: Choose closest to your users
   - **Plan**: Free
4. Click **"Create Database"**
5. Wait for provisioning (1-2 minutes)
6. Copy the **Internal Database URL** (starts with `postgresql://`)

### 2.2 Deploy Backend Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure service:
   - **Name**: `codeexam-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Add **Environment Variables**:
   - `DATABASE_URL` = (paste Internal Database URL from step 2.1)
   - `ORGANIZER_JWT_SECRET` = Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `PARTICIPANT_JWT_SECRET` = Generate with same command (different value)
   - `PORT` = `5000`
   - `NODE_ENV` = `production`
5. Click **"Create Web Service"**
6. Wait for deployment (3-5 minutes)
7. Copy your backend URL (e.g., `https://codeexam-backend.onrender.com`)

### 2.3 Verify Backend

Visit: `https://your-backend-url.onrender.com/health`

Expected response:
```json
{"status":"OK","message":"Coding Exam Platform API is running"}
```

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)
5. Add **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com` (from Step 2.2)
6. Click **"Deploy"**
7. Wait for deployment (2-3 minutes)
8. Copy your frontend URL (e.g., `https://codeexam.vercel.app`)

## Step 4: Test Deployment

### 4.1 Backend Health Check
Visit: `https://your-backend-url.onrender.com/health`

### 4.2 Complete User Flow Test

1. Visit your frontend URL
2. **Organizer Test**:
   - Click "Login as Organizer"
   - Register: `test@example.com` / `password123`
   - Create exam with code: `TEST2024`
   - Create a question
   - Add C++, Python starter code
   - Add 2 visible + 2 hidden testcases

3. **Participant Test** (use incognito/private window):
   - Click "Login as Participant"
   - Exam code: `TEST2024`
   - Participant ID: `STUDENT001`
   - View question
   - Test Python code execution
   - Submit solution

## Troubleshooting

### Backend Issues

**Database Connection Error**
- Verify `DATABASE_URL` is the **Internal Database URL** from Render
- Check database is in "Available" status

**Prisma Migration Failed**
- Check build logs in Render dashboard
- Ensure `npx prisma migrate deploy` is in build command

**Health Check Fails**
- Wait 30 seconds after first deploy (cold start)
- Check service logs in Render dashboard

### Frontend Issues

**API Errors / CORS**
- Verify `NEXT_PUBLIC_API_URL` matches your Render backend URL exactly
- Ensure no trailing slash in URL
- Redeploy frontend after changing environment variables

**Build Failed**
- Check build logs in Vercel dashboard
- Ensure all dependencies in `package.json`

**Monaco Editor Not Loading**
- This should work - it's already configured for SSR: false
- Check browser console for errors

### Performance Notes

**Render Free Tier**
- Backend sleeps after 15 minutes of inactivity
- First request after sleep takes 30-50 seconds (cold start)
- Consider upgrading to paid tier for production use

**Vercel Free Tier**
- No cold start issues
- Generous bandwidth and build limits

## Custom Domain (Optional)

### For Frontend (Vercel)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### For Backend (Render)
1. Go to Service Settings → Custom Domain
2. Add your custom domain
3. Update DNS records as instructed

## Security Checklist

- [x] Database uses PostgreSQL (not SQLite)
- [x] JWT secrets are randomly generated
- [x] Environment variables not committed to Git
- [x] HTTPS enabled (automatic on Vercel/Render)
- [ ] Update CORS settings if using custom domains
- [ ] Set up database backups (Render dashboard)

## Monitoring

- **Render Dashboard**: Monitor backend logs, metrics, database
- **Vercel Dashboard**: Monitor frontend deployments, analytics, logs

## Updates and Redeployment

### Backend Updates
1. Push changes to GitHub
2. Render auto-deploys from `main` branch
3. Migration-only deploy: Manually trigger redeploy

### Frontend Updates
1. Push changes to GitHub
2. Vercel auto-deploys from `main` branch

---

**Your platform is now live! 🎉**

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`
