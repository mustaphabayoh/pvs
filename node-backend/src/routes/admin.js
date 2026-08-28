const express = require('express')
const { body, param, validationResult } = require('express-validator')
const router = express.Router()
const { User } = require('../models')
const { logger } = require('../logger')
const { ROLES, PERMISSIONS, isRole, requiresMfa } = require('../rbac')
const { authorize } = require('../middleware/auth')
const { hashPassword, validatePassword, generateTemporaryPassword } = require('../services/password')
const { sensitiveLimiter } = require('../middleware/rateLimit')

function validate(req, res){
  const errors = validationResult(req)
  if(errors.isEmpty()) return false
  res.status(400).json({ message: 'Invalid request', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) })
  return true
}

function audit(event, req, extra = {}){
  logger.info({ event, actor: req.user && req.user.username, ip: req.ip, ...extra }, `admin.${event}`)
}

function publicUser(u){
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    totp_enabled: !!u.totp_enabled,
    must_change_password: !!u.must_change_password,
    locked: !!(u.locked_until && new Date(u.locked_until) > new Date()),
    locked_until: u.locked_until,
    last_login_at: u.last_login_at,
    created_at: u.created_at
  }
}

async function countAdmins(){
  return User.count({ where: { role: ROLES.ADMIN } })
}

router.get('/users', authorize(PERMISSIONS.USER_MANAGE), async (req, res, next) => {
  try{
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100)
    const page = Math.max(parseInt(req.query.page || '1', 10), 1)
    const { count, rows } = await User.findAndCountAll({ limit, offset: (page - 1) * limit, order: [['id', 'ASC']] })
    return res.json({ total: count, page, per_page: limit, data: rows.map(publicUser) })
  }catch(err){ next(err) }
})

// Admins create privileged accounts; the user must change the temporary password on first login.
router.post('/users',
  authorize(PERMISSIONS.USER_MANAGE),
  body('username').isString().trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9._-]+$/),
  body('role').isString().trim(),
  body('password').optional().isString(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const { username } = req.body
      const role = String(req.body.role).toUpperCase()
      if(!isRole(role)) return res.status(400).json({ message: 'Unknown role' })

      const exists = await User.findOne({ where: { username } })
      if(exists) return res.status(409).json({ message: 'username already exists' })

      const password = req.body.password || generateTemporaryPassword()
      const strength = validatePassword(password, { username })
      if(!strength.valid) return res.status(400).json({ message: 'Weak password', errors: strength.errors })

      const user = await User.create({
        username,
        password_hash: await hashPassword(password),
        role,
        must_change_password: true,
        password_changed_at: new Date()
      })
      audit('user.created', req, { username, role })
      return res.status(201).json({ ...publicUser(user), temporary_password: password })
    }catch(err){ next(err) }
  })

// Password resets are an administrator-only operation — there is no self-service reset flow.
router.post('/users/:id/reset-password',
  sensitiveLimiter,
  authorize(PERMISSIONS.USER_RESET_PASSWORD),
  param('id').isInt(),
  body('password').optional().isString(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const user = await User.scope('withSecrets').findByPk(req.params.id)
      if(!user) return res.status(404).json({ message: 'not found' })

      const password = req.body.password || generateTemporaryPassword()
      const strength = validatePassword(password, { username: user.username })
      if(!strength.valid) return res.status(400).json({ message: 'Weak password', errors: strength.errors })

      user.password_hash = await hashPassword(password)
      user.password_changed_at = new Date()
      user.must_change_password = true
      user.failed_login_attempts = 0
      user.locked_until = null
      // Revoke any session issued with the old password.
      user.token_version = (user.token_version || 0) + 1
      await user.save()

      audit('user.password_reset', req, { target: user.username })
      return res.json({ id: user.id, username: user.username, temporary_password: password, must_change_password: true })
    }catch(err){ next(err) }
  })

// Clears a lost authenticator so the user can enroll again on next login.
router.post('/users/:id/2fa/reset',
  authorize(PERMISSIONS.USER_MANAGE),
  param('id').isInt(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const user = await User.scope('withSecrets').findByPk(req.params.id)
      if(!user) return res.status(404).json({ message: 'not found' })

      user.totp_enabled = false
      user.totp_secret = null
      user.totp_confirmed_at = null
      user.recovery_codes = null
      user.token_version = (user.token_version || 0) + 1
      await user.save()

      audit('user.2fa_reset', req, { target: user.username })
      return res.json({ id: user.id, username: user.username, totp_enabled: false, mfa_enrollment_required: requiresMfa(user.role) })
    }catch(err){ next(err) }
  })

router.post('/users/:id/unlock',
  authorize(PERMISSIONS.USER_MANAGE),
  param('id').isInt(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const user = await User.findByPk(req.params.id)
      if(!user) return res.status(404).json({ message: 'not found' })
      user.locked_until = null
      user.failed_login_attempts = 0
      await user.save()
      audit('user.unlocked', req, { target: user.username })
      return res.json(publicUser(user))
    }catch(err){ next(err) }
  })

router.put('/users/:id',
  authorize(PERMISSIONS.USER_MANAGE),
  param('id').isInt(),
  body('role').isString().trim(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const role = String(req.body.role).toUpperCase()
      if(!isRole(role)) return res.status(400).json({ message: 'Unknown role' })

      const user = await User.findByPk(req.params.id)
      if(!user) return res.status(404).json({ message: 'not found' })
      if(user.id === req.user.id) return res.status(403).json({ message: 'Administrators cannot change their own role' })
      if(user.role === ROLES.ADMIN && role !== ROLES.ADMIN && await countAdmins() <= 1){
        return res.status(409).json({ message: 'The last administrator cannot be demoted' })
      }

      user.role = role
      // A role change alters permissions, so existing tokens must be re-issued.
      user.token_version = (user.token_version || 0) + 1
      await user.save()
      audit('user.role_changed', req, { target: user.username, role })
      return res.json(publicUser(user))
    }catch(err){ next(err) }
  })

router.delete('/users/:id',
  authorize(PERMISSIONS.USER_MANAGE),
  param('id').isInt(),
  async (req, res, next) => {
    try{
      if(validate(req, res)) return
      const user = await User.findByPk(req.params.id)
      if(!user) return res.status(404).json({ message: 'not found' })
      if(user.id === req.user.id) return res.status(403).json({ message: 'Administrators cannot delete their own account' })
      if(user.role === ROLES.ADMIN && await countAdmins() <= 1){
        return res.status(409).json({ message: 'The last administrator cannot be deleted' })
      }
      await user.destroy()
      audit('user.deleted', req, { target: user.username })
      return res.json({ ok: true })
    }catch(err){ next(err) }
  })

module.exports = router
