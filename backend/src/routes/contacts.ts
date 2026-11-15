import { Router, Response } from "express";
import { body, param, query } from "express-validator";
import { RedisStoreInterface } from "../config/redis.js";
import { AuthenticatedRequest, createAuthMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { DataStore } from "../repositories/types.js";

export function createContactsRouter(store: DataStore, redisStore: RedisStoreInterface) {
  const router = Router();
  const requireAuth = createAuthMiddleware(redisStore);

  router.use(requireAuth);

  router.get(
    "/",
    [query("search").optional().isString()],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const contacts = await store.listContacts(req.user!.userId, search);
      return res.json({ contacts });
    }
  );

  router.post(
    "/",
    [
      body("firstName").trim().notEmpty().withMessage("firstName is required"),
      body("lastName").optional().trim(),
      body("phone").trim().isLength({ min: 7, max: 20 }).withMessage("Valid phone number is required"),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const { firstName, lastName = "", phone } = req.body;
      const matchedUser = await store.findUserByPhone(phone);
      const contact = await store.createContact({
        firstName,
        lastName,
        phone,
        ownerId: req.user!.userId,
        userId: matchedUser?.id ?? null,
      });
      return res.status(201).json({ contact });
    }
  );

  router.put(
    "/:id",
    [
      param("id").isInt({ min: 1 }).withMessage("Valid contact id is required"),
      body("firstName").optional().trim().notEmpty(),
      body("lastName").optional().trim(),
      body("phone").optional().trim().isLength({ min: 7, max: 20 }),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const id = Number(req.params.id);
      const patch: Record<string, any> = {};
      if (req.body.firstName !== undefined) patch.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) patch.lastName = req.body.lastName;
      if (req.body.phone !== undefined) {
        patch.phone = req.body.phone;
        const matched = await store.findUserByPhone(req.body.phone);
        patch.userId = matched?.id ?? null;
      }

      const updated = await store.updateContact(id, req.user!.userId, patch);
      if (!updated) return res.status(404).json({ error: "Contact not found" });
      return res.json({ contact: updated });
    }
  );

  router.delete(
    "/:id",
    [param("id").isInt({ min: 1 }).withMessage("Valid contact id is required")],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const deleted = await store.deleteContact(Number(req.params.id), req.user!.userId);
      if (!deleted) return res.status(404).json({ error: "Contact not found" });
      return res.json({ success: true });
    }
  );

  router.post(
    "/sync",
    [
      body("contacts").isArray().withMessage("contacts array is required"),
      body("contacts.*.firstName").trim().notEmpty(),
      body("contacts.*.phone").trim().isLength({ min: 7, max: 20 }),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const existing = await store.listContacts(req.user!.userId);
      const existingPhones = new Set(existing.map((c) => c.phone));
      const created = [];

      for (const item of req.body.contacts) {
        if (!existingPhones.has(item.phone)) {
          const matched = await store.findUserByPhone(item.phone);
          const contact = await store.createContact({
            firstName: item.firstName,
            lastName: item.lastName || "",
            phone: item.phone,
            ownerId: req.user!.userId,
            userId: matched?.id ?? null,
          });
          created.push(contact);
          existingPhones.add(item.phone);
        }
      }

      const contacts = await store.listContacts(req.user!.userId);
      return res.json({ syncedCount: created.length, contacts });
    }
  );

  return router;
}
