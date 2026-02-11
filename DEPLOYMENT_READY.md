# 🚀 Deployment Configuration & Secrets

## Generated JWT Secrets for Production

**IMPORTANT**: Save these secrets! You'll need them when deploying to Render.

```env
ORGANIZER_JWT_SECRET=8a9232940d0bc9921807f
PARTICIPANT_JWT_SECRET=c2e15e2a5a75444737e793
```

---

## Deployment Options

Since Git is not installed on your system, you have two options:

### Option 1: Install Git (Recommended)
1. Download Git from: https://git-scm.com/download/win
2. Install with default options
3. Restart your terminal/PowerShell
4. Continue with GitHub deployment

### Option 2: Deploy Without Git (Alternative)
1. **Backend**: Upload code directly to Render
2. **Frontend**: Upload code directly to Vercel

---

## Quick Deployment Guide

### Step 1: Create GitHub Repository (if Git is installed)

1. Go to https://github.com/new
2. Repository name: `codeexam-platform` (or your choice)
3. Choose Public or Private
4. Click "Create repository"

### Step 2: Push Code to GitHub

```powershell
cd c:\Users\dhanu\OneDrive\Desktop\CV

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - CodeExam platform ready for deployment"

# Add remote (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR-USERNAME/codeexam-platform.git

# Push
git branch -M main
git push -u origin main
```

### Step 3: Deploy Backend to Render

1. **Go to**: https://render.com (sign up/login)

2. **Create PostgreSQL Database**:
   - Click "New +" → "PostgreSQL"
   - Name: `codeexam-db`
   - Region: Choose closest to you
   - Click "Create Database"
   - **COPY** the "Internal Database URL"

3. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect GitHub repository (or upload code)
   - Settings:
     - Name: `codeexam-backend`
     - Root Directory: `backend`
     - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
     - Start Command: `npm start`
   
4. **Environment Variables**:
   ```
   DATABASE_URL = <Internal Database URL from step 2>
   ORGANIZER_JWT_SECRET = 8a9232940d0bc9921807f
   PARTICIPANT_JWT_SECRET = c2e15e2a5a75444737e793
   PORT = 5000
   NODE_ENV = production
   ```

5. Click "Create Web Service"
6. **COPY** your backend URL: `https://codeexam-backend.onrender.com`

### Step 4: Deploy Frontend to Vercel

1. **Go to**: https://vercel.com (sign up/login)

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import from GitHub (or upload code)
   - Root Directory: `frontend`

3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = <Your Render backend URL>
   ```
   Example: `https://codeexam-backend.onrender.com` (NO trailing slash!)

4. Click "Deploy"
5. **COPY** your frontend URL: `https://codeexam.vercel.app`

### Step 5: Test Your Live Website

1. **Backend Health**: Visit `https://your-backend-url.onrender.com/health`
   - Should show: `{"status":"OK","message":"Coding Exam Platform API is running"}`

2. **Frontend**: Visit `https://your-frontend-url.vercel.app`
   - Should show the CodeExam landing page

3. **Complete Flow**:
   - Register as organizer
   - Create exam with code
   - Join as participant (use incognito window)
   - Submit code solution

---

## 🎉 Your Website is Live!

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`

Share the frontend URL with anyone to let them access your coding exam platform!

---

## Troubleshooting

### "Git is not recognized"
- Install Git from https://git-scm.com/download/win
- Or use Render/Vercel's manual upload options

### Backend won't start
- Check Render logs for errors
- Verify DATABASE_URL is correct
- Ensure all environment variables are set

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL matches your Render URL exactly
- No trailing slash in the URL
- Redeploy frontend after changing env variables

### Cold Start (30-50s delay)
- Normal on Render free tier after 15 min of inactivity
- First request wakes up the server
- Consider paid tier for instant response
