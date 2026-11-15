import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || "vakhya"}:${process.env.POSTGRES_PASSWORD || "vakhya_secret"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || "vakhya_db"}`,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET || "vakhya-dev-jwt-secret-change-in-production",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || "vakhya-dev-refresh-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "no-reply@vakhya.app",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  translationServiceUrl: process.env.TRANSLATION_SERVICE_URL || "http://localhost:8000",
  translationTcpHost: process.env.TRANSLATION_TCP_HOST || "127.0.0.1",
  translationV2STcpPort: Number(process.env.V2S_TCP_PORT || 9001),
  translationS2VTcpPort: Number(process.env.S2V_TCP_PORT || 9002),
  mediasoupListenIp: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
  mediasoupAnnouncedIp: process.env.MEDIASOUP_ANNOUNCED_IP || "127.0.0.1",
  mediasoupRtcMinPort: Number(process.env.MEDIASOUP_RTC_MIN_PORT || 40000),
  mediasoupRtcMaxPort: Number(process.env.MEDIASOUP_RTC_MAX_PORT || 40100),
};
