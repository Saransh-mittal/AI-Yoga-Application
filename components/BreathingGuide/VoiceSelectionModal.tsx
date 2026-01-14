// components/BreathingGuide/VoiceSelectionModal.tsx
// Voice Selection Modal with Progress Transformation
// File Location: components/BreathingGuide/VoiceSelectionModal.tsx (REPLACE ENTIRE FILE)
//
// UX INNOVATION:
// âœ… Modal doesn't close after selection
// âœ… Transforms to "Preparing..." state immediately
// âœ… Shows progress IN THE MODAL (contextual)
// âœ… Smooth state transitions
// âœ… User stays oriented
// âœ… Auto-closes on completion (optional manual close)

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  Mic,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { VoicePackSummary } from '@/services/voicePackService'
import { VoiceProgressBar, ProgressData } from './VoiceProgressBar'
import { DefaultVoiceSelector } from './DefaultVoiceSelector' // NEW
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs' // NEW - shadcn tabs

interface VoiceSelectionModalProps {
  isOpen: boolean
  currentVoicePack: { id: string; name: string } | null
  availableVoicePacks: VoicePackSummary[]
  defaultVoicePacks?: VoicePackSummary[] // NEW: Default voices
  isProcessing: boolean
  currentProgress?: ProgressData | null
  showProgress?: boolean
  currentLanguage?: 'en' | 'hi'
  onSelect: (packId: string) => void
  onClose: () => void
}

type ModalState = 'selecting' | 'preparing' | 'processing' | 'completed'

