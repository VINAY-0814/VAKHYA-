export interface UserRecord {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactRecord {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  ownerId: number;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallRecord {
  id: number;
  ownerId: number;
  phone: string;
  type: "incoming" | "outgoing";
  status: "initiated" | "ringing" | "connected" | "missed" | "rejected" | "ended";
  date: Date;
  duration: number;
  contactId: number | null;
  userId: number | null;
  translationUsed: boolean;
  contactName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenRecord {
  id: number;
  ownerId: number;
  deviceId: string;
  fcmToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataStore {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByPhone(phone: string): Promise<UserRecord | null>;
  findUserById(id: number): Promise<UserRecord | null>;
  createUser(data: Omit<UserRecord, "id" | "createdAt" | "updatedAt">): Promise<UserRecord>;
  updateUser(id: number, patch: Partial<UserRecord>): Promise<UserRecord | null>;
  deleteUser(id: number): Promise<boolean>;

  listContacts(ownerId: number, search?: string): Promise<ContactRecord[]>;
  findContactById(id: number, ownerId: number): Promise<ContactRecord | null>;
  createContact(data: Omit<ContactRecord, "id" | "createdAt" | "updatedAt">): Promise<ContactRecord>;
  updateContact(id: number, ownerId: number, patch: Partial<ContactRecord>): Promise<ContactRecord | null>;
  deleteContact(id: number, ownerId: number): Promise<boolean>;

  listCalls(
    ownerId: number,
    filter?: { type?: "all" | "incoming" | "outgoing" | "missed"; search?: string }
  ): Promise<CallRecord[]>;
  findCallById(id: number): Promise<CallRecord | null>;
  createCall(data: Omit<CallRecord, "id" | "createdAt" | "updatedAt">): Promise<CallRecord>;
  updateCall(id: number, patch: Partial<CallRecord>): Promise<CallRecord | null>;
  deleteCall(id: number, ownerId: number): Promise<boolean>;
  deleteCalls(ownerId: number, ids?: number[]): Promise<number>;

  upsertToken(ownerId: number, deviceId: string, fcmToken: string): Promise<TokenRecord>;
  listTokensByUser(ownerId: number): Promise<TokenRecord[]>;
  deleteToken(ownerId: number, deviceId: string): Promise<boolean>;
}
