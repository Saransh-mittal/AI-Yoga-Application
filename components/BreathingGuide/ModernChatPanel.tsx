// components/BreathingGuide/ModernChatPanel.tsx
// Complete Modern Chat Panel with all features
// Location: Create as ModernChatPanel.tsx in components/BreathingGuide/

'use client'

import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Sparkles,
  Loader2,
  Check,
  Settings,
  Zap,
  HelpCircle,
  Mic,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  Message,
  VoicePreview,
  SettingsPreview,
  AIModel,
  BreathingSettings,
  MessagesConfig,
  VoiceLanguage,
  ClarificationRequest,
} from '@/models/types'
import { AI_MODEL_INFO } from '@/models/constants'
import { VoiceSelectionModal } from './VoiceSelectionModal'
import { ClarificationModal } from './ClarificationModal'
import { VoicePackSummary } from '@/services/voicePackService'

interface ModernChatPanelProps {
  messages: Message[]
  isThinking: boolean
  inputMessage: string
  aiModel: AIModel
  currentSettings: BreathingSettings
  currentInstructions: MessagesConfig
  currentLanguage: VoiceLanguage
  currentVoicePack: { id: string; name: string } | null
  availableVoicePacks: VoicePackSummary[]
  showVoiceSelection: boolean
  isApplyingVoice: boolean
  pendingClarification?: {
    request: ClarificationRequest
    messageId: string
  } | null
  onClarificationChoice?: (optionId: string) => void
  onCancelClarification?: () => void
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onModelChange: (model: AIModel) => void
  onApplyPreview: (
    preview: VoicePreview | SettingsPreview,
    previewId: string,
  ) => void
  onVoicePackSelected: (packId: string) => void
  onCancelVoiceSelection: () => void
  onVoiceUpload: (file: File, name: string) => void
  onClose: () => void
}

