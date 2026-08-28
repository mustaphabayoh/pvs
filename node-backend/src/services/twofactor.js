const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { authenticator } = require('otplib')
const QRCode = require('qrcode')

const ISSUER = process.env.TOTP_ISSUER || 'PVS'
const RECOVERY_CODE_COUNT = 10

// Allow one step of clock drift in either direction.
authenticator.options = { window: 1 }

function generateSecret(){
  return authenticator.generateSecret()
}

function keyUri(username, secret){
  return authenticator.keyuri(username, ISSUER, secret)
}

function qrDataUrl(otpauthUrl){
  return QRCode.toDataURL(otpauthUrl)
}

function verifyToken(secret, token){
  if(!secret || !/^\d{6}$/.test(String(token || '').trim())) return false
  try{
    return authenticator.check(String(token).trim(), secret)
  }catch(e){
    return false
  }
}

function generateRecoveryCodes(){
  const codes = []
  for(let i = 0; i < RECOVERY_CODE_COUNT; i++){
    codes.push(crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g).join('-'))
  }
  return codes
}

function hashRecoveryCodes(codes){
  return codes.map(c => bcrypt.hashSync(c, 10))
}

// Returns the remaining hashes when the code matches, otherwise null (single-use codes).
async function consumeRecoveryCode(hashes, code){
  const candidate = String(code || '').trim().toUpperCase()
  if(!candidate || !Array.isArray(hashes)) return null
  for(const hash of hashes){
    if(await bcrypt.compare(candidate, hash)){
      return hashes.filter(h => h !== hash)
    }
  }
  return null
}

module.exports = {
  ISSUER,
  RECOVERY_CODE_COUNT,
  generateSecret,
  keyUri,
  qrDataUrl,
  verifyToken,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode
}
