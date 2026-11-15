/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AnimatePresence } from "motion/react";
import { PhoneOff } from "lucide-react";
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

  const friendlyRingingText =
    ringingStatus && ringingStatus.includes("OFFLINE")
      ? "Peer is offline — ask them to open VAKHYA on their device"
      : ringingStatus && ringingStatus.includes("RINGING")
        ? "Ringing…"
        : "Calling…";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#151B29]/95 backdrop-blur-xl z-50 flex items-center justify-center font-sans overflow-hidden">
        {callState === "outgoing" && (
          <div className="text-center space-y-8 flex flex-col items-center justify-center px-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#22F3A6]/35 scale-125 animate-ping" style={{ animationDuration: "2.2s" }} />
              <img
                src={callContact?.avatar}
                alt={callContact?.name}
                className="w-28 h-28 rounded-full border-2 border-[#22F3A6] bg-[#1D2538] relative z-10 object-cover shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {callContact?.name || "Vakhya User"}
              </h3>
              <p className="text-sm text-[#22F3A6] font-medium">
                {friendlyRingingText}
              </p>
              <p className="text-xs text-slate-400">
                {callType === "video" ? "Video call with live sign & voice translation" : "Voice call"}
              </p>
            </div>

            <button
              onClick={onEndCall}
              className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer"
              title="Cancel call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}

        <IncomingCallIntent
          isOpen={callState === "incoming"}
          contact={callContact}
          callType={callType}
          onAccept={onAcceptCall}
          onDecline={onEndCall}
        />

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