export const ModernChatPanel: React.FC<ModernChatPanelProps> = ({
  messages,
  isThinking,
  inputMessage,
  aiModel,
  currentSettings,
  currentInstructions,
  currentLanguage,
  currentVoicePack,
  availableVoicePacks,
  showVoiceSelection,
  isApplyingVoice,
  pendingClarification,
  onClarificationChoice,
  onCancelClarification,
  onInputChange,
  onSendMessage,
  onModelChange,
  onApplyPreview,
  onVoicePackSelected,
  onCancelVoiceSelection,
  onVoiceUpload,
  onClose,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showHelp, setShowHelp] = React.useState(false)
  const [showVoiceUpload, setShowVoiceUpload] = React.useState(false)
  const [voiceFile, setVoiceFile] = React.useState<File | null>(null)
  const [voiceName, setVoiceName] = React.useState('')

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVoiceFile(file)
      if (!voiceName) {
        const name = file.name.replace(/\.[^/.]+$/, '')
        setVoiceName(name)
      }
    }
  }

  const handleVoiceSubmit = () => {
    if (voiceFile && voiceName.trim()) {
      onVoiceUpload(voiceFile, voiceName.trim())
      setVoiceFile(null)
      setVoiceName('')
      setShowVoiceUpload(false)
    }
  }

  const quickSuggestions = [
    {
      icon: '🎤',
      text: 'Make voice slower',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '⏱️',
      text: '5 minute session',
      gradient: 'from-purple-500 to-indigo-500',
    },
    {
      icon: '🧘',
      text: 'Box breathing (4-4-4)',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: '✨',
      text: 'More calming words',
      gradient: 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <>
      <div className="flex flex-col h-full bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-950/10">
        {/* Header with Model Selector */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shrink-0"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  AI Guide
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ask me anything
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowHelp(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Help"
              >
                <HelpCircle
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowVoiceUpload(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Upload Voice"
              >
                <Mic size={18} className="text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>
          </div>

          <select
            value={aiModel}
            onChange={e => onModelChange(e.target.value as AIModel)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          >
            {Object.entries(AI_MODEL_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} - {info.quality}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <Zap size={12} />
            <span>{AI_MODEL_INFO[aiModel].warning}</span>
          </div>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center px-6 pb-20"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-xl"
              >
                ✨
              </motion.div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                AI Yoga Guide
              </h3>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 max-w-md">
                I can help customize your practice, adjust settings, or answer
                questions about breathing techniques.
              </p>

              {/* Quick Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {quickSuggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onInputChange(suggestion.text)}
                    className={`p-4 bg-gradient-to-br ${suggestion.gradient} rounded-xl text-white text-left shadow-lg hover:shadow-xl transition-all`}
                  >
                    <div className="text-2xl mb-2">{suggestion.icon}</div>
                    <div className="text-sm font-medium">{suggestion.text}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{
                  opacity: 0,
                  x: msg.role === 'user' ? 20 : -20,
                  scale: 0.9,
                }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20 }}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-2 space-y-1 list-disc pl-4">
                          {children}
                        </ul>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold">{children}</strong>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>

                  {/* Settings Preview */}
                  {msg.preview && msg.preview.type === 'settings' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700"
                    >
                      <div className="flex items-center gap-2 mb-2 text-blue-900 dark:text-blue-200">
                        <Settings size={14} />
                        <span className="text-xs font-semibold">
                          Settings Preview
                        </span>
                      </div>

                      <div className="space-y-2 text-xs mb-3">
                        {Object.entries(
                          (msg.preview as SettingsPreview).settings,
                        )
                          .filter(
                            ([_, value]) =>
                              value !== undefined && value !== null,
                          )
                          .slice(0, 3)
                          .map(([key, value], i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-blue-800 dark:text-blue-300"
                            >
                              <span className="font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className="font-semibold">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          onApplyPreview(msg.preview!, msg.previewId!)
                        }
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check size={14} />
                        Apply Settings
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Voice Preview */}
                  {msg.preview && msg.preview.type === 'voice' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700"
                    >
                      <div className="flex items-center gap-2 mb-2 text-purple-900 dark:text-purple-200">
                        <Sparkles size={14} />
                        <span className="text-xs font-semibold">
                          Voice Preview
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          onApplyPreview(msg.preview!, msg.previewId!)
                        }
                        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check size={14} />
                        Apply Changes
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isThinking && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start"
            >
              <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm font-medium">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shrink-0"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={e => onInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-gray-400"
              disabled={isThinking}
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onSendMessage}
              disabled={!inputMessage.trim() || isThinking}
              className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
              <Send size={20} />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Voice Selection Modal */}
      <VoiceSelectionModal
        isOpen={showVoiceSelection}
        currentVoicePack={currentVoicePack}
        availableVoicePacks={availableVoicePacks}
        isProcessing={isApplyingVoice}
        onSelect={onVoicePackSelected}
        onClose={onCancelVoiceSelection}
      />

      {/* Clarification Modal */}
      <ClarificationModal
        isOpen={!!pendingClarification}
        clarification={pendingClarification?.request || null}
        onSelect={optionId => {
          if (onClarificationChoice) {
            onClarificationChoice(optionId)
          }
        }}
        onCancel={() => {
          if (onCancelClarification) {
            onCancelClarification()
          }
        }}
      />

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90vw] max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Quick Help
              </h3>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  💬 <strong>Voice:</strong> "make voice slower", "more calming
                  words"
                </p>
                <p>
                  ⏱️ <strong>Settings:</strong> "5 minute session", "box
                  breathing"
                </p>
                <p>
                  🧘 <strong>Guidance:</strong> Ask about breathing techniques
                </p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
              >
                Got it!
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Voice Upload Modal */}
      <AnimatePresence>
        {showVoiceUpload && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVoiceUpload(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Upload Voice
              </h3>

              <input
                type="text"
                value={voiceName}
                onChange={e => setVoiceName(e.target.value)}
                placeholder="Voice pack name"
                className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center cursor-pointer hover:border-purple-500 transition-all mb-3"
              >
                {voiceFile ? voiceFile.name : 'Choose audio file'}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowVoiceUpload(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoiceSubmit}
                  disabled={!voiceFile || !voiceName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
