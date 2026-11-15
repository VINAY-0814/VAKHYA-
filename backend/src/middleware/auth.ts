import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { RedisStoreInterface } from "../config/redis.js";

export interface JwtPayload {
  userId: number;
  email: string;
  userType: "deaf" | "hearing";
  type: "access" | "refresh";
  jti?: string;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  token?: string;
}

export function signAccessToken(payload: Omit<JwtPayload, "type" | "exp" | "jti">): string {
  return jwt.sign({ ...payload, type: "access" }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as any,
    jwtid: crypto.randomUUID(),
  });
}

export function signRefreshToken(payload: Omit<JwtPayload, "type" | "exp" | "jti">): string {
  return jwt.sign({ ...payload, type: "refresh" }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as any,
    jwtid: crypto.randomUUID(),
  });
}

export function createAuthMiddleware(redisStore: RedisStoreInterface) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization Bearer token is required" });
    }
    const token = header.slice(7).trim();
    try {
      const blacklisted = await redisStore.isTokenBlacklisted(token);
      if (blacklisted) {
        return res.status(401).json({ error: "Token has been invalidated (logged out)" });
      }
      const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
      if (decoded.type !== "access") {
        return res.status(401).json({ error: "Invalid token type" });
      }
      req.user = decoded;
      req.token = token;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired JWT token" });
    }
  };
}
