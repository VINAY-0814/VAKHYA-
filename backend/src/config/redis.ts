import crypto from "crypto";
import { env } from "./env.js";

export interface RedisStoreInterface {
  blacklistToken(token: string, ttlSeconds: number): Promise<void>;
  isTokenBlacklisted(token: string): Promise<boolean>;
  setOtp(email: string, otp: string, ttlSeconds: number): Promise<void>;
  getOtp(email: string): Promise<{ otp: string; attempts: number } | null>;
  incrementOtpAttempt(email: string): Promise<number>;
  deleteOtp(email: string): Promise<void>;
  disconnect(): Promise<void>;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * In-memory fallback store matching Redis TTL semantics for isolated unit tests.
 */
export class InMemoryTokenAndOtpStore implements RedisStoreInterface {
  private blacklist = new Map<string, number>();
  private otps = new Map<string, { otp: string; attempts: number; expiresAt: number }>();

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    const ttl = Math.max(1, ttlSeconds);
    this.blacklist.set(hashToken(token), Date.now() + ttl * 1000);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = hashToken(token);
    const exp = this.blacklist.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.blacklist.delete(key);
      return false;
    }
    return true;
  }

  async setOtp(email: string, otp: string, ttlSeconds: number): Promise<void> {
    this.otps.set(email.toLowerCase(), {
      otp,
      attempts: 0,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async getOtp(email: string): Promise<{ otp: string; attempts: number } | null> {
    const key = email.toLowerCase();
    const entry = this.otps.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.otps.delete(key);
      return null;
    }
    return { otp: entry.otp, attempts: entry.attempts };
  }

  async incrementOtpAttempt(email: string): Promise<number> {
    const key = email.toLowerCase();
    const entry = this.otps.get(key);
    if (!entry) return 0;
    entry.attempts += 1;
    return entry.attempts;
  }

  async deleteOtp(email: string): Promise<void> {
    this.otps.delete(email.toLowerCase());
  }

  async disconnect(): Promise<void> {
    this.blacklist.clear();
    this.otps.clear();
  }
}

export class RedisClientStore implements RedisStoreInterface {
  private client: any = null;
  private fallback = new InMemoryTokenAndOtpStore();

  async connect(): Promise<void> {
    if (this.client) return;
    try {
      const redisPkg = "redis";
      const { createClient } = await import(/* @vite-ignore */ redisPkg);
      const client = createClient({ url: env.redisUrl });
      client.on("error", (err: Error) => {
        console.warn("[VAKHYA Redis] Client warning:", err.message);
      });
      await client.connect();
      this.client = client;
      console.log("[VAKHYA Redis] Connected for JWT blacklisting and OTP TTL cache.");
    } catch (err: any) {
      console.warn(
        `[VAKHYA Redis] Unavailable (${err?.message || "no connection"}), using in-memory TTL store.`
      );
      this.client = null;
    }
  }

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    const ttl = Math.max(1, Math.ceil(ttlSeconds));
    const key = `blacklist:${hashToken(token)}`;
    if (this.client) {
      await this.client.set(key, "1", { EX: ttl });
      return;
    }
    await this.fallback.blacklistToken(token, ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${hashToken(token)}`;
    if (this.client) {
      const val = await this.client.get(key);
      return val !== null;
    }
    return this.fallback.isTokenBlacklisted(token);
  }

  async setOtp(email: string, otp: string, ttlSeconds: number): Promise<void> {
    const key = `otp:${email.toLowerCase()}`;
    if (this.client) {
      await this.client.set(key, JSON.stringify({ otp, attempts: 0 }), { EX: ttlSeconds });
      return;
    }
    await this.fallback.setOtp(email, otp, ttlSeconds);
  }

  async getOtp(email: string): Promise<{ otp: string; attempts: number } | null> {
    const key = `otp:${email.toLowerCase()}`;
    if (this.client) {
      const raw = await this.client.get(key);
      return raw ? JSON.parse(raw) : null;
    }
    return this.fallback.getOtp(email);
  }

  async incrementOtpAttempt(email: string): Promise<number> {
    const key = `otp:${email.toLowerCase()}`;
    if (this.client) {
      const raw = await this.client.get(key);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      parsed.attempts = (parsed.attempts || 0) + 1;
      const ttl = await this.client.ttl(key);
      await this.client.set(key, JSON.stringify(parsed), { EX: Math.max(1, ttl) });
      return parsed.attempts;
    }
    return this.fallback.incrementOtpAttempt(email);
  }

  async deleteOtp(email: string): Promise<void> {
    const key = `otp:${email.toLowerCase()}`;
    if (this.client) {
      await this.client.del(key);
      return;
    }
    await this.fallback.deleteOtp(email);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    await this.fallback.disconnect();
  }
}

export const redisStore = new RedisClientStore();
