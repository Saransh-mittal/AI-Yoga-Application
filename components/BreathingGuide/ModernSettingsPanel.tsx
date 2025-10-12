// components/BreathingGuide/ModernSettingsPanel.tsx
// Redesigned Settings Panel - Clean and Modern
// Location: Replace SettingsPanel.tsx with this

'use client'

import React from 'react'
import { motion, Variants } from 'framer-motion'
import { Wind, Timer, Volume2, Bell, Play } from 'lucide-react'
import {
  BreathingSettings,
  MessagesConfig,
  VoiceLanguage,
} from '@/models/types'

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
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Breathing Mode Card */}
      <motion.div
        variants={itemVariants}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Wind className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Breathing Mode
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose your practice style
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSettingsChange({ mode: 'guided' })}
            className={`p-4 rounded-xl font-medium transition-all border-2 ${
              settings.mode === 'guided'
                ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-transparent shadow-lg'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <Wind
                size={24}
                className={
                  settings.mode === 'guided' ? 'text-white' : 'text-blue-500'
                }
              />
              <span className="text-sm">Guided</span>
              <span className="text-xs opacity-80">Anulom Vilom</span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSettingsChange({ mode: 'simple' })}
            className={`p-4 rounded-xl font-medium transition-all border-2 ${
              settings.mode === 'simple'
                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-transparent shadow-lg'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <Timer
                size={24}
                className={
                  settings.mode === 'simple' ? 'text-white' : 'text-indigo-500'
                }
              />
              <span className="text-sm">Timer</span>
              <span className="text-xs opacity-80">Simple Mode</span>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Session Duration Card */}
      <motion.div
        variants={itemVariants}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Timer className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Session Duration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {settings.sessionDuration === 0
                ? 'Continuous practice'
                : `${settings.sessionDuration} minutes`}
            </p>
          </div>
        </div>

        <input
          type="number"
          min="0"
          max="120"
          step="1"
          value={settings.sessionDuration}
          onChange={e =>
            onSettingsChange({ sessionDuration: parseInt(e.target.value) || 0 })
          }
          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder="0 for continuous"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          💡 Set to 0 for unlimited practice time
        </p>
      </motion.div>

      {/* Breathing Timings Card - Only show in guided mode */}
      {settings.mode === 'guided' && (
        <motion.div
          variants={itemVariants}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Wind className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Breathing Rhythm
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize phase durations
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Inhale */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Inhale Duration
                </label>
                <motion.span
                  key={settings.inhaleDuration}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold"
                >
                  {settings.inhaleDuration}s
                </motion.span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                value={settings.inhaleDuration}
                onChange={e =>
                  onSettingsChange({ inhaleDuration: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Hold */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Hold Duration
                </label>
                <motion.span
                  key={settings.holdDuration}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-bold"
                >
                  {settings.holdDuration}s
                </motion.span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                value={settings.holdDuration}
                onChange={e =>
                  onSettingsChange({ holdDuration: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Exhale */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Exhale Duration
                </label>
                <motion.span
                  key={settings.exhaleDuration}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold"
                >
                  {settings.exhaleDuration}s
                </motion.span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                value={settings.exhaleDuration}
                onChange={e =>
                  onSettingsChange({ exhaleDuration: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500"
              />
            </div>

            {/* Cycle Preview */}
            <div className="bg-white dark:bg-gray-700 rounded-xl p-4 mt-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Complete Cycle Duration
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  Inhale {settings.inhaleDuration}s
                </span>
                <span className="text-gray-400">→</span>
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  Hold {settings.holdDuration}s
                </span>
                <span className="text-gray-400">→</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Exhale {settings.exhaleDuration}s
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Total:{' '}
                {(settings.inhaleDuration +
                  settings.holdDuration +
                  settings.exhaleDuration) *
                  2}
                s per full cycle
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Audio Settings Card */}
      <motion.div
        variants={itemVariants}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
            <Volume2 className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Audio Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Voice guidance and sounds
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Voice Guidance Toggle */}
          <motion.label
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
          >
            <div className="flex items-center gap-3">
              <Volume2 size={20} className="text-blue-500" />
              <div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Voice Guidance
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Requires loaded voice pack
                </div>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.voiceGuidance}
                onChange={e =>
                  onSettingsChange({ voiceGuidance: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </div>
          </motion.label>

          {/* Phase Beeps Toggle */}
          {settings.mode === 'guided' && (
            <motion.label
              whileHover={{ scale: 1.01 }}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-amber-500" />
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Phase Beeps
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Sound alerts for transitions
                  </div>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.phaseBeeps}
                  onChange={e =>
                    onSettingsChange({ phaseBeeps: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
              </div>
            </motion.label>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
