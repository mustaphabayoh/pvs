const pino = require('pino')
const pinoHttp = require('pino-http')
const Sentry = require('@sentry/node')
const cfg = require('./config')

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

function initSentry(){
  if(process.env.SENTRY_DSN){
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development' })
    logger.info('Sentry initialized')
  }
}

module.exports = {
  logger,
  httpLogger: pinoHttp({ logger }),
  initSentry,
  Sentry
}
