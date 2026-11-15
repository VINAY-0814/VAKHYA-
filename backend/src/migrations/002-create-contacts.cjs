"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Contacts", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      firstName: { type: Sequelize.STRING(255), allowNull: false },
      lastName: { type: Sequelize.STRING(255), allowNull: false, defaultValue: "" },
      phone: { type: Sequelize.STRING(255), allowNull: false },
      ownerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "SET NULL",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Contacts");
  },
};
