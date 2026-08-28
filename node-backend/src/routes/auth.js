const express = require('express')
const { body, validationResult } = require('express-validator')
const router = express.Router()
const { User } = require('../models')
const cfg = require('../config')
const { logger } = require('../logger')
const { ROLES, SELF_REGISTRATION_ROLES, requiresMfa } = require('../rbac')
const { hashPassword, verifyPassword, validatePassword } = require('../services/password')
const { TOKEN_TYPES, signAccessToken, signMfaToken } = require('../services/tokens')
const twofactor = require('../services/twofactor')
const { auth, mfaAuth } = require('../middleware/auth')
const { loginLimiter, sensitiveLimiter } = require('../middleware/rateLimit')

const GENERIC_LOGIN_ERROR = 'Invalid credentials'

function validate(req, res){
  const errors = validationResult(req)
  if(errors.isEmpty()) return false
  res.status(400).json({ message: 'Invalid request', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) })
  return true
}

function audit(event, req, extra = {}){
  logger.info({ event, ip: req.ip, ...extra }, `auth.${event}`)
}

function loginResponse(user){
  return {
    access_token: signAccessToken(user),
    token_type: 'bearer',
    expires_in: cfg.jwt.expiresIn,
    user: { id: user.id, username: user.username, role: user.role, totp_enabled: user.totp_enabled },
    must_change_password: !!user.must_change_password
  }
}

async function registerFailedAttempt(user){
  user.failed_login_attempts = (user.failed_login_attempts || 0) + 1
  if(user.failed_login_attempts >= cfg.security.maxFailedLogins){
    user.locked_until = new Date(Date.now() + cfg.security.lockoutMinutes * 60 * 1000)
    user.failed_login_attempts = 0
  }
  await user.save()
}

// Self-registration is limited to unprivileged roles; privileged accounts are created by an admin.
router.post('/register',
  sensitiveLimiter,
  body('username').isString().trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9._-]+$/),
  body('password').isString(),
  body('role').optional().isString(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const { username, password } = req.body
      const role = (req.body.role || ROLES.IMPORTER).toUpperCase()
      if(!SELF_REGISTRATION_ROLES.includes(role)){
        return res.status(403).json({ message: 'This role can only be assigned by an administrator' })
      }
      const strength = validatePassword(password, { username })
      if(!strength.valid) return res.status(400).json({ message: 'Weak password', errors: strength.errors })

      const exists = await User.findOne({ where: { username } })
      if(exists) return res.status(409).json({ message: 'username already exists' })

      const user = await User.create({
        username,
        password_hash: await hashPassword(password),
        role,
        password_changed_at: new Date()
      })
      audit('register', req, { username, role })
      return res.status(201).json({ id: user.id, username: user.username, role: user.role })
    }catch(err){ next(err) }
  })

router.post('/login',
  loginLimiter,
  body('username').isString().trim().notEmpty(),
  body('password').isString().notEmpty(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const { username, password } = req.body
      const user = await User.scope('withSecrets').findOne({ where: { username } })

      if(user && user.locked_until && new Date(user.locked_until) > new Date()){
        audit('login.locked', req, { username })
        return res.status(423).json({ message: 'Account temporarily locked due to failed login attempts' })
      }

      const ok = await verifyPassword(password, user && user.password_hash)
      if(!user || !ok){
        if(user) await registerFailedAttempt(user)
        audit('login.failed', req, { username })
        return res.status(401).json({ message: GENERIC_LOGIN_ERROR })
      }

      user.failed_login_attempts = 0
      user.locked_until = null
      user.last_login_at = new Date()
      await user.save()

      if(user.totp_enabled){
        audit('login.mfa_challenge', req, { username })
        return res.json({ mfa_required: true, mfa_token: signMfaToken(user, TOKEN_TYPES.MFA) })
      }

      // Privileged roles cannot obtain an access token until a second factor is enrolled.
      if(requiresMfa(user.role)){
        audit('login.mfa_enrollment_required', req, { username })
        return res.json({
          mfa_required: true,
          mfa_setup_required: true,
          mfa_token: signMfaToken(user, TOKEN_TYPES.MFA_ENROLLMENT)
        })
      }

      audit('login.success', req, { username })
      return res.json(loginResponse(user))
    }catch(err){ next(err) }
  })

// Second step of login: verify a TOTP code or a single-use recovery code.
router.post('/login/2fa',
  loginLimiter,
  mfaAuth([TOKEN_TYPES.MFA]),
  body('code').isString().trim().notEmpty(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const user = req.userRecord
      const { code } = req.body

      if(twofactor.verifyToken(user.totp_secret, code)){
        audit('login.mfa_success', req, { username: user.username })
        return res.json(loginResponse(user))
      }

      const stored = user.recovery_codes ? JSON.parse(user.recovery_codes) : []
      const remaining = await twofactor.consumeRecoveryCode(stored, code)
      if(remaining){
        user.recovery_codes = JSON.stringify(remaining)
        await user.save()
        audit('login.recovery_code_used', req, { username: user.username, remaining: remaining.length })
        return res.json({ ...loginResponse(user), recovery_codes_remaining: remaining.length })
      }

      await registerFailedAttempt(user)
      audit('login.mfa_failed', req, { username: user.username })
      return res.status(401).json({ message: 'Invalid verification code' })
    }catch(err){ next(err) }
  })

