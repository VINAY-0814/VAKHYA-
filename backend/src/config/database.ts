import { Sequelize } from "sequelize";
import { env } from "./env.js";

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  logging: env.nodeEnv === "development" ? false : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
}
