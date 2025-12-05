#!/usr/bin/env node
const mysql = require('mysql2/promise')
const { execSync } = require('child_process')

const host = process.env.DATABASE_HOST || 'db'
const user = process.env.DATABASE_USER || 'veruser'
const password = process.env.DATABASE_PASSWORD || 'verpass'
const database = process.env.DATABASE_NAME || 'verification'
const timeout = Number(process.env.DB_WAIT_TIMEOUT || 60) // seconds

async function waitForDb(){
  const deadline = Date.now() + (timeout * 1000)
  while (Date.now() < deadline) {
    try {
      const conn = await mysql.createConnection({ host, user, password, database })
      await conn.end()
      console.log('MySQL is reachable at', host)

      // run migrations automatically (idempotent)
      try {
        console.log('Running migrations...')
        execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' })
      } catch (mErr) {
        console.warn('Migrations failed (non-fatal) — you can run them manually:', mErr.message)
      }

      return true
    } catch (err) {
      const secsLeft = Math.max(0, Math.round((deadline - Date.now()) / 1000))
      console.log(`Waiting for MySQL at ${host} (${secsLeft}s left) — ${err.code || err.message}`)
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  return false
}

waitForDb().then(ok => {
  if (!ok) {
    console.error('Timed out waiting for DB')
    process.exit(1)
  }
  process.exit(0)
})
