const dotenv = require('dotenv')
const path = require('path')

// Load .env file from project root (one level up from src/)
const envPath = path.resolve(__dirname, '..', '.env')
dotenv.config({ path: envPath })

module.exports = {
  port: process.env.PORT || 4000,
  db: {
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'rootpass',
    database: process.env.DATABASE_NAME || 'verification',
    dialect: 'mysql'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'replace-with-secure-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  }
}

// Basic environment validation for production safety — fail fast if required secrets are not set
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace-with-secure-secret') {
    throw new Error('JWT_SECRET must be set in production and must not be the default value')
  }
  const requiredDb = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME']
  const missing = requiredDb.filter(k => !process.env[k])
  if (missing.length) {
    throw new Error('Missing required DB environment variables in production: ' + missing.join(', '))
  }
}


