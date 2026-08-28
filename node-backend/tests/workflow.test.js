process.env.LOGIN_RATE_LIMIT_MAX = '1000'
process.env.SENSITIVE_RATE_LIMIT_MAX = '1000'

const request = require('supertest')
const app = require('../src/index')
const { sequelize, User, Importer } = require('../src/models')
const { hashPassword } = require('../src/services/password')

const PASSWORD = 'Str0ng!Passphrase42'

beforeAll(async () => {
  await sequelize.sync({ force: true })
})

afterAll(async () => {
  await sequelize.close()
})

test('end-to-end workflow: create users, importer, verification, verify, booking', async () => {
  // privileged accounts are provisioned by an administrator, not by self-registration
  const password_hash = await hashPassword(PASSWORD)
  await User.create({ username: 'admin', password_hash, role: 'ADMIN' })
  await User.create({ username: 'customs', password_hash, role: 'CUSTOMS_OFFICER' })
  await request(app).post('/api/auth/register').send({ username: 'imp1', password: PASSWORD, role: 'IMPORTER' }).expect(201)

  // login importer
  const loginRes = await request(app).post('/api/auth/login').send({ username: 'imp1', password: PASSWORD }).expect(200)
  const tokenImp = loginRes.body.access_token

  // create importer record
  const impRes = await request(app).post('/api/importers').set('Authorization', `Bearer ${tokenImp}`).send({ name: 'ImportCo', customs_registration_number: 'CRN123', contact_email: 'foo@example.com' }).expect(201)
  const importer = impRes.body

  // submit verification
  const vpayload = { bank_name: 'BankA', amount: 100.0, currency_code: 'USD', reference_number: 'REF123', customs_registration_number: 'CRN123', importer_id: importer.id }
  await request(app).post('/api/verifications').set('Authorization', `Bearer ${tokenImp}`).send(vpayload).expect(201)

  // login customs
  const loginC = await request(app).post('/api/auth/login').send({ username: 'customs', password: PASSWORD }).expect(200)
  const tokenCustoms = loginC.body.access_token

  // list pending
  const pendRes = await request(app).get('/api/verifications/pending').set('Authorization', `Bearer ${tokenCustoms}`).expect(200)
  expect(pendRes.body.length).toBeGreaterThanOrEqual(1)

  // verify
  const first = pendRes.body[0]
  const updateRes = await request(app).post(`/api/verifications/${first.id}/status`).set('Authorization', `Bearer ${tokenCustoms}`).send({ status: 'VERIFIED' }).expect(200)
  expect(updateRes.body.verification.status).toBe('VERIFIED')

  // create booking (STANDARD) should succeed
  const bkRes = await request(app).post('/api/bookings').set('Authorization', `Bearer ${tokenImp}`).send({ importer_id: importer.id, document_type: 'STANDARD', containers: ['CONT1'] }).expect(201)
})

