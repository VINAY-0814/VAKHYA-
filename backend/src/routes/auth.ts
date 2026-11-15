import { Router, Response } from "express";
import { body } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { RedisStoreInterface } from "../config/redis.js";
import {
  AuthenticatedRequest,
  createAuthMiddleware,
  JwtPayload,
  signAccessToken,
  signRefreshToken,
} from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { DataStore } from "../repositories/types.js";
import { mailService } from "../services/mailService.js";

function sanitizeUser(user: any) {
  const { password: _pw, ...safe } = user;
  return safe;
}

export function createAuthRouter(store: DataStore, redisStore: RedisStoreInterface) {
  const router = Router();
  const requireAuth = createAuthMiddleware(redisStore);

  router.post(
    "/register",
    [
      body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
      body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
      body("firstName").trim().notEmpty().withMessage("First name is required"),
      body("lastName").optional().trim(),
      body("phone").trim().isLength({ min: 7, max: 20 }).withMessage("Valid phone number is required"),
      body("userType").optional().isIn(["deaf", "hearing"]).withMessage("userType must be deaf or hearing"),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { email, password, firstName, lastName = "", phone, userType = "deaf" } = req.body;
      const existingEmail = await store.findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: "Email is already registered" });
      }
      const existingPhone = await store.findUserByPhone(phone);
      if (existingPhone) {
        return res.status(409).json({ error: "Phone number is already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await store.createUser({
        email,
        password: passwordHash,
        firstName,
        lastName,
        phone,
        imageProfile: null,
        userType,
        notificationsEnabled: true,
        translationEnabled: true,
        preferredSignLanguage: "ASL",
      });

      const tokenPayload = { userId: user.id, email: user.email, userType: user.userType };
      return res.status(201).json({
        user: sanitizeUser(user),
        accessToken: signAccessToken(tokenPayload),
        refreshToken: signRefreshToken(tokenPayload),
      });
    }
  );

  router.post(
    "/login",
    [
      body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
      body("password").notEmpty().withMessage("Password is required"),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { email, password } = req.body;
      const user = await store.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const tokenPayload = { userId: user.id, email: user.email, userType: user.userType };
      return res.json({
        user: sanitizeUser(user),
        accessToken: signAccessToken(tokenPayload),
        refreshToken: signRefreshToken(tokenPayload),
      });
    }
  );

  router.post(
    "/refresh",
    [body("refreshToken").notEmpty().withMessage("refreshToken is required")],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { refreshToken } = req.body;
      if (await redisStore.isTokenBlacklisted(refreshToken)) {
        return res.status(401).json({ error: "Refresh token has been revoked" });
      }
      try {
        const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret) as JwtPayload;
        if (decoded.type !== "refresh") {
          return res.status(401).json({ error: "Invalid refresh token" });
        }
        const user = await store.findUserById(decoded.userId);
        if (!user) {
          return res.status(401).json({ error: "User no longer exists" });
        }
        const payload = { userId: user.id, email: user.email, userType: user.userType };
        return res.json({
          accessToken: signAccessToken(payload),
          refreshToken: signRefreshToken(payload),
        });
      } catch {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }
    }
  );

  router.post(
    "/logout",
    requireAuth,
    [body("refreshToken").optional().isString()],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const nowSec = Math.floor(Date.now() / 1000);
      if (req.token && req.user?.exp) {
        await redisStore.blacklistToken(req.token, Math.max(60, req.user.exp - nowSec));
      } else if (req.token) {
        await redisStore.blacklistToken(req.token, 3600);
      }

      const { refreshToken } = req.body || {};
      if (refreshToken) {
        await redisStore.blacklistToken(refreshToken, 7 * 24 * 3600);
      }
      return res.json({ success: true, message: "Logged out and JWT blacklisted in Redis." });
    }
  );

  router.post(
    "/forgot-password",
    [body("email").isEmail().normalizeEmail().withMessage("Valid email is required")],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { email } = req.body;
      const user = await store.findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "No account found for this email" });
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await redisStore.setOtp(email, otp, 600);
      await mailService.sendOtpEmail(email, otp);

      const response: Record<string, any> = {
        success: true,
        message: "6-digit recovery OTP sent to your email address.",
      };
      if (env.nodeEnv !== "production") {
        response.devOtp = otp;
      }
      return res.json(response);
    }
  );

  router.post(
    "/verify-otp",
    [
      body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
      body("otp").isLength({ min: 6, max: 6 }).isNumeric().withMessage("6-digit numeric OTP required"),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { email, otp } = req.body;
      const entry = await redisStore.getOtp(email);
      if (!entry) {
        return res.status(400).json({ error: "OTP expired or not requested" });
      }
      if (entry.attempts >= 5) {
        await redisStore.deleteOtp(email);
        return res.status(429).json({ error: "Too many failed attempts. Request a new OTP." });
      }
      if (entry.otp !== otp) {
        const attempts = await redisStore.incrementOtpAttempt(email);
        return res.status(400).json({ error: `Invalid OTP (${5 - attempts} attempts remaining)` });
      }
      return res.json({ success: true, verified: true });
    }
  );

  router.post(
    "/reset-password",
    [
      body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
      body("otp").isLength({ min: 6, max: 6 }).isNumeric().withMessage("6-digit numeric OTP required"),
      body("newPassword").isLength({ min: 6 }).withMessage("newPassword must be at least 6 characters"),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { email, otp, newPassword } = req.body;
      const entry = await redisStore.getOtp(email);
      if (!entry || entry.otp !== otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      const user = await store.findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "Account not found" });
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await store.updateUser(user.id, { password: passwordHash });
      await redisStore.deleteOtp(email);
      return res.json({ success: true, message: "Password updated successfully." });
    }
  );

  router.post(
    "/change-password",
    requireAuth,
    [
      body("currentPassword").notEmpty().withMessage("currentPassword is required"),
      body("newPassword").isLength({ min: 6 }).withMessage("newPassword must be at least 6 characters"),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const user = await store.findUserById(req.user!.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const match = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!match) return res.status(400).json({ error: "Current password is incorrect" });

      const passwordHash = await bcrypt.hash(req.body.newPassword, 10);
      await store.updateUser(user.id, { password: passwordHash });
      return res.json({ success: true, message: "Password changed successfully." });
    }
  );

  router.delete("/account", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await store.deleteUser(req.user!.userId);
    if (!deleted) return res.status(404).json({ error: "User not found" });
    if (req.token) {
      await redisStore.blacklistToken(req.token, 3600);
    }
    return res.json({ success: true, message: "Account deleted and session revoked." });
  });

  return router;
}
