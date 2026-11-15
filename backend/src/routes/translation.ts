import { Router, Response } from "express";
import { body } from "express-validator";
import { RedisStoreInterface } from "../config/redis.js";
import { AuthenticatedRequest, createAuthMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { TranslationClient, translationClient } from "../services/translationClient.js";

export function createTranslationRouter(
  redisStore: RedisStoreInterface,
  client: TranslationClient = translationClient
) {
  const router = Router();
  const requireAuth = createAuthMiddleware(redisStore);

  router.use(requireAuth);

  router.get("/vocabulary", async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await client.getVocabulary();
      return res.json(data);
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || "Translation microservice unavailable" });
    }
  });

  router.post(
    "/voice-to-sign",
    [
      body("text").optional().isString(),
      body("audio_base64").optional().isString(),
      body("sign_language").optional().isIn(["ASL", "ISL"]),
      body("fps").optional().isInt({ min: 4, max: 30 }),
      body("encode_video").optional().isBoolean(),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.body.text && !req.body.audio_base64) {
        return res.status(400).json({ error: "Either text or audio_base64 is required" });
      }
      try {
        const result = await client.voiceToSign(req.body);
        return res.json(result);
      } catch (err: any) {
        return res.status(502).json({ error: err?.message || "Voice-to-Sign microservice failed" });
      }
    }
  );

  router.post(
    "/sign-to-voice",
    [
      body("pose_sequence").optional().isArray(),
      body("video_base64").optional().isString(),
      body("gloss_hint").optional().isString(),
      body("pitch").optional().isFloat({ min: 0.5, max: 2.0 }),
      body("speed").optional().isFloat({ min: 0.5, max: 2.0 }),
    ],
    validateRequest,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const result = await client.signToVoice(req.body);
        return res.json(result);
      } catch (err: any) {
        return res.status(502).json({ error: err?.message || "Sign-to-Voice microservice failed" });
      }
    }
  );

  return router;
}
