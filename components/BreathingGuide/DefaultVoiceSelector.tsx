// components/BreathingGuide/DefaultVoiceSelector.tsx
// Default Voice Selector - Browse and select pre-generated default guided voices
// File Location: src/components/BreathingGuide/DefaultVoiceSelector.tsx (NEW FILE)
//
// FEATURES:
// - Grid-based voice display with filtering
// - Language & gender filtering
// - Quick preview of voice metadata
// - Smooth animations and transitions
// - Shows breathing technique and audio file count
// - Responsive design (mobile, tablet, desktop)

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Volume2, Filter, X } from 'lucide-react'
import { VoicePackSummary } from '@/services/voicePackService'
import { LANGUAGE_NAMES } from '@/models/constants'
import type { VoiceLanguage } from '@/models/types'

interface DefaultVoiceSelectorProps {
  /** List of available default voice packs */
  defaultVoices: VoicePackSummary[]
  /** Currently selected voice pack ID */
  selectedVoiceId: string | null
  /** Currently active voice pack ID */
  currentVoiceId: string | null
  /** Current language preference */
  currentLanguage: VoiceLanguage
  /** Is loading state */
  isLoading?: boolean
  /** Callback when voice is selected */
  onSelect: (packId: string) => void
}

type FilterGender = 'all' | 'male' | 'female'
type FilterLanguage = 'all' | 'en' | 'hi'

/**
 * Default Voice Selector Component
 *
 * Displays pre-generated default guided voices with:
 * - Language filtering (All, English, Hindi)
 * - Gender filtering (All, Male, Female)
 * - Visual indicators for selection state
 * - Breathing technique badges
 */
