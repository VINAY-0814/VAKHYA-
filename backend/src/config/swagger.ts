export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "VAKHYA API – Breaking Silence with AI",
    version: "1.0.0",
    description:
      "REST API for VAKHYA bidirectional sign-language video calling platform (JWT Auth + OTP Recovery, Contacts, Calls, Device FCM Tokens, Profile & Translation).",
  },
  servers: [{ url: "/api/v1", description: "Versioned REST API v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user account",
        security: [],
        responses: { "201": { description: "User registered with access and refresh JWTs" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate with email and password",
        security: [],
        responses: { "200": { description: "Authenticated with JWT tokens" } },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Issue a new access JWT using refresh token",
        security: [],
        responses: { "200": { description: "New access token issued" } },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Invalidate current JWT in Redis blacklist",
        responses: { "200": { description: "Logged out and token blacklisted" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Authentication"],
        summary: "Send 6-digit OTP to registered email",
        security: [],
        responses: { "200": { description: "OTP dispatched" } },
      },
    },
    "/auth/verify-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Verify 6-digit recovery OTP",
        security: [],
        responses: { "200": { description: "OTP verified" } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Authentication"],
        summary: "Reset password using valid OTP",
        security: [],
        responses: { "200": { description: "Password reset successful" } },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Authentication"],
        summary: "Change password for authenticated user",
        responses: { "200": { description: "Password updated" } },
      },
    },
    "/auth/account": {
      delete: {
        tags: ["Authentication"],
        summary: "Delete authenticated user account and blacklist token",
        responses: { "200": { description: "Account deleted" } },
      },
    },
    "/profile": {
      get: {
        tags: ["Profile"],
        summary: "Get current user profile & preferences",
        responses: { "200": { description: "User profile" } },
      },
      put: {
        tags: ["Profile"],
        summary: "Update personal info and profile image",
        responses: { "200": { description: "Profile updated" } },
      },
    },
    "/profile/preferences": {
      patch: {
        tags: ["Profile"],
        summary: "Toggle push notifications and accessibility translation preferences",
        responses: { "200": { description: "Preferences updated" } },
      },
    },
    "/contacts": {
      get: {
        tags: ["Contacts"],
        summary: "List and search user contacts",
        responses: { "200": { description: "Contacts list" } },
      },
      post: {
        tags: ["Contacts"],
        summary: "Create a contact",
        responses: { "201": { description: "Contact created" } },
      },
    },
    "/contacts/{id}": {
      put: {
        tags: ["Contacts"],
        summary: "Update contact details",
        responses: { "200": { description: "Contact updated" } },
      },
      delete: {
        tags: ["Contacts"],
        summary: "Delete contact",
        responses: { "200": { description: "Contact deleted" } },
      },
    },
    "/contacts/sync": {
      post: {
        tags: ["Contacts"],
        summary: "Synchronize local device contacts with registered VAKHYA users",
        responses: { "200": { description: "Contacts synchronized" } },
      },
    },
    "/calls": {
      get: {
        tags: ["Calls"],
        summary: "Get call history with category filter (all|incoming|outgoing|missed) and search",
        responses: { "200": { description: "Call history" } },
      },
      post: {
        tags: ["Calls"],
        summary: "Initiate a 1-to-1 video call and dispatch FCM incoming call alert",
        responses: { "201": { description: "Call initiated" } },
      },
      delete: {
        tags: ["Calls"],
        summary: "Clear or selectively delete call history entries",
        responses: { "200": { description: "Calls deleted" } },
      },
    },
    "/calls/{id}": {
      patch: {
        tags: ["Calls"],
        summary: "Update call status and duration",
        responses: { "200": { description: "Call updated" } },
      },
      delete: {
        tags: ["Calls"],
        summary: "Delete a single call record",
        responses: { "200": { description: "Call deleted" } },
      },
    },
    "/tokens": {
      post: {
        tags: ["Device Tokens"],
        summary: "Register or update an Android FCM device token",
        responses: { "200": { description: "Token saved" } },
      },
    },
    "/tokens/{deviceId}": {
      delete: {
        tags: ["Device Tokens"],
        summary: "Remove an FCM device token",
        responses: { "200": { description: "Token removed" } },
      },
    },
    "/translation/vocabulary": {
      get: {
        tags: ["Translation"],
        summary: "List demonstrative gloss-to-pose sign vocabulary",
        responses: { "200": { description: "Vocabulary entries" } },
      },
    },
    "/translation/voice-to-sign": {
      post: {
        tags: ["Translation"],
        summary: "Run Voice-to-Sign translation pipeline (STT -> Text-to-Gloss -> Gloss-to-Pose -> Avatar Video)",
        responses: { "200": { description: "Translated pose frames and avatar video" } },
      },
    },
    "/translation/sign-to-voice": {
      post: {
        tags: ["Translation"],
        summary: "Run Sign-to-Voice translation pipeline (Pose Extraction -> 3D-CNN Pose-to-Text -> TTS)",
        responses: { "200": { description: "Recognized text and synthesized WAV speech" } },
      },
    },
  },
};
