import http from "http";
import { env } from "./config/env.js";
import { connectDatabase, sequelize } from "./config/database.js";
import { redisStore } from "./config/redis.js";
import { SequelizeDataStore } from "./repositories/sequelizeStore.js";
import { fcmService } from "./services/fcmService.js";
import { mediasoupManager } from "./media/mediasoupManager.js";
import { signalingHub } from "./ws/signaling.js";
import { createApp } from "./app.js";
import "./models/index.js";

async function bootstrap() {
  await connectDatabase();
  await sequelize.sync();
  await redisStore.connect();
  await fcmService.init();
  await mediasoupManager.init();

  const store = new SequelizeDataStore();
  const app = createApp(store, redisStore);
  const server = http.createServer(app);

  signalingHub.attach(server, store, redisStore);

  server.listen(env.port, "0.0.0.0", () => {
    console.log(`[VAKHYA Backend] Listening on http://0.0.0.0:${env.port}`);
    console.log(`[VAKHYA Swagger] Docs available at http://0.0.0.0:${env.port}/api-docs`);
  });
}

bootstrap().catch((err) => {
  console.error("[VAKHYA Backend] Startup failed:", err);
  process.exit(1);
});
