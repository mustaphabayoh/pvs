const request = require('supertest')
const app = require('../src/index')
const { sequelize, Payment, Booking, Importer, WishList, Container, User } = require('../src/models')
const { signAccessToken } = require('../src/services/tokens')
const { hashPassword } = require('../src/services/password')

let testImporter = null
let authToken = null

beforeAll(async () => {
  // Ensure DB is ready (migrations should have been applied in CI/dev)
  await sequelize.sync({ force: true })
  testImporter = await Importer.create({ ImporterName: 'Test Importer', customs_registration_number: 'TEST-CRN-1' })
  const user = await User.create({ username: 'importer-test', role: 'IMPORTER', password_hash: await hashPassword('Str0ng!Passphrase42') })
  authToken = signAccessToken(user)
})

afterAll(async () => {
  if (testImporter) await testImporter.destroy()
  await sequelize.close()
})

describe('Booking suggestions and one-per-payment workflow', () => {
  test('approved payment does NOT appear as a suggested booking in GET /api/bookings', async () => {
    // create a payment
    const payment = await Payment.create({ ImporterID: testImporter.ImporterID, BankName: 'Test', Amount: 100, CurrencyCode: 'USD', PaymentMethod: 'BANK', ReferenceNumber: 'NOSUG-1', Status: 'APPROVED' })

    const res = await request(app).get('/api/bookings').set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(200)
    // No suggested items should be present for payments
    const suggested = res.body.find(b => b.suggested === true || b.source_payment_id === payment.PaymentID)
    expect(suggested).toBeFalsy()

    // cleanup
    await payment.destroy()
  })

  test('creating booking for a payment succeeds once and second attempt fails', async () => {
    const payment = await Payment.create({ ImporterID: testImporter.ImporterID, BankName: 'Test2', Amount: 200, CurrencyCode: 'USD', PaymentMethod: 'BANK', ReferenceNumber: 'SUG-2', Status: 'APPROVED' })

    // create booking referencing payment
    const payload = { importer_id: testImporter.ImporterID, verification_id: `payment-${payment.PaymentID}`, containers: ['C001'] }
    const r1 = await request(app).post('/api/bookings').set('Authorization', `Bearer ${authToken}`).send(payload)
    expect(r1.status).toBe(201)
    expect(r1.body.verification_id).toBe(`payment-${payment.PaymentID}`)

    // check wishlist item created and ready for scanning
    const booking = await Booking.findOne({ where: { verification_id: `payment-${payment.PaymentID}` } })
    const containers = await Container.findAll({ where: { BookingID: booking.BookingID } })
    expect(containers.length).toBeGreaterThan(0)
    const wishlistItems = await WishList.findAll({ where: { BookingID: booking.BookingID } })
    expect(wishlistItems.length).toBe(containers.length)
    for (const w of wishlistItems){
      expect(w.Status).toBe('READY_FOR_SCANNING')
    }

    // second attempt should fail with 409
    const r2 = await request(app).post('/api/bookings').set('Authorization', `Bearer ${authToken}`).send(payload)
    expect(r2.status).toBe(409)

    // cleanup: remove booking, wishlist items and payment
    await WishList.destroy({ where: { BookingID: booking.BookingID } })
    await Container.destroy({ where: { BookingID: booking.BookingID } })
    await Booking.destroy({ where: { BookingID: booking.BookingID } })
    await payment.destroy()
  })
})