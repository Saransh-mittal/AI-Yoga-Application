// models/constants.ts
// Application constants - WITH SPEED CONTROL
// File Location: models/constants.ts (REPLACE EXISTING)

import { MessagesConfig, AIModel } from './types';

// Language type
export type VoiceLanguage = 'en' | 'hi';

// English Messages (concise, self-contained)
export const DEFAULT_MESSAGES_EN: MessagesConfig = {
  'left-inhale': [
    "Breathe in deeply through your left nostril",
    "Inhale slowly through the left nostril",
    "Draw in fresh energy through your left nostril"
  ],
  'right-exhale': [
    "Exhale slowly through your right nostril",
    "Release through your right nostril",
    "Let go through the right nostril"
  ],
  'right-inhale': [
    "Breathe in deeply through your right nostril",
    "Inhale slowly through the right nostril",
    "Draw in fresh prana through your right nostril"
  ],
  'left-exhale': [
    "Exhale slowly through your left nostril",
    "Release through your left nostril",
    "Let go through the left nostril"
  ],
  hold: [
    "Hold your breath gently",
    "Retain the breath within",
    "Keep the breath steady and calm"
  ]
};

// Hindi Messages (concise, self-contained)
export const DEFAULT_MESSAGES_HI: MessagesConfig = {
  'left-inhale': [
    "बाएं नासिका से गहरी सांस लें",
    "बाएं नासिका से धीरे-धीरे सांस अंदर लें",
    "बाएं नासिका से ताजी ऊर्जा खींचें"
  ],
  'right-exhale': [
    "दाएं नासिका से धीरे-धीरे सांस छोड़ें",
    "दाएं नासिका से सांस बाहर निकालें",
    "दाएं नासिका से छोड़ें"
  ],
  'right-inhale': [
    "दाएं नासिका से गहरी सांस लें",
    "दाएं नासिका से धीरे-धीरे सांस अंदर लें",
    "दाएं नासिका से ताजी प्राण लें"
  ],
  'left-exhale': [
    "बाएं नासिका से धीरे-धीरे सांस छोड़ें",
    "बाएं नासिका से सांस बाहर निकालें",
    "बाएं नासिका से छोड़ें"
  ],
  hold: [
    "अपनी सांस को धीरे से रोकें",
    "प्राण को अंदर बनाए रखें",
    "सांस को स्थिर और शांत रखें"
  ]
};

// Helper function to get messages based on language
export const getDefaultMessages = (language: VoiceLanguage): MessagesConfig => {
  return language === 'hi' ? DEFAULT_MESSAGES_HI : DEFAULT_MESSAGES_EN;
};

// Language display names
export const LANGUAGE_NAMES: Record<VoiceLanguage, string> = {
  'en': 'English',
  'hi': 'हिंदी (Hindi)'
};

// Backward compatibility
export const DEFAULT_MESSAGES = DEFAULT_MESSAGES_EN;

export const AI_MODEL_INFO: Record<AIModel, { name: string; speed: string; cost: string; quality: string; warning: string }> = {
  'gpt-5-nano': {
    name: 'GPT-5 Nano',
    speed: 'Very Fast',
    cost: 'Low',
    quality: 'Good',
    warning: 'Uses minimal tokens - great for most use cases'
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    speed: 'Fast',
    cost: 'Medium',
    quality: 'Better',
    warning: 'Uses 2-3x more tokens than Mini - better understanding'
  },
  'gpt-5': {
    name: 'GPT-5',
    speed: 'Slower',
    cost: 'High',
    quality: 'Best',
    warning: 'Uses 15x more tokens than Mini - exhausts credits quickly!'
  }
};

export const BREATHING_DEFAULTS = {
  INHALE_DURATION: 5,
  HOLD_DURATION: 5,
  EXHALE_DURATION: 5,
  SESSION_DURATION: 10,
  COUNTDOWN_START: 5,
  VOICE_SPEED: 1.0, // NEW: Default voice speed (1.0 = normal)
};

// Voice speed presets for voice pack creation and editing
export const VOICE_SPEED_PRESETS = {
  'very-slow': { value: 0.5, label: 'Very Slow (0.5x)' },
  'slow': { value: 0.75, label: 'Slow (0.75x)' },
  'normal': { value: 1.0, label: 'Normal (1.0x)' },
  'fast': { value: 1.25, label: 'Fast (1.25x)' },
  'very-fast': { value: 1.5, label: 'Very Fast (1.5x)' },
};

export const AUDIO_FREQUENCIES = {
  INHALE: 440,
  HOLD: 523,
  EXHALE: 349,
};

export const SPEECH_SETTINGS = {
  RATE: 0.75,
  PITCH: 0.95,
  VOLUME: 0.9,
};
