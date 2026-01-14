// components/BreathingGuide/VoicePackManager.tsx
// Voice Pack Manager - DRAMATICALLY IMPROVED UX
// File Location: components/BreathingGuide/VoicePackManager.tsx (REPLACE ENTIRE FILE)
//
// UX IMPROVEMENTS:
// ✅ Single percentage display (removed duplicate)
// ✅ Uploaded file badge (minimal, hides during processing)
// ✅ Form collapses during processing
// ✅ Auto-cleanup after completion
// ✅ Better visual hierarchy
// ✅ Smooth state transitions

'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Download,
  Globe,
  Sparkles,
  Gauge,
  Star,
  Edit2,
  RefreshCw,
  AlertCircle,
  FileAudio,
  X,
} from 'lucide-react'
import { useVoicePack } from '@/hooks/useVoicePack'
import { MessagesConfig, VoiceLanguage } from '@/models/types'
import {
  LANGUAGE_NAMES,
  getDefaultMessages,
  VOICE_SPEED_PRESETS,
} from '@/models/constants'
import { VoiceProgressBar } from '@/components/BreathingGuide/VoiceProgressBar'

interface VoicePackManagerProps {
  currentInstructions: MessagesConfig
  currentLanguage: VoiceLanguage
  onVoicePackLoaded: () => void
}

