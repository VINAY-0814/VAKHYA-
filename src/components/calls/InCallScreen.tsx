/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  RefreshCw,
  Maximize2,
  Minimize2,
  Languages,
  MessageSquare,
  Send,
  Hand,
  X,
  Volume2,
  Video as VideoIcon,
} from "lucide-react";
import { realtimeClient, SignalingEvent } from "../../services/realtimeClient";
import {
  drawRealHandSkeleton,
  initHandLandmarker,
  PoseKeyframe,
  WebcamSignTracker,
} from "../../services/webcamSignTracker";
import {
  fetchTtsWav,
  playWavOrSpeech,
  unlockAudioPlayback,
} from "../../services/ttsPlayer";

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
  ctx.fillStyle = "#141A29";
  ctx.fillRect(0, 0, w, h);

  const headX = w * 0.5;
  const headY = h * 0.25;
  ctx.strokeStyle = "rgba(192, 170, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(headX, headY, 13, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle =
    markers?.eyebrows === "up"
      ? "#22F3A6"
      : markers?.eyebrows === "down"
        ? "#F43F5E"
        : "#C0AAFF";
  ctx.beginPath();
  ctx.moveTo(headX - 6, headY - 4);
  ctx.lineTo(headX - 2, headY - (markers?.eyebrows === "up" ? 6 : 4));
  ctx.moveTo(headX + 2, headY - (markers?.eyebrows === "up" ? 6 : 4));
  ctx.lineTo(headX + 6, headY - 4);
  ctx.stroke();

  const lShoulder = [w * 0.34, h * 0.45];
  const rShoulder = [w * 0.66, h * 0.45];
  const lx = Math.max(12, Math.min(w - 12, kf.left_wrist[0] * w));
  const ly = Math.max(18, Math.min(h - 12, kf.left_wrist[1] * h));
  const rx = Math.max(12, Math.min(w - 12, kf.right_wrist[0] * w));
  const ry = Math.max(18, Math.min(h - 12, kf.right_wrist[1] * h));

  ctx.strokeStyle = "#9E7BFF";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(headX, headY + 13);
  ctx.lineTo(headX, h * 0.45);
  ctx.moveTo(lShoulder[0], lShoulder[1]);
  ctx.lineTo(rShoulder[0], rShoulder[1]);
  ctx.lineTo(rx, ry);
  ctx.moveTo(lShoulder[0], lShoulder[1]);
  ctx.lineTo(lx, ly);
  ctx.stroke();

  const spreadL = 6 + kf.left_open * 10;
  const spreadR = 6 + kf.right_open * 10;
  const tips = [
    [lx - spreadL * 0.6, ly - 13],
    [lx, ly - 16],
    [lx + spreadL * 0.6, ly - 12],
    [rx - spreadR * 0.6, ry - 12],
    [rx, ry - 16],
    [rx + spreadR * 0.6, ry - 13],
  ];

  ctx.strokeStyle = "#22F3A6";
  ctx.lineWidth = 1.8;
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

  ctx.fillStyle = "#22F3A6";
  [[lx, ly], [rx, ry], ...tips].forEach(([jx, jy]) => {
    ctx.beginPath();
    ctx.arc(jx, jy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  if (gloss) {
    ctx.fillStyle = "#22F3A6";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(gloss.slice(0, 18), 8, h - 8);
  }
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
  const [showCaptions, setShowCaptions] = useState(true);
  const [showHandOverlay, setShowHandOverlay] = useState(true);
  const [showQuickMessageBar, setShowQuickMessageBar] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [activeSignLanguage, setActiveSignLanguage] = useState(
    localUser?.signLanguage || "ASL"
  );
  const [callDuration, setCallDuration] = useState(0);

  const [pipSize, setPipSize] = useState<"sm" | "lg">("sm");
  const [pipPosition, setPipPosition] = useState({ x: 16, y: 76 });
  const pipWidth = pipSize === "sm" ? 112 : 160;
  const pipHeight = pipSize === "sm" ? 152 : 216;

  // Clean live translation & connection states
  const [activeGloss, setActiveGloss] = useState("");
  const [activeSubtitle, setActiveSubtitle] = useState("");
  const [captionSpeaker, setCaptionSpeaker] = useState("");
  const [outgoingCaption, setOutgoingCaption] = useState("");
  const [handDetected, setHandDetected] = useState(false);
  const [isTranslatingSign, setIsTranslatingSign] = useState(false);
  const [hasIncomingSignPose, setHasIncomingSignPose] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [remoteAudioMutedByAutoplay, setRemoteAudioMutedByAutoplay] = useState(false);
  const [mediaReadyTick, setMediaReadyTick] = useState(0);
  const [webrtcStatus, setWebrtcStatus] = useState("Connecting video…");
  const [isPeerConnected, setIsPeerConnected] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const remotePoseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const outgoingPeerStreamRef = useRef<MediaStream | null>(null);
  const outgoingAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const rawMicTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioSenderRef = useRef<RTCRtpSender | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const txAudioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const micSourceConnectedRef = useRef<boolean>(false);
  const ttsPlaybackUntilRef = useRef<number>(0);
  const ttsPlayGenerationRef = useRef<number>(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteIdentityRef = useRef<string>(remoteUser.identity || "");
  const peerInRoomRef = useRef<boolean>(false);
  const turnConfiguredRef = useRef<boolean>(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);

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
    roomName ||
    `vakhya_call_${String(remoteUser.phone || remoteUser.id || "room").replace(/\D/g, "") || "default"}`;
  const myIdentity = localUser?.identity || realtimeClient.getIdentity();
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const isCamOnRef = useRef(isCamOn);
  isCamOnRef.current = isCamOn;
  const isFrontCameraRef = useRef(isFrontCamera);
  isFrontCameraRef.current = isFrontCamera;
  const showHandOverlayRef = useRef(showHandOverlay);
  showHandOverlayRef.current = showHandOverlay;

  const decodeBase64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const cleanB64 = String(base64).replace(/^data:audio\/[\w+;=-]+;base64,/, "");
    const binary = window.atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const speakTranslatedText = async (
    text: string,
    audioWavBase64?: string | null,
    forceSpeak = false
  ) => {
    const clean = text.trim();
    if (!clean) return;
    const now = Date.now();
    if (
      !forceSpeak &&
      lastSpokenRef.current.text.toLowerCase() === clean.toLowerCase() &&
      now - lastSpokenRef.current.ts < 3500
    ) {
      return;
    }
    lastSpokenRef.current = { text: clean, ts: now };

    await playWavOrSpeech(clean, {
      audioWavBase64,
      fetchIfMissing: true,
      voiceName: selectedVoicePreset,
      pitch: localUser?.voiceSettings?.pitch || 1.0,
      speed: localUser?.voiceSettings?.speed || 1.0,
    });
  };

  const ensureAudioMixer = async (): Promise<{
    ctx: AudioContext;
    dest: MediaStreamAudioDestinationNode;
    mixedTrack: MediaStreamTrack | null;
  } | null> => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    let ctx = audioCtxRef.current;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
        audioCtxRef.current = ctx;
      } catch {
        return null;
      }
    }

    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    let dest = txAudioDestRef.current;
    if (!dest) {
      dest = ctx.createMediaStreamDestination();
      txAudioDestRef.current = dest;
      outgoingAudioTrackRef.current = dest.stream.getAudioTracks()[0] || null;
    }

    if (rawMicTrackRef.current && !micSourceConnectedRef.current) {
      try {
        const micSource = ctx.createMediaStreamSource(new MediaStream([rawMicTrackRef.current]));
        const micGain = ctx.createGain();
        micGain.gain.value = isMutedRef.current ? 0 : 1;
        micSource.connect(micGain);
        micGain.connect(dest);
        micGainRef.current = micGain;
        micSourceConnectedRef.current = true;
      } catch {
        // Ignore if mic track cannot be attached to AudioContext
      }
    }

    return {
      ctx,
      dest,
      mixedTrack: outgoingAudioTrackRef.current,
    };
  };

  const injectAndPlayTtsAudio = async (
    text: string,
    initialWavBase64?: string | null,
    voicePreset?: string
  ): Promise<{ streamedViaWebRtc: boolean; audioWavBase64: string | null }> => {
    const clean = text.trim();
    if (!clean) return { streamedViaWebRtc: false, audioWavBase64: null };

    let wavBase64 = initialWavBase64 || null;
    if (!wavBase64) {
      try {
        const res = await fetch("/api/translate/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: clean,
            voiceSettings: {
              voiceName: voicePreset || selectedVoicePreset,
              pitch: localUser?.voiceSettings?.pitch || 1.0,
              speed: localUser?.voiceSettings?.speed || 1.0,
            },
          }),
        });
        if (res.ok) {
          const ttsData = await res.json();
          wavBase64 = ttsData.audioWavBase64 || null;
        }
      } catch {
        // fallback handled below
      }
    }

    const mixer = await ensureAudioMixer();
    const pc = pcRef.current;
    const isRtcConnected = Boolean(
      pc &&
        (pc.connectionState === "connected" ||
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed")
    );

    if (wavBase64 && mixer && mixer.ctx.state === "running") {
      try {
        const audioBuffer = await mixer.ctx.decodeAudioData(decodeBase64ToArrayBuffer(wavBase64));
        const gen = ++ttsPlayGenerationRef.current;
        const sender = audioSenderRef.current;
        let swappedTrackForTts = false;

        if (sender && mixer.mixedTrack && mixer.mixedTrack.readyState === "live") {
          if (rawMicTrackRef.current && micGainRef.current) {
            rawMicTrackRef.current.enabled = true;
            micGainRef.current.gain.setTargetAtTime(
              isMutedRef.current ? 0 : 1,
              mixer.ctx.currentTime,
              0.01
            );
          }
          if (sender.track !== mixer.mixedTrack) {
            await sender.replaceTrack(mixer.mixedTrack).catch(() => {});
          }
          swappedTrackForTts = sender.track === mixer.mixedTrack;
        }

        const nowAudio = mixer.ctx.currentTime;
        const startAt = Math.max(nowAudio, ttsPlaybackUntilRef.current);
        ttsPlaybackUntilRef.current = startAt + audioBuffer.duration + 0.05;

        const source = mixer.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(mixer.ctx.destination);
        source.connect(mixer.dest);
        source.onended = () => {
          if (ttsPlayGenerationRef.current !== gen) return;
          const rawMic = rawMicTrackRef.current;
          const currentSender = audioSenderRef.current;
          if (rawMic && currentSender && currentSender.track !== rawMic) {
            rawMic.enabled = !isMutedRef.current;
            void currentSender.replaceTrack(rawMic).catch(() => {});
          }
        };
        source.start(startAt);

        return {
          streamedViaWebRtc: Boolean(isRtcConnected && swappedTrackForTts),
          audioWavBase64: wavBase64,
        };
      } catch {
        // Fall through to element/SpeechSynthesis playback
      }
    }

    void speakTranslatedText(clean, wavBase64);
    return {
      streamedViaWebRtc: false,
      audioWavBase64: wavBase64,
    };
  };

  // Pre-warm speech voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Send a typed phrase as both Voice + Sign to the remote caller and read aloud on both sides
  const handleSendQuickPhrase = async (phraseText: string) => {
    const clean = phraseText.trim();
    if (!clean) return;
    unlockAudioPlayback();
    setQuickText("");
    setOutgoingCaption(`You: "${clean}"`);

    let glosses = clean.toUpperCase();
    let markers: any = { eyebrows: clean.includes("?") ? "up" : "neutral", mouth: "idle" };
    let pose_sequence: PoseKeyframe[] = [];

    const ttsOpts = {
      voiceName: selectedVoicePreset,
      pitch: localUser?.voiceSettings?.pitch || 1.0,
      speed: localUser?.voiceSettings?.speed || 1.0,
    };

    const [s2gResult, wavBase64] = await Promise.all([
      fetch("/api/translate/sentence-to-gloss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: clean, signLanguage: activeSignLanguage }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetchTtsWav(clean, ttsOpts),
    ]);

    if (s2gResult) {
      glosses = s2gResult.glosses || glosses;
      markers = s2gResult.markers || markers;
      pose_sequence = s2gResult.pose_sequence || [];
    }

    // Play cleanly on sender side without breaking or clipping live WebRTC mic track
    void playWavOrSpeech(clean, {
      ...ttsOpts,
      audioWavBase64: wavBase64,
      fetchIfMissing: true,
    });

    realtimeClient.send({
      type: "translation_event",
      roomName: activeRoomName,
      payload: {
        direction: "voice_to_sign",
        glosses,
        subtitle: clean,
        markers,
        pose_sequence,
      },
    });

    realtimeClient.send({
      type: "translation_event",
      roomName: activeRoomName,
      payload: {
        direction: "sign_to_voice",
        source: "quick_text",
        gloss: glosses,
        subtitle: clean,
        audioWavBase64: wavBase64,
        streamedViaWebRtc: false,
        forceSpeak: true,
      },
    });
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

    const tryPlayRemoteVideo = () => {
      const videoEl = remoteVideoRef.current;
      if (!videoEl) return;
      videoEl.play().catch(() => {
        // If unmuted autoplay is blocked, mute temporarily so remote video renders immediately
        videoEl.muted = true;
        setRemoteAudioMutedByAutoplay(true);
        videoEl.play().catch(() => {});
      });
    };

    pc.ontrack = (event) => {
      const targetStream = remoteStreamRef.current!;
      const alreadyAdded = targetStream.getTracks().some((t) => t.id === event.track.id);
      if (!alreadyAdded) {
        targetStream.addTrack(event.track);
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = new MediaStream(targetStream.getTracks());
        tryPlayRemoteVideo();
      }
      if (event.track.kind === "video") {
        setHasRemoteVideo(true);
        event.track.onunmute = () => {
          setHasRemoteVideo(true);
          tryPlayRemoteVideo();
        };
        event.track.onended = () => setHasRemoteVideo(false);
      }
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

    const shouldIOffer = (peerId?: string | null) => Boolean(peerId && myIdentity < peerId);
    const isPoliteTo = (peerId?: string | null) => Boolean(peerId && myIdentity > peerId);

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
    const syncConnectionState = () => {
      const st = pc.connectionState;
      const iceSt = pc.iceConnectionState;
      if (st === "connected" || iceSt === "connected" || iceSt === "completed") {
        didIceRestart = false;
        setIsPeerConnected(true);
        setWebrtcStatus("Connected");
      } else if (st === "connecting" || iceSt === "checking" || iceSt === "new") {
        setIsPeerConnected(false);
        setWebrtcStatus("Connecting video…");
      } else if ((st === "failed" || iceSt === "failed") && !didIceRestart && remoteIdentityRef.current) {
        didIceRestart = true;
        setWebrtcStatus("Reconnecting…");
        try {
          pc.restartIce();
          if (peerInRoomRef.current && shouldIOffer(remoteIdentityRef.current)) {
            void sendOfferToPeer(remoteIdentityRef.current, true);
          }
        } catch {}
      } else if (st === "disconnected" || st === "failed" || iceSt === "disconnected" || iceSt === "failed") {
        setIsPeerConnected(false);
        setHasRemoteVideo(false);
        setWebrtcStatus(
          (st === "failed" || iceSt === "failed") && !turnConfiguredRef.current
            ? "Connection failed — configure TURN_URLS on server"
            : "Reconnecting video…"
        );
      }
    };
    pc.onconnectionstatechange = syncConnectionState;
    pc.oniceconnectionstatechange = syncConnectionState;

    pc.onnegotiationneeded = async () => {
      if (
        peerInRoomRef.current &&
        remoteIdentityRef.current &&
        shouldIOffer(remoteIdentityRef.current)
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
          setWebrtcStatus("Connecting video…");
          if (shouldIOffer(other.identity)) {
            await sendOfferToPeer(other.identity, true);
          }
        } else {
          peerInRoomRef.current = false;
          setWebrtcStatus(`Waiting for ${remoteUser.name}…`);
        }
        return;
      }

      if (msg.type === "presence_joined" && msg.senderIdentity && msg.senderIdentity !== myIdentity) {
        peerInRoomRef.current = true;
        remoteIdentityRef.current = msg.senderIdentity;
        setWebrtcStatus("Connecting video…");
        if (shouldIOffer(msg.senderIdentity)) {
          await sendOfferToPeer(msg.senderIdentity, true);
        }
        return;
      }

      if (msg.type === "presence_left") {
        peerInRoomRef.current = false;
        setIsPeerConnected(false);
        setHasRemoteVideo(false);
        setWebrtcStatus(`${remoteUser.name} left`);
        return;
      }

      if (msg.type === "offer" && msg.payload?.description) {
        peerInRoomRef.current = true;
        if (msg.senderIdentity) remoteIdentityRef.current = msg.senderIdentity;
        const polite = isPoliteTo(msg.senderIdentity || remoteIdentityRef.current);
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
        const { direction, gloss, glosses, subtitle, pose_sequence, audioWavBase64, markers } =
          msg.payload;
        if (direction === "voice_to_sign_interim") {
          if (subtitle) {
            setCaptionSpeaker(remoteUser.name);
            setActiveSubtitle(subtitle);
          }
          return;
        }

        if (gloss || glosses) setActiveGloss(gloss || glosses);
        if (subtitle) {
          setCaptionSpeaker(remoteUser.name);
          setActiveSubtitle(subtitle);
        }

        if (direction === "voice_to_sign") {
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
            until: Date.now() + Math.max(3600, frames.length * 120),
          };
        } else if (direction === "sign_to_voice" && subtitle) {
          if (msg.payload.forceSpeak || !msg.payload.streamedViaWebRtc) {
            void speakTranslatedText(subtitle, audioWavBase64, Boolean(msg.payload.forceSpeak));
          }
        }
      }
    });

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
        // fallback to default STUN servers
      }

      let hasVideoTrack = false;
      let hasAudioTrack = false;

      const outgoingPeerStream = new MediaStream();
      outgoingPeerStreamRef.current = outgoingPeerStream;

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
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          } catch {
            // If another tab holds mic/cam or mic failed, still try video-only capture
            stream = await navigator.mediaDevices.getUserMedia({
              video: isCamOnRef.current
                ? { width: 640, height: 480, facingMode: isFrontCameraRef.current ? "user" : "environment" }
                : false,
              audio: false,
            });
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setMediaReadyTick((v) => v + 1);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        // Attach the native mic track directly so voice works even before any AudioContext gesture
        const micTrack = stream.getAudioTracks()[0];
        if (micTrack) {
          micTrack.enabled = !isMutedRef.current;
          rawMicTrackRef.current = micTrack;
          outgoingPeerStream.addTrack(micTrack);
          audioSenderRef.current = pc.addTrack(micTrack, outgoingPeerStream);
          hasAudioTrack = true;
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          hasVideoTrack = true;
          outgoingPeerStream.addTrack(videoTrack);
          pc.addTrack(videoTrack, outgoingPeerStream);
        }
      } catch {
        setWebrtcStatus("Camera/mic unavailable — receive-only mode");
      } finally {
        if (!cancelled) {
          // If no physical mic was captured, provide an AudioContext track so sign-to-voice can still transmit
          if (!hasAudioTrack) {
            const mixer = await ensureAudioMixer();
            if (mixer?.mixedTrack) {
              outgoingPeerStream.addTrack(mixer.mixedTrack);
              audioSenderRef.current = pc.addTrack(mixer.mixedTrack, outgoingPeerStream);
              hasAudioTrack = true;
            }
          }
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

    return () => {
      cancelled = true;
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
      if (outgoingAudioTrackRef.current) {
        outgoingAudioTrackRef.current.stop();
        outgoingAudioTrackRef.current = null;
      }
      rawMicTrackRef.current = null;
      audioSenderRef.current = null;
      outgoingPeerStreamRef.current = null;
      micGainRef.current = null;
      micSourceConnectedRef.current = false;
      txAudioDestRef.current = null;
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
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

  // Live mute toggle (mute mic gain if actively mixing TTS, and native mic track otherwise)
  useEffect(() => {
    if (micGainRef.current && audioCtxRef.current) {
      micGainRef.current.gain.setTargetAtTime(
        isMuted ? 0 : 1,
        audioCtxRef.current.currentTime,
        0.015
      );
    }
    const usingMixedTrack = Boolean(
      audioSenderRef.current &&
        outgoingAudioTrackRef.current &&
        audioSenderRef.current.track === outgoingAudioTrackRef.current
    );
    if (!usingMixedTrack) {
      localStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Live camera toggle or front/back flip
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
      if (existing && existing.readyState === "live" && existing.enabled === false) {
        existing.enabled = true;
        return;
      }
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
          const peerStream = outgoingPeerStreamRef.current || stream;
          if (!peerStream.getTracks().some((t) => t.id === newTrack.id)) {
            peerStream.addTrack(newTrack);
          }
          pc.addTrack(newTrack, peerStream);
        }
      } catch (err) {
        console.warn("[WebRTC] Failed switching camera:", err);
      }
    };
    void updateVideoTrack();
  }, [isCamOn, isFrontCamera]);

  // Voice-to-Sign (Web Speech API with automatic MediaRecorder audio fallback on error)
  useEffect(() => {
    if (isMuted) return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const dispatchVoiceToSign = async (transcript: string) => {
      const clean = transcript.trim();
      if (!clean) return;
      setOutgoingCaption(`You spoke: "${clean}"`);
      try {
        const res = await fetch("/api/translate/sentence-to-gloss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentence: clean, signLanguage: activeSignLanguage }),
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
      } catch {}
    };

    let stopped = false;
    let fallbackCleanup: (() => void) | null = null;

    const startMediaRecorderFallback = () => {
      if (stopped || fallbackCleanup) return;
      const stream = localStreamRef.current;
      if (!stream || stream.getAudioTracks().length === 0 || typeof MediaRecorder === "undefined") {
        return;
      }

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
                    signLanguage: activeSignLanguage,
                  }),
                });
                const data = await res.json();
                if (res.ok && data.text) {
                  setOutgoingCaption(`You spoke: "${data.text}"`);
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
          if (!stopped) setTimeout(runChunk, 100);
        };
        try {
          recorder.start();
          setTimeout(() => {
            if (recorder.state === "recording") recorder.stop();
          }, 2600);
        } catch {}
      };

      runChunk();
      fallbackCleanup = () => {
        if (rmsRaf) cancelAnimationFrame(rmsRaf);
        if (audioCtx) audioCtx.close().catch(() => {});
      };
    };

    if (SpeechRec) {
      let lastInterimSent = 0;
      let lastFinalSegment = "";
      let speechErrorCount = 0;
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = async (event: any) => {
        speechErrorCount = 0;
        const lastIdx = event.results.length - 1;
        const result = event.results[lastIdx];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript) return;

        setOutgoingCaption(`You spoke: "${transcript}"`);
        const now = Date.now();
        if (!result.isFinal) {
          if (now - lastInterimSent > 600) {
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

      recognition.onerror = (event: any) => {
        speechErrorCount++;
        const errCode = event?.error;
        if (
          errCode === "not-allowed" ||
          errCode === "service-not-allowed" ||
          errCode === "audio-capture" ||
          speechErrorCount >= 3
        ) {
          stopped = true;
          try {
            recognition.stop();
          } catch {}
          stopped = false;
          startMediaRecorderFallback();
        }
      };

      recognition.onend = () => {
        if (!stopped && !isMutedRef.current && !fallbackCleanup) {
          setTimeout(() => {
            if (!stopped && !isMutedRef.current && !fallbackCleanup) {
              try {
                recognition.start();
              } catch {}
            }
          }, 300);
        }
      };

      try {
        recognition.start();
      } catch {
        startMediaRecorderFallback();
      }

      return () => {
        stopped = true;
        try {
          recognition.stop();
        } catch {}
        if (fallbackCleanup) fallbackCleanup();
      };
    }

    startMediaRecorderFallback();
    return () => {
      stopped = true;
      if (fallbackCleanup) fallbackCleanup();
    };
  }, [isMuted, activeRoomName, activeSignLanguage, mediaReadyTick]);

  // Place self-preview cleanly in top-right below header
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPipPosition({
        x: Math.max(16, rect.width - pipWidth - 16),
        y: 76,
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
            x: isLeft ? 16 : Math.max(16, rect.width - pipWidth - 16),
            y: isTop ? 76 : Math.max(76, rect.height - pipHeight - 140),
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
      "top-left": { x: 16, y: 76 },
      "top-right": { x: Math.max(16, rect.width - pipWidth - 16), y: 76 },
      "bottom-left": { x: 16, y: Math.max(76, rect.height - pipHeight - 140) },
      "bottom-right": {
        x: Math.max(16, rect.width - pipWidth - 16),
        y: Math.max(76, rect.height - pipHeight - 140),
      },
    };
    const releaseX = info.point.x - rect.left;
    const releaseY = info.point.y - rect.top;

    let closestCorner: keyof typeof corners = "top-right";
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

  // Sign-to-Voice hand tracking + Incoming Voice-to-Sign avatar renderer
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
      setIsTranslatingSign(true);
      try {
        const res = await fetch("/api/translate/pose-to-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pose_sequence: poses.slice(-18),
            frames_base64: framesBase64.slice(0, 3),
            hand_summary: handSummary,
            signLanguage: activeSignLanguage,
            voicePreset: selectedVoicePreset,
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
            setOutgoingCaption(`You signed (${data.gloss || "SIGN"}): "${data.sentence}"`);
            const audioOut = await injectAndPlayTtsAudio(
              data.sentence,
              data.audioWavBase64 || null,
              selectedVoicePreset
            );
            realtimeClient.send({
              type: "translation_event",
              roomName: activeRoomName,
              payload: {
                direction: "sign_to_voice",
                gloss: data.gloss || "SIGNED",
                subtitle: data.sentence,
                audioWavBase64: audioOut.audioWavBase64,
                streamedViaWebRtc: audioOut.streamedViaWebRtc,
              },
            });
          }
        }
      } catch {
        // ignore transient errors
      } finally {
        isInferringPoseRef.current = false;
        setIsTranslatingSign(false);
      }
    };

    const renderLoop = () => {
      frameCount++;
      const now = Date.now();

      // 1. Hand tracking on local camera
      if (
        isCamOnRef.current &&
        localVideoRef.current &&
        localVideoRef.current.readyState >= 2 &&
        trackerRef.current
      ) {
        if (frameCount % 2 === 0) {
          const detection = trackerRef.current.detectFrame(localVideoRef.current);
          setHandDetected((prev) =>
            prev !== detection.hasActiveHands ? detection.hasActiveHands : prev
          );

          // Optional skeleton overlay directly inside self-preview
          if (showHandOverlayRef.current && skeletonCanvasRef.current) {
            const lctx = skeletonCanvasRef.current.getContext("2d");
            if (lctx) {
              if (skeletonCanvasRef.current.width !== pipWidth) skeletonCanvasRef.current.width = pipWidth;
              if (skeletonCanvasRef.current.height !== pipHeight) skeletonCanvasRef.current.height = pipHeight;
              drawRealHandSkeleton(
                lctx,
                skeletonCanvasRef.current.width,
                skeletonCanvasRef.current.height,
                detection,
                isFrontCameraRef.current
              );
            }
          }

          if (detection.hasActiveHands && frameCount % 4 === 0) {
            poseBufferRef.current.push(detection.poseFrame);
            if (poseBufferRef.current.length > 20) poseBufferRef.current.shift();
            handSummaryRef.current = detection.handSummary;
            if (detection.motionEnergy > peakMotionRef.current) {
              peakMotionRef.current = detection.motionEnergy;
            }

            if (
              frameSnapsRef.current.length === 0 ||
              (poseBufferRef.current.length === 4 && frameSnapsRef.current.length < 2) ||
              (poseBufferRef.current.length >= 8 && frameSnapsRef.current.length < 3)
            ) {
              const snap = trackerRef.current.captureCompactFrame(
                localVideoRef.current,
                isFrontCameraRef.current
              );
              if (snap) frameSnapsRef.current.push(snap);
            }

            if (detection.motionEnergy < 1.8) {
              quietFramesAfterMotionRef.current += 1;
            } else {
              quietFramesAfterMotionRef.current = 0;
            }

            const isMediaPipeHit = detection.engine === "mediapipe-hand-landmarker";
            const hasIntentionalSign =
              Boolean(detection.detectedLocalSign) ||
              (isMediaPipeHit && poseBufferRef.current.length >= 6) ||
              peakMotionRef.current > 2.4;
            const gestureCompleted =
              (Boolean(detection.detectedLocalSign) && poseBufferRef.current.length >= 5) ||
              (poseBufferRef.current.length >= 6 && quietFramesAfterMotionRef.current >= 2);
            const bufferFull = poseBufferRef.current.length >= 10;

            if (
              hasIntentionalSign &&
              (gestureCompleted || bufferFull) &&
              now - lastPoseInferRef.current > 1500
            ) {
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
          } else if (
            !detection.hasActiveHands &&
            poseBufferRef.current.length >= 5 &&
            (handSummaryRef.current.includes("localHint=") || peakMotionRef.current > 2.4) &&
            now - lastPoseInferRef.current > 1500
          ) {
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
        }
      } else if (frameCount % 10 === 0) {
        setHandDetected(false);
      }

      // 2. Incoming Voice-to-Sign Avatar Canvas
      const remoteCanvas = remotePoseCanvasRef.current;
      const remoteQueue = remotePoseQueueRef.current;
      if (remoteCanvas && remoteQueue.frames.length > 0) {
        if (remoteCanvas.width !== 156) remoteCanvas.width = 156;
        if (remoteCanvas.height !== 124) remoteCanvas.height = 124;
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
  }, [activeRoomName, activeSignLanguage, pipWidth, pipHeight]);

  return (
    <div
      ref={containerRef}
      id="incall-screen-wrapper"
      onPointerDown={() => {
        unlockAudioPlayback();
        if (audioCtxRef.current?.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        if (remoteVideoRef.current) {
          if (remoteVideoRef.current.muted) {
            remoteVideoRef.current.muted = false;
            setRemoteAudioMutedByAutoplay(false);
          }
          remoteVideoRef.current.play().catch(() => {});
        }
      }}
      className="absolute inset-0 bg-[#151B29] z-50 overflow-hidden flex flex-col justify-between font-sans select-none"
    >
      {/* 1. CLEAN TOP BAR */}
      <div className="relative z-30 flex items-center justify-between px-4 py-3.5 bg-gradient-to-b from-[#0E131F]/90 via-[#0E131F]/60 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={remoteUser.avatar}
            alt={remoteUser.name}
            className="w-10 h-10 rounded-full border border-[#22F3A6]/60 bg-[#1D2538] object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-white truncate">{remoteUser.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPeerConnected ? "bg-[#22F3A6]" : "bg-amber-400 animate-pulse"
                }`}
              />
              <span>{isPeerConnected ? formatTime(callDuration) : webrtcStatus}</span>
            </div>
          </div>
        </div>

        {/* Clean Language & Captions Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {remoteAudioMutedByAutoplay && (
            <button
              onClick={() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.muted = false;
                  remoteVideoRef.current.play().catch(() => {});
                }
                setRemoteAudioMutedByAutoplay(false);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#22F3A6] text-[#0E1523] text-xs font-semibold flex items-center gap-1 shadow-lg cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Unmute Audio</span>
            </button>
          )}
          <div className="flex items-center bg-[#1D2538]/90 border border-white/10 rounded-lg p-0.5 text-xs">
            {(["ASL", "ISL"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveSignLanguage(lang)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  activeSignLanguage === lang
                    ? "bg-[#22F3A6] text-[#0E1523]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button
            id="incall-overlay-btn"
            onClick={() => setShowCaptions(!showCaptions)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showCaptions
                ? "bg-[#9E7BFF]/20 border-[#9E7BFF]/50 text-[#E2D6FF]"
                : "bg-[#1D2538]/90 border-white/10 text-slate-300 hover:text-white"
            }`}
            title="Toggle Captions & Sign Avatar"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{showCaptions ? "Sign On" : "Sign Off"}</span>
          </button>
        </div>
      </div>

      {/* 2. FULL-BLEED VIDEO STAGE */}
      <div className="absolute inset-0 w-full h-full bg-[#151B29] flex items-center justify-center">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          onLoadedMetadata={() => remoteVideoRef.current?.play().catch(() => {})}
          onCanPlay={() => remoteVideoRef.current?.play().catch(() => {})}
          className={`absolute inset-0 w-full h-full object-cover z-10 ${
            hasRemoteVideo ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />

        {!hasRemoteVideo && (
          <div className="text-center space-y-3 relative z-10 px-6">
            <img
              src={remoteUser.avatar}
              alt={remoteUser.name}
              className="w-28 h-28 rounded-full border-2 border-[#9E7BFF]/40 bg-[#1D2538] mx-auto object-cover shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-xl font-semibold text-white">{remoteUser.name}</h2>
              <p className="text-xs text-slate-400 mt-1">{webrtcStatus}</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. SLEEK DRAGGABLE SELF-PREVIEW PiP */}
      <motion.div
        drag
        dragConstraints={containerRef}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={pipPosition}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        id="draggable-self-video"
        className="absolute bg-[#1D2538] border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-30 cursor-grab active:cursor-grabbing"
        style={{ top: 0, left: 0, width: pipWidth, height: pipHeight }}
      >
        {isCamOn ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${isFrontCamera ? "scale-x-[-1]" : ""}`}
            />
            {showHandOverlay && (
              <canvas
                ref={skeletonCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#141A29] space-y-1.5">
            <VideoOff className="w-5 h-5 text-slate-400" />
            <span className="text-[11px] text-slate-400">Camera off</span>
          </div>
        )}

        {/* Hand status indicator directly on self-preview */}
        {isCamOn && (handDetected || isTranslatingSign) && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 bg-[#0E1523]/80 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-medium text-[#22F3A6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22F3A6] animate-pulse shrink-0" />
            <span className="truncate">{isTranslatingSign ? "Translating…" : "Hand detected"}</span>
          </div>
        )}

        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {isCamOn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHandOverlay((v) => !v);
              }}
              className={`p-1 rounded-md text-white transition-colors cursor-pointer ${
                showHandOverlay ? "bg-[#22F3A6] text-[#0E1523]" : "bg-black/55 hover:bg-black/75"
              }`}
              title="Show hand landmarks on self preview"
            >
              <Hand className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPipSize((prev) => (prev === "sm" ? "lg" : "sm"));
            }}
            className="p-1 bg-black/55 hover:bg-black/75 rounded-md text-white transition-colors cursor-pointer"
            title={pipSize === "sm" ? "Larger preview" : "Smaller preview"}
          >
            {pipSize === "sm" ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
        </div>
      </motion.div>

      {/* 4. BOTTOM AREA: SIGN AVATAR + UNIFIED CAPTION + QUICK TEXT + CONTROLS */}
      <div className="relative z-30 mt-auto bg-gradient-to-t from-[#0B101B] via-[#0B101B]/85 to-transparent pt-8 pb-6 px-4 space-y-3">
        {/* Incoming Sign Avatar + Captions */}
        <AnimatePresence>
          {showCaptions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="max-w-xl mx-auto w-full flex flex-col gap-2"
            >
              {hasIncomingSignPose && (
                <div className="self-end bg-[#141A29]/95 border border-[#9E7BFF]/35 rounded-xl overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/10 text-[10px] font-medium text-[#C0AAFF]">
                    <span>Sign Preview ({activeSignLanguage})</span>
                    <button
                      onClick={() => setHasIncomingSignPose(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Hide sign avatar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <canvas ref={remotePoseCanvasRef} className="block" />
                </div>
              )}

              <div className="bg-[#141A29]/90 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-xl space-y-1">
                {activeSubtitle ? (
                  <>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-[#22F3A6]">
                        {captionSpeaker || remoteUser.name}
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        {activeGloss && (
                          <span className="text-[#C0AAFF] font-mono text-[10px] truncate">
                            {activeGloss}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void speakTranslatedText(activeSubtitle, null, true)}
                          className="p-1 rounded-md bg-white/10 hover:bg-[#22F3A6]/20 text-slate-200 hover:text-[#22F3A6] transition-colors cursor-pointer shrink-0"
                          title="Read incoming text aloud"
                          aria-label="Read incoming text aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-white font-medium leading-snug">
                      {activeSubtitle}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-300 text-center">
                    Speak or sign clearly to your camera — live translations appear here.
                  </p>
                )}

                {outgoingCaption && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                    <p className="text-xs text-[#22F3A6]/90 truncate">
                      {outgoingCaption}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const match = outgoingCaption.match(/"([^"]+)"$/);
                        const spoken = match ? match[1] : outgoingCaption;
                        void speakTranslatedText(spoken, null, true);
                      }}
                      className="p-1 rounded-md bg-white/10 hover:bg-[#22F3A6]/20 text-[#22F3A6] transition-colors cursor-pointer shrink-0"
                      title="Read your text aloud"
                      aria-label="Read your text aloud"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional Quick Type-to-Speak & Sign Drawer */}
        <AnimatePresence>
          {showQuickMessageBar && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="max-w-xl mx-auto w-full bg-[#192235] border border-white/10 rounded-2xl p-3 space-y-2.5 shadow-xl"
            >
              <div className="flex flex-wrap gap-1.5">
                {["Hello!", "Yes", "Please wait a moment", "Thank you"].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => void handleSendQuickPhrase(phrase)}
                    className="px-2.5 py-1 rounded-lg bg-[#232E47] hover:bg-[#2C3A58] text-xs text-slate-100 transition-colors cursor-pointer"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendQuickPhrase(quickText);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder="Type a message to speak & sign…"
                  className="flex-1 bg-[#111725] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#22F3A6]"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-[#22F3A6] hover:bg-[#19DC94] text-[#0E1523] transition-colors cursor-pointer"
                  title="Send as Voice & Sign"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clean 5-Button Control Dock */}
        <div className="flex justify-center items-center gap-4 max-w-md mx-auto">
          <button
            id="incall-mute-btn"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              isMuted
                ? "bg-red-500/20 border-red-400 text-red-300"
                : "bg-[#1D2538] border-white/15 text-white hover:bg-[#26314A]"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            id="incall-camera-btn"
            onClick={() => setIsCamOn(!isCamOn)}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              !isCamOn
                ? "bg-red-500/20 border-red-400 text-red-300"
                : "bg-[#1D2538] border-white/15 text-white hover:bg-[#26314A]"
            }`}
            title={isCamOn ? "Turn camera off" : "Turn camera on"}
          >
            {isCamOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            id="incall-flip-btn"
            onClick={() => setIsFrontCamera(!isFrontCamera)}
            className="w-12 h-12 rounded-full bg-[#1D2538] border border-white/15 text-white hover:bg-[#26314A] flex items-center justify-center transition-colors cursor-pointer"
            title="Switch front/back camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            id="incall-quicktext-btn"
            onClick={() => setShowQuickMessageBar((v) => !v)}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              showQuickMessageBar
                ? "bg-[#22F3A6] border-[#22F3A6] text-[#0E1523]"
                : "bg-[#1D2538] border-white/15 text-white hover:bg-[#26314A]"
            }`}
            title="Type to speak & sign"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            id="incall-end-btn"
            onClick={onEndCall}
            className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg cursor-pointer"
            title="End call"
          >
            <PhoneOff className="w-5 h-5 rotate-[135deg]" />
          </button>
        </div>
      </div>
    </div>
  );
}
