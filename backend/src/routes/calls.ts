import { Router, Response } from "express";
import { body, param, query } from "express-validator";
import { RedisStoreInterface } from "../config/redis.js";
import { AuthenticatedRequest, createAuthMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { DataStore } from "../repositories/types.js";
import { fcmService } from "../services/fcmService.js";
import { signalingHub } from "../ws/signaling.js";

export function createCallsRouter(store: DataStore, redisStore: RedisStoreInterface) {
  const router = Router();
  const requireAuth = createAuthMiddleware(redisStore);

  router.use(requireAuth);

  router.get(
    "/",
    [
      query("type").optional().isIn(["all", "incoming", "outgoing", "missed"]),
      query("search").optional().isString(),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const type = (req.query.type as "all" | "incoming" | "outgoing" | "missed") || "all";
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const calls = await store.listCalls(req.user!.userId, { type, search });
      return res.json({ calls });
    }
  );

  router.post(
    "/",
    [
      body("phone").trim().isLength({ min: 7, max: 20 }).withMessage("Callee phone number is required"),
      body("contactId").optional({ nullable: true }).isInt({ min: 1 }),
      body("translationUsed").optional().isBoolean(),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const caller = await store.findUserById(req.user!.userId);
      if (!caller) return res.status(404).json({ error: "Caller account not found" });

      const { phone, contactId = null, translationUsed = caller.translationEnabled } = req.body;
      const callee = await store.findUserByPhone(phone);

      const outgoingCall = await store.createCall({
        ownerId: caller.id,
        phone,
        type: "outgoing",
        status: "initiated",
        date: new Date(),
        duration: 0,
        contactId,
        userId: callee?.id ?? null,
        translationUsed: Boolean(translationUsed),
      });

      // Also create callee incoming call record & dispatch WebSocket + FCM data-only alert
      if (callee && callee.id !== caller.id) {
        const incomingCall = await store.createCall({
          ownerId: callee.id,
          phone: caller.phone,
          type: "incoming",
          status: "ringing",
          date: new Date(),
          duration: 0,
          contactId: null,
          userId: caller.id,
          translationUsed: Boolean(translationUsed),
        });

        signalingHub.sendToUser(callee.id, {
          type: "incoming_call",
          callId: incomingCall.id,
          callerCallId: outgoingCall.id,
          callerId: caller.id,
          callerName: `${caller.firstName} ${caller.lastName}`.trim(),
          callerPhone: caller.phone,
          callerType: caller.userType,
          translationEnabled: Boolean(translationUsed),
        });

        if (callee.notificationsEnabled) {
          const tokens = await store.listTokensByUser(callee.id);
          await fcmService.sendIncomingCallAlert(
            tokens.map((t) => t.fcmToken),
            {
              callId: incomingCall.id,
              callerId: caller.id,
              callerName: `${caller.firstName} ${caller.lastName}`.trim(),
              callerPhone: caller.phone,
              callerType: caller.userType,
              translationEnabled: Boolean(translationUsed),
            }
          );
        }
      }

      return res.status(201).json({
        call: outgoingCall,
        calleeOnline: callee ? true : false,
        calleeUserId: callee?.id ?? null,
      });
    }
  );

  router.patch(
    "/:id",
    [
      param("id").isInt({ min: 1 }).withMessage("Valid call id is required"),
      body("status").optional().isIn(["initiated", "ringing", "connected", "missed", "rejected", "ended"]),
      body("duration").optional().isInt({ min: 0 }),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const existing = await store.findCallById(Number(req.params.id));
      if (!existing || existing.ownerId !== req.user!.userId) {
        return res.status(404).json({ error: "Call record not found" });
      }
      const patch: Record<string, any> = {};
      if (req.body.status !== undefined) patch.status = req.body.status;
      if (req.body.duration !== undefined) patch.duration = Number(req.body.duration);

      const updated = await store.updateCall(existing.id, patch);
      return res.json({ call: updated });
    }
  );

  router.delete(
    "/:id",
    [param("id").isInt({ min: 1 }).withMessage("Valid call id is required")],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const deleted = await store.deleteCall(Number(req.params.id), req.user!.userId);
      if (!deleted) return res.status(404).json({ error: "Call record not found" });
      return res.json({ success: true });
    }
  );

  router.delete(
    "/",
    [body("ids").optional().isArray(), body("ids.*").optional().isInt({ min: 1 })],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : undefined;
      const deletedCount = await store.deleteCalls(req.user!.userId, ids);
      return res.json({ success: true, deletedCount });
    }
  );

  return router;
}