export const VoicePackManager: React.FC<VoicePackManagerProps> = ({
  currentInstructions,
  currentLanguage,
  onVoicePackLoaded,
}) => {
  const {
    currentVoicePack,
    availableVoicePacks,
    userDefaultPackId,
    isLoading,
    error,
    currentProgress,
    showProgress,
    createVoicePack,
    loadVoicePack,
    deleteVoicePack,
    updateVoicePackSpeed,
    setAsDefault,
    clearError,
    refreshVoicePackList,
  } = useVoicePack()

  // Form state
  const [voiceName, setVoiceName] = useState('')
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [selectedLanguage, setSelectedLanguage] =
    useState<VoiceLanguage>(currentLanguage)
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0)
  const [isDragging, setIsDragging] = useState(false)
  const [instructionsToUse, setInstructionsToUse] =
    useState<MessagesConfig>(currentInstructions)

  // Speed edit modal state
  const [editingPackId, setEditingPackId] = useState<string | null>(null)
  const [editingSpeed, setEditingSpeed] = useState<number>(1.0)

  // Track operation type for progress bar context
  const [currentOperationType, setCurrentOperationType] = useState<
    'creation' | 'update' | 'speed_change'
  >('creation')

  // ✅ Track if we just completed creation (for auto-cleanup)
  const [justCompleted, setJustCompleted] = useState(false)

  // Sync language and instructions
  useEffect(() => {
    setSelectedLanguage(currentLanguage)
  }, [currentLanguage])

  useEffect(() => {
    if (selectedLanguage === currentLanguage) {
      setInstructionsToUse(currentInstructions)
    }
  }, [currentInstructions, selectedLanguage, currentLanguage])

  // ✅ Auto-cleanup after successful creation
  useEffect(() => {
    if (
      justCompleted &&
      currentProgress?.status === 'completed' &&
      currentOperationType === 'creation'
    ) {
      // Wait a moment to show success, then cleanup
      const timer = setTimeout(() => {
        setVoiceName('')
        setVoiceFile(null)
        setSelectedSpeed(1.0)
        setJustCompleted(false)
        console.log('✅ Form cleaned up after successful creation')
      }, 2000) // 2 second delay to show success state

      return () => clearTimeout(timer)
    }
  }, [justCompleted, currentProgress, currentOperationType])

  const handleLanguageChange = (language: VoiceLanguage) => {
    setSelectedLanguage(language)
    if (language === currentLanguage) {
      setInstructionsToUse(currentInstructions)
    } else {
      setInstructionsToUse(getDefaultMessages(language))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVoiceFile(file)
      if (!voiceName) {
        const name = file.name.replace(/\.[^/.]+$/, '')
        setVoiceName(name)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      setVoiceFile(file)
      if (!voiceName) {
        const name = file.name.replace(/\.[^/.]+$/, '')
        setVoiceName(name)
      }
    }
  }

  const handleRemoveFile = () => {
    setVoiceFile(null)
    // Don't clear the name if user manually typed it
  }

  /**
   * Create voice pack with progress tracking
   */
  const handleCreate = async () => {
    if (!voiceFile || !voiceName.trim()) {
      return
    }

    try {
      setCurrentOperationType('creation')
      setJustCompleted(false)
      console.log('🎯 Creating voice pack with progress...')

      await createVoicePack({
        name: voiceName.trim(),
        voiceSample: voiceFile,
        instructions: instructionsToUse,
        language: selectedLanguage,
        speed: selectedSpeed,
      })

      console.log('✅ Voice pack created successfully')
      setJustCompleted(true)
      onVoicePackLoaded()
    } catch (error) {
      console.error('❌ Failed to create voice pack:', error)
      setJustCompleted(false)
    }
  }

  const handleLoad = async (packId: string) => {
    try {
      await loadVoicePack(packId)
      onVoicePackLoaded()
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleDelete = async (packId: string) => {
    if (confirm('Are you sure you want to delete this voice pack?')) {
      try {
        await deleteVoicePack(packId)
      } catch (error) {
        // Error handled by hook
      }
    }
  }

  const handleSetAsDefault = (packId: string) => {
    setAsDefault(packId)
  }

  const handleEditSpeed = (packId: string, currentSpeed: number) => {
    setEditingPackId(packId)
    setEditingSpeed(currentSpeed)
  }

  /**
   * Speed update with progress tracking
   */
  const handleSpeedUpdate = async () => {
    if (!editingPackId) return

    try {
      setCurrentOperationType('speed_change')

      await updateVoicePackSpeed({
        packId: editingPackId,
        newSpeed: editingSpeed,
      })

      console.log('✅ Speed updated successfully')

      // Only close modal after completion
      if (currentProgress?.status === 'completed') {
        setEditingPackId(null)
        setEditingSpeed(1.0)
      }
    } catch (error) {
      console.error('❌ Failed to update speed:', error)
    }
  }

  // ✅ Auto-close speed modal after successful completion
  useEffect(() => {
    if (
      editingPackId &&
      currentProgress?.status === 'completed' &&
      currentOperationType === 'speed_change'
    ) {
      const timer = setTimeout(() => {
        setEditingPackId(null)
        setEditingSpeed(1.0)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [editingPackId, currentProgress, currentOperationType])

  const getSpeedLabel = (speed: number): string => {
    if (speed < 0.7) return 'Very Slow'
    if (speed < 0.9) return 'Slow'
    if (speed < 1.1) return 'Normal'
    if (speed < 1.4) return 'Fast'
    return 'Very Fast'
  }

  const isUsingModifiedInstructions =
    selectedLanguage === currentLanguage &&
    JSON.stringify(instructionsToUse) !==
      JSON.stringify(getDefaultMessages(selectedLanguage))

  const isProcessingCreation =
    isLoading && showProgress && currentOperationType === 'creation'

  // Render edit speed modal with integrated progress
  const renderEditSpeedModal = () => {
    if (!editingPackId || typeof window === 'undefined') return null

    const isProcessingSpeed =
      isLoading && currentOperationType === 'speed_change'

    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isProcessingSpeed && setEditingPackId(null)}
          className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      rotate: isProcessingSpeed ? 360 : 0,
                    }}
                    transition={{
                      duration: 2,
                      repeat: isProcessingSpeed ? Infinity : 0,
                      ease: 'linear',
                    }}
                  >
                    <Gauge className="text-white" size={24} />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Edit Voice Speed
                    </h3>
                    <p className="text-sm text-white/80">
                      Adjust playback speed
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => !isProcessingSpeed && setEditingPackId(null)}
                  disabled={isProcessingSpeed}
                  className="p-2 hover:bg-white/20 rounded-full transition-all disabled:opacity-50 text-white"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Warning Notice - Only show before processing */}
              {!isProcessingSpeed && !currentProgress && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <RefreshCw
                      className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                      size={16}
                    />
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                      <p className="font-semibold mb-1">
                        ⚠️ Audio Regeneration Required
                      </p>
                      <p>
                        Changing the speed will regenerate all audio files.
                        You'll see real-time progress updates.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Speed Controls - Hide during processing */}
              <AnimatePresence>
                {!isProcessingSpeed && (
                  <motion.div
                    initial={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      New Speed:{' '}
                      <span className="text-purple-600 dark:text-purple-400">
                        {editingSpeed}x ({getSpeedLabel(editingSpeed)})
                      </span>
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={editingSpeed}
                        onChange={e =>
                          setEditingSpeed(parseFloat(e.target.value))
                        }
                        disabled={isLoading}
                        className="w-full accent-purple-600 disabled:opacity-50"
                      />
                      <div className="grid grid-cols-5 gap-1">
                        {Object.entries(VOICE_SPEED_PRESETS).map(
                          ([key, preset]) => (
                            <motion.button
                              key={key}
                              whileHover={{ scale: isLoading ? 1 : 1.05 }}
                              whileTap={{ scale: isLoading ? 1 : 0.95 }}
                              onClick={() =>
                                !isLoading && setEditingSpeed(preset.value)
                              }
                              disabled={isLoading}
                              className={`px-2 py-1 rounded text-xs transition-all disabled:opacity-50 ${
                                editingSpeed === preset.value
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {preset.value}x
                            </motion.button>
                          ),
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ✨ INTEGRATED PROGRESS - Shown during speed update */}
              <AnimatePresence>
                {showProgress &&
                  currentProgress &&
                  currentOperationType === 'speed_change' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <VoiceProgressBar
                        progress={currentProgress}
                        language={currentLanguage}
                        operationType="speed_change"
                        compact={false}
                      />
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Action Buttons */}
              {!isProcessingSpeed && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPackId(null)}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSpeedUpdate}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <RefreshCw size={16} />
                    Update Speed
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body,
    )
  }

  return (
    <div className="space-y-4">
      {/* Current Voice Pack Status */}
      {currentVoicePack && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle
              size={18}
              className="text-green-600 dark:text-green-400 shrink-0"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-green-900 dark:text-green-200">
                Active Voice Pack
              </div>
              <div className="text-xs text-green-700 dark:text-green-300 flex items-center gap-2 flex-wrap">
                <span className="font-medium">{currentVoicePack.name}</span>
                <span>•</span>
                <span>
                  {LANGUAGE_NAMES[currentVoicePack.language as VoiceLanguage] ||
                    currentVoicePack.language}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Gauge size={12} />
                  {currentVoicePack.speed}x (
                  {getSpeedLabel(currentVoicePack.speed)})
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modified Instructions Info */}
      {isUsingModifiedInstructions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              {currentLanguage === 'hi'
                ? '✨ AI द्वारा संशोधित निर्देशों का उपयोग करते हुए वॉयस पैक बनाया जाएगा'
                : '✨ Voice pack will use your AI-modified instructions'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3"
          >
            <div className="flex items-start gap-2">
              <XCircle
                size={16}
                className="text-red-600 dark:text-red-400 mt-0.5"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Error
                </div>
                <div className="text-xs text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <XCircle size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ IMPROVED Create New Voice Pack Form */}
      <motion.div layout className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-600" />
          Create New Voice Pack
        </h3>

        {/* Form Container - Collapses during processing */}
        <motion.div
          layout
          className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl overflow-hidden shadow-sm"
        >
          {/* ✅ Form Fields - Hidden during processing */}
          <AnimatePresence>
            {!isProcessingCreation && (
              <motion.div
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 space-y-3"
              >
                {/* Language Selection */}
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Globe size={14} />
                    Voice Language
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleLanguageChange('en')}
                      disabled={isLoading}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedLanguage === 'en'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg">🇬🇧</span>
                        <span>English</span>
                      </div>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleLanguageChange('hi')}
                      disabled={isLoading}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedLanguage === 'hi'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg">🇮🇳</span>
                        <span>हिंदी</span>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Voice Speed Selection */}
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Gauge size={14} />
                    Voice Speed:{' '}
                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                      {selectedSpeed}x ({getSpeedLabel(selectedSpeed)})
                    </span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={selectedSpeed}
                      onChange={e =>
                        setSelectedSpeed(parseFloat(e.target.value))
                      }
                      disabled={isLoading}
                      className="w-full accent-purple-600 disabled:opacity-50"
                    />
                    <div className="grid grid-cols-5 gap-1">
                      {Object.entries(VOICE_SPEED_PRESETS).map(
                        ([key, preset]) => (
                          <motion.button
                            key={key}
                            whileHover={{ scale: isLoading ? 1 : 1.05 }}
                            whileTap={{ scale: isLoading ? 1 : 0.95 }}
                            onClick={() =>
                              !isLoading && setSelectedSpeed(preset.value)
                            }
                            disabled={isLoading}
                            className={`px-2 py-1 rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              selectedSpeed === preset.value
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {preset.value}x
                          </motion.button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Voice Pack Name */}
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Voice Pack Name
                  </label>
                  <input
                    type="text"
                    value={voiceName}
                    onChange={e => setVoiceName(e.target.value)}
                    placeholder={
                      selectedLanguage === 'en'
                        ? 'e.g., My Calm Voice'
                        : 'जैसे, मेरी शांत आवाज'
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  />
                </div>

                {/* ✅ Voice Sample Upload - Shows badge when file selected */}
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    {selectedLanguage === 'en'
                      ? 'Voice Sample (10+ seconds recommended)'
                      : 'आवाज का नमूना (10+ सेकंड अनुशंसित)'}
                  </label>

                  {voiceFile ? (
                    // ✅ Compact file badge when file is selected
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-600 rounded-lg p-3 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
                        <FileAudio
                          size={20}
                          className="text-purple-600 dark:text-purple-400"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {voiceFile.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(voiceFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleRemoveFile}
                        disabled={isLoading}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all text-red-600 dark:text-red-400 disabled:opacity-50"
                        title="Remove file"
                      >
                        <X size={16} />
                      </motion.button>
                    </motion.div>
                  ) : (
                    // Upload area when no file
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                        isDragging
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        disabled={isLoading}
                      />
                      <div className="text-center pointer-events-none">
                        <Upload
                          size={24}
                          className="mx-auto mb-2 text-gray-400"
                        />
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedLanguage === 'en' ? (
                            <>
                              Drag and drop or{' '}
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                browse
                              </span>
                            </>
                          ) : (
                            <>
                              खींचें और छोड़ें या{' '}
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                ब्राउज़ करें
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ Create Button / Progress Area */}
          <div className="px-4 pb-4">
            {!isProcessingCreation ? (
              // Create button when not processing
              <motion.button
                layout
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                disabled={isLoading || !voiceFile || !voiceName.trim()}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Upload size={16} />
                {selectedLanguage === 'en'
                  ? 'Create Voice Pack'
                  : 'वॉयस पैक बनाएं'}
              </motion.button>
            ) : (
              // ✅ Progress shown during creation
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {/* File info badge during processing */}
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <FileAudio size={14} className="text-purple-600" />
                  <span>Using: {voiceFile?.name}</span>
                </div>

                {/* Enhanced progress bar */}
                {showProgress && currentProgress && (
                  <VoiceProgressBar
                    progress={currentProgress}
                    language={currentLanguage}
                    operationType="creation"
                    compact={false}
                  />
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Saved Voice Packs List */}
      {availableVoicePacks.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {currentLanguage === 'en'
              ? 'Saved Voice Packs'
              : 'सहेजे गए वॉयस पैक'}
          </h3>

          <div className="space-y-2">
            {availableVoicePacks.map(pack => {
              const isSystemDefault = pack.id === 'default'
              const isUserDefault = userDefaultPackId === pack.id
              const isActive = currentVoicePack?.id === pack.id

              const fullPack =
                currentVoicePack?.id === pack.id ? currentVoicePack : null
              const packSpeed = fullPack?.speed || 1.0

              return (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 shadow-sm'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {pack.name}
                        </div>
                        {isSystemDefault && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                            System
                          </span>
                        )}
                        {isUserDefault && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded flex items-center gap-1">
                            <Star size={12} className="fill-current" />
                            My Default
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                            Active
                          </span>
                        )}
                        {fullPack && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded flex items-center gap-1">
                            <Gauge size={12} />
                            {packSpeed}x
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {pack.total_audio_files}{' '}
                        {currentLanguage === 'en'
                          ? 'audio files'
                          : 'ऑडियो फ़ाइलें'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!isActive && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleLoad(pack.id)}
                        disabled={isLoading}
                        className="flex-1 min-w-[80px] p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-all disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-1"
                      >
                        <Download size={14} />
                        {currentLanguage === 'en' ? 'Load' : 'लोड'}
                      </motion.button>
                    )}

                    {isActive && !isSystemDefault && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditSpeed(pack.id, packSpeed)}
                        disabled={isLoading}
                        className="flex-1 min-w-[80px] p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-all disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-1"
                        title={
                          currentLanguage === 'en'
                            ? 'Edit voice speed'
                            : 'वॉयस स्पीड संपादित करें'
                        }
                      >
                        <Edit2 size={14} />
                        {currentLanguage === 'en' ? 'Edit Speed' : 'स्पीड एडिट'}
                      </motion.button>
                    )}

                    {!isUserDefault && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSetAsDefault(pack.id)}
                        disabled={isLoading}
                        className="flex-1 min-w-[80px] p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-all disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-1"
                        title={
                          currentLanguage === 'en'
                            ? 'Set as my default voice'
                            : 'मेरे डिफ़ॉल्ट के रूप में सेट करें'
                        }
                      >
                        <Star size={14} />
                        {currentLanguage === 'en' ? 'Set Default' : 'डिफ़ॉल्ट'}
                      </motion.button>
                    )}

                    {!isSystemDefault && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(pack.id)}
                        disabled={isLoading}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50"
                        title={
                          currentLanguage === 'en'
                            ? 'Delete this voice pack'
                            : 'इस वॉयस पैक को हटाएं'
                        }
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit Speed Modal */}
      {renderEditSpeedModal()}
    </div>
  )
}
