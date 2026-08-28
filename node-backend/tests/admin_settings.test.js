process.env.LOGIN_RATE_LIMIT_MAX = '1000'
process.env.SENSITIVE_RATE_LIMIT_MAX = '1000'

const request = require('supertest')
const { authenticator } = require('otplib')
const app = require('../src/index')
const { sequelize, User, Setting } = require('../src/models')
const { hashPassword } = require('../src/services/password')
const { ROLES } = require('../src/rbac')

const PASSWORD = 'Str0ng!Passphrase42'

async function createUser(username, role){
  return User.create({ username, role, password_hash: await hashPassword(PASSWORD) })
}

async function sessionFor(username){
  const first = await request(app).post('/api/auth/login').send({ username, password: PASSWORD })
  if(!first.body.mfa_required) return first.body.access_token
  const setup = await request(app).post('/api/auth/2fa/setup').set('Authorization', `Bearer ${first.body.mfa_token}`)
  const enable = await request(app).post('/api/auth/2fa/enable')
    .set('Authorization', `Bearer ${first.body.mfa_token}`)
    .send({ code: authenticator.generate(setup.body.secret) })
  return enable.body.access_token
}

beforeAll(async () => { await sequelize.sync({ force: true }) })
afterAll(async () => { await sequelize.close() })
beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true })
  await Setting.destroy({ where: {}, truncate: true })
})

describe('admin settings', () => {
  test('returns defaults with their definitions and persists updates', async () => {
    await createUser('settings-admin', ROLES.ADMIN)
    const token = await sessionFor('settings-admin')

    const initial = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`).expect(200)
    expect(initial.body.settings.max_failed_logins).toBe(5)
    expect(initial.body.definitions.map(d => d.key)).toEqual(expect.arrayContaining(['site_name', 'maintenance_mode']))

    await request(app).put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ settings: { site_name: 'Freetown Port', maintenance_mode: true, max_failed_logins: 3 } })
      .expect(200)

    const reloaded = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`).expect(200)
    expect(reloaded.body.settings.site_name).toBe('Freetown Port')
    expect(reloaded.body.settings.maintenance_mode).toBe(true)
    expect(reloaded.body.settings.max_failed_logins).toBe(3)
  })

  test('rejects unknown keys and out-of-range values without persisting anything', async () => {
    await createUser('settings-admin2', ROLES.ADMIN)
    const token = await sessionFor('settings-admin2')

    const bad = await request(app).put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ settings: { site_name: 'Kept out', nope: 1, lockout_minutes: 99999 } })
      .expect(400)
    expect(bad.body.errors.map(e => e.field)).toEqual(expect.arrayContaining(['nope', 'lockout_minutes']))

    const after = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
    expect(after.body.settings.site_name).toBe('Port Vehicle System')
  })

  test('non-admins cannot read or write settings', async () => {
    await createUser('settings-importer', ROLES.IMPORTER)
    const token = await sessionFor('settings-importer')

    expect((await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)).status).toBe(403)
    expect((await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send({ settings: { site_name: 'x' } })).status).toBe(403)
    expect((await request(app).get('/api/admin/settings')).status).toBe(401)
  })
})
