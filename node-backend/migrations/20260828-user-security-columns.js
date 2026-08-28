'use strict';

const COLUMNS = (Sequelize) => ({
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
})

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = COLUMNS(Sequelize)
    for (const [name, definition] of Object.entries(columns)) {
      await queryInterface.addColumn('user', name, definition)
    }
  },

  async down(queryInterface, Sequelize) {
    for (const name of Object.keys(COLUMNS(Sequelize))) {
      await queryInterface.removeColumn('user', name)
    }
  }
}
