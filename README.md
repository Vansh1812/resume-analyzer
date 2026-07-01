A full-stack web app that lets users upload resumes and get AI-powered analysis.

## Tech Stack

- **Frontend** — React (Vite)
- **Backend** — Node.js + Express
- **Database** — PostgreSQL (AWS RDS)
- **Storage** — AWS S3
- **Processing** — AWS Lambda + Amazon Textract
- **Logging** — AWS CloudWatch

## Project Structure
resume-analyzer/
├── frontend/     → React app (Day 5)
├── backend/      → Express REST API
│   ├── src/
│   │   ├── config/       → database connection
│   │   ├── controllers/  → business logic
│   │   ├── middleware/   → JWT auth
│   │   └── routes/       → API endpoints
│   └── migrations/       → database schema
├── lambda/       → S3-triggered text extraction (Day 4)
└── infra/        → IAM policies, AWS config


## how it work 
1. User uploads a resume (PDF/DOCX)
2. File goes directly to S3 via pre-signed URL
3. S3 triggers a Lambda function
4. Lambda sends the file to Amazon Textract
5. Textract extracts the text
6. Lambda parses skills, experience, and generates a score
7. Results are saved to PostgreSQL
8. User sees the analysis on the dashboard


## Progress

- [x] Day 1 — Project setup, folder structure, IAM policies
- [x] Day 2 — PostgreSQL schema, RDS setup, migrations
- [x] Day 3 — Express server, JWT auth, REST API
- [ ] Day 4 — AWS S3, Lambda, Amazon Textract
- [ ] Day 5 — React frontend
- [ ] Day 6 — Security hardening
- [ ] Day 7 — Deployment

## API Endpoints (Day 3)

### Auth
- `POST /api/auth/register` — create account, returns JWT
- `POST /api/auth/login` — login, returns JWT

### Resumes (protected — requires Bearer token)
- `GET /api/resumes` — list all resumes for logged-in user
- `GET /api/resumes/:id` — get single resume with analysis
- `DELETE /api/resumes/:id` — delete a resume

### Health
- `GET /health` — server health check

## Database Schema

**users** — id, email, password_hash, created_at, updated_at

**resumes** — id, user_id (FK), s3_key, filename, status (uploaded/processing/done/failed), created_at

**analyses** — id, resume_id (FK), raw_text, skills (JSONB), experience_years, score, feedback (JSONB), created_at

## Architecture (Data Flow)
User → React → Node API → S3 (upload)
→ Lambda trigger → Textract
→ PostgreSQL → API → React

## Local Setup

### Prerequisites
- Node.js v20+
- Docker Desktop
- AWS CLI configured

### Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:4000
```

### Environment Variables
Copy `.env.example` to `.env` in the `backend/` folder:
DATABASE_URL=postgresql://...
PORT=4000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=...
JWT_EXPIRES_IN=7d
AWS_REGION=ap-south-1

## AWS Resources

| Service | Name | Status |
|---|---|---|
| RDS PostgreSQL | resume-analyzer-db | ✅ Running |
| S3 Bucket | TBD | ⏳ Day 4 |
| Lambda Function | resume-processor | ⏳ Day 4 |
| ECS Service | resume-analyzer-backend | ⏳ Day 7 |
| CloudFront | resume-analyzer-frontend | ⏳ Day 7 |