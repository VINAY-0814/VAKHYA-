import express from "express";
import swaggerUi from "swagger-ui-express";
import { RedisStoreInterface } from "./config/redis.js";
import { swaggerSpec } from "./config/swagger.js";
import { DataStore } from "./repositories/types.js";
import { createAuthRouter } from "./routes/auth.js";
import { createProfileRouter } from "./routes/profile.js";
import { createContactsRouter } from "./routes/contacts.js";
import { createCallsRouter } from "./routes/calls.js";
import { createTokensRouter } from "./routes/tokens.js";
import { createTranslationRouter } from "./routes/translation.js";
import { TranslationClient, translationClient } from "./services/translationClient.js";

export function createApp(
  store: DataStore,
  redisStore: RedisStoreInterface,
  txClient: TranslationClient = translationClient
) {
  const app = express();

  // Security headers & CORS
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: "25mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "vakhya-backend", timestamp: new Date().toISOString() });
  });

  app.get("/api-docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/api/v1/auth", createAuthRouter(store, redisStore));
  app.use("/api/v1/profile", createProfileRouter(store, redisStore));
  app.use("/api/v1/contacts", createContactsRouter(store, redisStore));
  app.use("/api/v1/calls", createCallsRouter(store, redisStore));
  app.use("/api/v1/tokens", createTokensRouter(store, redisStore));
  app.use("/api/v1/translation", createTranslationRouter(redisStore, txClient));

  return app;
}
