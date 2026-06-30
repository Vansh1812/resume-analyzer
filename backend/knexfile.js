require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL ||
      'postgresql://postgres:ResumeApp2026Secure@localhost:5432/resume_analyzer_dev',
    migrations: {
      directory: './migrations'
    }
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './migrations'
    },
    pool: { min: 2, max: 10 }
  }
};