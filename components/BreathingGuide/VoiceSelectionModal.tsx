// components/BreathingGuide/VoiceSelectionModal.tsx
// Voice Pack Selection Modal for AI Instruction Updates
// File Location: components/BreathingGuide/VoiceSelectionModal.tsx (NEW FILE)
//
// PURPOSE: When user applies AI instruction changes, let them choose
// which voice pack should be updated with the new instructions

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Mic, X, Loader2, AlertCircle } from 'lucide-react'
import { VoicePackSummary } from '@/services/voicePackService'

interface VoiceSelectionModalProps {
  isOpen: boolean
  currentVoicePack: { id: string; name: string } | null
  availableVoicePacks: VoicePackSummary[]
  isProcessing: boolean
  onSelect: (packId: string) => void
  onClose: () => void
}

export const VoiceSelectionModal: React.FC<VoiceSelectionModalProps> = ({
  isOpen,
  currentVoicePack,
  availableVoicePacks,
  isProcessing,
  onSelect,
  onClose,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(
    currentVoicePack?.id || null,
  )

  const handleConfirm = () => {
    if (selectedPackId) {
      onSelect(selectedPackId)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm flex items-center justify-center p-4"
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
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Mic className="text-white" size={24} />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Select Voice Pack
                  </h3>
                  <p className="text-sm text-white/80">
                    Choose which voice to update
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                disabled={isProcessing}
                className="p-2 hover:bg-white/20 rounded-full transition-all disabled:opacity-50 text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
                  size={20}
                />
                <div className="text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-semibold mb-1">About Voice Updates</p>
                  <p>
                    The selected voice pack will be updated with your new
                    AI-generated instructions. This will regenerate audio files
                    for that voice.
                  </p>
                </div>
              </div>
            </div>

            {/* Voice Pack List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {availableVoicePacks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Mic className="mx-auto mb-3 opacity-50" size={32} />
                  <p className="text-sm">No voice packs available</p>
                  <p className="text-xs mt-1">Create one in Settings first</p>
                </div>
              ) : (
                availableVoicePacks.map(pack => {
                  const isSelected = selectedPackId === pack.id
                  const isCurrent = currentVoicePack?.id === pack.id
                  const isDefault = pack.id === 'default'

                  return (
                    <motion.button
                      key={pack.id}
                      whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                      whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                      onClick={() =>
                        !isProcessing && setSelectedPackId(pack.id)
                      }
                      disabled={isProcessing}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {pack.name}
                            </div>
                            {isDefault && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                                Default
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {pack.total_audio_files} audio files
                          </div>
                        </div>

                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-2"
                          >
                            <CheckCircle
                              className="text-purple-600 dark:text-purple-400"
                              size={20}
                            />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  )
                })
              )}
            </div>

            {/* Recommendation */}
            {currentVoicePack && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <div className="text-xs text-purple-800 dark:text-purple-200">
                  💡 <strong>Recommended:</strong> Select your currently active
                  voice pack ({currentVoicePack.name}) for a seamless
                  experience.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <motion.button
              whileHover={{ scale: selectedPackId && !isProcessing ? 1.02 : 1 }}
              whileTap={{ scale: selectedPackId && !isProcessing ? 0.98 : 1 }}
              onClick={handleConfirm}
              disabled={!selectedPackId || isProcessing}
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Update This Voice</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
