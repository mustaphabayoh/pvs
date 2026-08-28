'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('setting', {
      key: { type: Sequelize.STRING, primaryKey: true },
      value: { type: Sequelize.TEXT },
      updated_by: { type: Sequelize.STRING },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('setting')
  }
}
