# VAKHYA — Breaking Silence with AI

VAKHYA is a prototype bidirectional video-calling platform enabling natural 1-to-1 communication between Deaf / sign-language users and hearing users. Built strictly around the VAKHYA system specification (`i3 report`), the codebase includes:

- **Android Mobile App (`/mobile`)**: React Native + Expo + Expo Router with JWT auth & OTP password recovery, Deaf-first accessible UI, Calls tab (filter All / Incoming / Outgoing / Missed, search, delete, FAB initiation), Contacts CRUD, Profile & Preferences, mandatory Camera/Microphone permission & consent gate, 1-to-1 Video Call with draggable preview, controls, timer, optional Sign-Avatar overlay, and FCM + Notifee incoming call alerts.
- **Node.js / Express Backend (`/backend`)**: PostgreSQL + Sequelize (`Users`, `Contacts`, `Calls`, `Tokens`) with migrations and seeders, Redis JWT blacklisting & OTP TTL cache, `express-validator` on all REST endpoints, Swagger/OpenAPI at `/api-docs`, in-memory WebSocket signaling (`/ws`), Mediasoup SFU + FFmpeg RTP pipeline, and Firebase Admin FCM push dispatch.
- **Python AI Translation Microservices (`/services/translation`)**:
  - **Voice-to-Sign**: Speech-to-Text -> Text-to-Gloss -> Gloss-to-Pose lookup (demonstrative 32-sign vocabulary) -> Pose-to-Video avatar rendering + FFmpeg MP4 encoding.
  - **Sign-to-Voice**: Pose/keypoint extraction -> 3D-CNN Pose-to-Text classifier -> Text-to-Speech WAV synthesis.
  - Exposes both REST endpoints (`/health`, `/vocabulary`, `/translate/voice-to-sign`, `/translate/sign-to-voice`, `/metrics`) and raw TCP stream bridges (`9001` V2S, `9002` S2V) for FFmpeg RTP stream interception/reinjection.
- **Web Verification Companion (`/src`, `/server.ts`)**: Runs on port `3000` inside AI Studio / browser for interactive local testing of auth, OTP recovery, Contacts, Calls, Swagger `/api-docs`, consent-gated 1-to-1 calls, and live translation pipelines.

> **Vocabulary Scope**: Sign translation uses a demonstrative lookup vocabulary (32 core conversational glosses in ASL/ISL) per the project report, not a full national sign language corpus. Group calls, iOS builds, live text chat, and public-cloud deployment are out of scope.

---

## Brand Logo Assets

Generated logo files are applied across all surfaces:
- Web & docs icon: `public/vakhya-logo.png`
- Expo App Icon: `mobile/assets/icon.png` (1024x1024)
- Android Adaptive Icon: `mobile/assets/adaptive-icon.png` (1024x1024)
- Splash Screen: `mobile/assets/splash.png` (1284x2778)
- In-app Header Logo: `mobile/assets/logo.png` (512x512)

---

## Running the Full Stack Locally (Docker Compose)

1. Copy `.env.example` to `.env` and set `JWT_SECRET`, `JWT_REFRESH_SECRET`, and (for physical Android devices) `MEDIASOUP_ANNOUNCED_IP` to your machine's LAN IP.
2. Start PostgreSQL, Redis, Python translation microservices, and the Node.js backend:
   ```bash
   docker compose up --build
   ```
3. Run database seeders (optional demo accounts `aarav@vakhya.app` and `maya@vakhya.app`, password `Vakhya@123`):
   ```bash
   docker compose exec backend npm run seed
   ```
4. Verify services:
   - Backend Health: `http://localhost:4000/health`
   - Swagger/OpenAPI Docs: `http://localhost:4000/api-docs`
   - Translation Service Health: `http://localhost:8000/health`

### Running Locally Without Docker (Manual)

1. Start PostgreSQL (`vakhya_db`) and Redis (`6379`).
2. Start Python translation microservices:
   ```bash
   cd services/translation
   pip install -r requirements.txt
   python3 -m app.server
   ```
3. Migrate, seed, and start the backend:
   ```bash
   cd backend
   npm install
   npm run migrate
   npm run seed
   npm run dev
   ```
4. Start the Web Companion (port 3000):
   ```bash
   npm install
   npm run dev
   ```

---

## Running on an Android Device / Emulator

Because VAKHYA uses native modules (`react-native-webrtc`, `@notifee/react-native`, `@react-native-firebase/messaging`, `expo-camera`), use an Expo Development Build rather than Expo Go:

1. Place your Firebase Android config at `mobile/google-services.json` (required for FCM background/terminated wake alerts).
2. Configure the backend URL in `mobile/.env` (for Android emulator use `10.0.2.2`; for a physical Android phone on the same Wi-Fi, use your computer's LAN IP):
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_HOST_IP>:4000/api/v1
   EXPO_PUBLIC_WS_URL=ws://<YOUR_HOST_IP>:4000/ws
   ```
3. Install dependencies and build/run on Android:
   ```bash
   cd mobile
   npm install
   npx expo prebuild --platform android
   npx expo run:android
   ```

---

## Test Commands

Run each component's automated suite:

- **Python Translation Microservices** (Voice-to-Sign, Sign-to-Voice 3D-CNN, FFmpeg encoding, HTTP API, TCP stream bridges):
  ```bash
  PYTHONPATH=services/translation python3 services/translation/tests/test_translation_pipeline.py -v
  ```
- **Node.js Backend Integration Tests** (Auth, Redis JWT blacklist, OTP recovery, `express-validator`, Swagger `/api-docs`, Contacts CRUD, 1-to-1 Call initiation, WebSocket + FCM dispatch, Translation proxy):
  ```bash
  cd backend && npm test
  ```
  *(From workspace root in CI/sandbox: `NODE_PATH=./node_modules ./node_modules/.bin/tsx backend/tests/api.test.ts`)*
- **Mobile Client Unit Tests** (Call history filtering/search, duration formatting, Camera+Mic permission & consent gate):
  ```bash
  cd mobile && npm test
  ```
  *(From workspace root in CI/sandbox: `./node_modules/.bin/tsx mobile/tests/mobile.test.ts`)*
