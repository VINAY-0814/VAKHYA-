/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserType {
  DEAF_OR_HARD_OF_HEARING = "DEAF_OR_HARD_OF_HEARING",
  HEARING_PERSON = "HEARING_PERSON",
  INTERPRETER_OR_FAMILY = "INTERPRETER_OR_FAMILY",
}

export enum SignLanguage {
  ASL = "ASL", // American Sign Language
  ISL = "ISL", // Indian Sign Language
  BSL = "BSL", // British Sign Language
  LFS = "LFS", // French Sign Language
}

export interface VoiceSettings {
  voiceId: string;
  voiceName: string;
  pitch: number;      // 0.5 to 2.0
  speed: number;      // 0.5 to 2.0
  warmth: number;     // 0 to 100
  cloningEnabled: boolean;
  clonedVoiceSampled: boolean;
}

export interface UserProfile {
  name: string;
  userType: UserType;
  primarySignLanguage: SignLanguage;
  spokenLanguage: string;
  voiceSettings: VoiceSettings;
  avatarUrl: string;
  backupEmail?: string;
  phone: string;
  accessibilitySettings: {
    textSize: "small" | "normal" | "large";
    highContrast: boolean;
    reducedMotion: boolean;
    hapticIntensity: "none" | "low" | "medium" | "high";
    captionStyle: "standard" | "large-bg" | "outline";
    avatarThemeId?: string;
    avatarBackgroundId?: string;
  };
}

export interface CallSession {
  id: string;
  remoteUserName: string;
  remoteUserType: UserType;
  status: "idle" | "incoming" | "outgoing" | "connected";
  isMuted: boolean;
  cameraEnabled: boolean;
  screenShareEnabled: boolean;
  backgroundBlur: boolean;
  noiseCancellation: boolean;
  captions: Array<{ sender: "me" | "remote"; text: string; timestamp: number; gloss?: string }>;
}

export interface LearnLesson {
  id: string;
  title: string;
  category: "Basics" | "Conversational" | "Emergency" | "Grammar";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  points: number;
  completed: boolean;
  vocab: Array<{ word: string; description: string; glossSteps: string[] }>;
}

export interface QuizQuestion {
  id: string;
  lessonId: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  signAnimationGloss: string; // The sign gloss string the quiz avatar will execute
}
