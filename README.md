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

├── frontend/     → React app

├── backend/      → Express REST API

├── lambda/       → S3-triggered text extraction

└── infra/        → IAM policies, AWS config

## How it works

1. User uploads a resume (PDF/DOCX)
2. File goes directly to S3 via pre-signed URL
3. S3 triggers a Lambda function
4. Lambda sends the file to Amazon Textract
5. Textract extracts the text
6. Lambda parses skills, experience, and generates a score
7. Results are saved to PostgreSQL
8. User sees the analysis on the dashboard

## Setup

See each subfolder for individual setup instructions.

## Environment Variables

Copy `.env.example` to `.env` in the `backend/` folder and fill in the values.
EOF