const Sequelize = require('sequelize')
const sequelize = require('../db')

const User = sequelize.define('User', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: Sequelize.STRING, unique: true, allowNull: false },
  password_hash: { type: Sequelize.STRING, allowNull: false },
  role: { type: Sequelize.STRING, allowNull: false },
  token_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
  must_change_password: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  password_changed_at: { type: Sequelize.DATE },
  failed_login_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
  locked_until: { type: Sequelize.DATE },
  last_login_at: { type: Sequelize.DATE },
  totp_secret: { type: Sequelize.STRING },
  totp_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  totp_confirmed_at: { type: Sequelize.DATE },
  recovery_codes: { type: Sequelize.TEXT }
}, {
  tableName: 'user',
  defaultScope: { attributes: { exclude: ['password_hash', 'totp_secret', 'recovery_codes'] } },
  scopes: { withSecrets: { attributes: {} } }
})

const Importer = sequelize.define('Importer', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: Sequelize.STRING, allowNull: false },
  customs_registration_number: { type: Sequelize.STRING, unique: true, allowNull: false },
  contact_email: { type: Sequelize.STRING }
}, { tableName: 'importer' })

const Vessel = sequelize.define('Vessel', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: Sequelize.STRING, allowNull: false },
  imo: { type: Sequelize.STRING }
}, { tableName: 'vessel' })

const Shipment = sequelize.define('Shipment', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  vessel_id: { type: Sequelize.INTEGER },
  voyage_number: { type: Sequelize.STRING },
  arrival_date: { type: Sequelize.DATE }
}, { tableName: 'shipment' })

const Verified = sequelize.define('Verified', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  importer_id: { type: Sequelize.INTEGER },
  bank_name: { type: Sequelize.STRING, allowNull: false },
  amount: { type: Sequelize.DECIMAL(12,2), allowNull: false },
  currency_code: { type: Sequelize.STRING, allowNull: false },
  reference_number: { type: Sequelize.STRING },
  customs_registration_number: { type: Sequelize.STRING },
  status: { type: Sequelize.STRING, defaultValue: 'PENDING' },
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'verified' })

const Booking = sequelize.define('Booking', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  importer_id: { type: Sequelize.INTEGER },
  shipment_id: { type: Sequelize.INTEGER },
  document_type: { type: Sequelize.STRING, allowNull: false, defaultValue: 'STANDARD' },
  verification_id: { type: Sequelize.INTEGER },
  created_by_user_id: { type: Sequelize.INTEGER },
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'booking' })

const Container = sequelize.define('Container', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  booking_id: { type: Sequelize.INTEGER },
  container_number: { type: Sequelize.STRING },
  size: { type: Sequelize.STRING },
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'container' })

const Setting = sequelize.define('Setting', {
  key: { type: Sequelize.STRING, primaryKey: true },
  value: { type: Sequelize.TEXT },
  updated_by: { type: Sequelize.STRING },
  updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'setting', timestamps: false })

// relationships
Importer.hasMany(Booking, { foreignKey: 'importer_id' })
Booking.belongsTo(Importer, { foreignKey: 'importer_id' })

Booking.hasMany(Container, { foreignKey: 'booking_id' })
Container.belongsTo(Booking, { foreignKey: 'booking_id' })

Vessel.hasMany(Shipment, { foreignKey: 'vessel_id' })
Shipment.belongsTo(Vessel, { foreignKey: 'vessel_id' })

Importer.hasMany(Verified, { foreignKey: 'importer_id' })
Verified.belongsTo(Importer, { foreignKey: 'importer_id' })

Booking.belongsTo(Verified, { foreignKey: 'verification_id' })

module.exports = {
  sequelize,
  User,
  Importer,
  Vessel,
  Shipment,
  Verified,
  Booking,
  Container,
  Setting
}