export const DefaultVoiceSelector: React.FC<DefaultVoiceSelectorProps> = ({
  defaultVoices,
  selectedVoiceId,
  currentVoiceId,
  currentLanguage,
  isLoading = false,
  onSelect,
}) => {
  // Filter state
  const [filterLanguage, setFilterLanguage] = useState<FilterLanguage>('all')
  const [filterGender, setFilterGender] = useState<FilterGender>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Memoized filtered voices
  const filteredVoices = useMemo(() => {
    return defaultVoices.filter(voice => {
      // Language filter
      if (filterLanguage !== 'all' && voice.language !== filterLanguage) {
        return false
      }

      // Gender filter (extract from description or metadata)
      if (filterGender !== 'all') {
        const voiceGender = voice.description?.toLowerCase() || ''
        if (
          filterGender === 'male' &&
          !voiceGender.includes('male') &&
          !voiceGender.includes('man')
        ) {
          return false
        }
        if (
          filterGender === 'female' &&
          !voiceGender.includes('female') &&
          !voiceGender.includes('woman')
        ) {
          return false
        }
      }

      return true
    })
  }, [defaultVoices, filterLanguage, filterGender])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with Filter Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {currentLanguage === 'en'
              ? 'Default Guided Voices'
              : 'डिफ़ॉल्ट निर्देशित आवाजें'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {currentLanguage === 'en'
              ? `${filteredVoices.length} voice pack${
                  filteredVoices.length !== 1 ? 's' : ''
                } available`
              : `${filteredVoices.length} आवाज पैक उपलब्ध`}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title={currentLanguage === 'en' ? 'Toggle filters' : 'फ़िल्टर'}
        >
          <Filter size={16} />
        </motion.button>
      </div>

      {/* Filter Panel - Collapsible */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-3"
          >
            {/* Language Filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
                {currentLanguage === 'en' ? 'Language' : 'भाषा'}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'en', 'hi'] as const).map(lang => (
                  <motion.button
                    key={lang}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilterLanguage(lang as FilterLanguage)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterLanguage === lang
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {lang === 'all'
                      ? currentLanguage === 'en'
                        ? 'All'
                        : 'सभी'
                      : lang === 'en'
                      ? 'English'
                      : 'हिंदी'}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
                {currentLanguage === 'en' ? 'Gender' : 'लिंग'}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'male', 'female'] as const).map(gender => (
                  <motion.button
                    key={gender}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilterGender(gender as FilterGender)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterGender === gender
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {gender === 'all'
                      ? currentLanguage === 'en'
                        ? 'All'
                        : 'सभी'
                      : gender === 'male'
                      ? currentLanguage === 'en'
                        ? 'Male'
                        : 'पुरुष'
                      : currentLanguage === 'en'
                      ? 'Female'
                      : 'महिला'}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Reset Filters Button */}
            {(filterLanguage !== 'all' || filterGender !== 'all') && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setFilterLanguage('all')
                  setFilterGender('all')
                }}
                className="w-full py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center justify-center gap-1"
              >
                <X size={14} />
                {currentLanguage === 'en'
                  ? 'Reset Filters'
                  : 'फ़िल्टर रीसेट करें'}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voices Grid */}
      <div className="space-y-2">
        {filteredVoices.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {filteredVoices.map(voice => {
              const isSelected = selectedVoiceId === voice.id
              const isActive = currentVoiceId === voice.id

              return (
                <motion.button
                  key={voice.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (!isLoading) {
                      onSelect(voice.id)
                    }
                  }}
                  disabled={isLoading}
                  className={`p-3 rounded-lg border-2 transition-all text-left overflow-hidden relative group ${
                    isActive
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : isSelected
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  } ${
                    isLoading
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  {/* Background Gradient on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-100 dark:to-purple-900/10 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />

                  {/* Content Container */}
                  <div className="relative z-10 space-y-2">
                    {/* Header with Title and Icons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {voice.name}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {voice.description}
                        </p>
                      </div>

                      {/* Selection Indicator */}
                      <AnimatePresence mode="wait">
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="flex-shrink-0"
                          >
                            <div className="relative">
                              <div className="absolute inset-0 bg-purple-500 rounded-full blur animate-pulse" />
                              <Check
                                size={18}
                                className="text-purple-600 dark:text-purple-400 relative"
                              />
                            </div>
                          </motion.div>
                        )}
                        {isSelected && !isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="flex-shrink-0"
                          >
                            <Check
                              size={18}
                              className="text-blue-600 dark:text-blue-400"
                            />
                          </motion.div>
                        )}
                        {!isSelected && !isActive && (
                          <motion.div
                            initial={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            className="flex-shrink-0"
                          >
                            <Volume2
                              size={16}
                              className="text-gray-400 dark:text-gray-600"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Metadata Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {/* Language Badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {voice.language === 'en' ? '🇬🇧 EN' : '🇮🇳 HI'}
                      </span>

                      {/* Gender Badge (if available) */}
                      {voice.description?.toLowerCase().includes('male') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                          ♂ {currentLanguage === 'en' ? 'Male' : 'पुरुष'}
                        </span>
                      )}
                      {voice.description?.toLowerCase().includes('female') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                          ♀ {currentLanguage === 'en' ? 'Female' : 'महिला'}
                        </span>
                      )}

                      {/* Breathing Technique Badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        🧘 {currentLanguage === 'en' ? 'Guided' : 'निर्देशित'}
                      </span>
                    </div>

                    {/* Audio Files Count */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Volume2 size={12} />
                      <span>
                        {voice.total_audio_files}{' '}
                        {currentLanguage === 'en'
                          ? 'audio files'
                          : 'ऑडियो फ़ाइलें'}
                      </span>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <Volume2
              size={32}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentLanguage === 'en'
                ? 'No voices match your filters'
                : 'कोई आवाज आपके फ़िल्टर से मेल नहीं खाती'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Loading State Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/10 dark:bg-black/30 rounded-lg flex items-center justify-center backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Volume2 size={24} className="text-purple-600" />
              </motion.div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {currentLanguage === 'en' ? 'Loading...' : 'लोड हो रहा है...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
