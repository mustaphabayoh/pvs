const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
const MIN_LENGTH = 12
const MAX_LENGTH = 128

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'qwerty', '123456', '12345678',
  '123456789', 'letmein', 'admin', 'administrator', 'welcome', 'iloveyou',
  'changeme', 'passw0rd', 'football', 'monkey', 'dragon', 'abc123'
])

// A hash of a value nobody can supply, used to keep login timing constant for unknown users.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS)

function validatePassword(password, { username } = {}){
  const errors = []
  if(typeof password !== 'string' || password.length < MIN_LENGTH){
    errors.push(`Password must be at least ${MIN_LENGTH} characters long`)
  }
  if(typeof password === 'string' && password.length > MAX_LENGTH){
    errors.push(`Password must be at most ${MAX_LENGTH} characters long`)
  }
  if(!/[a-z]/.test(password || '')) errors.push('Password must contain a lowercase letter')
  if(!/[A-Z]/.test(password || '')) errors.push('Password must contain an uppercase letter')
  if(!/[0-9]/.test(password || '')) errors.push('Password must contain a digit')
  if(!/[^A-Za-z0-9]/.test(password || '')) errors.push('Password must contain a symbol')
  if(typeof password === 'string' && COMMON_PASSWORDS.has(password.toLowerCase())){
    errors.push('Password is too common')
  }
  if(username && typeof password === 'string' && password.toLowerCase().includes(String(username).toLowerCase())){
    errors.push('Password must not contain the username')
  }
  return { valid: errors.length === 0, errors }
}

function hashPassword(password){
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function verifyPassword(password, hash){
  if(!hash){
    // Spend the same time as a real comparison so responses do not reveal account existence.
    await bcrypt.compare(String(password || ''), DUMMY_HASH)
    return false
  }
  return bcrypt.compare(String(password || ''), hash)
}

function generateTemporaryPassword(){
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%^&*-_=+'
  const all = upper + lower + digits + symbols
  const pick = (set) => set[crypto.randomInt(0, set.length)]
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  while(chars.length < 16) chars.push(pick(all))
  for(let i = chars.length - 1; i > 0; i--){
    const j = crypto.randomInt(0, i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

module.exports = {
  BCRYPT_ROUNDS,
  MIN_LENGTH,
  validatePassword,
  hashPassword,
  verifyPassword,
  generateTemporaryPassword
}
