// components/BreathingGuide/EnhancedBreathingDisplay.tsx
// Calming, larger breathing visualization with fluid animations
// Location: components/BreathingGuide/EnhancedBreathingDisplay.tsx

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Sparkles } from 'lucide-react'
import { BreathingState, BreathingSettings } from '@/models/types'

interface EnhancedBreathingDisplayProps {
  state: BreathingState
  settings: BreathingSettings
  onToggle: () => void
  onReset: () => void
}

export const EnhancedBreathingDisplay: React.FC<
  EnhancedBreathingDisplayProps
> = ({ state, settings, onToggle, onReset }) => {
  const getPhaseDuration = (): number => {
    if (state.phase === 'hold') return settings.holdDuration
    if (state.phase === 'inhale') return settings.inhaleDuration
    return settings.exhaleDuration
  }

  const getPhaseColor = (): { from: string; to: string; glow: string } => {
    if (state.phase === 'hold') {
      return { from: '#8b5cf6', to: '#6366f1', glow: 'rgba(139, 92, 246, 0.4)' }
    }
    if (state.nostril === 'left') {
      return state.phase === 'inhale'
        ? { from: '#3b82f6', to: '#06b6d4', glow: 'rgba(59, 130, 246, 0.4)' }
        : { from: '#10b981', to: '#14b8a6', glow: 'rgba(16, 185, 129, 0.4)' }
    }
    return state.phase === 'inhale'
      ? { from: '#f59e0b', to: '#f97316', glow: 'rgba(245, 158, 11, 0.4)' }
      : { from: '#14b8a6', to: '#06b6d4', glow: 'rgba(20, 184, 166, 0.4)' }
  }

  const getPhaseText = (): string => {
    if (state.phase === 'hold') return 'Hold'
    const nostrilText = state.nostril === 'left' ? 'Left' : 'Right'
    const phaseText = state.phase.charAt(0).toUpperCase() + state.phase.slice(1)
    return `${phaseText} - ${nostrilText}`
  }

  const getGuidanceText = (): string => {
    if (state.phase === 'hold') return 'Feel the energy within'
    if (state.nostril === 'left') {
      return state.phase === 'inhale'
        ? 'Breathe in through left nostril'
        : 'Release through right nostril'
    }
    return state.phase === 'inhale'
      ? 'Breathe in through right nostril'
      : 'Release through left nostril'
  }

  const colors = getPhaseColor()

  // Consistent scale calculation with smaller expansion range:
  // Inhale: 1.0 → 1.2 (expands 30%)
  // Hold: stays at 1.2 (pause at peak)
  // Exhale: 1.2 → 1.0 (contracts 30%)
  const scale =
    state.phase === 'inhale'
      ? 1 + (state.phaseProgress / 100) * 0.2 // 1.0 to 1.2
      : state.phase === 'exhale'
      ? 1.2 - (state.phaseProgress / 100) * 0.2 // 1.2 to 1.0
      : 1.2 // Hold at peak

  // Countdown display with pulsing animation
  if (state.isCountingDown) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-4 w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          {/* Pulsing Background */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 -m-8 sm:-m-12 md:-m-16 bg-gradient-to-br from-amber-400/30 to-orange-500/30 rounded-full blur-3xl"
          />

          {/* Countdown Number */}
          <motion.div
            key={state.countdown}
            initial={{ scale: 1.5, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative flex align-middle justify-center text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold bg-gradient-to-br from-amber-500 to-orange-600 bg-clip-text text-transparent mb-3 sm:mb-4 md:mb-6"
          >
            {state.countdown === 0 ? '✨' : state.countdown}
          </motion.div>

          {/* Message */}
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-center"
          >
            <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {state.countdown === 0 ? 'Begin!' : 'Get Ready'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {state.countdown === 0
                ? "Let's start breathing"
                : 'Prepare yourself'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // Simple Timer Mode
  if (settings.mode === 'simple') {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-4 w-full max-w-2xl mx-auto">
        {/* Timer Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-4 sm:mb-6 shrink-0"
        >
          {/* Animated Glow */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 -m-12 sm:-m-16 md:-m-20 bg-gradient-to-br from-blue-500/30 to-indigo-600/30 rounded-full blur-3xl"
          />

          {/* Timer */}
          <motion.div
            key={state.elapsedTime}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-mono font-bold bg-gradient-to-br from-blue-500 to-indigo-600 bg-clip-text text-transparent"
          >
            {Math.floor(state.elapsedTime / 60)}:
            {(state.elapsedTime % 60).toString().padStart(2, '0')}
          </motion.div>
        </motion.div>

        {/* Remaining Time */}
        {settings.sessionDuration > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4 sm:mb-6 shrink-0"
          >
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
              Time Remaining
            </p>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
              {Math.floor(
                (settings.sessionDuration * 60 - state.elapsedTime) / 60,
              )}
              :
              {((settings.sessionDuration * 60 - state.elapsedTime) % 60)
                .toString()
                .padStart(2, '0')}
            </p>
          </motion.div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center gap-4 shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggle}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all"
          >
            {state.isRunning ? (
              <Pause size={24} />
            ) : (
              <Play size={24} className="ml-0.5" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1, rotate: -90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onReset}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          >
            <RotateCcw size={20} />
          </motion.button>
        </div>
      </div>
    )
  }

  // Guided Breathing Mode
  return (
    <div className="flex flex-col items-center px-4 py-2 w-full max-w-2xl mx-auto h-full overflow-hidden">
      {/* Main Breathing Circle */}
      <div className="mt-7 relative sm:mb-4 flex-shrink-0">
        {/* Outer Glow Rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1 + i * 0.15, 1.2 + i * 0.15, 1 + i * 0.15],
              opacity: [0.15 - i * 0.05, 0.25 - i * 0.05, 0.15 - i * 0.05],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
            className="absolute inset-0 -m-8 sm:-m-12 md:-m-16 rounded-full blur-2xl"
            style={{
              background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            }}
          />
        ))}

        {/* Main Circle Container - Fixed animation */}
        <motion.div
          animate={{ scale }}
          transition={{
            duration: 0.1,
            ease: 'linear',
          }}
          className="relative"
        >
          {/* Gradient Circle */}
          <motion.div
            animate={{
              background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
            }}
            transition={{ duration: 1 }}
            className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full shadow-2xl relative overflow-hidden"
          >
            {/* Inner Pulse */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-6 rounded-full bg-white/30 backdrop-blur-sm"
            />

            {/* Center Core */}
            <motion.div
              animate={{
                scale: [0.9, 1.1, 0.9],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-1/4 rounded-full bg-white/50 backdrop-blur-md flex items-center justify-center"
            >
              <Sparkles size={20} className="text-white drop-shadow-lg" />
            </motion.div>
          </motion.div>

          {/* Progress Ring - Fixed animation */}
          <svg className="absolute -inset-3 w-[calc(100%+1.5rem)] h-[calc(100%+1.5rem)] -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="3"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: state.phaseProgress / 100 }}
              transition={{ duration: 0.1, ease: 'linear' }}
              style={{
                filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.8))',
              }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Phase Information */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${state.phase}-${state.nostril}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="text-center mt-7 mb-3 sm:mb-4 max-w-md px-4 flex-shrink-0"
        >
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {getPhaseText()}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-1">
            {getGuidanceText()}
          </p>
          <motion.p
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {Math.ceil(
              ((100 - state.phaseProgress) * getPhaseDuration()) / 100,
            )}
            s remaining
          </motion.p>
        </motion.div>
      </AnimatePresence>

      {/* Stats */}
      <div className="flex items-center gap-4 sm:gap-6 mb-3 sm:mb-4 text-center flex-shrink-0">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Cycles
          </p>
          <motion.p
            key={state.cycleCount}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400"
          >
            {state.cycleCount}
          </motion.p>
        </div>

        <div className="w-px h-8 sm:h-10 bg-gray-300 dark:bg-gray-600" />

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {settings.sessionDuration > 0 ? 'Remaining' : 'Elapsed'}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {settings.sessionDuration > 0
              ? `${Math.floor(
                  (settings.sessionDuration * 60 - state.elapsedTime) / 60,
                )}:${((settings.sessionDuration * 60 - state.elapsedTime) % 60)
                  .toString()
                  .padStart(2, '0')}`
              : `${Math.floor(state.elapsedTime / 60)}:${(
                  state.elapsedTime % 60
                )
                  .toString()
                  .padStart(2, '0')}`}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all"
        >
          {state.isRunning ? (
            <Pause size={20} />
          ) : (
            <Play size={20} className="ml-0.5" />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, rotate: -90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onReset}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        >
          <RotateCcw size={18} />
        </motion.button>
      </div>

      {/* Completion Message */}
      {state.isCompletingFinalCycle && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-lg flex-shrink-0"
        >
          <p className="text-xs sm:text-sm font-medium">
            ✨ Completing final cycle...
          </p>
        </motion.div>
      )}
    </div>
  )
}
