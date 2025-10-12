// components/BreathingGuide/SettingsPanel.tsx
// Settings Panel WITHOUT Voice Speed - UPDATED
// File Location: components/BreathingGuide/SettingsPanel.tsx (REPLACE EXISTING)
//
// CHANGE: Removed voice speed control (now part of voice pack creation)
// REASON: Voice speed affects TTS generation, so it's a voice pack property

'use client'

import React from 'react'
import { motion, Variants } from 'framer-motion'
import {
  BreathingSettings,
  MessagesConfig,
  VoiceLanguage,
} from '@/models/types'
import { VoicePackManager } from '../BreathingGuide/VoicePackManager'

interface SettingsPanelProps {
  settings: BreathingSettings
  currentInstructions: MessagesConfig
  currentLanguage: VoiceLanguage
  onSettingsChange: (settings: Partial<BreathingSettings>) => void
  onLanguageChange: (language: VoiceLanguage) => void
  onVoicePackLoaded: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  currentInstructions,
  currentLanguage,
  onSettingsChange,
  onLanguageChange,
  onVoicePackLoaded,
}) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 mb-6 p-5 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl max-h-[70vh] overflow-y-auto"
    >
      <motion.h2
        variants={itemVariants}
        className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2"
      >
        <motion.div
          animate={{ rotate: [0, 90, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ⚙️
        </motion.div>
        {currentLanguage === 'hi' ? 'सेटिंग्स' : 'Settings'}
      </motion.h2>

      {/* Voice Pack Management */}
      <motion.div
        variants={itemVariants}
        className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700"
      >
        <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-3 flex items-center gap-2">
          🎤{' '}
          {currentLanguage === 'hi'
            ? 'वॉयस पैक प्रबंधन'
            : 'Voice Pack Management'}
        </h3>
        <VoicePackManager
          currentInstructions={currentInstructions}
          currentLanguage={currentLanguage}
          onVoicePackLoaded={onVoicePackLoaded}
        />
      </motion.div>

      {/* Mode Selection */}
      <motion.div variants={itemVariants}>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
          {currentLanguage === 'hi' ? 'मोड' : 'Mode'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSettingsChange({ mode: 'guided' })}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
              settings.mode === 'guided'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            <span className="relative z-10">
              🧘 {currentLanguage === 'hi' ? 'निर्देशित' : 'Guided'}
            </span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSettingsChange({ mode: 'simple' })}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
              settings.mode === 'simple'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            <span className="relative z-10">
              ⏱️ {currentLanguage === 'hi' ? 'टाइमर' : 'Timer'}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Session Duration */}
      <motion.div variants={itemVariants}>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
          {currentLanguage === 'hi' ? 'सत्र अवधि' : 'Session Duration'}:{' '}
          {settings.sessionDuration === 0
            ? currentLanguage === 'hi'
              ? 'निरंतर'
              : 'Continuous'
            : `${settings.sessionDuration} ${
                currentLanguage === 'hi' ? 'मिनट' : 'min'
              }`}
        </label>
        <motion.input
          whileFocus={{ scale: 1.02 }}
          type="number"
          min="0"
          max="120"
          step="1"
          value={settings.sessionDuration}
          onChange={e =>
            onSettingsChange({ sessionDuration: parseInt(e.target.value) || 0 })
          }
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          placeholder={
            currentLanguage === 'hi' ? '0 निरंतर के लिए' : '0 for continuous'
          }
        />
      </motion.div>

      {/* Breathing Timings */}
      {settings.mode === 'guided' && (
        <motion.div
          variants={itemVariants}
          className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {currentLanguage === 'hi' ? 'श्वास समय' : 'Breathing Timings'}
          </h3>

          <motion.div variants={itemVariants}>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              {currentLanguage === 'hi' ? 'श्वास अंदर' : 'Inhale'}:{' '}
              <motion.span
                key={settings.inhaleDuration}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-blue-600 dark:text-blue-400"
              >
                {settings.inhaleDuration}
                {currentLanguage === 'hi' ? 'से' : 's'}
              </motion.span>
            </label>
            <input
              type="range"
              min="2"
              max="15"
              value={settings.inhaleDuration}
              onChange={e =>
                onSettingsChange({ inhaleDuration: parseInt(e.target.value) })
              }
              className="w-full accent-blue-600"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              {currentLanguage === 'hi' ? 'रोकें' : 'Hold'}:{' '}
              <motion.span
                key={settings.holdDuration}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-purple-600 dark:text-purple-400"
              >
                {settings.holdDuration}
                {currentLanguage === 'hi' ? 'से' : 's'}
              </motion.span>
            </label>
            <input
              type="range"
              min="2"
              max="15"
              value={settings.holdDuration}
              onChange={e =>
                onSettingsChange({ holdDuration: parseInt(e.target.value) })
              }
              className="w-full accent-purple-600"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              {currentLanguage === 'hi' ? 'श्वास बाहर' : 'Exhale'}:{' '}
              <motion.span
                key={settings.exhaleDuration}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-green-600 dark:text-green-400"
              >
                {settings.exhaleDuration}
                {currentLanguage === 'hi' ? 'से' : 's'}
              </motion.span>
            </label>
            <input
              type="range"
              min="2"
              max="15"
              value={settings.exhaleDuration}
              onChange={e =>
                onSettingsChange({ exhaleDuration: parseInt(e.target.value) })
              }
              className="w-full accent-green-600"
            />
          </motion.div>

          <motion.label
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg cursor-pointer"
          >
            <input
              type="checkbox"
              checked={settings.phaseBeeps}
              onChange={e => onSettingsChange({ phaseBeeps: e.target.checked })}
              className="w-4 h-4 rounded accent-purple-600"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentLanguage === 'hi' ? 'चरण बीप' : 'Phase Beeps'}
              </div>
            </div>
          </motion.label>
        </motion.div>
      )}

      {/* Voice Guidance Toggle */}
      <motion.label
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg cursor-pointer"
      >
        <input
          type="checkbox"
          checked={settings.voiceGuidance}
          onChange={e => onSettingsChange({ voiceGuidance: e.target.checked })}
          className="w-4 h-4 rounded accent-purple-600"
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentLanguage === 'hi' ? 'वॉयस मार्गदर्शन' : 'Voice Guidance'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {currentLanguage === 'hi'
              ? 'एक लोड किए गए वॉयस पैक की आवश्यकता है'
              : 'Requires a loaded voice pack'}
          </div>
        </div>
      </motion.label>
    </motion.div>
  )
}