export const VoiceSelectionModal: React.FC<VoiceSelectionModalProps> = ({
  isOpen,
  currentVoicePack,
  availableVoicePacks,
  defaultVoicePacks = [], // NEW: Default to empty array
  isProcessing,
  currentProgress,
  showProgress = false,
  currentLanguage = 'en',
  onSelect,
  onClose,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(
    currentVoicePack?.id || null,
  )
  const [modalState, setModalState] = useState<ModalState>('selecting')
  const [selectedPackName, setSelectedPackName] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'default' | 'saved'>('default')
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPackId(currentVoicePack?.id || null)
      setModalState('selecting')
      setSelectedPackName('')
    }
  }, [isOpen, currentVoicePack])

  // âœ… Track state transitions
  useEffect(() => {
    if (!isOpen) return

    if (isProcessing && !showProgress && modalState === 'selecting') {
      // Just clicked confirm, show preparing state
      setModalState('preparing')
    } else if (isProcessing && showProgress && currentProgress) {
      // Progress started, show it
      setModalState('processing')
    } else if (
      currentProgress?.status === 'completed' &&
      modalState === 'processing'
    ) {
      // Completed
      setModalState('completed')

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    }
  }, [isProcessing, showProgress, currentProgress, modalState, isOpen, onClose])

  const handleConfirm = () => {
    if (selectedPackId) {
      // Find the pack name
      const pack = availableVoicePacks.find(p => p.id === selectedPackId)
      if (pack) {
        setSelectedPackName(pack.name)
      }

      // Trigger the selection
      onSelect(selectedPackId)

      // State will transition to 'preparing' via useEffect
    }
  }

  const handleClose = () => {
    // Only allow closing if not processing or if completed
    if (modalState === 'selecting' || modalState === 'completed') {
      onClose()
    }
  }

  if (!isOpen) return null

  const canClose = modalState === 'selecting' || modalState === 'completed'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={canClose ? handleClose : undefined}
        className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* âœ… DYNAMIC HEADER - Changes based on state */}
          <motion.div
            layout
            className={`p-6 relative overflow-hidden ${
              modalState === 'completed'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600'
            }`}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    rotate:
                      modalState === 'preparing' || modalState === 'processing'
                        ? 360
                        : 0,
                    scale: modalState === 'completed' ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    rotate: {
                      duration: 2,
                      repeat:
                        modalState === 'preparing' ||
                        modalState === 'processing'
                          ? Infinity
                          : 0,
                      ease: 'linear',
                    },
                    scale: {
                      duration: 0.5,
                    },
                  }}
                >
                  {modalState === 'completed' ? (
                    <CheckCircle className="text-white" size={24} />
                  ) : modalState === 'preparing' ||
                    modalState === 'processing' ? (
                    <Sparkles className="text-white" size={24} />
                  ) : (
                    <Mic className="text-white" size={24} />
                  )}
                </motion.div>
                <div>
                  <motion.h3 layout className="text-xl font-bold text-white">
                    {modalState === 'selecting' && 'Select Voice Pack'}
                    {modalState === 'preparing' && 'Preparing...'}
                    {modalState === 'processing' && 'Updating Voice'}
                    {modalState === 'completed' && 'Complete!'}
                  </motion.h3>
                  <motion.p layout className="text-sm text-white/80">
                    {modalState === 'selecting' &&
                      'Choose which voice to update'}
                    {modalState === 'preparing' &&
                      'Getting ready to regenerate audio'}
                    {modalState === 'processing' &&
                      `Regenerating ${selectedPackName}`}
                    {modalState === 'completed' && 'Voice successfully updated'}
                  </motion.p>
                </div>
              </div>

              <button
                onClick={handleClose}
                disabled={!canClose}
                className={`p-2 hover:bg-white/20 rounded-full transition-all text-white ${
                  !canClose ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={!canClose ? 'Please wait...' : 'Close'}
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>

          {/* âœ… DYNAMIC CONTENT - Transitions between states */}
          <AnimatePresence mode="wait">
            {modalState === 'selecting' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-4"
              >
                {/* Tabs for Default vs Saved Voices */}
                {defaultVoicePacks.length > 0 && (
                  <Tabs
                    value={activeTab}
                    onValueChange={(value: string) =>
                      setActiveTab(value as 'default' | 'saved')
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="default">
                        {currentLanguage === 'en'
                          ? '🎯 Default'
                          : '🎯 डिफ़ॉल्ट'}
                      </TabsTrigger>
                      <TabsTrigger value="saved">
                        {currentLanguage === 'en' ? '💾 Saved' : '💾 सहेजा गया'}
                        ({availableVoicePacks.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Default Voices Tab */}
                    <TabsContent value="default" className="mt-4">
                      <DefaultVoiceSelector
                        defaultVoices={defaultVoicePacks}
                        selectedVoiceId={selectedPackId}
                        currentVoiceId={currentVoicePack?.id || null}
                        currentLanguage={currentLanguage as 'en' | 'hi'}
                        isLoading={isProcessing}
                        onSelect={(packId: string) => {
                          setSelectedPackId(packId)
                          const pack = defaultVoicePacks.find(
                            p => p.id === packId,
                          )
                          if (pack) {
                            setSelectedPackName(pack.name)
                          }
                        }}
                      />
                    </TabsContent>

                    {/* Saved Packs Tab */}
                    <TabsContent value="saved" className="mt-4">
                      {availableVoicePacks.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {availableVoicePacks.map(pack => {
                            const isSelected = selectedPackId === pack.id
                            const isCurrent = currentVoicePack?.id === pack.id

                            return (
                              <motion.button
                                key={pack.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setSelectedPackId(pack.id)
                                  setSelectedPackName(pack.name)
                                }}
                                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                                  isCurrent
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : isSelected
                                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-sm font-semibold">
                                      {pack.name}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {pack.total_audio_files} audio files
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                    >
                                      <CheckCircle
                                        className="text-purple-600"
                                        size={20}
                                      />
                                    </motion.div>
                                  )}
                                </div>
                              </motion.button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">
                            {currentLanguage === 'en'
                              ? 'No saved voice packs yet'
                              : 'अभी तक कोई सहेजी गई आवाज पैक नहीं'}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* If no default packs, show old list layout */}
                {defaultVoicePacks.length === 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableVoicePacks.map(pack => {
                      const isSelected = selectedPackId === pack.id
                      const isCurrent = currentVoicePack?.id === pack.id

                      return (
                        <motion.button
                          key={pack.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedPackId(pack.id)
                            setSelectedPackName(pack.name)
                          }}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                            isCurrent
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : isSelected
                              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold">
                                {pack.name}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {pack.total_audio_files} audio files
                              </p>
                            </div>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <CheckCircle
                                  className="text-purple-600"
                                  size={20}
                                />
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                {/* Confirmation Buttons - Keep existing */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="flex-1 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
                  >
                    {currentLanguage === 'en' ? 'Cancel' : 'रद्द करें'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    disabled={!selectedPackId || isProcessing}
                    className="flex-1 py-2 px-4 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Loader2 size={16} />
                        </motion.div>
                        {currentLanguage === 'en'
                          ? 'Loading...'
                          : 'लोड हो रहा है...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        {currentLanguage === 'en' ? 'Confirm' : 'पुष्टि करें'}
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modalState === 'preparing' && (
              <motion.div
                key="preparing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      rotate: {
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      },
                      scale: {
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                    }}
                    className="mb-6"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <Sparkles size={32} className="text-white" />
                    </div>
                  </motion.div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Initializing...
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
                    Preparing to regenerate audio files with new instructions.
                    This will take a moment.
                  </p>

                  <div className="mt-6 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                    <div
                      className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {modalState === 'processing' && currentProgress && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <VoiceProgressBar
                  progress={currentProgress}
                  language={currentLanguage}
                  operationType="update"
                  compact={false}
                />

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Please keep this window open while we regenerate your audio
                    files...
                  </p>
                </div>
              </motion.div>
            )}

            {modalState === 'completed' && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                    }}
                    className="mb-6"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                      <CheckCircle size={32} className="text-white" />
                    </div>
                  </motion.div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    All Done!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm mb-6">
                    Your voice pack <strong>{selectedPackName}</strong> has been
                    successfully updated with new instructions.
                  </p>

                  <div className="w-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200 text-sm">
                      <CheckCircle size={16} />
                      <span>Ready to use in your next session</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    Closing automatically in 2 seconds...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
