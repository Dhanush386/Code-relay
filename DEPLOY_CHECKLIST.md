# Deployment Checklist for CodeExam Platform

## ✅ Completed (Automatic Setup)
- [x] Database migrated from SQLite to PostgreSQL
- [x] Environment templates created
- [x] Vercel configuration added
- [x] Render configuration added
- [x] Deployment guide created
- [x] .gitignore updated

## 📋 Next Steps (Manual Actions Required)

### Step 1: Generate JWT Secrets
Run these commands to generate secure random secrets:

```bash
# Generate Organizer JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Participant JWT Secret (run again for different value)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save these values!** You'll need them for Render environment variables.

---

### Step 2: Push to GitHub

```bash
cd c:\Users\dhanu\OneDrive\Desktop\CV

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare CodeExam platform for production deployment"

# Add your GitHub repository
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

### Step 3: Deploy Backend on Render

1. **Go to [render.com](https://render.com)** and sign in
2. **Create PostgreSQL Database:**
   - Click "New +" → "PostgreSQL"
   - Name: `codeexam-db`
   - Region: Choose closest to your users
   - Click "Create Database"
   - **COPY the Internal Database URL** (you'll need this)

3. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `backend` as root directory
   - Configure:
     - Name: `codeexam-backend`
     - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
     - Start Command: `npm start`
   
4. **Add Environment Variables:**
   - `DATABASE_URL` = (paste Internal Database URL from step 2)
   - `ORGANIZER_JWT_SECRET` = (paste secret from Step 1)
   - `PARTICIPANT_JWT_SECRET` = (paste second secret from Step 1)
   - `PORT` = `5000`
   - `NODE_ENV` = `production`

5. **Deploy** and wait 3-5 minutes

6. **Copy your backend URL** (e.g., `https://codeexam-backend.onrender.com`)

---

### Step 4: Deploy Frontend on Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Import Project:**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Set Root Directory: `frontend`
   
3. **Add Environment Variable:**
   - `NEXT_PUBLIC_API_URL` = (paste your Render backend URL from Step 3)
   - **IMPORTANT:** No trailing slash!

4. **Deploy** and wait 2-3 minutes

5. **Copy your frontend URL** (e.g., `https://codeexam.vercel.app`)

---

### Step 5: Verify Deployment

#### Backend Health Check
Visit: `https://your-backend-url.onrender.com/health`

Expected response:
```json
{"status":"OK","message":"Coding Exam Platform API is running"}
```

#### Full Workflow Test
1. Visit your frontend URL
2. **Organizer Flow:**
   - Login as Organizer
   - Register account
   - Create exam (code: `TEST2024`)
   - Create question
   - Add testcases
3. **Participant Flow:**
   - Open incognito window
   - Login as Participant
   - Exam code: `TEST2024`
   - Submit code solution

---

## 🎉 Success!

Your CodeExam platform is now live!

- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-backend.onrender.com`

---

## 📚 Reference Documentation

- **Full Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick Start Guide:** [QUICKSTART.md](./QUICKSTART.md)
- **Main README:** [README.md](./README.md)

---

## ⚠️ Important Notes

- **Cold Start:** Render free tier sleeps after 15 min. First request takes 30-50 seconds.
- **Database Backups:** Set up automatic backups in Render dashboard.
- **Monitoring:** Check Render logs for backend issues, Vercel logs for frontend.
- **Updates:** Push to GitHub main branch for automatic redeployment.
