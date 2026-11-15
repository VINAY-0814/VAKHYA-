import { Router, Response } from "express";
import { body, param } from "express-validator";
import { RedisStoreInterface } from "../config/redis.js";
import { AuthenticatedRequest, createAuthMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { DataStore } from "../repositories/types.js";

export function createTokensRouter(store: DataStore, redisStore: RedisStoreInterface) {
  const router = Router();
  const requireAuth = createAuthMiddleware(redisStore);

  router.use(requireAuth);

  router.post(
    "/",
    [
      body("deviceId").trim().notEmpty().withMessage("deviceId is required"),
      body("fcmToken").trim().notEmpty().withMessage("fcmToken is required"),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { deviceId, fcmToken } = req.body;
      const token = await store.upsertToken(req.user!.userId, deviceId, fcmToken);
      return res.json({ token });
    }
  );

  router.delete(
    "/:deviceId",
    [param("deviceId").trim().notEmpty().withMessage("deviceId is required")],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const deleted = await store.deleteToken(req.user!.userId, req.params.deviceId);
      return res.json({ success: deleted });
    }
  );

  return router;
}
