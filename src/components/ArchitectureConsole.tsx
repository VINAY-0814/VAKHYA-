/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { FileText, Copy, Check, ChevronRight, Activity, Code, Server, Heart } from "lucide-react";
import { theme } from "../theme";

export default function ArchitectureConsole() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const DIAGRAMS = {
    setup: `sequenceDiagram
    autonumber
    participant Alice as Deaf User (ASL)
    participant Vakhya as WebRTC Signal Broker
    participant Bob as Hearing User (Speech)
    participant Avatar as 3D Avatar Engine

    Note over Alice, Bob: 1. Call Initiation & Setup
    Alice->>Vakhya: POST /api/calls/initiate (Peer SDP, Codecs, Profile)
    Vakhya-->>Alice: 200 OK (Session ID: s_983)
    Vakhya->>Bob: Push Notification / WebRTC Signal (Incoming Call)
    Bob->>Vakhya: POST /api/calls/accept (Bob SDP Answer, Modulated Voice)
    Vakhya->>Alice: Signal Exchange (SDP Answer, ICE Candidates)
    
    rect rgb(30, 20, 50)
        Note over Alice, Bob: 2. Connected Session (Active Media Stream)
        Alice->>Bob: WebRTC Data Channel (Real-time Hand Skeletal Coordinates)
        Bob->>Alice: WebRTC Voice Stream (Simultaneous Speech)
        Note over Alice: Speech-to-Sign Avatar Translation
        Bob->>Avatar: Speech Audio Feed -> Streaming STT (whisper)
        Avatar->>Alice: Mapped 3D Rig Bone Transforms (Latency <400ms)
    end

    Note over Alice, Bob: 3. Teardown
    Bob->>Vakhya: POST /api/calls/terminate
    Vakhya->>Alice: Signal Session Closed
    Note over Alice, Bob: WebRTC Tunnel Closed, Summary Generated`,

    reconnect: `sequenceDiagram
    autonumber
    participant Client as Vakhya Client (Mobile)
    participant Broker as Signal Server
    participant Peer as Peer Connection

    Note over Client, Peer: Active Connection (Excellent Network)
    Client->>Peer: Continuous Media/Data Packet Exchange
    Note over Client: Network Interface Switched (WiFi -> 5G)
    Client->>Client: Detect connectionState == "disconnected"
    Client->>Client: Trigger ICE Restart (generate new credentials)
    Client->>Broker: POST /api/calls/reconnect (New ICE Gathering offer)
    Broker->>Peer: Forward ICE Restart offer
    Peer-->>Broker: SDP Answer with fresh candidates
    Broker-->>Client: SDP Answer with fresh candidates
    Note over Client, Peer: ICE Gathering Completed (Tunnel re-established)
    Client->>Peer: Resume Skeletal coordinates + audio streaming`,

    interpreter: `sequenceDiagram
    autonumber
    participant User as Call Session (Alice & Bob)
    participant Server as Vakhya Router
    participant Interp as Certified Interpreter (Sarah)

    Note over User: Ongoing 1:1 Sign-to-Speech Call
    User->>Server: POST /api/calls/add-interpreter (Specialty: Medical)
    Server->>Server: Look up active interpreter queue
    Server->>Interp: Dispatch Call Alert (Emergency Dispatch)
    Interp->>Server: Accept Dispatch (Join Session s_983)
    Server->>User: Inject SDP Invite for 3rd Peer (Three-Way Mesh)
    User->>Interp: Establish peer-to-peer connection
    Note over User, Interp: 3-Way Video Stream Connected
    Note over Interp: Translates Alice's sign / Bob's speech live`
  };

  const SCHEMA_CODE = `// Database Schema definition for Vakhya Voice Studio Profiles
model VoiceProfile {
  id               String       @id @default(uuid())
  userId           String       @unique
  user             User         @relation(fields: [userId], references: [id])
  voiceName        String       // "Warm Male", "Deep Male", "Bright Female", etc.
  pitch            Float        @default(1.0)  // 0.5 - 2.0 multiplier
  speed            Float        @default(1.0)  // 0.5 - 2.0 multiplier
  warmth           Int          @default(75)   // 0 - 100 percentage
  cloningEnabled   Boolean      @default(false)
  clonedVoiceSampled Boolean    @default(false)
  clonedEnclaveKey String?      // Encrypted storage token for locally cloned neural parameters
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  // Mapped contact voice memories
  contactMemories  ContactVoiceMemory[]
}

model ContactVoiceMemory {
  id             String       @id @default(uuid())
  voiceProfileId String
  voiceProfile   VoiceProfile @relation(fields: [voiceProfileId], references: [id])
  contactPhone   String       // Contact's normalized phone number
  assignedVoice  String       // Override voice identifier for this contact
  
  @@unique([voiceProfileId, contactPhone])
}`;

  const API_CONTRACT_CODE = `/**
 * @api {post} /api/voice-studio/switch Real-Time Voice Parameter Switch
 * @apiDescription Switch active vocal modulation presets/tuning mid-call.
 */
interface MidCallVoiceSwitchRequest {
  sessionId: string;        // Active Call Session UUID
  voicePreset: string;      // "Warm Male" | "Deep Male" | "Bright Female" | "Calm Female" | "My Cloned Voice"
  customTuning?: {
    pitch: number;          // 0.5 to 2.0 range
    rate: number;           // 0.5 to 2.0 range
    warmth: number;         // 0 to 100 index
    expressiveness: number; // 0 to 100 index
  };
}

interface MidCallVoiceSwitchResponse {
  status: "success" | "failed";
  activeVoiceId: string;
  appliedGains: {
    dspPitchShift: number;
    dspFormantWidth: number;
    dspAcousticFilter: "lp" | "none" | "hp";
  };
  appliedLatencyMs: number; // Low DSP processing overhead (<5ms dsp cycle)
}`;

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <div className={`p-6 ${theme.styles.glassDark} space-y-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300">
            <FileText className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">VAKHYA Phase 4 Engineering Specifications</h3>
            <span className="text-xs text-purple-300 font-mono font-bold">UML DIAGRAMS • VOICE SCHEMAS • PIPELINE PIPELINES</span>
          </div>
        </div>
        <p className="text-xs text-white/70 leading-relaxed max-w-3xl">
          Welcome to Vakhya's System Architecture Console. This panel provides complete access to our system integration parameters, database schemas, API contracts, and low-latency pipeline models. Select and copy the specifications below to compile in standard UML viewers.
        </p>
      </div>

      {/* Latency Budget & Decision Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`p-6 ${theme.styles.glassLight} lg:col-span-7 space-y-4`}>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-purple-300" />
            Speech-to-3D-Avatar Latency Budget
          </h4>

          <div className="space-y-4 text-xs font-sans text-white/80">
            <p>
              To maintain an unbroken conversational pacing, our flagship translation pipeline targets a maximum delay of <strong className="text-purple-300">400ms</strong> from raw acoustic vocalization to corresponding skeletal joint movement onset.
            </p>

            <div className="space-y-3">
              {[
                { stage: "Streaming Speech Input (STT)", duration: "80ms", bar: "w-[20%]", color: "bg-purple-500" },
                { stage: "Predictive NLP Grammatical Parsing", duration: "120ms", bar: "w-[30%]", color: "bg-indigo-500" },
                { stage: "Gloss-to-Motion Coordinate Mapping", duration: "90ms", bar: "w-[22.5%]", color: "bg-pink-500" },
                { stage: "WebGL WebGL Joint Node Rigging Rendering", duration: "60ms", bar: "w-[15%]", color: "bg-emerald-500" },
                { stage: "Total System Overhead Buffer", duration: "25ms", bar: "w-[6.25%]", color: "bg-gray-500" }
              ].map((item) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span>{item.stage}</span>
                    <span className="font-bold text-purple-300">{item.duration}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/45 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full ${item.bar}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase">★ Adaptive Scaling Decision Matrix</span>
              <p className="text-[11px] leading-relaxed text-white/60">
                If packet drop exceeds 8% or network ping surpasses 150ms, Vakhya automatically drops secondary asset render configurations (hair strands, clothing physics) and falls back to flat skeletal vertex wireframe representations, lowering CPU overhead by 65% and preserving translation integrity.
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 ${theme.styles.glassLight} lg:col-span-5 space-y-4`}>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
            <Server className="w-4 h-4 text-purple-300" />
            Compliance & Interoperability
          </h4>

          <div className="space-y-3 text-xs leading-relaxed text-white/70">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
              <h5 className="font-bold text-white">WCAG 2.1 AA Compliant</h5>
              <p className="text-[10px] text-white/50">Ensures correct typography sizing, screen-flashes on phone ring, and contrast checking throughout.</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
              <h5 className="font-bold text-white">HIPAA & GDPR Ready</h5>
              <p className="text-[10px] text-white/50">Local Enclave computation holds voice cloning variables and face matrices safely. Fully secure local storage.</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
              <h5 className="font-bold text-white">ITU-T H.265 / WebRTC Coexistence</h5>
              <p className="text-[10px] text-white/50">Enables high-fidelity skeletal coordinate streams sent in WebRTC DataChannels alongside standard voice packets.</p>
            </div>
          </div>
        </div>
      </div>

      {/* UML Diagrams Accordion */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider block">
          UML Sequence Flows (Mermaid Syntax)
        </h4>

        {[
          { id: "setup", title: "1. WebRTC Call Setup & Teardown Flow", code: DIAGRAMS.setup },
          { id: "reconnect", title: "2. Reconnection on Network Interface Change (ICE Restart)", code: DIAGRAMS.reconnect },
          { id: "interpreter", title: "3. Mid-Call Certified Interpreter Dispatch & Injection", code: DIAGRAMS.interpreter }
        ].map((item) => (
          <div key={item.id} className={`p-5 ${theme.styles.glassDark} space-y-3.5`}>
            <div className="flex justify-between items-center">
              <h5 className="text-xs font-bold text-white font-mono">{item.title}</h5>
              <button
                onClick={() => handleCopy(item.id, item.code)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1.5 transition-colors ${theme.styles.buttonGlass}`}
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-purple-300" />
                    <span>Copy Mermaid Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/10 overflow-x-auto max-h-60 scrollbar-thin">
              <pre className="text-[10px] font-mono text-purple-200 leading-normal select-all">
                {item.code}
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* Prisma Database Schema & Voice Switch API Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prisma Schema */}
        <div className={`p-5 ${theme.styles.glassLight} space-y-3`}>
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h5 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
              <Code className="w-4 h-4 text-purple-300" />
              Voice Studio Database Schema
            </h5>
            <button
              onClick={() => handleCopy("schema", SCHEMA_CODE)}
              className="p-1.5 rounded-lg text-white/50 hover:text-purple-300 transition-colors hover:bg-white/5"
              title="Copy Database Schema"
            >
              {copiedId === "schema" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-black/50 p-3 rounded-xl border border-white/5 max-h-80 overflow-y-auto scrollbar-thin">
            <pre className="text-[9px] font-mono text-[#C9A9E9] leading-relaxed">
              {SCHEMA_CODE}
            </pre>
          </div>
        </div>

        {/* API Switch Contract */}
        <div className={`p-5 ${theme.styles.glassLight} space-y-3`}>
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h5 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
              <Code className="w-4 h-4 text-purple-300" />
              Voice Switch Mid-Call API Contract
            </h5>
            <button
              onClick={() => handleCopy("api", API_CONTRACT_CODE)}
              className="p-1.5 rounded-lg text-white/50 hover:text-purple-300 transition-colors hover:bg-white/5"
              title="Copy API Contract"
            >
              {copiedId === "api" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-black/50 p-3 rounded-xl border border-white/5 max-h-80 overflow-y-auto scrollbar-thin">
            <pre className="text-[9px] font-mono text-[#C9A9E9] leading-relaxed">
              {API_CONTRACT_CODE}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
