// components/BreathingGuide/QuickSettings.tsx
// Quick access to essential settings without leaving breathing screen
// Location: components/BreathingGuide/QuickSettings.tsx

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Timer,
  Infinity,
  ChevronDown,
} from 'lucide-react'
import { BreathingSettings } from '@/models/types'

interface QuickSettingsProps {
  settings: BreathingSettings
  onSettingsChange: (settings: Partial<BreathingSettings>) => void
  isBreathing: boolean
}

export const QuickSettings: React.FC<QuickSettingsProps> = ({
  settings,
  onSettingsChange,
  isBreathing,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const quickToggles = [
    {
      id: 'voice',
      icon: settings.voiceGuidance ? Volume2 : VolumeX,
      label: settings.voiceGuidance ? 'Voice' : 'Voice',
      active: settings.voiceGuidance,
      action: () =>
        onSettingsChange({ voiceGuidance: !settings.voiceGuidance }),
      color: settings.voiceGuidance ? 'from-blue-500 to-cyan-500' : '',
    },
    {
      id: 'beeps',
      icon: settings.phaseBeeps ? Bell : BellOff,
      label: settings.phaseBeeps ? 'Beeps' : 'Beeps',
      active: settings.phaseBeeps,
      action: () => onSettingsChange({ phaseBeeps: !settings.phaseBeeps }),
      color: settings.phaseBeeps ? 'from-amber-500 to-orange-500' : '',
    },
    {
      id: 'duration',
      icon: settings.sessionDuration === 0 ? Infinity : Timer,
      label:
        settings.sessionDuration === 0
          ? '∞'
          : settings.sessionDuration < 1
          ? `${Math.round(settings.sessionDuration * 60)}s`
          : `${settings.sessionDuration}min`,
      active: true,
      action: () => setIsExpanded(!isExpanded),
      color: 'from-purple-500 to-indigo-500',
      showChevron: true,
    },
  ]

  const durationPresets = [
    { value: 0, label: '∞', sublabel: 'Continuous' },
    { value: 0.5, label: '30s', sublabel: '30 sec' },
    { value: 1, label: '1', sublabel: 'min' },
    { value: 3, label: '3', sublabel: 'min' },
    { value: 5, label: '5', sublabel: 'min' },
    { value: 10, label: '10', sublabel: 'min' },
    { value: 15, label: '15', sublabel: 'min' },
    { value: 20, label: '20', sublabel: 'min' },
    { value: 30, label: '30', sublabel: 'min' },
  ]

  return (
    <div className="relative">
      {/* Main Quick Settings Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2 px-3 py-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg"
      >
        {quickToggles.map((toggle, index) => {
          const Icon = toggle.icon
          const isLast = index === quickToggles.length - 1

          return (
            <React.Fragment key={toggle.id}>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggle.action}
                disabled={isBreathing && toggle.id === 'duration'}
                className={`relative flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-medium text-sm transition-all min-w-[70px] ${
                  toggle.active && !toggle.showChevron
                    ? `bg-gradient-to-r ${toggle.color} text-white shadow-md`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {/* Icon */}
                <Icon
                  size={18}
                  className={
                    toggle.active && !toggle.showChevron
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                />

                {/* Label - Always show on mobile */}
                <span className="text-xs sm:text-sm whitespace-nowrap">
                  {toggle.label}
                </span>

                {/* Chevron for duration */}
                {toggle.showChevron && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown
                      size={16}
                      className="text-gray-500 dark:text-gray-400"
                    />
                  </motion.div>
                )}
              </motion.button>

              {/* Separator */}
              {!isLast && (
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
              )}
            </React.Fragment>
          )
        })}
      </motion.div>

      {/* Duration Selector Dropdown */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-full mt-2 right-0 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-3 min-w-[200px]"
          >
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">
              Session Duration
            </div>

            <div className="grid grid-cols-3 gap-2">
              {durationPresets.map(preset => {
                const isSelected = settings.sessionDuration === preset.value

                return (
                  <motion.button
                    key={preset.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onSettingsChange({ sessionDuration: preset.value })
                      setIsExpanded(false)
                    }}
                    disabled={isBreathing}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {preset.value === 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <Infinity size={18} />
                        <span className="text-xs">{preset.sublabel}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-base font-semibold">
                          {preset.label}
                        </span>
                        <span className="text-xs opacity-70">
                          {preset.sublabel}
                        </span>
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {isBreathing && (
              <div className="mt-3 px-2 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                ⚠️ Stop breathing to change duration
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
