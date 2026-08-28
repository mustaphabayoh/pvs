process.env.LOGIN_RATE_LIMIT_MAX = '1000'
process.env.SENSITIVE_RATE_LIMIT_MAX = '1000'

const request = require('supertest')
const { authenticator } = require('otplib')
const app = require('../src/index')
const { sequelize, User } = require('../src/models')
const { hashPassword } = require('../src/services/password')

const STRONG_PASSWORD = 'Str0ng!Passphrase42'
const OTHER_PASSWORD = 'An0ther!Passphrase77'

async function createUser({ username, role, password = STRONG_PASSWORD, ...rest }){
  return User.create({ username, role, password_hash: await hashPassword(password), ...rest })
}

async function login(username, password){
  return request(app).post('/api/auth/login').send({ username, password })
}

// Logs in an admin and completes the mandatory TOTP enrollment, returning an access token.
async function loginAdminWithMfa(username, password = STRONG_PASSWORD){
  const first = await login(username, password)
  if(first.body.mfa_setup_required){
    const setup = await request(app).post('/api/auth/2fa/setup').set('Authorization', `Bearer ${first.body.mfa_token}`).expect(200)
    const enable = await request(app).post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${first.body.mfa_token}`)
      .send({ code: authenticator.generate(setup.body.secret) })
      .expect(200)
    return { token: enable.body.access_token, secret: setup.body.secret, recovery_codes: enable.body.recovery_codes }
  }
  const secret = (await User.scope('withSecrets').findOne({ where: { username } })).totp_secret
  const second = await request(app).post('/api/auth/login/2fa')
    .set('Authorization', `Bearer ${first.body.mfa_token}`)
    .send({ code: authenticator.generate(secret) })
    .expect(200)
  return { token: second.body.access_token, secret }
}

beforeAll(async () => { await sequelize.sync({ force: true }) })
afterAll(async () => { await sequelize.close() })
beforeEach(async () => { await User.destroy({ where: {}, truncate: true }) })

describe('registration', () => {
  test('rejects weak passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'weakuser', password: 'password' })
    expect(res.status).toBe(400)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('refuses to self-assign a privileged role', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'wannabe', password: STRONG_PASSWORD, role: 'ADMIN' })
    expect(res.status).toBe(403)
    expect(await User.findOne({ where: { username: 'wannabe' } })).toBeNull()
  })

  test('creates an importer account with a strong password', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'importer9', password: STRONG_PASSWORD })
    expect(res.status).toBe(201)
    expect(res.body.role).toBe('IMPORTER')
  })
})

describe('login hardening', () => {
  test('locks the account after repeated failures and reports it generically', async () => {
    await createUser({ username: 'lockme', role: 'IMPORTER' })
    for(let i = 0; i < 5; i++){
      const res = await login('lockme', 'Wr0ng!Passphrase99')
      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Invalid credentials')
    }
    const locked = await login('lockme', STRONG_PASSWORD)
    expect(locked.status).toBe(423)
  })

  test('unknown users get the same error as wrong passwords', async () => {
    const res = await login('ghost', STRONG_PASSWORD)
    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid credentials')
  })

  test('tokens issued for another audience are rejected', async () => {
    const jwt = require('jsonwebtoken')
    const cfg = require('../src/config')
    const user = await createUser({ username: 'imp2', role: 'IMPORTER' })
    const forged = jwt.sign({ sub: user.username, id: user.id, role: 'ADMIN', typ: 'access', ver: 0 }, cfg.jwt.secret)
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${forged}`)
    expect(res.status).toBe(401)
  })
})

