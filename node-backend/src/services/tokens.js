const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const cfg = require('../config')
const { permissionsFor } = require('../rbac')

const TOKEN_TYPES = {
  ACCESS: 'access',
  MFA: 'mfa',
  MFA_ENROLLMENT: 'mfa_enrollment'
}

const MFA_TOKEN_TTL = process.env.MFA_TOKEN_TTL || '5m'

function sign(payload, expiresIn){
  return jwt.sign(payload, cfg.jwt.secret, {
    expiresIn,
    issuer: cfg.jwt.issuer,
    audience: cfg.jwt.audience,
    jwtid: crypto.randomUUID()
  })
}

function verify(token){
  return jwt.verify(token, cfg.jwt.secret, {
    issuer: cfg.jwt.issuer,
    audience: cfg.jwt.audience
  })
}

function signAccessToken(user){
  return sign({
    sub: user.username,
    id: user.id,
    role: user.role,
    perms: permissionsFor(user.role),
    ver: user.token_version || 0,
    typ: TOKEN_TYPES.ACCESS
  }, cfg.jwt.expiresIn)
}

// Short-lived token that only allows completing (or enrolling in) the second factor.
function signMfaToken(user, type){
  return sign({
    sub: user.username,
    id: user.id,
    ver: user.token_version || 0,
    typ: type
  }, MFA_TOKEN_TTL)
}

module.exports = { TOKEN_TYPES, MFA_TOKEN_TTL, sign, verify, signAccessToken, signMfaToken }
