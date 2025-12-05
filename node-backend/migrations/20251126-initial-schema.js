# Run in foreground so we can see issues now
sudo docker-compose -f docker-compose.dev.yml up --build'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: Sequelize.STRING, unique: true, allowNull: false },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      role: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('importer', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      customs_registration_number: { type: Sequelize.STRING, unique: true, allowNull: false },
      contact_email: { type: Sequelize.STRING }
    })

    await queryInterface.createTable('vessel', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      imo: { type: Sequelize.STRING }
    })

    await queryInterface.createTable('shipment', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      vessel_id: { type: Sequelize.INTEGER, references: { model: 'vessel', key: 'id' }, onDelete: 'SET NULL' },
      voyage_number: { type: Sequelize.STRING },
      arrival_date: { type: Sequelize.DATE }
    })

    await queryInterface.createTable('verified', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      importer_id: { type: Sequelize.INTEGER, references: { model: 'importer', key: 'id' }, onDelete: 'CASCADE' },
      bank_name: { type: Sequelize.STRING, allowNull: false },
      amount: { type: Sequelize.DECIMAL(12,2), allowNull: false },
      currency_code: { type: Sequelize.STRING, allowNull: false },
      reference_number: { type: Sequelize.STRING },
      customs_registration_number: { type: Sequelize.STRING },
      status: { type: Sequelize.STRING, defaultValue: 'PENDING' },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('booking', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      importer_id: { type: Sequelize.INTEGER, references: { model: 'importer', key: 'id' }, onDelete: 'SET NULL' },
      shipment_id: { type: Sequelize.INTEGER, references: { model: 'shipment', key: 'id' }, onDelete: 'SET NULL' },
      document_type: { type: Sequelize.STRING, allowNull: false, defaultValue: 'STANDARD' },
      verification_id: { type: Sequelize.INTEGER, references: { model: 'verified', key: 'id' }, onDelete: 'SET NULL' },
      created_by_user_id: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('container', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: { type: Sequelize.INTEGER, references: { model: 'booking', key: 'id' }, onDelete: 'CASCADE' },
      container_number: { type: Sequelize.STRING },
      size: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('container')
    await queryInterface.dropTable('booking')
    await queryInterface.dropTable('verified')
    await queryInterface.dropTable('shipment')
    await queryInterface.dropTable('vessel')
    await queryInterface.dropTable('importer')
    await queryInterface.dropTable('user')
  }
};
