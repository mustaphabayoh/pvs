process.env.LOGIN_RATE_LIMIT_MAX = '1000'
process.env.SENSITIVE_RATE_LIMIT_MAX = '1000'

const request = require('supertest')
const { authenticator } = require('otplib')
const app = require('../src/index')
const { sequelize, User } = require('../src/models')
const { hashPassword } = require('../src/services/password')
const { ROLES, PERMISSIONS, roleHasPermission, permissionsFor } = require('../src/rbac')

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
beforeEach(async () => { await User.destroy({ where: {}, truncate: true }) })

describe('permission model', () => {
  test('admins hold every permission and importers hold none of the privileged ones', () => {
    expect(permissionsFor(ROLES.ADMIN)).toEqual(expect.arrayContaining(Object.values(PERMISSIONS)))
    expect(roleHasPermission(ROLES.IMPORTER, PERMISSIONS.USER_MANAGE)).toBe(false)
    expect(roleHasPermission(ROLES.CUSTOMS_OFFICER, PERMISSIONS.VERIFICATION_CREATE)).toBe(false)
    expect(roleHasPermission(ROLES.QUAY_OPERATOR, PERMISSIONS.BOOKING_CANCEL)).toBe(false)
  })
})

describe('route authorization', () => {
  test('endpoints are gated by permission, not by guesswork', async () => {
    await createUser('rbac-admin', ROLES.ADMIN)
    await createUser('rbac-importer', ROLES.IMPORTER)
    await createUser('rbac-customs', ROLES.CUSTOMS_OFFICER)

    const importerToken = await sessionFor('rbac-importer')
    const customsToken = await sessionFor('rbac-customs')
    const adminToken = await sessionFor('rbac-admin')

    expect((await request(app).get('/api/admin/users').set('Authorization', `Bearer ${importerToken}`)).status).toBe(403)
    expect((await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`)).status).toBe(200)
    expect((await request(app).get('/api/verifications/pending').set('Authorization', `Bearer ${importerToken}`)).status).toBe(403)
    expect((await request(app).get('/api/verifications/pending').set('Authorization', `Bearer ${customsToken}`)).status).toBe(200)
    expect((await request(app).get('/api/admin/users')).status).toBe(401)
  })

  test('a role change revokes tokens issued under the previous role', async () => {
    await createUser('rbac-admin2', ROLES.ADMIN)
    const target = await createUser('rbac-quay', ROLES.QUAY_OPERATOR)
    const adminToken = await sessionFor('rbac-admin2')
    const targetToken = await sessionFor('rbac-quay')

    await request(app).put(`/api/admin/users/${target.id}`).set('Authorization', `Bearer ${adminToken}`).send({ role: ROLES.IMPORTER }).expect(200)
    expect((await request(app).get('/api/importers').set('Authorization', `Bearer ${targetToken}`)).status).toBe(401)
  })

  test('unknown roles are rejected', async () => {
    await createUser('rbac-admin3', ROLES.ADMIN)
    const target = await createUser('rbac-imp2', ROLES.IMPORTER)
    const adminToken = await sessionFor('rbac-admin3')
    const res = await request(app).put(`/api/admin/users/${target.id}`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'SUPERUSER' })
    expect(res.status).toBe(400)
  })

  test('the last admin cannot be demoted, deleted, or self-modified', async () => {
    const admin = await createUser('rbac-admin4', ROLES.ADMIN)
    const adminToken = await sessionFor('rbac-admin4')

    expect((await request(app).put(`/api/admin/users/${admin.id}`).set('Authorization', `Bearer ${adminToken}`).send({ role: ROLES.IMPORTER })).status).toBe(403)
    expect((await request(app).delete(`/api/admin/users/${admin.id}`).set('Authorization', `Bearer ${adminToken}`)).status).toBe(403)

    const second = await createUser('rbac-admin5', ROLES.ADMIN)
    expect((await request(app).delete(`/api/admin/users/${second.id}`).set('Authorization', `Bearer ${adminToken}`)).status).toBe(200)
  })

  test('admins create privileged accounts with a forced password change', async () => {
    await createUser('rbac-admin6', ROLES.ADMIN)
    const adminToken = await sessionFor('rbac-admin6')

    const created = await request(app).post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'newofficer', role: 'customs_officer' })
      .expect(201)
    expect(created.body.role).toBe(ROLES.CUSTOMS_OFFICER)
    expect(created.body.must_change_password).toBe(true)

    const login = await request(app).post('/api/auth/login').send({ username: 'newofficer', password: created.body.temporary_password }).expect(200)
    expect(login.body.must_change_password).toBe(true)
  })

  test('admins can clear a lost authenticator', async () => {
    await createUser('rbac-admin7', ROLES.ADMIN)
    const victim = await createUser('rbac-admin8', ROLES.ADMIN)
    const adminToken = await sessionFor('rbac-admin7')
    await sessionFor('rbac-admin8')

    const res = await request(app).post(`/api/admin/users/${victim.id}/2fa/reset`).set('Authorization', `Bearer ${adminToken}`).expect(200)
    expect(res.body.totp_enabled).toBe(false)

    const login = await request(app).post('/api/auth/login').send({ username: 'rbac-admin8', password: PASSWORD })
    expect(login.body.mfa_setup_required).toBe(true)
  })
})
