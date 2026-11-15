"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      firstName: { type: Sequelize.STRING(255), allowNull: false },
      lastName: { type: Sequelize.STRING(255), allowNull: false, defaultValue: "" },
      phone: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      imageProfile: { type: Sequelize.STRING(512), allowNull: true },
      userType: { type: Sequelize.ENUM("deaf", "hearing"), allowNull: false, defaultValue: "deaf" },
      notificationsEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      translationEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      preferredSignLanguage: { type: Sequelize.ENUM("ASL", "ISL"), allowNull: false, defaultValue: "ASL" },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Users");
  },
};
