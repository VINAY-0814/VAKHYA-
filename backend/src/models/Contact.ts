import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

export interface ContactAttributes {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  ownerId: number;
  userId: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ContactCreationAttributes = Optional<ContactAttributes, "id" | "lastName" | "userId">;

export class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
  declare id: number;
  declare firstName: string;
  declare lastName: string;
  declare phone: string;
  declare ownerId: number;
  declare userId: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Contact.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    firstName: { type: DataTypes.STRING(255), allowNull: false },
    lastName: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
    phone: { type: DataTypes.STRING(255), allowNull: false },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "Contacts",
    timestamps: true,
  }
);
