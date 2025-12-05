const { Sequelize } = require('sequelize')
const cfg = require('./config')

// Use in-memory sqlite for tests to keep test runs isolated and fast.
const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined

let sequelize
if (isTest) {
  sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
} else {
  sequelize = new Sequelize(cfg.db.database, cfg.db.user, cfg.db.password, {
    host: cfg.db.host,
    dialect: cfg.db.dialect,
    logging: false,
    define: { timestamps: false }
  })
}

module.exports = sequelize
