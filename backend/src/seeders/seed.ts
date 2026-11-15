import bcrypt from "bcryptjs";
import { sequelize } from "../config/database.js";
import { User, Contact, Call } from "../models/index.js";

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync();

  const passwordHash = await bcrypt.hash("Vakhya@123", 10);

  const [deafUser] = await User.findOrCreate({
    where: { email: "aarav@vakhya.app" },
    defaults: {
      email: "aarav@vakhya.app",
      password: passwordHash,
      firstName: "Aarav",
      lastName: "Patel",
      phone: "+919988776655",
      userType: "deaf",
      notificationsEnabled: true,
      translationEnabled: true,
      preferredSignLanguage: "ASL",
    },
  });

  const [hearingUser] = await User.findOrCreate({
    where: { email: "maya@vakhya.app" },
    defaults: {
      email: "maya@vakhya.app",
      password: passwordHash,
      firstName: "Maya",
      lastName: "Sharma",
      phone: "+919876501234",
      userType: "hearing",
      notificationsEnabled: true,
      translationEnabled: true,
      preferredSignLanguage: "ASL",
    },
  });

  const [contact] = await Contact.findOrCreate({
    where: { ownerId: deafUser.id, phone: hearingUser.phone },
    defaults: {
      ownerId: deafUser.id,
      userId: hearingUser.id,
      firstName: "Maya",
      lastName: "Sharma",
      phone: hearingUser.phone,
    },
  });

  await Call.findOrCreate({
    where: { ownerId: deafUser.id, phone: hearingUser.phone, type: "outgoing" },
    defaults: {
      ownerId: deafUser.id,
      userId: hearingUser.id,
      contactId: contact.id,
      phone: hearingUser.phone,
      type: "outgoing",
      status: "ended",
      duration: 185,
      translationUsed: true,
      date: new Date(),
    },
  });

  console.log("[VAKHYA Seed] Demo Deaf & Hearing accounts seeded.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[VAKHYA Seed] Failed:", err);
  process.exit(1);
});
