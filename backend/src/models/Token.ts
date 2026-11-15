import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

export interface TokenAttributes {
  id: number;
  ownerId: number;
  deviceId: string;
  fcmToken: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TokenCreationAttributes = Optional<TokenAttributes, "id">;

export class Token extends Model<TokenAttributes, TokenCreationAttributes> implements TokenAttributes {
  declare id: number;
  declare ownerId: number;
  declare deviceId: string;
  declare fcmToken: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Token.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    deviceId: { type: DataTypes.STRING(255), allowNull: false },
    fcmToken: { type: DataTypes.STRING(512), allowNull: false },
  },
  {
    sequelize,
    tableName: "Tokens",
    timestamps: true,
    indexes: [{ unique: true, fields: ["ownerId", "deviceId"] }],
  }
);
