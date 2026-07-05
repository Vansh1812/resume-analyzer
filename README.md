# Resume Analyzer

A full-stack AI-powered resume analysis web application built with React, Node.js, PostgreSQL, and AWS services.

## Live Demo

- **Frontend:** https://your-cloudfront-url.cloudfront.net
- **Backend API:** https://resume-analyzer-backend.onrender.com
- **Health Check:** https://resume-analyzer-backend.onrender.com/health

## What it does

Upload your resume (PDF) and get instant AI-powered analysis including:
- Overall resume score (0-100)
- Skills detected by category (Languages, Frontend, Backend, Databases, Cloud, Tools)
- Education level detection
- Years of experience detection
- Strengths and areas for improvement
- Detailed actionable feedback
- Downloadable PDF analysis report

## Tech Stack

### Frontend
- React 18 (Vite)
- Tailwind CSS
- React Router DOM
- Axios
- jsPDF (PDF report generation)
- React Hot Toast

### Backend
- Node.js + Express
- JWT Authentication
- bcryptjs (password hashing)
- Knex.js (query builder + migrations)
- PostgreSQL (AWS RDS)
- express-rate-limit
- Helmet (security headers)

### AWS Services
- **S3** — Resume file storage (private bucket with presigned URLs)
- **Lambda** — Serverless resume processing (triggered by S3 upload)
- **RDS PostgreSQL** — Database (ap-south-1 / Mumbai)
- **CloudFront** — CDN for frontend (HTTPS, global edge network)
- **CloudWatch** — Logging, monitoring, and alarms
- **CloudTrail** — AWS API audit logging
- **IAM** — Least privilege access control
- **Secrets Manager** — Secure secrets storage

### Deployment
- **Frontend** — S3 + CloudFront
- **Backend** — Render.com (free tier)
- **CI/CD** — GitHub Actions (auto-deploy on push to main)

## Architecture
User Browser
↓
CloudFront (HTTPS CDN)
↓
S3 Static Website (React app)
↓ API calls
Render.com (Node.js backend)
↓                    ↓
RDS PostgreSQL      S3 Uploads Bucket
↓
Lambda (auto-triggered)
↓
PDF Text Extraction
↓
Analysis saved to RDS

## Project Structure
resume-analyzer/
├── frontend/                    # React app (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   └── AnalysisPage.jsx
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── Navbar.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── api/
│   │   │   └── axios.js
│   │   └── utils/
│   │       └── generatePDF.js
│   └── public/
├── backend/                     # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js            # PostgreSQL connection
│   │   │   ├── s3.js            # AWS S3 client
│   │   │   └── secrets.js       # AWS Secrets Manager
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT verification
│   │   │   └── sanitize.js      # Input sanitization
│   │   ├── routes/
│   │   │   ├── auth.js          # Register, login, forgot password
│   │   │   └── resumes.js       # CRUD + presigned URLs
│   │   └── index.js             # Express server entry point
│   └── migrations/              # Database schema (Knex)
├── lambda/                      # AWS Lambda function
│   └── handler.js               # PDF processing + analysis
├── infra/                       # IAM policies + architecture docs
│   ├── backend-policy-dev.json
│   ├── lambda-policy-dev.json
│   └── ARCHITECTURE.md
└── .github/
└── workflows/
└── deploy-frontend.yml  # GitHub Actions CI/CD

## Local Development Setup

### Prerequisites

- Node.js v20+
- Docker Desktop (for local PostgreSQL)
- AWS CLI configured (`aws configure`)
- Git

### Step 1 — Clone the repository

```bash
git clone https://github.com/Vansh1812/resume-analyzer.git
cd resume-analyzer
```

### Step 2 — Start local PostgreSQL with Docker

```bash
docker run --name resume-db-local \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=resume_analyzer_dev \
  -p 5432:5432 \
  -d postgres:15
```

### Step 3 — Set up the backend

```bash
cd backend
npm install
```

Create `backend/.env` (copy from `.env.example` and fill in values):

```bash
cp .env.example .env
```

Fill in your `.env`:
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/resume_analyzer_dev
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=7d
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=your-s3-bucket-name

Run database migrations:

```bash
npx knex migrate:latest
```

Start the backend server:

```bash
npm run dev
# Server runs on http://localhost:4000
```

Verify it's running:

```bash
curl http://localhost:4000/health
# {"status":"ok","timestamp":"..."}
```

### Step 4 — Set up the frontend

```bash
cd ../frontend
npm install
```

Create `frontend/.env`:
VITE_API_URL=http://localhost:4000

Start the React dev server:

```bash
npm run dev
# App runs on http://localhost:5173
```

### Step 5 — Open the app

Go to `http://localhost:5173` in your browser.

