// components/BreathingGuide/index.tsx
// Main component with Fixed TypeScript Types - COMPLETE
// File Location: components/BreathingGuide/index.tsx (REPLACE EXISTING)
//
// FIX: Proper handling of AISettingsUpdate type
// FIX: Separate defaultVoicePackId from BreathingSettings

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import {
  BreathingSettings,
  MessagesConfig,
  AIModel,
  VoiceLanguage,
  VoicePreview,
  SettingsPreview,
  AISettingsUpdate // NEW: Import the extended type
} from '@/models/types';
import {
  getDefaultMessages,
  BREATHING_DEFAULTS
} from '@/models/constants';
import { useBreathing } from '@/hooks/useBreathing';
import { useChat } from '@/hooks/useChat';
import { useVoicePack } from '@/hooks/useVoicePack';
import { SettingsPanel } from './SettingsPanel';
import { ChatPanel } from './ChatPanel';
import { BreathingDisplay } from './BreathingDisplay';
import { FloatingParticles } from '@/components/FloatingParticles';

export default function BreathingGuide() {
  // Language State
  const [currentLanguage, setCurrentLanguage] = useState<VoiceLanguage>('en');

  // UI State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');

  // Settings
  const [settings, setSettings] = useState<BreathingSettings>({
    mode: 'guided',
    sessionDuration: BREATHING_DEFAULTS.SESSION_DURATION,
    inhaleDuration: BREATHING_DEFAULTS.INHALE_DURATION,
    holdDuration: BREATHING_DEFAULTS.HOLD_DURATION,
    exhaleDuration: BREATHING_DEFAULTS.EXHALE_DURATION,
    voiceGuidance: true,
    phaseBeeps: true,
    voiceSpeed: BREATHING_DEFAULTS.VOICE_SPEED,
  });

  const [aiModel, setAIModel] = useState<AIModel>('gpt-5-nano');

  // Voice guidance
  const [customMessages, setCustomMessages] = useState<MessagesConfig>(
    getDefaultMessages(currentLanguage)
  );

  // Update messages when language changes
  useEffect(() => {
    setCustomMessages(getDefaultMessages(currentLanguage));
  }, [currentLanguage]);

  // Voice Pack Hook
  const {
    currentVoicePack,
    availableVoicePacks,
    userDefaultPackId,
    updateVoicePack,
    updateVoicePackSpeed,
    createVoicePack,
    setAsDefault,
    isLoading: isVoicePackLoading,
  } = useVoicePack();

  // Breathing Hook
  const { state, toggleBreathing, reset } = useBreathing(settings);

  // Chat Hook with voice selection
  const {
  messages,
  isThinking,
  showVoiceSelection,
  pendingClarification,
  sendMessage,
  applyPreview,
  handleVoicePackSelected,
  cancelVoiceSelection,
  handleClarificationChoice,
  cancelClarification,
} = useChat(
  customMessages,
  settings,
  aiModel,

  // Voice preview apply handler
  async (instructions, packId, onProgress) => {
    setCustomMessages(instructions);

    try {
      onProgress('Regenerating audio with new instructions...');

      const changedPhases: string[] = [];
      for (const key of Object.keys(instructions)) {
        if (JSON.stringify(instructions[key as keyof MessagesConfig]) !==
            JSON.stringify(customMessages[key as keyof MessagesConfig])) {
          changedPhases.push(key);
        }
      }

      await updateVoicePack({
        packId,
        instructions,
        phasesToUpdate: changedPhases.length > 0 ? changedPhases : undefined,
      });

      onProgress('Voice pack updated successfully!');
    } catch (error) {
      console.error('Failed to update voice pack:', error);
      onProgress('Warning: Instructions updated but voice pack regeneration failed');
    }
  },

  // Settings preview apply handler
  // Note: This now receives Partial<BreathingSettings> (already converted from AISettingsUpdate)
  (partialSettings: Partial<BreathingSettings>) => {
    console.log('Applying settings:', partialSettings);

    // Check for voice speed changes (this is a BreathingSettings property)
    if (partialSettings.voiceSpeed !== undefined &&
        currentVoicePack &&
        partialSettings.voiceSpeed !== currentVoicePack.speed) {

      const newSpeed = partialSettings.voiceSpeed;
      console.log(`Voice speed change detected: ${currentVoicePack.speed}x → ${newSpeed}x`);

      // Update voice pack speed
      updateVoicePackSpeed({
        packId: currentVoicePack.id,
        newSpeed
      })
        .then(() => {
          console.log('✅ Voice pack speed updated successfully');
        })
        .catch((error) => {
          console.error('Failed to update voice pack speed:', error);
        });
    }

    // Apply all settings (including the speed which will be reflected in state)
    setSettings(prev => {
      const updated = { ...prev, ...partialSettings };
      console.log('Settings updated:', updated);
      return updated;
    });
  }
);

  // Handlers
  const handleSettingsChange = (newSettings: Partial<BreathingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isThinking) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleVoicePackLoaded = () => {
    if (currentVoicePack?.language) {
      const packLanguage = currentVoicePack.language as VoiceLanguage;
      if (packLanguage === 'en' || packLanguage === 'hi') {
        setCurrentLanguage(packLanguage);
      }
    }
  };

  const handleLanguageChange = (language: VoiceLanguage) => {
    setCurrentLanguage(language);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 dark:from-gray-900 dark:via-purple-950/20 dark:to-indigo-950/20 flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingParticles />

      <motion.div
        className="absolute top-20 left-20 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl"
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl"
        animate={{
          x: [0, -70, 70, 0],
          y: [0, 70, -70, 0],
          scale: [1, 0.8, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-between mb-6">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2"
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="text-purple-600" size={24} />
            </motion.div>
            {settings.mode === 'guided'
              ? (currentLanguage === 'hi' ? 'AI योग गाइड' : 'AI Yoga Guide')
              : (currentLanguage === 'hi' ? 'सिंपल टाइमर' : 'Simple Timer')
            }
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-2"
          >
            <motion.button
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg transition-all ${
                showChat
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <MessageSquare size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, y: -2, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-all ${
                showSettings
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <SettingsIcon size={20} />
            </motion.button>
          </motion.div>
        </div>

        {!currentVoicePack && settings.voiceGuidance && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3"
          >
            <div className="text-sm text-blue-800 dark:text-blue-200">
              {isVoicePackLoading ? (
                <>⏳ Loading default voice...</>
              ) : (
                <>
                  {currentLanguage === 'hi'
                    ? '💡 डिफ़ॉल्ट वॉयस लोड हो रहा है...'
                    : '💡 Default voice ready to use! Create your own in Settings for a personalized experience.'
                  }
                </>
              )}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <SettingsPanel
                settings={settings}
                currentLanguage={currentLanguage}
                onSettingsChange={handleSettingsChange}
                onLanguageChange={handleLanguageChange}
                onVoicePackLoaded={handleVoicePackLoaded}
                currentInstructions={customMessages}
              />
            </motion.div>
          ) : (
            <motion.div
              key="breathing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <BreathingDisplay
                state={state}
                settings={settings}
                onToggle={toggleBreathing}
                onReset={reset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showChat && (
          <ChatPanel
      messages={messages}
      isThinking={isThinking}
      inputMessage={inputMessage}
      aiModel={aiModel}
      currentSettings={settings}
      currentInstructions={customMessages}
      currentLanguage={currentLanguage}
      currentVoicePack={currentVoicePack ? {
        id: currentVoicePack.id,
        name: currentVoicePack.name
      } : null}
      availableVoicePacks={availableVoicePacks}
      showVoiceSelection={showVoiceSelection}
      isApplyingVoice={isVoicePackLoading}
      pendingClarification={pendingClarification}
      onClarificationChoice={handleClarificationChoice}
      onCancelClarification={cancelClarification}

      onInputChange={setInputMessage}
      onSendMessage={handleSendMessage}
      onModelChange={setAIModel}
      onApplyPreview={applyPreview}
      onVoicePackSelected={handleVoicePackSelected}
      onCancelVoiceSelection={cancelVoiceSelection}
      onVoiceUpload={async (file, name) => {
        try {
          await createVoicePack({
            name,
            voiceSample: file,
            instructions: customMessages,
            language: currentLanguage,
            speed: settings.voiceSpeed,
          });
          handleVoicePackLoaded();
        } catch (error) {
          console.error('Failed to create voice pack from chat:', error);
        }
      }}
      onClose={() => setShowChat(false)}
    />
        )}
      </AnimatePresence>
    </div>
  );
}
