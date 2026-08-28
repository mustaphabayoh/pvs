const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')

function ipKey(req){
  return ipKeyGenerator(req.ip || 'unknown')
}

function limiter({ windowMs, max, message, keyGenerator }){
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => res.status(429).json({ message, error_code: 'RATE_LIMITED' })
  })
}

// Credential endpoints are limited per IP *and* per targeted username so that
// spraying many usernames from one host is throttled as well.
const loginLimiter = limiter({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req) => `${ipKey(req)}:${String(req.body?.username || '').toLowerCase()}`
})

const sensitiveLimiter = limiter({
  windowMs: parseInt(process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
  max: parseInt(process.env.SENSITIVE_RATE_LIMIT_MAX || '20', 10),
  message: 'Too many attempts, please try again later',
  keyGenerator: ipKey
})

module.exports = { loginLimiter, sensitiveLimiter }
