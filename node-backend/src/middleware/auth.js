const jwt = require('jsonwebtoken')
const cfg = require('../config')

function auth(requiredRoles = []){
  return function(req, res, next){
    const authHeader = req.headers.authorization
    if(!authHeader) return res.status(401).json({message: 'Missing Authorization'})
    const parts = authHeader.split(' ')
    if(parts.length !== 2) return res.status(401).json({message: 'Invalid Authorization format'})
    const token = parts[1]
    try{
      const payload = jwt.verify(token, cfg.jwt.secret)
      req.user = payload
      if(requiredRoles.length && !requiredRoles.includes(payload.role)){
        return res.status(403).json({message: 'Insufficient privileges'})
      }
      next()
    }catch(e){
      return res.status(401).json({message: 'Invalid token'})
    }
  }
}

module.exports = auth


