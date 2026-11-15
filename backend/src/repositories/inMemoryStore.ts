import {
  CallRecord,
  ContactRecord,
  DataStore,
  TokenRecord,
  UserRecord,
} from "./types.js";

export class InMemoryDataStore implements DataStore {
  private users: UserRecord[] = [];
  private contacts: ContactRecord[] = [];
  private calls: CallRecord[] = [];
  private tokens: TokenRecord[] = [];
  private seq = { user: 1, contact: 1, call: 1, token: 1 };

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async findUserByPhone(phone: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.phone === phone) || null;
  }

  async findUserById(id: number): Promise<UserRecord | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async createUser(data: Omit<UserRecord, "id" | "createdAt" | "updatedAt">): Promise<UserRecord> {
    const now = new Date();
    const record: UserRecord = {
      ...data,
      email: data.email.toLowerCase(),
      id: this.seq.user++,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(record);
    return record;
  }

  async updateUser(id: number, patch: Partial<UserRecord>): Promise<UserRecord | null> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...patch, updatedAt: new Date() };
    return this.users[idx];
  }

  async deleteUser(id: number): Promise<boolean> {
    const before = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    this.contacts = this.contacts.filter((c) => c.ownerId !== id);
    this.calls = this.calls.filter((c) => c.ownerId !== id);
    this.tokens = this.tokens.filter((t) => t.ownerId !== id);
    return this.users.length < before;
  }

  async listContacts(ownerId: number, search?: string): Promise<ContactRecord[]> {
    let list = this.contacts.filter((c) => c.ownerId === ownerId);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.firstName.localeCompare(b.firstName));
  }

  async findContactById(id: number, ownerId: number): Promise<ContactRecord | null> {
    return this.contacts.find((c) => c.id === id && c.ownerId === ownerId) || null;
  }

  async createContact(data: Omit<ContactRecord, "id" | "createdAt" | "updatedAt">): Promise<ContactRecord> {
    const linked = await this.findUserByPhone(data.phone);
    const now = new Date();
    const record: ContactRecord = {
      ...data,
      userId: data.userId ?? linked?.id ?? null,
      id: this.seq.contact++,
      createdAt: now,
      updatedAt: now,
    };
    this.contacts.push(record);
    return record;
  }

  async updateContact(
    id: number,
    ownerId: number,
    patch: Partial<ContactRecord>
  ): Promise<ContactRecord | null> {
    const idx = this.contacts.findIndex((c) => c.id === id && c.ownerId === ownerId);
    if (idx === -1) return null;
    this.contacts[idx] = { ...this.contacts[idx], ...patch, updatedAt: new Date() };
    return this.contacts[idx];
  }

  async deleteContact(id: number, ownerId: number): Promise<boolean> {
    const before = this.contacts.length;
    this.contacts = this.contacts.filter((c) => !(c.id === id && c.ownerId === ownerId));
    return this.contacts.length < before;
  }

  async listCalls(
    ownerId: number,
    filter?: { type?: "all" | "incoming" | "outgoing" | "missed"; search?: string }
  ): Promise<CallRecord[]> {
    let list = this.calls.filter((c) => c.ownerId === ownerId);
    if (filter?.type === "incoming") list = list.filter((c) => c.type === "incoming");
    else if (filter?.type === "outgoing") list = list.filter((c) => c.type === "outgoing");
    else if (filter?.type === "missed") list = list.filter((c) => c.status === "missed");

    list = list.map((call) => {
      const contact = this.contacts.find((ct) => ct.id === call.contactId || ct.phone === call.phone);
      const contactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : undefined;
      return { ...call, contactName };
    });

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.phone.toLowerCase().includes(q) ||
          (c.contactName || "").toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async findCallById(id: number): Promise<CallRecord | null> {
    return this.calls.find((c) => c.id === id) || null;
  }

  async createCall(data: Omit<CallRecord, "id" | "createdAt" | "updatedAt">): Promise<CallRecord> {
    const now = new Date();
    const record: CallRecord = {
      ...data,
      id: this.seq.call++,
      createdAt: now,
      updatedAt: now,
    };
    this.calls.push(record);
    return record;
  }

  async updateCall(id: number, patch: Partial<CallRecord>): Promise<CallRecord | null> {
    const idx = this.calls.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.calls[idx] = { ...this.calls[idx], ...patch, updatedAt: new Date() };
    return this.calls[idx];
  }

  async deleteCall(id: number, ownerId: number): Promise<boolean> {
    const before = this.calls.length;
    this.calls = this.calls.filter((c) => !(c.id === id && c.ownerId === ownerId));
    return this.calls.length < before;
  }

  async deleteCalls(ownerId: number, ids?: number[]): Promise<number> {
    const before = this.calls.length;
    this.calls = this.calls.filter((c) => {
      if (c.ownerId !== ownerId) return true;
      if (!ids || ids.length === 0) return false;
      return !ids.includes(c.id);
    });
    return before - this.calls.length;
  }

  async upsertToken(ownerId: number, deviceId: string, fcmToken: string): Promise<TokenRecord> {
    const idx = this.tokens.findIndex((t) => t.ownerId === ownerId && t.deviceId === deviceId);
    const now = new Date();
    if (idx !== -1) {
      this.tokens[idx] = { ...this.tokens[idx], fcmToken, updatedAt: now };
      return this.tokens[idx];
    }
    const record: TokenRecord = {
      id: this.seq.token++,
      ownerId,
      deviceId,
      fcmToken,
      createdAt: now,
      updatedAt: now,
    };
    this.tokens.push(record);
    return record;
  }

  async listTokensByUser(ownerId: number): Promise<TokenRecord[]> {
    return this.tokens.filter((t) => t.ownerId === ownerId);
  }

  async deleteToken(ownerId: number, deviceId: string): Promise<boolean> {
    const before = this.tokens.length;
    this.tokens = this.tokens.filter((t) => !(t.ownerId === ownerId && t.deviceId === deviceId));
    return this.tokens.length < before;
  }
}