describe('two-factor authentication', () => {
  test('admins cannot get a session until 2FA is enrolled, then must present a code', async () => {
    await createUser({ username: 'admin1', role: 'ADMIN' })

    const first = await login('admin1', STRONG_PASSWORD)
    expect(first.body).toMatchObject({ mfa_required: true, mfa_setup_required: true })
    expect(first.body.access_token).toBeUndefined()

    const { token, recovery_codes } = await loginAdminWithMfa('admin1')
    expect(token).toBeDefined()
    expect(recovery_codes).toHaveLength(10)

    // Subsequent logins stop at the code challenge.
    const second = await login('admin1', STRONG_PASSWORD)
    expect(second.body.mfa_required).toBe(true)
    expect(second.body.access_token).toBeUndefined()

    const wrong = await request(app).post('/api/auth/login/2fa')
      .set('Authorization', `Bearer ${second.body.mfa_token}`)
      .send({ code: '000000' })
    expect(wrong.status).toBe(401)
  })

  test('a recovery code works once', async () => {
    await createUser({ username: 'admin2', role: 'ADMIN' })
    const { recovery_codes } = await loginAdminWithMfa('admin2')
    const code = recovery_codes[0]

    const first = await login('admin2', STRONG_PASSWORD)
    const used = await request(app).post('/api/auth/login/2fa').set('Authorization', `Bearer ${first.body.mfa_token}`).send({ code })
    expect(used.status).toBe(200)
    expect(used.body.recovery_codes_remaining).toBe(9)

    const again = await login('admin2', STRONG_PASSWORD)
    const reused = await request(app).post('/api/auth/login/2fa').set('Authorization', `Bearer ${again.body.mfa_token}`).send({ code })
    expect(reused.status).toBe(401)
  })

  test('admins may not disable their second factor', async () => {
    await createUser({ username: 'admin3', role: 'ADMIN' })
    const { token, secret } = await loginAdminWithMfa('admin3')
    const res = await request(app).post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: STRONG_PASSWORD, code: authenticator.generate(secret) })
    expect(res.status).toBe(403)
  })

  test('an mfa token cannot be used as a session token', async () => {
    await createUser({ username: 'admin4', role: 'ADMIN' })
    const first = await login('admin4', STRONG_PASSWORD)
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${first.body.mfa_token}`)
    expect(res.status).toBe(401)
  })
})

describe('admin-driven password reset', () => {
  test('admin resets a password, the old session dies and the user must set a new one', async () => {
    await createUser({ username: 'admin5', role: 'ADMIN' })
    const user = await createUser({ username: 'imp3', role: 'IMPORTER' })
    const { token: adminToken } = await loginAdminWithMfa('admin5')

    const userToken = (await login('imp3', STRONG_PASSWORD)).body.access_token
    expect(userToken).toBeDefined()

    const reset = await request(app).post(`/api/admin/users/${user.id}/reset-password`).set('Authorization', `Bearer ${adminToken}`).expect(200)
    const temporary = reset.body.temporary_password
    expect(temporary).toHaveLength(16)

    // Old session is revoked, old password no longer works.
    expect((await request(app).get('/api/importers').set('Authorization', `Bearer ${userToken}`)).status).toBe(401)
    expect((await login('imp3', STRONG_PASSWORD)).status).toBe(401)

    const relogin = await login('imp3', temporary)
    expect(relogin.status).toBe(200)
    expect(relogin.body.must_change_password).toBe(true)

    // Nothing but the password change is reachable while the reset is pending.
    const blocked = await request(app).get('/api/importers').set('Authorization', `Bearer ${relogin.body.access_token}`)
    expect(blocked.status).toBe(403)
    expect(blocked.body.error_code).toBe('PASSWORD_CHANGE_REQUIRED')

    const changed = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${relogin.body.access_token}`)
      .send({ current_password: temporary, new_password: OTHER_PASSWORD })
      .expect(200)
    expect(changed.body.must_change_password).toBe(false)
    expect((await request(app).get('/api/importers').set('Authorization', `Bearer ${changed.body.access_token}`)).status).toBe(200)
  })

  test('non-admins cannot reset anyone password', async () => {
    const victim = await createUser({ username: 'imp4', role: 'IMPORTER' })
    await createUser({ username: 'customs2', role: 'CUSTOMS_OFFICER' })
    const customsToken = (await login('customs2', STRONG_PASSWORD)).body.access_token

    const res = await request(app).post(`/api/admin/users/${victim.id}/reset-password`).set('Authorization', `Bearer ${customsToken}`)
    expect(res.status).toBe(403)
  })

  test('there is no self-service password reset endpoint', async () => {
    for(const path of ['/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/password-reset']){
      expect((await request(app).post(path).send({ username: 'imp4' })).status).toBe(404)
    }
  })

  test('rejects a weak replacement password', async () => {
    await createUser({ username: 'imp5', role: 'IMPORTER' })
    const token = (await login('imp5', STRONG_PASSWORD)).body.access_token
    const res = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: STRONG_PASSWORD, new_password: 'short' })
    expect(res.status).toBe(400)
  })
})
