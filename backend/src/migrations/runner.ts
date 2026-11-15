import { sequelize } from "../config/database.js";
import "../models/index.js";

async function runMigrations() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    console.log("[VAKHYA DB] PostgreSQL schema synchronized (Users, Contacts, Calls, Tokens).");
    process.exit(0);
  } catch (err) {
    console.error("[VAKHYA DB] Migration failed:", err);
    process.exit(1);
  }
}

runMigrations();
