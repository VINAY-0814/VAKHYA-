"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Calls", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      ownerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      phone: { type: Sequelize.STRING(255), allowNull: false },
      type: { type: Sequelize.ENUM("incoming", "outgoing"), allowNull: false },
      status: {
        type: Sequelize.ENUM("initiated", "ringing", "connected", "missed", "rejected", "ended"),
        allowNull: false,
        defaultValue: "initiated",
      },
      date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      duration: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      contactId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onDelete: "SET NULL",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "SET NULL",
      },
      translationUsed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Calls");
  },
};
