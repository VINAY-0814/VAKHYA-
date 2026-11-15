/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Sparkles,
  RefreshCw,
  Volume2,
  Lock,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Languages,
  UserPlus,
  HelpCircle,
  Video as VideoIcon
} from "lucide-react";
import { theme } from "../../theme";
import { realtimeClient, SignalingEvent } from "../../services/realtimeClient";
import {
  drawRealHandSkeleton,
  initHandLandmarker,
  PoseKeyframe,
  WebcamSignTracker,
} from "../../services/webcamSignTracker";

interface InCallScreenProps {
  remoteUser: {
    id?: string;
    identity?: string;
    name: string;
    avatar: string;
    phone: string;
    userType: string;
    statusText?: string;
  };
  callType: "voice" | "video";
  onEndCall: () => void;
  selectedVoicePreset?: string;
  onUpdateVoicePreset?: (preset: string) => void;
  roomName?: string;
  localUser?: {
    identity?: string;
    phone?: string;
    name?: string;
    userType?: string;
    avatar?: string;
    signLanguage?: string;
    voiceSettings?: {
      pitch?: number;
      speed?: number;
    };
  };
  isInitiator?: boolean;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function drawRemotePoseFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  kf: PoseKeyframe,
  gloss: string,
  markers?: { eyebrows?: string; mouth?: string }
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(24, 34, 41, 0.92)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(201, 169, 233, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }
  for (let j = 0; j < h; j += 20) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(w, j);
    ctx.stroke();
  }

  // Head + shoulders reference for intuitive sign-avatar readability
  const headX = w * 0.5;
  const headY = h * 0.24;
  ctx.strokeStyle = "rgba(201, 169, 233, 0.45)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(headX, headY, 13, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle eyebrow/mouth non-manual marker cue
  ctx.strokeStyle = markers?.eyebrows === "up" ? "#22D3EE" : markers?.eyebrows === "down" ? "#F43F5E" : "#C9A9E9";
  ctx.beginPath();
  ctx.moveTo(headX - 6, headY - 4);
  ctx.lineTo(headX - 2, headY - (markers?.eyebrows === "up" ? 6 : 4));
  ctx.moveTo(headX + 2, headY - (markers?.eyebrows === "up" ? 6 : 4));
  ctx.lineTo(headX + 6, headY - 4);
  ctx.stroke();

  const lShoulder = [w * 0.34, h * 0.44];
  const rShoulder = [w * 0.66, h * 0.44];
  const lx = Math.max(12, Math.min(w - 12, kf.left_wrist[0] * w));
  const ly = Math.max(18, Math.min(h - 12, kf.left_wrist[1] * h));
  const rx = Math.max(12, Math.min(w - 12, kf.right_wrist[0] * w));
  const ry = Math.max(18, Math.min(h - 12, kf.right_wrist[1] * h));

  ctx.strokeStyle = "#C9A9E9";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(headX, headY + 13);
  ctx.lineTo(headX, h * 0.44);
  ctx.moveTo(lShoulder[0], lShoulder[1]);
  ctx.lineTo(rShoulder[0], rShoulder[1]);
  ctx.lineTo(rx, ry);
  ctx.moveTo(lShoulder[0], lShoulder[1]);
  ctx.lineTo(lx, ly);
  ctx.stroke();

  const spreadL = 6 + kf.left_open * 10;
  const spreadR = 6 + kf.right_open * 10;
  const tips = [
    [lx - spreadL * 0.6, ly - 14],
    [lx, ly - 17],
    [lx + spreadL * 0.6, ly - 13],
    [rx - spreadR * 0.6, ry - 13],
    [rx, ry - 17],
    [rx + spreadR * 0.6, ry - 14],
  ];

  ctx.strokeStyle = "#22D3EE";
  ctx.beginPath();
  tips.slice(0, 3).forEach(([tx, ty]) => {
    ctx.moveTo(lx, ly);
    ctx.lineTo(tx, ty);
  });
  tips.slice(3).forEach(([tx, ty]) => {
    ctx.moveTo(rx, ry);
    ctx.lineTo(tx, ty);
  });
  ctx.stroke();

  ctx.fillStyle = "#F43F5E";
  [[lx, ly], [rx, ry], ...tips].forEach(([jx, jy]) => {
    ctx.beginPath();
    ctx.arc(jx, jy, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#22D3EE";
  ctx.font = "bold 9px monospace";
  ctx.fillText(`SIGN: ${(gloss || "READY").slice(0, 18)}`, 6, 13);
}

export default function InCallScreen({
  remoteUser,
  callType,
  onEndCall,
  selectedVoicePreset = "Warm Male",
  roomName,
  localUser,
  isInitiator = true,
}: InCallScreenProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(callType === "video");
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [showTranslationOverlay, setShowTranslationOverlay] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const [pipSize, setPipSize] = useState<"sm" | "lg">("sm");
  const [pipPosition, setPipPosition] = useState({ x: 0, y: 0 });
  const pipWidth = pipSize === "sm" ? 128 : 176;
  const pipHeight = pipSize === "sm" ? 176 : 240;

  // Live translation & telemetry states
  const [activeGloss, setActiveGloss] = useState("READY");
  const [activeSubtitle, setActiveSubtitle] = useState("Speak into microphone or sign to camera for live bidirectional translation.");
  const [activeDirectionTag, setActiveDirectionTag] = useState("Live Two-Way Sync");
  const [outgoingCaption, setOutgoingCaption] = useState("");
  const [hasIncomingSignPose, setHasIncomingSignPose] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [mediaReadyTick, setMediaReadyTick] = useState(0);
  const [webrtcStatus, setWebrtcStatus] = useState("Negotiating encrypted WebRTC P2P tunnel...");
  const [bitrateKbps, setBitrateKbps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const remotePoseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteIdentityRef = useRef<string>(remoteUser.identity || "");
  const peerInRoomRef = useRef<boolean>(false);
  const turnConfiguredRef = useRef<boolean>(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const prevBytesRef = useRef<{ bytes: number; ts: number }>({ bytes: 0, ts: Date.now() });

  const trackerRef = useRef<WebcamSignTracker | null>(null);
  const poseBufferRef = useRef<PoseKeyframe[]>([]);
  const frameSnapsRef = useRef<string[]>([]);
  const handSummaryRef = useRef<string>("");
  const peakMotionRef = useRef<number>(0);
  const quietFramesAfterMotionRef = useRef<number>(0);
  const lastPoseInferRef = useRef<number>(0);
  const lastSentSignRef = useRef<{ sentence: string; ts: number }>({ sentence: "", ts: 0 });
  const lastSpokenRef = useRef<{ text: string; ts: number }>({ text: "", ts: 0 });
  const isInferringPoseRef = useRef(false);
  const remotePoseQueueRef = useRef<{
    frames: PoseKeyframe[];
    gloss: string;
    until: number;
    markers?: { eyebrows?: string; mouth?: string };
  }>({
    frames: [],
    gloss: "",
    until: 0,
  });

  const activeRoomName =
    roomName || `vakhya_call_${String(remoteUser.phone || remoteUser.id || "room").replace(/\D/g, "") || "default"}`;
  const myIdentity = localUser?.identity || realtimeClient.getIdentity();
  const signLanguage = localUser?.signLanguage || "ASL";
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const isCamOnRef = useRef(isCamOn);
  isCamOnRef.current = isCamOn;
  const isFrontCameraRef = useRef(isFrontCamera);
  isFrontCameraRef.current = isFrontCamera;

  const playWavAudio = (audioWavBase64?: string | null) => {
    if (!audioWavBase64) return;
    try {
      const audio = new Audio(`data:audio/wav;base64,${audioWavBase64}`);
      audio.play().catch(() => {});
    } catch {}
  };

  const speakTranslatedText = (text: string, audioWavBase64?: string | null) => {
    const clean = text.trim();
    if (!clean) return;
    const now = Date.now();
    if (lastSpokenRef.current.text.toLowerCase() === clean.toLowerCase() && now - lastSpokenRef.current.ts < 3500) {
      return;
    }
    lastSpokenRef.current = { text: clean, ts: now };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.resume();
      } catch {}
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 || "onvoiceschanged" in window.speechSynthesis) {
        if (window.speechSynthesis.pending && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.pitch = localUser?.voiceSettings?.pitch || 1.0;
        utterance.rate = localUser?.voiceSettings?.speed || 1.0;
        const matched = voices.find((v) =>
          selectedVoicePreset.toLowerCase().includes("female")
            ? /female|zira|samantha|aria|victoria|google us english/i.test(v.name)
            : /male|david|mark|alex|daniel/i.test(v.name)
        );
        if (matched) utterance.voice = matched;
        utterance.onerror = () => playWavAudio(audioWavBase64);
        window.speechSynthesis.speak(utterance);
        return;
      }
    }
    playWavAudio(audioWavBase64);
  };

  // Pre-warm speech voices list in Chrome
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Acquire local media & bind WebRTC RTCPeerConnection + signaling
  useEffect(() => {
    let cancelled = false;
    remoteStreamRef.current = new MediaStream();

    realtimeClient.connect({
      phone: localUser?.phone || "",
      name: localUser?.name || "Vakhya User",
      userType: localUser?.userType || "Profile",
      avatar: localUser?.avatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=user",
    });

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || remoteStreamRef.current!;
      if (!event.streams?.[0]) {
        remoteStreamRef.current!.addTrack(event.track);
      }
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        }
        remoteVideoRef.current.play().catch(() => {});
      }
      if (event.track.kind === "video") {
        setHasRemoteVideo(true);
        event.track.onunmute = () => {
          setHasRemoteVideo(true);
          remoteVideoRef.current?.play().catch(() => {});
        };
        event.track.onended = () => setHasRemoteVideo(false);
      }
      setWebrtcStatus("Connected • Live WebRTC Media Active");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        realtimeClient.send({
          type: "candidate",
          roomName: activeRoomName,
          targetIdentity: remoteIdentityRef.current || undefined,
          payload: { candidate: event.candidate.toJSON() },
        });
      }
    };

    const sendOfferToPeer = async (targetId?: string, forceRenegotiate = false) => {
      try {
        makingOfferRef.current = true;
        if (forceRenegotiate && pc.signalingState === "have-local-offer") {
          await pc.setLocalDescription({ type: "rollback" });
        }
        if (pc.signalingState !== "stable") return;
        const offer = await pc.createOffer();
        if (pc.signalingState !== "stable") return;
        await pc.setLocalDescription(offer);
        realtimeClient.send({
          type: "offer",
          roomName: activeRoomName,
          targetIdentity: targetId || remoteIdentityRef.current || undefined,
          payload: { description: pc.localDescription },
        });
      } catch (err) {
        console.warn("[WebRTC] Failed creating offer:", err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    let didIceRestart = false;
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        didIceRestart = false;
        setWebrtcStatus("Connected • Encrypted Peer Media Active");
      } else if (st === "connecting") {
        setWebrtcStatus("Establishing P2P ICE connection...");
      } else if (st === "failed" && !didIceRestart && remoteIdentityRef.current) {
        didIceRestart = true;
        setWebrtcStatus(
          turnConfiguredRef.current
            ? "Retrying connection via ICE/TURN relay..."
            : "Retrying ICE (TURN_URLS not set on server — cross-network calls may need TURN)..."
        );
        try {
          pc.restartIce();
          if (peerInRoomRef.current && (isInitiator || myIdentity < remoteIdentityRef.current)) {
            void sendOfferToPeer(remoteIdentityRef.current, true);
          }
        } catch {}
      } else if (st === "disconnected" || st === "failed") {
        setWebrtcStatus(
          st === "failed" && !turnConfiguredRef.current
            ? "Connection failed — add TURN_URLS/TURN_USERNAME/TURN_CREDENTIAL in Render Environment"
            : `Peer connection ${st}`
        );
        setHasRemoteVideo(false);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (
        peerInRoomRef.current &&
        remoteIdentityRef.current &&
        (isInitiator || myIdentity < remoteIdentityRef.current)
      ) {
        await sendOfferToPeer(remoteIdentityRef.current);
      }
    };

    const unsubscribe = realtimeClient.subscribe(async (msg: SignalingEvent) => {
      if (cancelled) return;
      if (msg.roomName && msg.roomName !== activeRoomName) return;

      if ((msg.type === "joined_ack" || msg.type === "reconnected_ack") && Array.isArray(msg.participants)) {
        const other = msg.participants.find((p: any) => p.identity !== myIdentity);
        if (other) {
          peerInRoomRef.current = true;
          remoteIdentityRef.current = other.identity;
          setWebrtcStatus(`Peer ${other.userName || remoteUser.name} in room • Handshaking...`);
          if (isInitiator || myIdentity < other.identity) {
            await sendOfferToPeer(other.identity, true);
          }
        } else {
          peerInRoomRef.current = false;
          setWebrtcStatus(`Waiting for ${remoteUser.name} to join room...`);
        }
        return;
      }

      if (msg.type === "presence_joined" && msg.senderIdentity && msg.senderIdentity !== myIdentity) {
        peerInRoomRef.current = true;
        remoteIdentityRef.current = msg.senderIdentity;
        setWebrtcStatus(`${msg.senderName || remoteUser.name} joined • Negotiating WebRTC...`);
        if (isInitiator || myIdentity < msg.senderIdentity) {
          await sendOfferToPeer(msg.senderIdentity, true);
        }
        return;
      }

      if (msg.type === "presence_left") {
        peerInRoomRef.current = false;
        setHasRemoteVideo(false);
        setWebrtcStatus(`${remoteUser.name} left the call`);
        return;
      }

      if (msg.type === "offer" && msg.payload?.description) {
        peerInRoomRef.current = true;
        if (msg.senderIdentity) remoteIdentityRef.current = msg.senderIdentity;
        const polite = !isInitiator || myIdentity > (msg.senderIdentity || "");
        const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";
        ignoreOfferRef.current = !polite && offerCollision;
        if (ignoreOfferRef.current) return;

        try {
          if (offerCollision && polite) {
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.description));
          while (pendingIceRef.current.length > 0) {
            const c = pendingIceRef.current.shift()!;
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          realtimeClient.send({
            type: "answer",
            roomName: activeRoomName,
            targetIdentity: msg.senderIdentity || remoteIdentityRef.current || undefined,
            payload: { description: pc.localDescription },
          });
        } catch (err) {
          console.warn("[WebRTC] Error handling offer:", err);
        }
        return;
      }

      if (msg.type === "answer" && msg.payload?.description) {
        try {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.description));
            while (pendingIceRef.current.length > 0) {
              const c = pendingIceRef.current.shift()!;
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }
          }
        } catch (err) {
          console.warn("[WebRTC] Error handling answer:", err);
        }
        return;
      }

      if (msg.type === "candidate" && msg.payload?.candidate) {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
          } else {
            pendingIceRef.current.push(msg.payload.candidate);
          }
        } catch {
          // ignore late ICE candidate
        }
        return;
      }

      if (msg.type === "translation_event" && msg.payload) {
        const { direction, gloss, glosses, subtitle, pose_sequence, audioWavBase64, markers } = msg.payload;
        if (direction === "voice_to_sign_interim") {
          if (subtitle) {
            setActiveDirectionTag(`${remoteUser.name} • Live Speech → Sign`);
            setActiveSubtitle(subtitle);
          }
          return;
        }

        if (gloss || glosses) setActiveGloss(gloss || glosses);
        if (subtitle) setActiveSubtitle(subtitle);

        if (direction === "voice_to_sign") {
          setActiveDirectionTag(`${remoteUser.name} • Voice → Sign`);
          const frames: PoseKeyframe[] =
            Array.isArray(pose_sequence) && pose_sequence.length > 0
              ? pose_sequence
              : [
                  { t: 0, right_wrist: [0.68, 0.34, 0.08], left_wrist: [0.35, 0.72, 0.0], right_open: 0.9, left_open: 0.4, elbow_angle: 55 },
                  { t: 0.5, right_wrist: [0.76, 0.28, 0.14], left_wrist: [0.35, 0.72, 0.0], right_open: 1.0, left_open: 0.4, elbow_angle: 75 },
                  { t: 1, right_wrist: [0.66, 0.36, 0.10], left_wrist: [0.35, 0.72, 0.0], right_open: 0.8, left_open: 0.4, elbow_angle: 60 },
                ];
          setHasIncomingSignPose(true);
          remotePoseQueueRef.current = {
            frames,
            gloss: glosses || gloss || "SIGN",
            markers,
            until: Date.now() + Math.max(3200, frames.length * 110),
          };
        } else if (direction === "sign_to_voice" && subtitle) {
          setActiveDirectionTag(`${remoteUser.name} • Sign → Voice`);
          speakTranslatedText(subtitle, audioWavBase64);
        }
      }
    });

    // Load STUN/TURN ICE config dynamically from backend, acquire local media, and join room
    const startMedia = async () => {
      try {
        const res = await fetch("/api/webrtc/ice-servers", { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          turnConfiguredRef.current = Boolean(data.turnConfigured);
          if (Array.isArray(data.iceServers) && data.iceServers.length > 0 && !cancelled) {
            pc.setConfiguration({ iceServers: data.iceServers });
          }
        }
      } catch {
        // fallback to default Google STUN servers
      }

      let hasVideoTrack = false;
      let hasAudioTrack = false;

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: isCamOnRef.current
              ? { width: 640, height: 480, facingMode: isFrontCameraRef.current ? "user" : "environment" }
              : false,
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        stream.getAudioTracks().forEach((t) => {
          t.enabled = !isMutedRef.current;
        });
        localStreamRef.current = stream;
        setMediaReadyTick((v) => v + 1);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        stream.getTracks().forEach((track) => {
          if (track.kind === "video") hasVideoTrack = true;
          if (track.kind === "audio") hasAudioTrack = true;
          pc.addTrack(track, stream);
        });
      } catch (err) {
        console.warn("[WebRTC] Media devices unavailable:", err);
        setWebrtcStatus("Signaling active (camera/mic unavailable — receive-only mode)");
      } finally {
        if (!cancelled) {
          // Ensure receive capability even if local webcam/mic is unavailable or denied
          try {
            if (!hasAudioTrack && !pc.getTransceivers().some((t) => t.receiver.track?.kind === "audio")) {
              pc.addTransceiver("audio", { direction: "recvonly" });
            }
            if (!hasVideoTrack && !pc.getTransceivers().some((t) => t.receiver.track?.kind === "video")) {
              pc.addTransceiver("video", { direction: "recvonly" });
            }
          } catch {}

          realtimeClient.send({
            type: "join",
            roomName: activeRoomName,
            senderIdentity: myIdentity,
            senderName: localUser?.name || "Vakhya User",
          });
        }
      }
    };

    void startMedia();

    // Real WebRTC stats polling
    const statsTimer = setInterval(async () => {
      if (!pcRef.current) return;
      try {
        const stats = await pcRef.current.getStats();
        let totalBytes = 0;
        let rttSeconds = 0;
        stats.forEach((report) => {
          if ((report.type === "outbound-rtp" || report.type === "inbound-rtp") && typeof report.bytesSent === "number") {
            totalBytes += report.bytesSent;
          }
          if ((report.type === "inbound-rtp") && typeof report.bytesReceived === "number") {
            totalBytes += report.bytesReceived;
          }
          if (report.type === "candidate-pair" && report.state === "succeeded" && typeof report.currentRoundTripTime === "number") {
            rttSeconds = report.currentRoundTripTime;
          }
        });
        const now = Date.now();
        const dt = (now - prevBytesRef.current.ts) / 1000;
        if (dt > 0.2 && totalBytes >= prevBytesRef.current.bytes) {
          const kbps = Math.round(((totalBytes - prevBytesRef.current.bytes) * 8) / dt / 1000);
          setBitrateKbps(kbps);
        }
        prevBytesRef.current = { bytes: totalBytes, ts: now };
        if (rttSeconds > 0) {
          setLatencyMs(Math.round(rttSeconds * 1000));
        }
      } catch {
        // ignore stats error during close
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(statsTimer);
      unsubscribe();
      realtimeClient.send({
        type: "leave",
        roomName: activeRoomName,
        senderIdentity: myIdentity,
      });
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      pc.close();
      pcRef.current = null;
    };
  }, [activeRoomName]);

  // Keep local PiP video bound whenever camera toggles on/off
  useEffect(() => {
    if (isCamOn && localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [isCamOn, mediaReadyTick]);

  // Live mute toggle on existing tracks
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted;
    });
  }, [isMuted]);

  // Live camera toggle or front/back flip without dropping WebRTC call
  const mountedCamEffectRef = useRef(false);
  useEffect(() => {
    if (!mountedCamEffectRef.current) {
      mountedCamEffectRef.current = true;
      return;
    }
    const updateVideoTrack = async () => {
      const pc = pcRef.current;
      const stream = localStreamRef.current;
      if (!stream) return;

      if (!isCamOn) {
        stream.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
        return;
      }

      const existing = stream.getVideoTracks()[0];
      if (existing && existing.readyState === "live") {
        existing.stop();
        stream.removeTrack(existing);
      }

      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: isFrontCamera ? "user" : "environment" },
          audio: false,
        });
        const newTrack = camStream.getVideoTracks()[0];
        if (!newTrack) return;
        stream.addTrack(newTrack);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        const videoSender = pc?.getSenders().find((s) => s.track?.kind === "video" || !s.track);
        if (videoSender) {
          await videoSender.replaceTrack(newTrack);
        } else if (pc) {
          pc.addTrack(newTrack, stream);
        }
      } catch (err) {
        console.warn("[WebRTC] Failed switching camera:", err);
      }
    };
    void updateVideoTrack();
  }, [isCamOn, isFrontCamera]);

  // Live Microphone Speech -> Voice-to-Sign (Low-latency SpeechRecognition + MediaRecorder audio fallback)
  useEffect(() => {
    if (isMuted) return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const dispatchVoiceToSign = async (transcript: string) => {
      const clean = transcript.trim();
      if (!clean) return;
      setOutgoingCaption(`You Spoke: "${clean}"`);
      try {
        const res = await fetch("/api/translate/sentence-to-gloss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentence: clean, signLanguage }),
        });
        const data = await res.json();
        const glosses = data.glosses || clean.toUpperCase();
        realtimeClient.send({
          type: "translation_event",
          roomName: activeRoomName,
          payload: {
            direction: "voice_to_sign",
            glosses,
            subtitle: clean,
            markers: data.markers,
            pose_sequence: data.pose_sequence || [],
          },
        });
      } catch {
        // ignore transient network failure
      }
    };

    if (SpeechRec) {
      let stopped = false;
      let lastInterimSent = 0;
      let lastFinalSegment = "";
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = async (event: any) => {
        const lastIdx = event.results.length - 1;
        const result = event.results[lastIdx];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript) return;

        setOutgoingCaption(`You Spoke: "${transcript}"`);
        const now = Date.now();
        if (!result.isFinal) {
          if (now - lastInterimSent > 550) {
            lastInterimSent = now;
            realtimeClient.send({
              type: "translation_event",
              roomName: activeRoomName,
              payload: {
                direction: "voice_to_sign_interim",
                subtitle: transcript,
              },
            });
          }
          return;
        }

        if (transcript === lastFinalSegment) return;
        lastFinalSegment = transcript;
        await dispatchVoiceToSign(transcript);
      };

      recognition.onend = () => {
        if (!stopped && !isMutedRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      try {
        recognition.start();
      } catch {}

      return () => {
        stopped = true;
        try {
          recognition.stop();
        } catch {}
      };
    }

    // Fallback for browsers without Web Speech API (Firefox/WebView): voiced MediaRecorder chunks -> /api/translate/audio-to-gloss
    const stream = localStreamRef.current;
    if (!stream || stream.getAudioTracks().length === 0 || typeof MediaRecorder === "undefined") {
      return;
    }

    let stopped = false;
    const audioOnlyStream = new MediaStream(stream.getAudioTracks());
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let maxRmsInChunk = 0;
    let rmsRaf = 0;

    try {
      audioCtx = new AudioContext();
      const src = audioCtx.createMediaStreamSource(audioOnlyStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const bins = new Uint8Array(analyser.frequencyBinCount);
      const measureRms = () => {
        if (stopped || !analyser) return;
        analyser.getByteTimeDomainData(bins);
        let sum = 0;
        for (let i = 0; i < bins.length; i++) {
          const v = (bins[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / bins.length);
        if (rms > maxRmsInChunk) maxRmsInChunk = rms;
        rmsRaf = requestAnimationFrame(measureRms);
      };
      measureRms();
    } catch {}

    const runChunk = () => {
      if (stopped || isMutedRef.current) return;
      maxRmsInChunk = 0;
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(audioOnlyStream, { mimeType: "audio/webm" });
      } catch {
        try {
          recorder = new MediaRecorder(audioOnlyStream);
        } catch {
          return;
        }
      }
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        if (stopped) return;
        const hadVoice = maxRmsInChunk > 0.035;
        if (hadVoice && chunks.length > 0) {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = String(reader.result || "");
            if (!base64Audio) return;
            try {
              const res = await fetch("/api/translate/audio-to-gloss", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  base64Audio,
                  mimeType: recorder.mimeType || "audio/webm",
                  signLanguage,
                }),
              });
              const data = await res.json();
              if (res.ok && data.text) {
                setOutgoingCaption(`You Spoke: "${data.text}"`);
                realtimeClient.send({
                  type: "translation_event",
                  roomName: activeRoomName,
                  payload: {
                    direction: "voice_to_sign",
                    glosses: data.glosses || data.text.toUpperCase(),
                    subtitle: data.text,
                    markers: data.markers,
                    pose_sequence: data.pose_sequence || [],
                  },
                });
              }
            } catch {}
          };
          reader.readAsDataURL(blob);
        }
        if (!stopped) setTimeout(runChunk, 80);
      };
      try {
        recorder.start();
        setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, 2600);
      } catch {}
    };

    runChunk();
    return () => {
      stopped = true;
      if (rmsRaf) cancelAnimationFrame(rmsRaf);
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [isMuted, activeRoomName, signLanguage, mediaReadyTick]);

  // Default / Reset PiP Position to Bottom-Right Corner
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPipPosition({
        x: rect.width - pipWidth - 16,
        y: rect.height - pipHeight - 140,
      });
    }
  }, [pipSize]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPipPosition((prev) => {
          const isLeft = prev.x < rect.width / 2;
          const isTop = prev.y < rect.height / 2;
          return {
            x: isLeft ? 16 : rect.width - pipWidth - 16,
            y: isTop ? 16 : rect.height - pipHeight - 140,
          };
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pipWidth, pipHeight]);

  const handleDragEnd = (_event: any, info: any) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const corners = {
      "top-left": { x: 16, y: 16 },
      "top-right": { x: rect.width - pipWidth - 16, y: 16 },
      "bottom-left": { x: 16, y: rect.height - pipHeight - 140 },
      "bottom-right": { x: rect.width - pipWidth - 16, y: rect.height - pipHeight - 140 },
    };
    const releaseX = info.point.x - rect.left;
    const releaseY = info.point.y - rect.top;

    let closestCorner: keyof typeof corners = "bottom-right";
    let minDistance = Infinity;
    Object.entries(corners).forEach(([key, pt]) => {
      const dx = releaseX - (pt.x + pipWidth / 2);
      const dy = releaseY - (pt.y + pipHeight / 2);
      const dist = dx * dx + dy * dy;
      if (dist < minDistance) {
        minDistance = dist;
        closestCorner = key as keyof typeof corners;
      }
    });
    setPipPosition(corners[closestCorner]);
  };

  // Full-Duplex Hand Tracking (Sign-to-Voice) + Independent Incoming Voice-to-Sign Pose Rendering
  useEffect(() => {
    let rafId = 0;
    let frameCount = 0;
    let poseIdx = 0;

    initHandLandmarker().catch(() => null);
    if (!trackerRef.current) trackerRef.current = new WebcamSignTracker();

    const triggerInCallPoseToVoice = async (
      poses: PoseKeyframe[],
      framesBase64: string[],
      handSummary: string
    ) => {
      if (isInferringPoseRef.current || poses.length < 4) return;
      isInferringPoseRef.current = true;
      try {
        const res = await fetch("/api/translate/pose-to-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pose_sequence: poses.slice(-18),
            frames_base64: framesBase64.slice(0, 3),
            hand_summary: handSummary,
            signLanguage,
          }),
        });
        const data = await res.json();
        if (res.ok && data.recognized !== false && data.sentence) {
          const now = Date.now();
          const isDup =
            lastSentSignRef.current.sentence.toLowerCase() === String(data.sentence).toLowerCase() &&
            now - lastSentSignRef.current.ts < 3500;
          if (!isDup) {
            lastSentSignRef.current = { sentence: data.sentence, ts: now };
            setOutgoingCaption(`You Signed [${data.gloss || "SIGN"}]: "${data.sentence}"`);
            realtimeClient.send({
              type: "translation_event",
              roomName: activeRoomName,
              payload: {
                direction: "sign_to_voice",
                gloss: data.gloss || "SIGNED",
                subtitle: data.sentence,
                audioWavBase64: data.audioWavBase64 || null,
              },
            });
          }
        }
      } catch {
        // ignore transient errors
      } finally {
        isInferringPoseRef.current = false;
      }
    };

    const renderLoop = () => {
      frameCount++;
      const now = Date.now();

      // 1. Local Camera Hand Tracking -> Sign-to-Voice (Always Active, Never Paused)
      const localCanvas = skeletonCanvasRef.current;
      if (localCanvas) {
        if (localCanvas.width !== 180) localCanvas.width = 180;
        if (localCanvas.height !== 140) localCanvas.height = 140;
        const lctx = localCanvas.getContext("2d");
        if (lctx) {
          if (isCamOnRef.current && localVideoRef.current && localVideoRef.current.readyState >= 2 && trackerRef.current) {
            const detection = trackerRef.current.detectFrame(localVideoRef.current);
            lctx.fillStyle = "rgba(24, 34, 41, 0.9)";
            lctx.fillRect(0, 0, localCanvas.width, localCanvas.height);
            drawRealHandSkeleton(lctx, localCanvas.width, localCanvas.height, detection, isFrontCameraRef.current);

            if (detection.hasActiveHands && frameCount % 3 === 0) {
              poseBufferRef.current.push(detection.poseFrame);
              if (poseBufferRef.current.length > 20) poseBufferRef.current.shift();
              handSummaryRef.current = detection.handSummary;
              if (detection.motionEnergy > peakMotionRef.current) {
                peakMotionRef.current = detection.motionEnergy;
              }

              // Capture up to 3 compact frames spaced across the signing window
              if (
                frameSnapsRef.current.length === 0 ||
                (poseBufferRef.current.length === 5 && frameSnapsRef.current.length < 2) ||
                (poseBufferRef.current.length >= 9 && frameSnapsRef.current.length < 3)
              ) {
                const snap = trackerRef.current.captureCompactFrame(localVideoRef.current, isFrontCameraRef.current);
                if (snap) frameSnapsRef.current.push(snap);
              }

              if (detection.motionEnergy < 3.0) {
                quietFramesAfterMotionRef.current += 1;
              } else {
                quietFramesAfterMotionRef.current = 0;
              }

              const hasMeaningfulGesture = peakMotionRef.current > 2.2 || poseBufferRef.current.length >= 10;
              const gestureCompleted = poseBufferRef.current.length >= 6 && quietFramesAfterMotionRef.current >= 2;
              const bufferFull = poseBufferRef.current.length >= 10;

              if (hasMeaningfulGesture && (gestureCompleted || bufferFull) && now - lastPoseInferRef.current > 1500) {
                lastPoseInferRef.current = now;
                const snapshot = [...poseBufferRef.current];
                const snaps = [...frameSnapsRef.current];
                const summary = handSummaryRef.current;
                poseBufferRef.current = [];
                frameSnapsRef.current = [];
                peakMotionRef.current = 0;
                quietFramesAfterMotionRef.current = 0;
                void triggerInCallPoseToVoice(snapshot, snaps, summary);
              }
            } else if (!detection.hasActiveHands && poseBufferRef.current.length >= 6 && peakMotionRef.current > 2.2 && now - lastPoseInferRef.current > 1500) {
              // Hands dropped out of frame right after signing -> trigger immediate recognition
              lastPoseInferRef.current = now;
              const snapshot = [...poseBufferRef.current];
              const snaps = [...frameSnapsRef.current];
              const summary = handSummaryRef.current;
              poseBufferRef.current = [];
              frameSnapsRef.current = [];
              peakMotionRef.current = 0;
              quietFramesAfterMotionRef.current = 0;
              void triggerInCallPoseToVoice(snapshot, snaps, summary);
            }
          } else {
            lctx.fillStyle = "rgba(24, 34, 41, 0.9)";
            lctx.fillRect(0, 0, localCanvas.width, localCanvas.height);
            lctx.fillStyle = "rgba(201, 169, 233, 0.75)";
            lctx.font = "8px monospace";
            lctx.fillText("CV HAND TRACKER IDLE", 10, 20);
            lctx.fillText(isCamOnRef.current ? "AWAITING CAMERA..." : "CAMERA DISABLED", 10, 36);
          }
        }
      }

      // 2. Independent Incoming Voice-to-Sign Avatar Canvas
      const remoteCanvas = remotePoseCanvasRef.current;
      const remoteQueue = remotePoseQueueRef.current;
      if (remoteCanvas && remoteQueue.frames.length > 0) {
        if (remoteCanvas.width !== 180) remoteCanvas.width = 180;
        if (remoteCanvas.height !== 140) remoteCanvas.height = 140;
        const rctx = remoteCanvas.getContext("2d");
        if (rctx) {
          if (now < remoteQueue.until) {
            if (frameCount % 5 === 0) poseIdx = (poseIdx + 1) % remoteQueue.frames.length;
            drawRemotePoseFrame(
              rctx,
              remoteCanvas.width,
              remoteCanvas.height,
              remoteQueue.frames[poseIdx],
              remoteQueue.gloss,
              remoteQueue.markers
            );
          } else {
            // Hold final pose calmly until next spoken phrase arrives
            drawRemotePoseFrame(
              rctx,
              remoteCanvas.width,
              remoteCanvas.height,
              remoteQueue.frames[remoteQueue.frames.length - 1],
              remoteQueue.gloss,
              remoteQueue.markers
            );
          }
        }
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(rafId);
  }, [activeRoomName, signLanguage]);

  return (
    <div
      ref={containerRef}
      id="incall-screen-wrapper"
      className="absolute inset-0 bg-[#111b21] z-50 overflow-hidden flex flex-col justify-between font-sans select-none"
    >
      {/* 1. TOP HEADER OVERLAY (Sleek frosted WhatsApp bar) */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/85 via-black/45 to-transparent p-5 pt-8 z-30 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={remoteUser.avatar}
              alt={remoteUser.name}
              className="w-11 h-11 rounded-full border-2 border-[#C9A9E9] bg-[#182229] p-0.5 object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full border border-[#111b21]">
              <ShieldCheck className="w-2.5 h-2.5 text-white" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-white tracking-wide">{remoteUser.name}</h3>
              <span className="text-[8px] font-mono font-bold bg-[#C9A9E9]/20 border border-[#C9A9E9]/30 px-1.5 py-0.2 rounded-full text-[#C9A9E9] uppercase">
                {remoteUser.userType.split(" ")[0]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/50 mt-0.5">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                SECURE WebRTC
              </span>
              <span>•</span>
              <span className="text-[#C9A9E9] font-semibold">{formatTime(callDuration)}</span>
            </div>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-[10px] font-mono text-white/80">
            <Lock className="w-3.5 h-3.5 text-[#C9A9E9]" />
            <span>AES-256</span>
          </div>
          <button
            onClick={() => {}}
            className="p-2 rounded-full bg-black/40 border border-white/5 hover:bg-black/60 text-white/70"
            title="Invite certified Interpreter"
          >
            <UserPlus className="w-4 h-4 text-[#C9A9E9]" />
          </button>
        </div>
      </div>

      {/* 2. MAIN MIDDLE VIDEO COMPONENT */}
      <div className="flex-1 relative flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full bg-[#111b21] overflow-hidden flex items-center justify-center">
          {/* Live Remote WebRTC Video Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            onLoadedMetadata={() => remoteVideoRef.current?.play().catch(() => {})}
            className={`absolute inset-0 w-full h-full object-cover z-20 ${hasRemoteVideo ? "block" : "opacity-0 pointer-events-none"}`}
          />

          {/* Lavender Aurora Backdrop while connecting or audio-only */}
          <div className="absolute inset-0 z-0 opacity-40">
            <motion.div
              animate={{
                x: [0, 40, -20, 0],
                y: [0, -30, 40, 0],
                scale: [1, 1.15, 0.9, 1],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#C9A9E9] to-[#7B5EA7] blur-[90px]"
            />
            <motion.div
              animate={{
                x: [0, -50, 30, 0],
                y: [0, 40, -30, 0],
                scale: [1, 0.9, 1.2, 1],
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#EFE3FB] to-[#C9A9E9] blur-[100px]"
            />
            <motion.div
              animate={{
                x: [0, 30, -30, 0],
                y: [0, 20, 20, 0],
                scale: [1, 1.1, 1, 1],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#C9A9E9] to-[#3E2C64] blur-[90px]"
            />
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,169,233,0.08)_0%,transparent_85%)] pointer-events-none z-0" />

          {!hasRemoteVideo && (
            <div className="text-center space-y-4 relative z-10 p-6">
              <div className="relative inline-block">
                <div className="absolute w-36 h-36 bg-[#C9A9E9]/10 rounded-full border border-[#C9A9E9]/20 animate-ping" style={{ animationDuration: "2.5s" }} />
                <div className="absolute w-48 h-48 bg-[#C9A9E9]/5 rounded-full border border-[#C9A9E9]/10 animate-ping" style={{ animationDuration: "4s" }} />

                <img
                  src={remoteUser.avatar}
                  alt={remoteUser.name}
                  className="w-32 h-32 rounded-full border-4 border-[#1f2c34] bg-[#182229] relative z-10 object-cover shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#C9A9E9] uppercase block font-bold">
                  Remote Video Signal
                </span>
                <h2 className="text-xl font-black text-white tracking-wide mt-1">
                  {remoteUser.name}
                </h2>
                <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto">
                  {webrtcStatus}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* A. DRAGGABLE & RESIZABLE SELF-PREVIEW WINDOW */}
        <motion.div
          drag
          dragConstraints={containerRef}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={pipPosition}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          id="draggable-self-video"
          className="absolute bg-[#182229] border-2 border-[#C9A9E9]/40 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-40 cursor-grab active:cursor-grabbing"
          style={{ top: 0, left: 0, width: pipWidth, height: pipHeight }}
        >
          {isCamOn ? (
            <video
              ref={localVideoRef}
              className={`w-full h-full object-cover rounded-2xl ${isFrontCamera ? "scale-x-[-1]" : ""}`}
              muted
              playsInline
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#111b21] space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#C9A9E9]/20 flex items-center justify-center text-white/60">
                <VideoOff className="w-5 h-5 text-[#C9A9E9]" />
              </div>
              <span className="text-[9px] font-mono text-[#C9A9E9]">Cam Off</span>
            </div>
          )}

          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[8px] font-mono text-white/90">
            YOU
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setPipSize((prev) => (prev === "sm" ? "lg" : "sm"));
            }}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-[#C9A9E9]/40 rounded-md text-white transition-colors z-50 cursor-pointer"
            title={pipSize === "sm" ? "Enlarge PiP Preview" : "Minimize PiP Preview"}
          >
            {pipSize === "sm" ? <Maximize2 className="w-3.5 h-3.5 text-[#C9A9E9]" /> : <Minimize2 className="w-3.5 h-3.5 text-[#C9A9E9]" />}
          </button>
        </motion.div>

        {/* B. LIVE TRANSLATION OVERLAY, LOCAL HAND SKELETON & INCOMING SIGN AVATAR */}
        <AnimatePresence>
          {showTranslationOverlay && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-6 pb-28 z-30">
              {/* Top-Left: Always-active local camera hand tracking for Sign-to-Voice */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute left-6 top-28 bg-[#182229]/90 backdrop-blur-md border border-[#C9A9E9]/30 rounded-2xl p-1 shadow-2xl pointer-events-auto overflow-hidden"
              >
                <div className="text-[8px] font-mono text-[#C9A9E9] px-2 py-1 bg-black/20 font-bold tracking-wider flex items-center gap-1 border-b border-white/5">
                  <Sparkles className="w-3 h-3 text-[#C9A9E9] animate-pulse" />
                  AI HAND COORDINATES
                </div>
                <canvas ref={skeletonCanvasRef} className="rounded-b-xl block" />
              </motion.div>

              {/* Top-Right: Incoming Speaker Voice-to-Sign Avatar Visualization */}
              {hasIncomingSignPose && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-6 top-28 bg-[#182229]/90 backdrop-blur-md border border-[#22D3EE]/35 rounded-2xl p-1 shadow-2xl pointer-events-auto overflow-hidden"
                >
                  <div className="text-[8px] font-mono text-[#22D3EE] px-2 py-1 bg-black/20 font-bold tracking-wider flex items-center gap-1 border-b border-white/5">
                    <Languages className="w-3 h-3 text-[#22D3EE]" />
                    INCOMING SIGN ({signLanguage})
                  </div>
                  <canvas ref={remotePoseCanvasRef} className="rounded-b-xl block" />
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto w-full max-w-xl bg-black/65 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center shadow-2xl pointer-events-auto space-y-1.5"
              >
                <div className="flex justify-between items-center text-[8px] font-mono tracking-widest text-[#C9A9E9] font-bold uppercase border-b border-white/5 pb-1">
                  <span className="flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5" />
                    {activeDirectionTag}
                  </span>
                  <span className="text-[#C9A9E9]">Active Gloss: {activeGloss}</span>
                </div>

                <p className="text-xs text-white leading-relaxed font-semibold">
                  "{activeSubtitle}"
                </p>

                {outgoingCaption && (
                  <p className="text-[10px] font-mono text-[#22D3EE]/90 truncate">
                    {outgoingCaption}
                  </p>
                )}

                <div className="flex justify-center items-center gap-4 text-[9px] text-white/40 pt-1">
                  <span>Engine: Vakhya Core 4.0</span>
                  <span>•</span>
                  <span className="text-[#22D3EE] font-semibold">
                    Latency: {latencyMs > 0 ? `${latencyMs}ms` : "Measuring..."}
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. BOTTOM CONTROL DOCK */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-10 pb-8 px-6 z-30">
        <div className="flex justify-between items-center max-w-sm mx-auto mb-4 text-[10px] font-mono text-white/50 bg-[#182229]/60 p-2 rounded-xl border border-white/5">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-[#C9A9E9]" />
            Vocal DSP: {selectedVoicePreset}
          </span>
          <span className="text-emerald-400 font-bold">
            Bitrate: {bitrateKbps > 0 ? `${bitrateKbps} kbps` : "P2P Syncing"}
          </span>
        </div>

        <div className="flex justify-between items-center max-w-md mx-auto bg-[#182229]/90 backdrop-blur-3xl border border-white/10 rounded-full px-6 py-4 shadow-2xl">
          <button
            id="incall-mute-btn"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? "bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
            }`}
            title="Mute Audio"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            id="incall-camera-btn"
            onClick={() => setIsCamOn(!isCamOn)}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              !isCamOn
                ? "bg-red-500/20 border-red-500 text-red-300"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
            }`}
            title="Toggle Camera"
          >
            {isCamOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            id="incall-flip-btn"
            onClick={() => setIsFrontCamera(!isFrontCamera)}
            className={`w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer`}
            title="Flip Camera orientation"
          >
            <RefreshCw className="w-5 h-5 text-[#C9A9E9]" />
          </button>

          <button
            id="incall-overlay-btn"
            onClick={() => setShowTranslationOverlay(!showTranslationOverlay)}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              showTranslationOverlay
                ? "bg-[#C9A9E9]/25 border-[#C9A9E9] text-[#C9A9E9]"
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
            }`}
            title="Toggle Translation Overlays"
          >
            <Languages className="w-5 h-5" />
          </button>

          <button
            id="incall-end-btn"
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg cursor-pointer animate-pulse"
            title="End Session"
          >
            <PhoneOff className="w-6 h-6 rotate-[135deg]" />
          </button>
        </div>
      </div>
    </div>
  );
}
