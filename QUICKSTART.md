# Quick Start Guide

## Prerequisites
- Node.js v18+
- PostgreSQL database (local or cloud)
- Git

## Local Development Setup

### 1. Backend Setup
```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your PostgreSQL DATABASE_URL and JWT secrets

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

# Start backend
npm run dev
```

Backend runs on http://localhost:5000

### 2. Frontend Setup
```bash
cd frontend
npm install

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local if needed (default: http://localhost:5000)

# Start frontend
npm run dev
```

Frontend runs on http://localhost:3000

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions using Vercel + Render.

**Quick Summary:**
1. Push code to GitHub
2. Deploy backend to Render (includes PostgreSQL database)
3. Deploy frontend to Vercel
4. Configure environment variables on both platforms

## Technology Stack
- **Frontend**: Next.js 14, Monaco Editor, Tailwind CSS
- **Backend**: Express.js, Prisma ORM, PostgreSQL
- **Code Execution**: Piston API (online, no local compiler needed)

## Features
- JWT-based authentication for organizers and participants
- Real-time code editor with syntax highlighting
- Secure code execution with time/memory limits
- Hidden testcases for fair evaluation
- Exam management with time controls
- Tab switch detection (anti-cheating)

For detailed features and usage, see full [README.md](./README.md)
