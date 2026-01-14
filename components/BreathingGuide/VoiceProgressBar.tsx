// components/BreathingGuide/VoiceProgressBar.tsx
// Enhanced Voice Progress Bar - SINGLE PERCENTAGE DISPLAY
// File Location: components/BreathingGuide/VoiceProgressBar.tsx (REPLACE ENTIRE FILE)
//
// UX IMPROVEMENTS:
// ✅ Single percentage display (removed duplicate)
// ✅ Cleaner visual hierarchy
// ✅ Better phase indication
// ✅ No percentage in message text

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  Wand2,
  Zap,
  Volume2,
} from 'lucide-react'

export interface ProgressData {
  operation_id: string
  status: 'initializing' | 'processing' | 'completed' | 'error'
  progress: number // 0-100
  message: string
  current_phase?: string
  voice_pack_id?: string
  error_detail?: string
}

export type OperationType = 'creation' | 'update' | 'speed_change'

interface VoiceProgressBarProps {
  progress: ProgressData
  language?: 'en' | 'hi'
  operationType?: OperationType
  compact?: boolean
}

/**
 * Enhanced Voice Progress Bar - Single Percentage Display
 *
 * Features:
 * - ONE clear percentage display
 * - Operation-specific icons and titles
 * - Phase indicators
 * - Clean visual hierarchy
 */
export const VoiceProgressBar: React.FC<VoiceProgressBarProps> = ({
  progress,
  language = 'en',
  operationType = 'update',
  compact = false,
}) => {
  const isCompleted = progress.status === 'completed'
  const isError = progress.status === 'error'
  const isProcessing =
    progress.status === 'processing' || progress.status === 'initializing'

  // Get operation-specific content
  const getOperationContent = () => {
    const content = {
      creation: {
        icon: Sparkles,
        title: {
          en: 'Creating Voice Pack',
          hi: 'वॉयस पैक बना रहे हैं',
        },
        completedTitle: {
          en: 'Voice Pack Created!',
          hi: 'वॉयस पैक बन गया!',
        },
      },
      update: {
        icon: Wand2,
        title: {
          en: 'Updating Voice',
          hi: 'वॉयस अपडेट हो रहा है',
        },
        completedTitle: {
          en: 'Voice Updated!',
          hi: 'वॉयस अपडेट हो गया!',
        },
      },
      speed_change: {
        icon: Zap,
        title: {
          en: 'Adjusting Speed',
          hi: 'स्पीड समायोजित हो रही है',
        },
        completedTitle: {
          en: 'Speed Updated!',
          hi: 'स्पीड अपडेट हो गई!',
        },
      },
    }

    return content[operationType]
  }

  const operationContent = getOperationContent()
  const OperationIcon = operationContent.icon

  // Get status color scheme
  const getStatusColors = () => {
    if (isCompleted) {
      return {
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
        border: 'border-green-300 dark:border-green-700',
        progressBg: 'bg-gradient-to-r from-green-500 to-emerald-500',
        icon: 'text-green-600 dark:text-green-400',
        glow: 'shadow-green-500/20',
      }
    }

    if (isError) {
      return {
        bg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
        border: 'border-red-300 dark:border-red-700',
        progressBg: 'bg-gradient-to-r from-red-500 to-rose-500',
        icon: 'text-red-600 dark:text-red-400',
        glow: 'shadow-red-500/20',
      }
    }

    return {
      bg: 'bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-purple-900/20',
      border: 'border-purple-300 dark:border-purple-700',
      progressBg:
        'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600',
      icon: 'text-purple-600 dark:text-purple-400',
      glow: 'shadow-purple-500/20',
    }
  }

  const colors = getStatusColors()

  // ✅ Get phase message WITHOUT percentage
  const getPhaseMessage = () => {
    if (isCompleted) {
      return operationContent.completedTitle[language]
    }

    if (isError) {
      return language === 'en' ? 'Operation Failed' : 'ऑपरेशन विफल रहा'
    }

    // Use operation title, not the SSE message (which may contain percentage)
    return operationContent.title[language]
  }

  const phaseMessage = getPhaseMessage()

  // ✅ Get current phase name (e.g., "left-inhale")
  const getCurrentPhase = () => {
    if (progress.current_phase) {
      return progress.current_phase
    }
    return null
  }

  const currentPhase = getCurrentPhase()

  if (compact) {
    // Compact inline version
    return (
      <motion.div
        layout
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div
          className={`${colors.bg} border ${colors.border} rounded-lg px-3 py-2`}
        >
          <div className="flex items-center gap-2">
            {/* Icon */}
            <div className="shrink-0">
              {isProcessing && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <OperationIcon size={16} className={colors.icon} />
                </motion.div>
              )}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                >
                  <CheckCircle size={16} className={colors.icon} />
                </motion.div>
              )}
              {isError && <XCircle size={16} className={colors.icon} />}
            </div>

            {/* Progress Bar */}
            <div className="flex-1 min-w-0">
              <div className="relative h-1.5 bg-white/50 dark:bg-gray-800/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${colors.progressBg}`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* ✅ SINGLE Percentage */}
            <div
              className={`${colors.icon} text-xs font-semibold tabular-nums shrink-0`}
            >
              {Math.round(progress.progress)}%
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Full version with rich details
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`${colors.bg} border-2 ${colors.border} rounded-xl shadow-lg ${colors.glow} overflow-hidden`}
    >
      <div className="p-4">
        {/* Header with Icon, Title, and Percentage */}
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0">
            {isProcessing && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className={`w-10 h-10 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}
              >
                <OperationIcon size={20} className={colors.icon} />
              </motion.div>
            )}

            {isCompleted && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 border-2 border-green-400 flex items-center justify-center`}
              >
                <CheckCircle
                  size={20}
                  className="text-green-600 dark:text-green-400"
                />
              </motion.div>
            )}

            {isError && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 border-2 border-red-400 flex items-center justify-center"
              >
                <XCircle size={20} className="text-red-600 dark:text-red-400" />
              </motion.div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* ✅ Title WITHOUT percentage */}
            <motion.div
              layout
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1"
            >
              {phaseMessage}
            </motion.div>

            {/* Current Phase Indicator (e.g., "left-inhale") */}
            {isProcessing && currentPhase && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Volume2 size={12} className={colors.icon} />
                </motion.div>
                <span className="font-medium">{currentPhase}</span>
              </motion.div>
            )}
          </div>

          {/* ✅ SINGLE Percentage Badge - Prominent */}
          <motion.div
            layout
            className={`px-3 py-1.5 rounded-full ${colors.bg} border-2 ${colors.border} shadow-sm`}
          >
            <span className={`${colors.icon} text-base font-bold tabular-nums`}>
              {Math.round(progress.progress)}%
            </span>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2.5 bg-white/70 dark:bg-gray-800/70 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className={`h-full ${colors.progressBg} relative`}
            initial={{ width: '0%' }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Animated shimmer effect */}
            {isProcessing && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Completion Message */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2"
          >
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-300 to-transparent" />
            <span className="text-xs text-green-700 dark:text-green-300 font-medium">
              {language === 'en' ? '✓ Ready to use' : '✓ उपयोग के लिए तैयार'}
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-300 to-transparent" />
          </motion.div>
        )}

        {/* Error Detail */}
        {isError && progress.error_detail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-red-200 dark:border-red-800"
          >
            <div className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-lg p-2.5 font-mono">
              {progress.error_detail}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
