import { ChildProcess, spawn } from "child_process";
import net from "net";
import { env } from "../config/env.js";

export interface ActivePipelineHandle {
  callId: string;
  direction: "voice_to_sign" | "sign_to_voice";
  extractorProcess: ChildProcess | null;
  injectorProcess: ChildProcess | null;
  stop: () => void;
}

/**
 * Orchestrates FFmpeg RTP stream interception from Mediasoup PlainTransport ->
 * TCP raw stream to Python AI translation microservice -> FFmpeg RTP reinjection.
 */
export class FfmpegRtpPipeline {
  private active = new Map<string, ActivePipelineHandle[]>();

  public buildSdp(mediaType: "audio" | "video", rtpPort: number, payloadType: number): string {
    if (mediaType === "audio") {
      return [
        "v=0",
        "o=- 0 0 IN IP4 127.0.0.1",
        "s=VAKHYA Audio RTP",
        "c=IN IP4 127.0.0.1",
        "t=0 0",
        `m=audio ${rtpPort} RTP/AVP ${payloadType}`,
        `a=rtpmap:${payloadType} opus/48000/2`,
      ].join("\r\n");
    }
    return [
      "v=0",
      "o=- 0 0 IN IP4 127.0.0.1",
      "s=VAKHYA Video RTP",
      "c=IN IP4 127.0.0.1",
      "t=0 0",
      `m=video ${rtpPort} RTP/AVP ${payloadType}`,
      `a=rtpmap:${payloadType} VP8/90000`,
    ].join("\r\n");
  }

  public startVoiceToSignBridge(
    callId: string,
    audioInputRtpPort: number,
    videoOutputRtpPort: number
  ): ActivePipelineHandle {
    const tcpTarget = `tcp://${env.translationTcpHost}:${env.translationV2STcpPort}`;

    // 1. Intercept RTP Opus audio -> decode to raw s16le PCM -> stream over TCP to Python Voice-to-Sign microservice
    const extractor = spawn(
      "ffmpeg",
      [
        "-protocol_whitelist",
        "pipe,rtp,udp,tcp",
        "-f",
        "sdp",
        "-i",
        "pipe:0",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "s16le",
        tcpTarget,
      ],
      { stdio: ["pipe", "ignore", "pipe"] }
    );

    if (extractor.stdin) {
      extractor.stdin.write(this.buildSdp("audio", audioInputRtpPort, 111));
      extractor.stdin.end();
    }

    // 2. Reinject translated RGB24 avatar video frames -> encode VP8 RTP back into Mediasoup PlainTransport
    const injector = spawn(
      "ffmpeg",
      [
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        "256x256",
        "-r",
        "12",
        "-i",
        "pipe:0",
        "-c:v",
        "libvpx",
        "-deadline",
        "realtime",
        "-f",
        "rtp",
        `rtp://127.0.0.1:${videoOutputRtpPort}?pkt_size=1200`,
      ],
      { stdio: ["pipe", "ignore", "pipe"] }
    );

    const handle: ActivePipelineHandle = {
      callId,
      direction: "voice_to_sign",
      extractorProcess: extractor,
      injectorProcess: injector,
      stop: () => {
        try {
          extractor.kill("SIGTERM");
        } catch {}
        try {
          injector.kill("SIGTERM");
        } catch {}
      },
    };

    const list = this.active.get(callId) || [];
    list.push(handle);
    this.active.set(callId, list);
    return handle;
  }

  public startSignToVoiceBridge(
    callId: string,
    videoInputRtpPort: number,
    audioOutputRtpPort: number
  ): ActivePipelineHandle {
    const tcpTarget = `tcp://${env.translationTcpHost}:${env.translationS2VTcpPort}`;

    // 1. Intercept RTP VP8 video -> decode to raw RGB24 256x256 frames -> stream over TCP to Python Sign-to-Voice
    const extractor = spawn(
      "ffmpeg",
      [
        "-protocol_whitelist",
        "pipe,rtp,udp,tcp",
        "-f",
        "sdp",
        "-i",
        "pipe:0",
        "-vf",
        "scale=256:256,fps=12",
        "-pix_fmt",
        "rgb24",
        "-f",
        "rawvideo",
        tcpTarget,
      ],
      { stdio: ["pipe", "ignore", "pipe"] }
    );

    if (extractor.stdin) {
      extractor.stdin.write(this.buildSdp("video", videoInputRtpPort, 96));
      extractor.stdin.end();
    }

    // 2. Reinject synthesized PCM speech -> encode Opus RTP back into Mediasoup PlainTransport
    const injector = spawn(
      "ffmpeg",
      [
        "-f",
        "s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-i",
        "pipe:0",
        "-c:a",
        "libopus",
        "-f",
        "rtp",
        `rtp://127.0.0.1:${audioOutputRtpPort}?pkt_size=1200`,
      ],
      { stdio: ["pipe", "ignore", "pipe"] }
    );

    const handle: ActivePipelineHandle = {
      callId,
      direction: "sign_to_voice",
      extractorProcess: extractor,
      injectorProcess: injector,
      stop: () => {
        try {
          extractor.kill("SIGTERM");
        } catch {}
        try {
          injector.kill("SIGTERM");
        } catch {}
      },
    };

    const list = this.active.get(callId) || [];
    list.push(handle);
    this.active.set(callId, list);
    return handle;
  }

  /**
   * Direct TCP chunk roundtrip helper used when sending raw media frames to Python microservices.
   */
  public sendTcpMediaBurst(host: string, port: number, payload: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      const chunks: Buffer[] = [];
      socket.setTimeout(5000);
      socket.on("connect", () => {
        socket.write(payload);
        socket.end();
      });
      socket.on("data", (chunk) => chunks.push(chunk));
      socket.on("end", () => resolve(Buffer.concat(chunks)));
      socket.on("timeout", () => {
        socket.destroy();
        resolve(Buffer.concat(chunks));
      });
      socket.on("error", reject);
    });
  }

  public stopCallPipelines(callId: string): void {
    const handles = this.active.get(callId) || [];
    for (const h of handles) h.stop();
    this.active.delete(callId);
  }
}

export const ffmpegPipeline = new FfmpegRtpPipeline();
