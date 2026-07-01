## users
- id          UUID PK, default gen_random_uuid()
- email       VARCHAR(255) UNIQUE NOT NULL
- password_hash VARCHAR(255) NOT NULL
- created_at  TIMESTAMP default now()
- updated_at  TIMESTAMP default now()

## resumes
- id          UUID PK
- user_id     UUID FK → users.id
- s3_key      VARCHAR(500) NOT NULL
- filename    VARCHAR(255) NOT NULL
- status      VARCHAR(20) — uploaded | processing | done | failed
- created_at  TIMESTAMP default now()

## analyses
- id               UUID PK
- resume_id        UUID FK → resumes.id
- raw_text         TEXT
- skills           JSONB
- experience_years INT
- score            FLOAT
- feedback         JSONB
- created_at       TIMESTAMP default now()

database password is ResumeApp2026Secure
alias/aws/rds kms key id