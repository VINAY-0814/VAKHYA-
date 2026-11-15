import { env } from "../config/env.js";

export interface CallMediaRoom {
  callId: string;
  router: any;
  transports: Map<string, any>;
  producers: Map<string, any>;
  consumers: Map<string, any>;
  plainTransports: any[];
}

export class MediasoupManager {
  private worker: any = null;
  private rooms = new Map<string, CallMediaRoom>();
  private initialized = false;

  async init(): Promise<boolean> {
    if (this.initialized) return this.worker !== null;
    this.initialized = true;
    try {
      const mediasoupPkg = "mediasoup";
      const mediasoup = await import(/* @vite-ignore */ mediasoupPkg);
      this.worker = await mediasoup.createWorker({
        logLevel: "warn",
        rtcMinPort: env.mediasoupRtcMinPort,
        rtcMaxPort: env.mediasoupRtcMaxPort,
      });
      this.worker.on("died", () => {
        console.error("[VAKHYA Mediasoup] Worker died unexpectedly");
        this.worker = null;
      });
      console.log("[VAKHYA Mediasoup] SFU Worker ready.");
      return true;
    } catch (err: any) {
      console.warn(
        `[VAKHYA Mediasoup] Native worker unavailable in current host (${err?.message || "not built"}). Using signalling-only media descriptor.`
      );
      this.worker = null;
      return false;
    }
  }

  async getOrCreateRoom(callId: string): Promise<CallMediaRoom> {
    const existing = this.rooms.get(callId);
    if (existing) return existing;

    await this.init();
    let router: any = null;
    if (this.worker) {
      router = await this.worker.createRouter({
        mediaCodecs: [
          {
            kind: "audio",
            mimeType: "audio/opus",
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: "video",
            mimeType: "video/VP8",
            clockRate: 90000,
            parameters: { "x-google-start-bitrate": 1000 },
          },
        ],
      });
    }

    const room: CallMediaRoom = {
      callId,
      router,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      plainTransports: [],
    };
    this.rooms.set(callId, room);
    return room;
  }

  async getRouterRtpCapabilities(callId: string) {
    const room = await this.getOrCreateRoom(callId);
    if (room.router) return room.router.rtpCapabilities;
    return {
      codecs: [
        { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
        { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
      ],
    };
  }

  async createWebRtcTransport(callId: string, participantId: string) {
    const room = await this.getOrCreateRoom(callId);
    if (!room.router) {
      return {
        id: `sim-transport-${callId}-${participantId}`,
        iceParameters: { usernameFragment: "vakhya", password: "sim" },
        iceCandidates: [],
        dtlsParameters: { role: "auto", fingerprints: [] },
      };
    }

    const transport = await room.router.createWebRtcTransport({
      listenIps: [{ ip: env.mediasoupListenIp, announcedIp: env.mediasoupAnnouncedIp }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });
    room.transports.set(transport.id, transport);
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(callId: string, transportId: string, dtlsParameters: any) {
    const room = this.rooms.get(callId);
    const transport = room?.transports.get(transportId);
    if (transport) {
      await transport.connect({ dtlsParameters });
    }
  }

  async produce(callId: string, transportId: string, kind: "audio" | "video", rtpParameters: any) {
    const room = this.rooms.get(callId);
    const transport = room?.transports.get(transportId);
    if (!transport) {
      return { id: `sim-producer-${kind}-${Date.now()}` };
    }
    const producer = await transport.produce({ kind, rtpParameters });
    room!.producers.set(producer.id, producer);
    return { id: producer.id };
  }

  async createPlainTransportForInterception(callId: string, rtpPort: number) {
    const room = await this.getOrCreateRoom(callId);
    if (!room.router) {
      return { id: `sim-plain-${rtpPort}`, rtpPort };
    }
    const plainTransport = await room.router.createPlainTransport({
      listenIp: { ip: "127.0.0.1", announcedIp: "127.0.0.1" },
      rtcpMux: true,
      comedia: false,
    });
    await plainTransport.connect({ ip: "127.0.0.1", port: rtpPort });
    room.plainTransports.push(plainTransport);
    return plainTransport;
  }

  async closeRoom(callId: string): Promise<void> {
    const room = this.rooms.get(callId);
    if (!room) return;
    for (const pt of room.plainTransports) {
      try {
        pt.close?.();
      } catch {}
    }
    for (const tr of room.transports.values()) {
      try {
        tr.close?.();
      } catch {}
    }
    try {
      room.router?.close?.();
    } catch {}
    this.rooms.delete(callId);
  }
}

export const mediasoupManager = new MediasoupManager();
