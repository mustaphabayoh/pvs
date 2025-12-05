const request = require('supertest')
const app = require('../src/index')
const { sequelize, User, Importer } = require('../src/models')

beforeAll(async () => {
  await sequelize.sync({ force: true })
})

afterAll(async () => {
  await sequelize.close()
})

test('end-to-end workflow: create users, importer, verification, verify, booking', async () => {
  // admin, customs, importer
  await request(app).post('/api/auth/register').send({ username: 'admin', password: 'pass', role: 'ADMIN' }).expect(201)
  await request(app).post('/api/auth/register').send({ username: 'customs', password: 'pass', role: 'CUSTOMS_OFFICER' }).expect(201)
  await request(app).post('/api/auth/register').send({ username: 'imp1', password: 'pass', role: 'IMPORTER' }).expect(201)

  // login importer
  const loginRes = await request(app).post('/api/auth/login').send({ username: 'imp1', password: 'pass' }).expect(200)
  const tokenImp = loginRes.body.access_token

  // create importer record
  const impRes = await request(app).post('/api/importers').set('Authorization', `Bearer ${tokenImp}`).send({ name: 'ImportCo', customs_registration_number: 'CRN123', contact_email: 'foo@example.com' }).expect(201)
  const importer = impRes.body

  // submit verification
  const vpayload = { bank_name: 'BankA', amount: 100.0, currency_code: 'USD', reference_number: 'REF123', customs_registration_number: 'CRN123', importer_id: importer.id }
  await request(app).post('/api/verifications').set('Authorization', `Bearer ${tokenImp}`).send(vpayload).expect(201)

  // login customs
  const loginC = await request(app).post('/api/auth/login').send({ username: 'customs', password: 'pass' }).expect(200)
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