Register a new account, upload a PDF resume, and see the analysis!

## AWS Setup (for full functionality)

For the complete experience including S3 uploads and Lambda processing, you need:

### Required AWS services

1. **S3 bucket** — for resume storage
2. **RDS PostgreSQL** — for the database (db.t3.micro, free tier)
3. **Lambda function** — for resume processing
4. **IAM roles** — with least privilege policies

### Lambda setup

The Lambda function in `lambda/handler.js`:
- Triggered automatically when a PDF is uploaded to S3
- Extracts text from the PDF using `pdfreader`
- Detects skills, education, experience years
- Calculates a resume score
- Saves analysis to PostgreSQL
- Updates resume status to "done"

Deploy Lambda:

```bash
cd lambda
npm install
zip -r function.zip . --exclude "*.env" --exclude ".git/*"
# Upload function.zip to AWS Lambda console
```

Lambda environment variables needed:
AWS_REGION=ap-south-1
DATABASE_URL=your-rds-connection-string

## API Endpoints

### Authentication
POST /api/auth/register    Register new account
POST /api/auth/login       Login, returns JWT token
POST /api/auth/forgot-password   Request password reset

### Resumes (all require Bearer token)
GET    /api/resumes           List all resumes for user
GET    /api/resumes/:id       Get resume + analysis
POST   /api/resumes/presign   Get S3 presigned upload URL
POST   /api/resumes           Register resume in DB after upload
DELETE /api/resumes/:id       Delete resume from DB and S3

### Health
GET /health    Server health check

## Database Schema

```sql
-- Users table
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Resumes table
resumes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  s3_key VARCHAR(500) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'uploaded',
  -- status: uploaded | pending | processing | done | failed
  created_at TIMESTAMP
)

-- Analyses table
analyses (
  id UUID PRIMARY KEY,
  resume_id UUID REFERENCES resumes(id),
  raw_text TEXT,
  skills JSONB,
  experience_years INT,
  score FLOAT,
  feedback JSONB,
  created_at TIMESTAMP
)
```

## Security Features

- JWT authentication with configurable expiry
- Password requirements: uppercase, lowercase, number, special character, min 8 chars
- bcrypt password hashing (12 rounds)
- Rate limiting: 10 auth attempts per 15 minutes, 50 uploads per hour
- Input sanitization (XSS protection)
- Security headers via Helmet
- S3 files private by default (presigned URLs only)
- IAM least privilege policies
- AWS CloudTrail audit logging
- AWS Secrets Manager for production secrets

## Deployment Progress

- [x] Day 1 — Project setup, IAM policies, architecture design
- [x] Day 2 — PostgreSQL schema, RDS setup, migrations
- [x] Day 3 — Express server, JWT auth, REST API
- [x] Day 4 — AWS S3, Lambda, PDF processing pipeline
- [x] Day 5 — React frontend, file upload, analysis UI
- [x] Day 6 — Security hardening, rate limiting, CloudTrail
- [x] Day 7 — S3+CloudFront frontend, Render backend, CI/CD

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | Server port | 4000 |
| DATABASE_URL | PostgreSQL connection string | postgresql://... |
| JWT_SECRET | JWT signing secret (min 32 chars) | random-string |
| JWT_EXPIRES_IN | Token expiry | 7d |
| AWS_REGION | AWS region | ap-south-1 |
| AWS_ACCESS_KEY_ID | AWS access key | AKIA... |
| AWS_SECRET_ACCESS_KEY | AWS secret key | xxxx |
| S3_BUCKET_NAME | S3 bucket for resumes | resume-analyzer-uploads-... |
| FRONTEND_URL | Allowed CORS origin | http://localhost:5173 |

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:4000 |

## Troubleshooting

**Login fails on deployed app**
- Check Render environment variables — FRONTEND_URL must match your CloudFront/S3 URL
- Check CORS settings in backend/src/index.js

**Analysis stays in "processing" status**
- Check CloudWatch logs for Lambda errors
- Verify RDS security group allows 0.0.0.0/0 on port 5432
- Check Lambda environment variables (DATABASE_URL correct?)

**S3 upload fails with CORS error**
- Add your CloudFront URL to the S3 uploads bucket CORS policy
- Make sure AllowedMethods includes PUT

**Skills showing as 0**
- Old resume data — upload a new resume after Lambda redeployment
- Check CloudWatch logs show "Skills found: {...}"

**Page refresh gives 403/404 on CloudFront**
- Add custom error responses in CloudFront: 403→/index.html→200, 404→/index.html→200

## License

MIT License — feel free to use this project as a reference or starting point.

## Author

Vansh Saxena
- GitHub: https://github.com/Vansh1812
- Email: vansh18saxena@gmail.com
