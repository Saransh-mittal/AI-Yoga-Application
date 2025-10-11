// models/types.ts
// TypeScript types - WITH AI SETTINGS SUPPORT (FIXED FOR OPENAI STRUCTURED OUTPUTS)
// File Location: models/types.ts (REPLACE ENTIRE FILE)

export type BreathingPhase = 'inhale' | 'hold' | 'exhale';
export type Nostril = 'left' | 'right';
export type BreathingMode = 'guided' | 'simple';
export type AIModel = 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5';
export type VoiceLanguage = 'en' | 'hi';

export interface MessagesConfig {
  'left-inhale': string[];
  'right-exhale': string[];
  'right-inhale': string[];
  'left-exhale': string[];
  'hold': string[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  preview?: VoicePreview | SettingsPreview;
  previewId?: string;
}

export interface VoicePreview {
  type: 'voice';
  instructions: MessagesConfig;
  explanation: string;
}

export interface SettingsPreview {
  type: 'settings';
  settings: Partial<BreathingSettings>;
  explanation: string;
}

export interface BreathingState {
  isRunning: boolean;
  isCountingDown: boolean;
  countdown: number;
  phase: BreathingPhase;
  nostril: Nostril;
  phaseProgress: number;
  cycleCount: number;
  elapsedTime: number;
  isCompletingFinalCycle: boolean;
}

export interface BreathingSettings {
  mode: BreathingMode;
  sessionDuration: number;
  inhaleDuration: number;
  holdDuration: number;
  exhaleDuration: number;
  voiceGuidance: boolean;
  phaseBeeps: boolean;
  voiceSpeed: number;
}

// Extended settings type that AI returns via OpenAI Structured Outputs
// All fields are nullable (can be null if not being changed)
export interface AISettingsUpdate {
  // Breathing settings (nullable)
  mode: BreathingMode | null;
  sessionDuration: number | null;
  inhaleDuration: number | null;
  holdDuration: number | null;
  exhaleDuration: number | null;
  voiceGuidance: boolean | null;
  phaseBeeps: boolean | null;
  voiceSpeed: number | null;

  // Voice pack operations (nullable)
  defaultVoicePackId: string | null;
  voicePackSpeedUpdate: {
    packId: string;
    newSpeed: number;
  } | null;
}

/**
 * Helper type: Converts nullable fields to optional fields
 *
 * Example transformation:
 * { mode: 'guided' | null } → { mode?: 'guided' }
 */
export type NullableToOptional<T> = {
  [K in keyof T]: T[K] extends null | infer U ? U | undefined : T[K];
};

/**
 * Converts AISettingsUpdate (nullable fields) to Partial<BreathingSettings> (optional fields)
 *
 * @param aiSettings - Settings from OpenAI Structured Output (with nulls)
 * @returns Settings for UI components (with undefined for missing values)
 */
export function convertAISettingsToPartial(
  aiSettings: AISettingsUpdate
): Partial<BreathingSettings> {
  const result: Partial<BreathingSettings> = {};

  // Only include non-null values
  if (aiSettings.mode !== null) {
    result.mode = aiSettings.mode;
  }
  if (aiSettings.sessionDuration !== null) {
    result.sessionDuration = aiSettings.sessionDuration;
  }
  if (aiSettings.inhaleDuration !== null) {
    result.inhaleDuration = aiSettings.inhaleDuration;
  }
  if (aiSettings.holdDuration !== null) {
    result.holdDuration = aiSettings.holdDuration;
  }
  if (aiSettings.exhaleDuration !== null) {
    result.exhaleDuration = aiSettings.exhaleDuration;
  }
  if (aiSettings.voiceGuidance !== null) {
    result.voiceGuidance = aiSettings.voiceGuidance;
  }
  if (aiSettings.phaseBeeps !== null) {
    result.phaseBeeps = aiSettings.phaseBeeps;
  }
  if (aiSettings.voiceSpeed !== null) {
    result.voiceSpeed = aiSettings.voiceSpeed;
  }

  return result;
}

export interface ChatState {
  messages: Message[];
  isThinking: boolean;
  showChat: boolean;
}

export interface AISettings {
  model: AIModel;
  usageWarning: string;
}

export interface APIRequest {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentMessages: MessagesConfig;
  currentSettings: BreathingSettings;
  model: AIModel;
  clarificationResponse?: { // NEW: Optional clarification response
    selectedOptionId: string;
    originalPrompt: string;
    confirmedAction: any;
  };
}


// REPLACE WITH THIS:
/**
 * Clarification option presented to user
 */
export interface ClarificationOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
  action: {
    type: 'update_settings' | 'update_messages';
    payload: any;
  };
}

/**
 * Clarification request from AI
 */
export interface ClarificationRequest {
  question: string;
  context: string;
  options: ClarificationOption[];
  originalPrompt: string;
}

/**
 * User's clarification response
 */
export interface ClarificationResponse {
  selectedOptionId: string;
  originalPrompt: string;
  confirmedAction: {
    type: 'update_settings' | 'update_messages';
    payload: any;
  };
}

/**
 * API Response with clarification support
 */
export interface APIResponse {
  type: 'update_messages' | 'update_settings' | 'chat' | 'error' | 'clarification_needed';
  message?: string;
  instructions?: MessagesConfig;
  settings?: AISettingsUpdate;
  explanation?: string;
  clarification?: ClarificationRequest; // NEW field
}
