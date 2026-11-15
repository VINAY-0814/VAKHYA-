import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

export type CallType = "incoming" | "outgoing";
export type CallStatus = "initiated" | "ringing" | "connected" | "missed" | "rejected" | "ended";

export interface CallAttributes {
  id: number;
  ownerId: number;
  phone: string;
  type: CallType;
  status: CallStatus;
  date: Date;
  duration: number;
  contactId: number | null;
  userId: number | null;
  translationUsed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CallCreationAttributes = Optional<
  CallAttributes,
  "id" | "date" | "duration" | "contactId" | "userId" | "translationUsed"
>;

export class Call extends Model<CallAttributes, CallCreationAttributes> implements CallAttributes {
  declare id: number;
  declare ownerId: number;
  declare phone: string;
  declare type: CallType;
  declare status: CallStatus;
  declare date: Date;
  declare duration: number;
  declare contactId: number | null;
  declare userId: number | null;
  declare translationUsed: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Call.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    phone: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.ENUM("incoming", "outgoing"), allowNull: false },
    status: {
      type: DataTypes.ENUM("initiated", "ringing", "connected", "missed", "rejected", "ended"),
      allowNull: false,
      defaultValue: "initiated",
    },
    date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    duration: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    contactId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    translationUsed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: "Calls",
    timestamps: true,
  }
);
