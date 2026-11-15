"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Tokens", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      ownerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      deviceId: { type: Sequelize.STRING(255), allowNull: false },
      fcmToken: { type: Sequelize.STRING(512), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("Tokens", ["ownerId", "deviceId"], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Tokens");
  },
};
