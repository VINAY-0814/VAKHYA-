import { Op } from "sequelize";
import { User, Contact, Call, Token } from "../models/index.js";
import {
  CallRecord,
  ContactRecord,
  DataStore,
  TokenRecord,
  UserRecord,
} from "./types.js";

export class SequelizeDataStore implements DataStore {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const row = await User.findOne({ where: { email: email.toLowerCase() } });
    return row ? (row.get({ plain: true }) as UserRecord) : null;
  }

  async findUserByPhone(phone: string): Promise<UserRecord | null> {
    const row = await User.findOne({ where: { phone } });
    return row ? (row.get({ plain: true }) as UserRecord) : null;
  }

  async findUserById(id: number): Promise<UserRecord | null> {
    const row = await User.findByPk(id);
    return row ? (row.get({ plain: true }) as UserRecord) : null;
  }

  async createUser(data: Omit<UserRecord, "id" | "createdAt" | "updatedAt">): Promise<UserRecord> {
    const row = await User.create({ ...data, email: data.email.toLowerCase() });
    return row.get({ plain: true }) as UserRecord;
  }

  async updateUser(id: number, patch: Partial<UserRecord>): Promise<UserRecord | null> {
    const row = await User.findByPk(id);
    if (!row) return null;
    await row.update(patch);
    return row.get({ plain: true }) as UserRecord;
  }

  async deleteUser(id: number): Promise<boolean> {
    const deleted = await User.destroy({ where: { id } });
    return deleted > 0;
  }

  async listContacts(ownerId: number, search?: string): Promise<ContactRecord[]> {
    const where: any = { ownerId };
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { firstName: { [Op.iLike]: q } },
        { lastName: { [Op.iLike]: q } },
        { phone: { [Op.iLike]: q } },
      ];
    }
    const rows = await Contact.findAll({ where, order: [["firstName", "ASC"]] });
    return rows.map((r) => r.get({ plain: true }) as ContactRecord);
  }

  async findContactById(id: number, ownerId: number): Promise<ContactRecord | null> {
    const row = await Contact.findOne({ where: { id, ownerId } });
    return row ? (row.get({ plain: true }) as ContactRecord) : null;
  }

  async createContact(data: Omit<ContactRecord, "id" | "createdAt" | "updatedAt">): Promise<ContactRecord> {
    const linked = await User.findOne({ where: { phone: data.phone } });
    const row = await Contact.create({ ...data, userId: data.userId ?? linked?.id ?? null });
    return row.get({ plain: true }) as ContactRecord;
  }

  async updateContact(
    id: number,
    ownerId: number,
    patch: Partial<ContactRecord>
  ): Promise<ContactRecord | null> {
    const row = await Contact.findOne({ where: { id, ownerId } });
    if (!row) return null;
    await row.update(patch);
    return row.get({ plain: true }) as ContactRecord;
  }

  async deleteContact(id: number, ownerId: number): Promise<boolean> {
    const deleted = await Contact.destroy({ where: { id, ownerId } });
    return deleted > 0;
  }

  async listCalls(
    ownerId: number,
    filter?: { type?: "all" | "incoming" | "outgoing" | "missed"; search?: string }
  ): Promise<CallRecord[]> {
    const where: any = { ownerId };
    if (filter?.type === "incoming") where.type = "incoming";
    else if (filter?.type === "outgoing") where.type = "outgoing";
    else if (filter?.type === "missed") where.status = "missed";

    const rows = await Call.findAll({
      where,
      include: [{ model: Contact, as: "contact", required: false }],
      order: [["date", "DESC"]],
    });

    let records = rows.map((r: any) => {
      const plain = r.get({ plain: true });
      const contactName = plain.contact
        ? `${plain.contact.firstName} ${plain.contact.lastName}`.trim()
        : undefined;
      return { ...plain, contactName } as CallRecord;
    });

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      records = records.filter(
        (c) =>
          c.phone.toLowerCase().includes(q) ||
          (c.contactName || "").toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q)
      );
    }
    return records;
  }

  async findCallById(id: number): Promise<CallRecord | null> {
    const row = await Call.findByPk(id);
    return row ? (row.get({ plain: true }) as CallRecord) : null;
  }

  async createCall(data: Omit<CallRecord, "id" | "createdAt" | "updatedAt">): Promise<CallRecord> {
    const row = await Call.create(data);
    return row.get({ plain: true }) as CallRecord;
  }

  async updateCall(id: number, patch: Partial<CallRecord>): Promise<CallRecord | null> {
    const row = await Call.findByPk(id);
    if (!row) return null;
    await row.update(patch);
    return row.get({ plain: true }) as CallRecord;
  }

  async deleteCall(id: number, ownerId: number): Promise<boolean> {
    const deleted = await Call.destroy({ where: { id, ownerId } });
    return deleted > 0;
  }

  async deleteCalls(ownerId: number, ids?: number[]): Promise<number> {
    const where: any = { ownerId };
    if (ids && ids.length > 0) where.id = { [Op.in]: ids };
    return Call.destroy({ where });
  }

  async upsertToken(ownerId: number, deviceId: string, fcmToken: string): Promise<TokenRecord> {
    const existing = await Token.findOne({ where: { ownerId, deviceId } });
    if (existing) {
      await existing.update({ fcmToken });
      return existing.get({ plain: true }) as TokenRecord;
    }
    const created = await Token.create({ ownerId, deviceId, fcmToken });
    return created.get({ plain: true }) as TokenRecord;
  }

  async listTokensByUser(ownerId: number): Promise<TokenRecord[]> {
    const rows = await Token.findAll({ where: { ownerId } });
    return rows.map((r) => r.get({ plain: true }) as TokenRecord);
  }

  async deleteToken(ownerId: number, deviceId: string): Promise<boolean> {
    const deleted = await Token.destroy({ where: { ownerId, deviceId } });
    return deleted > 0;
  }
}
