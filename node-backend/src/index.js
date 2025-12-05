const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const cfg = require('./config')
const sequelize = require('./db')
const { User, Importer, Verified, Booking, Container, Shipment, Vessel } = require('./models')

const authRoutes = require('./routes/auth')
const importersRoutes = require('./routes/importers')
const verificationsRoutes = require('./routes/verifications')
const bookingsRoutes = require('./routes/bookings')
const adminRoutes = require('./routes/admin')

const app = express()
const { httpLogger, initSentry, Sentry } = require('./logger')
const { prometheus, initOpentelemetry } = require('./telemetry')
app.use(httpLogger)
app.use(cors())
app.use(bodyParser.json())

app.use('/api/auth', authRoutes)
app.use('/api/importers', importersRoutes)
app.use('/api/verifications', verificationsRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/admin', adminRoutes)

app.get('/health', (req,res) => res.json({ ok: true }))

// centralized error handler
const { logger, Sentry: SentryLib } = require('./logger')
app.use((err, req, res, next) => {
  logger.error(err)
  if (process.env.SENTRY_DSN) SentryLib.captureException(err)
  res.status(500).json({ message: 'server error' })
})

// initialize OpenTelemetry asynchronously (non-blocking) if configured
initOpentelemetry().then(sdk => { if (sdk) console.log('OpenTelemetry started') }).catch(()=>{})

async function start(){
  try{
    await sequelize.authenticate()
    // ensure tables exist (sync) - fine for dev
    await sequelize.sync({ alter: true })

    // In development/test mode create a couple of demo users so the UI can authenticate
    if (process.env.NODE_ENV !== 'production') {
      try {
        const bcrypt = require('bcryptjs')
        const toCreate = [
          { username: 'admin', password: 'password', role: 'ADMIN' },
          { username: 'importer1', password: 'password', role: 'IMPORTER' },
          { username: 'customs1', password: 'password', role: 'CUSTOMS_OFFICER' }
        ]

        for (let u of toCreate) {
          const found = await User.findOne({ where: { username: u.username } })
          if (!found) {
            const hash = await bcrypt.hash(u.password, 10)
            await User.create({ username: u.username, password_hash: hash, role: u.role })
            console.log('seeded user', u.username)
          }
        }
      } catch (e) {
        console.warn('seeding users failed', e.message)
      }
    }
    initSentry()
    const port = cfg.port
    // bind explicitly on 0.0.0.0 so the server is reachable on both IPv4 and IPv6
    const server = app.listen(port, '0.0.0.0', () => console.log('Node backend listening on', port))

    // global error handlers
    process.on('unhandledRejection', (err) => {
      console.error('UnhandledRejection', err)
      if (process.env.SENTRY_DSN) Sentry.captureException(err)
    })
    process.on('uncaughtException', (err) => {
      console.error('uncaughtException', err)
      if (process.env.SENTRY_DSN) Sentry.captureException(err)
      // in production we should exit
    })
    return server
  }catch(err){ console.error('Failed to start', err); process.exit(1) }
}

// Prometheus metrics endpoint (if prom-client installed)
if (prometheus) {
  app.get('/metrics', async (req, res) => {
    try{
      res.set('Content-Type', prometheus.contentType)
      res.send(await prometheus.metrics())
    }catch(e){ res.status(500).send('error collecting metrics') }
  })
}
if(require.main === module){ start() }

module.exports = app


