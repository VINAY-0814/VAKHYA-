/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PhoneOff,
  Video,
  Mic,
  MicOff,
  Sparkles,
  ShieldAlert,
  Sliders,
  Maximize2,
  Copy,
  MessageSquare,
  Volume2,
  UserCheck,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  Send,
  AlertTriangle,
  UserPlus,
  Smartphone,
  Zap,
  VolumeX,
  Languages,
  Bell
} from "lucide-react";
import { theme } from "../theme";
import InCallScreen from "./calls/InCallScreen";
import IncomingCallIntent from "./IncomingCallIntent";

interface CallingOverlayProps {
  callState: "idle" | "incoming" | "outgoing" | "connected" | "ended";
  callContact: any;
  callType: "voice" | "video";
  onEndCall: () => void;
  onAcceptCall: () => void;
  selectedVoicePreset: string;
  onUpdateVoicePreset: (preset: string) => void;
  roomName?: string;
  localUser?: any;
  isInitiator?: boolean;
  ringingStatus?: string;
}

export default function CallingOverlay({
  callState,
  callContact,
  callType,
  onEndCall,
  onAcceptCall,
  selectedVoicePreset,
  onUpdateVoicePreset,
  roomName,
  localUser,
  isInitiator = true,
  ringingStatus,
}: CallingOverlayProps) {
  if (callState === "idle") return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-50 flex items-center justify-center font-sans overflow-hidden">
        {/* 1. OUTGOING CALL VIEW */}
        {callState === "outgoing" && (
          <div className="text-center space-y-8 flex flex-col items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#8A5CF6] rounded-full filter blur-2xl opacity-20 animate-pulse" />
              <div className="absolute inset-0 border border-[#D96FF2]/30 rounded-full scale-125 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-0 border border-purple-500/10 rounded-full scale-150 animate-ping" style={{ animationDuration: "3s" }} />
              <img
                src={callContact?.avatar}
                alt={callContact?.name}
                className="w-24 h-24 rounded-full border-2 border-[#D96FF2] relative z-10"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">{callContact?.name}</h3>
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-widest font-mono animate-pulse block">
                {ringingStatus || "SECURING WebRTC SIGNALLING..."}
              </span>
            </div>

            <button
              onClick={onEndCall}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* 2. INCOMING CALL VIEW */}
        <IncomingCallIntent
          isOpen={callState === "incoming"}
          contact={callContact}
          callType={callType}
          onAccept={onAcceptCall}
          onDecline={onEndCall}
        />

        {/* 3. CONNECTED ACTIVE CALL VIEW */}
        {callState === "connected" && (
          <InCallScreen
            remoteUser={
              callContact || {
                name: "Vakhya Peer",
                avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=peer",
                phone: "",
                userType: "Profile",
              }
            }
            callType={callType}
            onEndCall={onEndCall}
            selectedVoicePreset={selectedVoicePreset}
            onUpdateVoicePreset={onUpdateVoicePreset}
            roomName={roomName}
            localUser={localUser}
            isInitiator={isInitiator}
          />
        )}
      </div>
    </AnimatePresence>
  );
}
