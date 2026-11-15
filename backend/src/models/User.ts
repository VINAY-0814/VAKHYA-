import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

export interface UserAttributes {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  imageProfile: string | null;
  userType: "deaf" | "hearing";
  notificationsEnabled: boolean;
  translationEnabled: boolean;
  preferredSignLanguage: "ASL" | "ISL";
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "imageProfile" | "userType" | "notificationsEnabled" | "translationEnabled" | "preferredSignLanguage"
>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare email: string;
  declare password: string;
  declare firstName: string;
  declare lastName: string;
  declare phone: string;
  declare imageProfile: string | null;
  declare userType: "deaf" | "hearing";
  declare notificationsEnabled: boolean;
  declare translationEnabled: boolean;
  declare preferredSignLanguage: "ASL" | "ISL";
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public toSafeJSON() {
    const { password: _pw, ...safe } = this.get({ plain: true });
    return safe;
  }
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    firstName: { type: DataTypes.STRING(255), allowNull: false },
    lastName: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
    phone: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    imageProfile: { type: DataTypes.STRING(512), allowNull: true },
    userType: {
      type: DataTypes.ENUM("deaf", "hearing"),
      allowNull: false,
      defaultValue: "deaf",
    },
    notificationsEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    translationEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    preferredSignLanguage: {
      type: DataTypes.ENUM("ASL", "ISL"),
      allowNull: false,
      defaultValue: "ASL",
    },
  },
  {
    sequelize,
    tableName: "Users",
    timestamps: true,
  }
);