// Starts (or restarts) TOTP enrollment. Usable with a normal session or an enrollment token.
router.post('/2fa/setup',
  sensitiveLimiter,
  mfaAuth([TOKEN_TYPES.ACCESS, TOKEN_TYPES.MFA_ENROLLMENT]),
  async (req, res, next) => {
    try{
      const user = req.userRecord
      if(user.totp_enabled) return res.status(409).json({ message: 'Two-factor authentication is already enabled' })

      const secret = twofactor.generateSecret()
      user.totp_secret = secret
      await user.save()

      const otpauthUrl = twofactor.keyUri(user.username, secret)
      audit('2fa.setup_started', req, { username: user.username })
      return res.json({ secret, otpauth_url: otpauthUrl, qr_data_url: await twofactor.qrDataUrl(otpauthUrl) })
    }catch(err){ next(err) }
  })

// Confirms enrollment and returns the one-time recovery codes.
router.post('/2fa/enable',
  sensitiveLimiter,
  mfaAuth([TOKEN_TYPES.ACCESS, TOKEN_TYPES.MFA_ENROLLMENT]),
  body('code').isString().trim().notEmpty(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const user = req.userRecord
      if(user.totp_enabled) return res.status(409).json({ message: 'Two-factor authentication is already enabled' })
      if(!user.totp_secret) return res.status(400).json({ message: 'Start enrollment first' })
      if(!twofactor.verifyToken(user.totp_secret, req.body.code)){
        return res.status(401).json({ message: 'Invalid verification code' })
      }

      const recoveryCodes = twofactor.generateRecoveryCodes()
      user.totp_enabled = true
      user.totp_confirmed_at = new Date()
      user.recovery_codes = JSON.stringify(twofactor.hashRecoveryCodes(recoveryCodes))
      await user.save()

      audit('2fa.enabled', req, { username: user.username })
      const payload = { enabled: true, recovery_codes: recoveryCodes }
      // Enrolling during login: hand out the session the user was waiting for.
      if(req.mfaTokenType === TOKEN_TYPES.MFA_ENROLLMENT){
        Object.assign(payload, loginResponse(user))
      }
      return res.json(payload)
    }catch(err){ next(err) }
  })

router.post('/2fa/disable',
  sensitiveLimiter,
  auth(),
  body('password').isString().notEmpty(),
  body('code').isString().trim().notEmpty(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const user = req.userRecord
      if(requiresMfa(user.role)){
        return res.status(403).json({ message: 'Two-factor authentication is mandatory for this role' })
      }
      if(!await verifyPassword(req.body.password, user.password_hash)){
        return res.status(401).json({ message: GENERIC_LOGIN_ERROR })
      }
      if(!twofactor.verifyToken(user.totp_secret, req.body.code)){
        return res.status(401).json({ message: 'Invalid verification code' })
      }

      user.totp_enabled = false
      user.totp_secret = null
      user.totp_confirmed_at = null
      user.recovery_codes = null
      await user.save()
      audit('2fa.disabled', req, { username: user.username })
      return res.json({ enabled: false })
    }catch(err){ next(err) }
  })

// Users change their own password (also used to clear an admin-forced reset).
router.post('/change-password',
  sensitiveLimiter,
  auth([], { allowPasswordChangePending: true }),
  body('current_password').isString().notEmpty(),
  body('new_password').isString().notEmpty(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const user = req.userRecord
      const { current_password, new_password } = req.body
      if(!await verifyPassword(current_password, user.password_hash)){
        return res.status(401).json({ message: GENERIC_LOGIN_ERROR })
      }
      if(current_password === new_password){
        return res.status(400).json({ message: 'New password must be different from the current password' })
      }
      const strength = validatePassword(new_password, { username: user.username })
      if(!strength.valid) return res.status(400).json({ message: 'Weak password', errors: strength.errors })

      user.password_hash = await hashPassword(new_password)
      user.password_changed_at = new Date()
      user.must_change_password = false
      // Invalidate every previously issued token for this user.
      user.token_version = (user.token_version || 0) + 1
      await user.save()

      audit('password.changed', req, { username: user.username })
      return res.json(loginResponse(user))
    }catch(err){ next(err) }
  })

router.get('/me', auth([], { allowPasswordChangePending: true }), (req, res) => {
  return res.json({ ...req.user, permissions: req.user.permissions })
})

module.exports = router
