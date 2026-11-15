/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, PhoneOff, Video, Bell, BellOff } from "lucide-react";

interface IncomingCallIntentProps {
  isOpen: boolean;
  contact: {
    id: string;
    name: string;
    avatar: string;
    phone: string;
    userType: string;
    statusText?: string;
  } | null;
  callType: "voice" | "video";
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallIntent({
  isOpen,
  contact,
  callType,
  onAccept,
  onDecline,
}: IncomingCallIntentProps) {
  const [visualAlert, setVisualAlert] = useState(true);
  const [pulseOn, setPulseOn] = useState(false);
  const [quickReplyStatus, setQuickReplyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !contact) {
      setPulseOn(false);
      return;
    }

    let active = true;
    const interval = setInterval(() => {
      if (!active) return;
      setPulseOn((prev) => {
        const next = !prev;
        if (next) {
          try {
            if (navigator.vibrate) navigator.vibrate(180);
          } catch {}
        }
        return next;
      });
    }, 750);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, contact]);

  const handleQuickReply = (messageText: string, action: "accept" | "decline") => {
    setQuickReplyStatus(messageText);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(messageText);
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
    setTimeout(() => {
      setQuickReplyStatus(null);
      if (action === "accept") onAccept();
      else onDecline();
    }, 1200);
  };

  if (!isOpen || !contact) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-[#151B29]/95 backdrop-blur-xl z-50 flex items-center justify-center font-sans p-6 select-none"
        id="incoming-call-intent-root"
      >
        {visualAlert && (
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
              pulseOn ? "opacity-100" : "opacity-30"
            }`}
            style={{
              background:
                "radial-gradient(circle at 50% 35%, rgba(34, 243, 166, 0.14), rgba(158, 123, 255, 0.08) 45%, transparent 75%)",
            }}
          />
        )}

        <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center space-y-8">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium text-slate-400">
              {callType === "video" ? "Incoming Video Call" : "Incoming Voice Call"}
            </span>
            <button
              onClick={() => setVisualAlert((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#20293E] border border-[#9E7BFF]/25 transition-colors cursor-pointer"
              title="Toggle visual pulse alert"
            >
              {visualAlert ? <Bell className="w-3.5 h-3.5 text-[#22F3A6]" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
              {visualAlert ? "Pulse On" : "Pulse Off"}
            </button>
          </div>

          <motion.div
            animate={visualAlert && pulseOn ? { scale: 1.04 } : { scale: 1 }}
            transition={{ duration: 0.35 }}
            className="relative w-32 h-32 flex items-center justify-center"
          >
            <div
              className={`absolute -inset-3 rounded-full border-2 transition-opacity duration-500 ${
                visualAlert && pulseOn ? "border-[#22F3A6]/60 opacity-100" : "border-[#9E7BFF]/25 opacity-60"
              }`}
            />
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-28 h-28 rounded-full border-2 border-[#22F3A6] bg-[#1D2538] relative z-10 object-cover shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-white tracking-tight">{contact.name}</h2>
            <p className="text-xs text-slate-400">
              {contact.userType}
              {contact.phone ? ` · ${contact.phone}` : ""}
            </p>
          </div>

          {quickReplyStatus ? (
            <div className="w-full py-4 px-5 rounded-2xl bg-[#1D2538] border border-[#22F3A6]/35 text-sm text-[#22F3A6] font-medium">
              Sending "{quickReplyStatus}"…
            </div>
          ) : (
            <div className="flex items-center justify-center gap-8 pt-2">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onDecline}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                  aria-label="Decline call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-xs text-slate-300 font-medium">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onAccept}
                  className="w-16 h-16 rounded-full bg-[#22F3A6] hover:bg-[#19DC94] text-[#0E1523] flex items-center justify-center shadow-lg shadow-[#22F3A6]/25 transition-transform active:scale-95 cursor-pointer"
                  aria-label="Accept call"
                >
                  {callType === "video" ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                </button>
                <span className="text-xs text-[#22F3A6] font-medium">Accept</span>
              </div>
            </div>
          )}

          {!quickReplyStatus && (
            <div className="w-full pt-2 border-t border-white/10 space-y-2">
              <p className="text-[11px] text-slate-400">Quick replies</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { text: "Joining with captions", action: "accept" as const },
                  { text: "Give me a moment", action: "accept" as const },
                  { text: "Can't talk now, message me", action: "decline" as const },
                ].map((reply) => (
                  <button
                    key={reply.text}
                    onClick={() => handleQuickReply(reply.text, reply.action)}
                    className="px-3 py-1.5 rounded-lg bg-[#1D2538] hover:bg-[#27314A] border border-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    {reply.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
}
