const { User } = require('../models')
const { TOKEN_TYPES, verify } = require('../services/tokens')
const { roleHasPermission, permissionsFor } = require('../rbac')

function bearerToken(req){
  const authHeader = req.headers.authorization
  if(!authHeader) return { error: 'Missing Authorization' }
  const parts = authHeader.split(' ')
  if(parts.length !== 2 || !/^Bearer$/i.test(parts[0])) return { error: 'Invalid Authorization format' }
  return { token: parts[1] }
}

// Verifies the JWT, then re-checks the user against the database so that role
// changes, password resets and lockouts take effect immediately (token versioning).
async function resolveUser(req, allowedTypes){
  const { token, error } = bearerToken(req)
  if(error) return { status: 401, message: error }

  let payload
  try{
    payload = verify(token)
  }catch(e){
    return { status: 401, message: 'Invalid token' }
  }

  if(!allowedTypes.includes(payload.typ || TOKEN_TYPES.ACCESS)){
    return { status: 401, message: 'Invalid token type' }
  }

  const user = await User.scope('withSecrets').findByPk(payload.id)
  if(!user) return { status: 401, message: 'Invalid token' }
  if((payload.ver || 0) !== (user.token_version || 0)) return { status: 401, message: 'Token has been revoked' }
  if(user.locked_until && new Date(user.locked_until) > new Date()) return { status: 423, message: 'Account is locked' }

  return { payload, user }
}

// Authentication + optional role gate. `auth()` allows any authenticated user.
function auth(requiredRoles = [], { allowPasswordChangePending = false } = {}){
  return async function(req, res, next){
    try{
      const result = await resolveUser(req, [TOKEN_TYPES.ACCESS])
      if(result.status) return res.status(result.status).json({ message: result.message })

      const { user } = result
      if(user.must_change_password && !allowPasswordChangePending){
        return res.status(403).json({ message: 'Password change required', error_code: 'PASSWORD_CHANGE_REQUIRED' })
      }

      req.user = {
        id: user.id,
        sub: user.username,
        username: user.username,
        role: user.role,
        permissions: permissionsFor(user.role),
        must_change_password: user.must_change_password,
        totp_enabled: user.totp_enabled
      }
      req.userRecord = user

      if(requiredRoles.length && !requiredRoles.includes(user.role)){
        return res.status(403).json({ message: 'Insufficient privileges' })
      }
      next()
    }catch(err){ next(err) }
  }
}

// Permission gate built on top of `auth()`; prefer this over hard-coded role lists.
function authorize(...permissions){
  const authenticate = auth()
  return function(req, res, next){
    authenticate(req, res, (err) => {
      if(err) return next(err)
      if(res.headersSent) return
      const allowed = permissions.some(p => roleHasPermission(req.user.role, p))
      if(!allowed) return res.status(403).json({ message: 'Insufficient privileges' })
      next()
    })
  }
}

// Accepts short-lived MFA tokens (used while completing or enrolling in 2FA).
function mfaAuth(types = [TOKEN_TYPES.MFA, TOKEN_TYPES.MFA_ENROLLMENT]){
  return async function(req, res, next){
    try{
      const result = await resolveUser(req, types)
      if(result.status) return res.status(result.status).json({ message: result.message })
      req.mfaTokenType = result.payload.typ
      req.userRecord = result.user
      next()
    }catch(err){ next(err) }
  }
}

module.exports = auth
module.exports.auth = auth
module.exports.authorize = authorize
module.exports.mfaAuth = mfaAuth
