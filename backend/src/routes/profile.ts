import { Router, Response } from "express";
import { body } from "express-validator";
import { RedisStoreInterface } from "../config/redis.js";
import { AuthenticatedRequest, createAuthMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { DataStore } from "../repositories/types.js";

function sanitizeUser(user: any) {
  const { password: _pw, ...safe } = user;
  return safe;
}

export function createProfileRouter(store: DataStore, redisStore: RedisStoreInterface) {
  const router = Router();
  const requireAuth = createAuthMiddleware(redisStore);

  router.use(requireAuth);

  router.get("/", async (req: AuthenticatedRequest, res: Response) => {
    const user = await store.findUserById(req.user!.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user: sanitizeUser(user) });
  });

  router.put(
    "/",
    [
      body("firstName").optional().trim().notEmpty().withMessage("firstName cannot be empty"),
      body("lastName").optional().trim(),
      body("phone").optional().trim().isLength({ min: 7, max: 20 }),
      body("imageProfile").optional({ nullable: true }).isString(),
      body("userType").optional().isIn(["deaf", "hearing"]),
      body("preferredSignLanguage").optional().isIn(["ASL", "ISL"]),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { firstName, lastName, phone, imageProfile, userType, preferredSignLanguage } = req.body;
      const patch: Record<string, any> = {};
      if (firstName !== undefined) patch.firstName = firstName;
      if (lastName !== undefined) patch.lastName = lastName;
      if (phone !== undefined) patch.phone = phone;
      if (imageProfile !== undefined) patch.imageProfile = imageProfile;
      if (userType !== undefined) patch.userType = userType;
      if (preferredSignLanguage !== undefined) patch.preferredSignLanguage = preferredSignLanguage;

      const updated = await store.updateUser(req.user!.userId, patch);
      if (!updated) return res.status(404).json({ error: "User not found" });
      return res.json({ user: sanitizeUser(updated) });
    }
  );

  router.patch(
    "/preferences",
    [
      body("notificationsEnabled").optional().isBoolean(),
      body("translationEnabled").optional().isBoolean(),
      body("preferredSignLanguage").optional().isIn(["ASL", "ISL"]),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const patch: Record<string, any> = {};
      if (typeof req.body.notificationsEnabled === "boolean") {
        patch.notificationsEnabled = req.body.notificationsEnabled;
      }
      if (typeof req.body.translationEnabled === "boolean") {
        patch.translationEnabled = req.body.translationEnabled;
      }
      if (req.body.preferredSignLanguage !== undefined) {
        patch.preferredSignLanguage = req.body.preferredSignLanguage;
      }
      const updated = await store.updateUser(req.user!.userId, patch);
      if (!updated) return res.status(404).json({ error: "User not found" });
      return res.json({ user: sanitizeUser(updated) });
    }
  );

  return router;
}
