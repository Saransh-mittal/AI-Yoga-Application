// components/BreathingGuide/ChatPanel.tsx
// Chat Panel - COMPLETE FIX WITH LOADING STATES
// File Location: components/BreathingGuide/ChatPanel.tsx (REPLACE ENTIRE FILE)
//
// FIXES:
// ✅ Voice preview always shows instructions
// ✅ Loading state immediately after Apply click
// ✅ Loading state after voice selection
// ✅ Smooth transitions between all states
// ✅ No empty/broken states

'use client'

import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Check,
  Settings as SettingsIcon,
  Mic,
  HelpCircle,
  Upload,
  ChevronDown,
  Lightbulb,
  Zap,
  Sliders,
  Volume2,
  ChevronRight,
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
import { VoiceProgressBar, ProgressData } from './VoiceProgressBar'
import { VoicePackSummary } from '@/services/voicePackService'

interface ChatPanelProps {
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

  // SSE Progress Props
  currentProgress: ProgressData | null
  showProgress: boolean

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

interface QuickAction {
  id: string
  icon: React.ElementType
  label: string
  prompt: string
}

const ModelDropdown: React.FC<{
  isOpen: boolean
  buttonRef: React.RefObject<HTMLButtonElement | null>
  currentModel: AIModel
  onSelect: (model: AIModel) => void
  onClose: () => void
}> = ({ isOpen, buttonRef, currentModel, onSelect, onClose }) => {
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownHeight = Object.keys(AI_MODEL_INFO).length * 60

      setPosition({
        top: rect.top - dropdownHeight - 22,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [isOpen, buttonRef])

  if (!mounted || !isOpen) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          minWidth: `${Math.max(position.width, 200)}px`,
          maxWidth: '250px',
        }}
        className="z-[9999] bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-xl shadow-2xl py-1.5 px-1.5"
      >
        {Object.entries(AI_MODEL_INFO).map(([key, info]) => {
          const isSelected = currentModel === key
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSelect(key as AIModel)
                onClose()
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all mb-1 last:mb-0 ${
                isSelected
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap
                  size={16}
                  className={isSelected ? 'text-purple-600' : 'text-gray-400'}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {info.name}
                  </div>
                  <div className="text-xs opacity-70 truncate">
                    {info.quality} • {info.speed}
                  </div>
                </div>
                {isSelected && (
                  <Check size={16} className="text-purple-600 shrink-0" />
                )}
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </>,
    document.body,
  )
}

// ✅ Helper to format phase name nicely
const formatPhaseName = (phase: string): string => {
  return phase
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
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
  currentProgress,
  showProgress,
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
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modelButtonRef = useRef<HTMLButtonElement>(null)

  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showVoiceUpload, setShowVoiceUpload] = useState(false)
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [voiceName, setVoiceName] = useState('')

  // ✅ Track which preview was just applied (for success state)
  const [appliedPreviewId, setAppliedPreviewId] = useState<string | null>(null)

  // ✅ Track preview instructions expansion
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(
    new Set(),
  )

  const isCentered = messages.length === 0 && !isThinking

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // ✅ Auto-expand preview when created
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.previewId && lastMessage.preview?.type === 'voice') {
      setExpandedPreviews(prev => new Set(prev).add(lastMessage.previewId!))
    }
  }, [messages])

  // ✅ Clear applied state after completion
  useEffect(() => {
    if (appliedPreviewId && currentProgress?.status === 'completed') {
      const timer = setTimeout(() => {
        setAppliedPreviewId(null)
      }, 5000) // Show success for 5 seconds

      return () => clearTimeout(timer)
    }
  }, [appliedPreviewId, currentProgress])

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

  const handleQuickAction = (prompt: string) => {
    onInputChange(prompt)
    inputRef.current?.focus()
  }

  const handleApplyPreview = (
    preview: VoicePreview | SettingsPreview,
    previewId: string,
  ) => {
    setAppliedPreviewId(previewId)
    onApplyPreview(preview, previewId)
  }

  const togglePreviewExpansion = (previewId: string) => {
    setExpandedPreviews(prev => {
      const next = new Set(prev)
      if (next.has(previewId)) {
        next.delete(previewId)
      } else {
        next.add(previewId)
      }
      return next
    })
  }

  const quickActions: QuickAction[] = [
    {
      id: 'voice',
      icon: Mic,
      label: 'Voice',
      prompt: 'Make voice instructions shorter and calmer',
    },
    {
      id: 'settings',
      icon: Sliders,
      label: 'Settings',
      prompt: '5 minute calming session',
    },
    {
      id: 'guide',
      icon: Lightbulb,
      label: 'Guide',
      prompt: 'Benefits of alternate nostril breathing?',
    },
    {
      id: 'tips',
      icon: Sparkles,
      label: 'Tips',
      prompt: 'How to improve my breathing technique?',
    },
  ]

  const renderInputArea = () => (
    <motion.div layout className="w-full max-w-3xl mx-auto px-2 md:px-6 py-1">
      <div className="p-1">
        <div className="relative">
          <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-600 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-[14px]">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowVoiceUpload(true)}
                className="p-1.5 md:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all text-gray-600 dark:text-gray-400"
                title="Upload voice"
              >
                <Upload size={16} className="md:w-[18px] md:h-[18px]" />
              </motion.button>

              <motion.button
                ref={modelButtonRef}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="px-2 md:px-3 py-1 md:py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-all max-w-[200px]"
              >
                <Zap
                  size={12}
                  className="md:w-[14px] md:h-[14px] text-purple-600 shrink-0"
                />
                <span className="truncate text-xs md:text-sm">
                  {AI_MODEL_INFO[aiModel].name}
                </span>
                <ChevronDown
                  size={10}
                  className="md:w-[12px] md:h-[12px] shrink-0"
                />
              </motion.button>

              <div className="flex-1" />

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowHelp(true)}
                className="p-1.5 md:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all text-gray-600 dark:text-gray-400"
                title="Help"
              >
                <HelpCircle size={16} className="md:w-[18px] md:h-[18px]" />
              </motion.button>
            </div>

            <div className="flex items-center gap-2 px-2 md:px-4 py-2 md:py-3">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={e => onInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  currentLanguage === 'hi'
                    ? 'मैं कैसे मदद कर सकता हूं?'
                    : 'How can I help you today?'
                }
                className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm md:text-base"
                disabled={isThinking}
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onSendMessage}
                disabled={!inputMessage.trim() || isThinking}
                className="p-2 md:p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Send size={16} className="md:w-[18px] md:h-[18px]" />
              </motion.button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 md:mt-3 text-center text-[10px] md:text-xs text-gray-500 dark:text-gray-400 px-2"
          >
            {AI_MODEL_INFO[aiModel].warning}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <>
      <div
        className="h-full flex flex-col bg-white dark:bg-gray-900"
        style={{ overflow: 'visible' }}
      >
        {isCentered ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto"
            style={{ paddingBottom: '3rem' }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-6 md:mb-8"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Sparkles size={32} className="text-white md:w-10 md:h-10" />
              </div>
            </motion.div>

            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 text-center">
              {currentLanguage === 'hi'
                ? 'नमस्ते 🙏'
                : `Sunday session, ${currentVoicePack?.name || 'friend'}?`}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base max-w-md mb-8 md:mb-10 text-center px-4">
              {currentLanguage === 'hi'
                ? 'मैं आप की सांस लेने में मदद कर सकता हूं'
                : 'I can help customize your breathing practice, adjust voice guidance, and answer questions about yoga.'}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-2 md:gap-3 justify-center mb-8 md:mb-10 px-4 max-w-2xl"
            >
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isThinking}
                  className="px-3 py-2 md:px-4 md:py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  <action.icon size={16} className="text-gray-500" />
                  {action.label}
                </motion.button>
              ))}
            </motion.div>

            {renderInputArea()}
          </motion.div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 pb-[180px] md:pb-6">
              <div className="space-y-3 md:space-y-4 pb-4 max-w-3xl mx-auto">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{
                        opacity: 0,
                        x: msg.role === 'user' ? 50 : -50,
                        scale: 0.9,
                      }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: 'spring',
                        damping: 20,
                        stiffness: 150,
                      }}
                    >
                      <div
                        className={`flex ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className={`max-w-[85%] md:max-w-[75%] p-3 md:p-4 rounded-2xl text-sm md:text-base ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-md'
                          }`}
                        >
                          <div
                            className={`prose prose-sm md:prose-base max-w-none ${
                              msg.role === 'user'
                                ? 'prose-invert'
                                : 'dark:prose-invert'
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
                                  <strong className="font-bold">
                                    {children}
                                  </strong>
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </motion.div>
                      </div>

                      {/* Settings Preview */}
                      {msg.preview &&
                        msg.preview.type === 'settings' &&
                        (() => {
                          const settingsPreview = msg.preview as SettingsPreview
                          const changedSettings = settingsPreview.settings
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 md:mt-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-3 md:p-4 space-y-2"
                            >
                              <div className="font-semibold text-xs md:text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                                <SettingsIcon size={16} />
                                Settings Preview
                              </div>
                              <div className="space-y-2">
                                {Object.entries(changedSettings)
                                  .filter(
                                    ([_, value]) =>
                                      value !== undefined && value !== null,
                                  )
                                  .map(([key, value]) => {
                                    const label = key
                                      .replace(/([A-Z])/g, ' $1')
                                      .trim()
                                    const currentValue =
                                      currentSettings[
                                        key as keyof typeof currentSettings
                                      ]
                                    return (
                                      <div
                                        key={key}
                                        className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-blue-200 dark:border-blue-700"
                                      >
                                        <div className="text-xs font-medium">
                                          {label}
                                        </div>
                                        <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                                          {String(currentValue)} →{' '}
                                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                                            {String(value)}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() =>
                                  handleApplyPreview(
                                    msg.preview!,
                                    msg.previewId!,
                                  )
                                }
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <Check size={16} />
                                Apply Settings
                              </motion.button>
                            </motion.div>
                          )
                        })()}

                      {/* ✅ COMPLETE Voice Preview - Always shows instructions */}
                      {msg.preview &&
                        msg.preview.type === 'voice' &&
                        (() => {
                          const voicePreview = msg.preview as VoicePreview
                          const instructions = voicePreview.instructions
                          const phases = Object.entries(instructions) as [
                            string,
                            string[],
                          ][]
                          const isExpanded = expandedPreviews.has(
                            msg.previewId!,
                          )
                          const isProcessing =
                            isApplyingVoice &&
                            appliedPreviewId === msg.previewId
                          const isCompleted =
                            appliedPreviewId === msg.previewId &&
                            currentProgress?.status === 'completed'

                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 md:mt-3"
                            >
                              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl overflow-hidden shadow-lg">
                                {/* Header - Always visible */}
                                <div className="p-3 md:p-4 border-b border-purple-200 dark:border-purple-700">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold text-xs md:text-sm flex items-center gap-2 text-purple-900 dark:text-purple-200">
                                      <Mic size={16} />
                                      Voice Preview
                                    </div>
                                    {isCompleted && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400"
                                      >
                                        <Check size={14} />
                                        Applied!
                                      </motion.div>
                                    )}
                                  </div>
                                </div>

                                {/* ✅ INSTRUCTIONS - Always visible, collapsible during processing */}
                                <AnimatePresence>
                                  {(!isProcessing || isExpanded) && (
                                    <motion.div
                                      initial={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="p-3 md:p-4 space-y-2 max-h-[300px] overflow-y-auto">
                                        {phases.map(([phase, variants]) => (
                                          <div
                                            key={phase}
                                            className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-purple-200 dark:border-purple-700"
                                          >
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <Volume2
                                                size={14}
                                                className="text-purple-600 dark:text-purple-400"
                                              />
                                              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                {formatPhaseName(phase)}
                                              </span>
                                            </div>
                                            <div className="space-y-1">
                                              {variants.map(
                                                (
                                                  variant: string,
                                                  idx: number,
                                                ) => (
                                                  <div
                                                    key={idx}
                                                    className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300"
                                                  >
                                                    <ChevronRight
                                                      size={12}
                                                      className="mt-0.5 text-purple-500 shrink-0"
                                                    />
                                                    <span className="italic">
                                                      "{variant}"
                                                    </span>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* ✅ PROGRESS AREA - Shows during processing */}
                                {isProcessing &&
                                  showProgress &&
                                  currentProgress && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="px-3 md:px-4 pb-3 md:pb-4"
                                    >
                                      <VoiceProgressBar
                                        progress={currentProgress}
                                        language={currentLanguage}
                                        operationType="update"
                                        compact={false}
                                      />

                                      {/* Toggle button to show/hide instructions during progress */}
                                      {!isExpanded && (
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() =>
                                            togglePreviewExpansion(
                                              msg.previewId!,
                                            )
                                          }
                                          className="mt-2 w-full text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center justify-center gap-1"
                                        >
                                          <ChevronDown size={14} />
                                          Show instructions
                                        </motion.button>
                                      )}
                                    </motion.div>
                                  )}

                                {/* ✅ LOADING STATE - Before progress starts */}
                                {isProcessing && !showProgress && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-3 md:p-4 bg-purple-50/50 dark:bg-purple-900/10"
                                  >
                                    <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                                      <Loader2
                                        size={16}
                                        className="animate-spin"
                                      />
                                      <span className="text-sm">
                                        Initializing voice update...
                                      </span>
                                    </div>
                                  </motion.div>
                                )}

                                {/* Apply Button / Success Area */}
                                <div className="p-3 md:p-4 bg-purple-50/50 dark:bg-purple-900/10">
                                  {!isProcessing && !isCompleted ? (
                                    // Apply button when ready
                                    <motion.button
                                      layout
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() =>
                                        handleApplyPreview(
                                          msg.preview!,
                                          msg.previewId!,
                                        )
                                      }
                                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                      <Check size={16} />
                                      Apply Voice Changes
                                    </motion.button>
                                  ) : isCompleted ? (
                                    // Success message
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 flex items-center gap-2"
                                    >
                                      <Check
                                        size={16}
                                        className="text-green-600 dark:text-green-400 shrink-0"
                                      />
                                      <span className="text-sm text-green-800 dark:text-green-200">
                                        ✅ Changes applied! Your new voice
                                        guidance is now active.
                                      </span>
                                    </motion.div>
                                  ) : null}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })()}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 md:p-4 rounded-2xl shadow-md">
                      <div className="flex items-center gap-2 text-purple-600">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        >
                          <Loader2 size={16} />
                        </motion.div>
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            <div
              className="fixed md:relative bottom-16 md:bottom-0 left-0 right-0 md:shrink-0 p-2 md:p-6 pt-2 md:pt-6 pb-3 md:pb-8 bg-white dark:bg-gray-900 z-30 border-t md:border-t-0 border-gray-200 dark:border-gray-800"
              style={{ overflow: 'visible' }}
            >
              {renderInputArea()}
            </div>
          </>
        )}
      </div>

      <ModelDropdown
        isOpen={showModelSelector}
        buttonRef={modelButtonRef}
        currentModel={aiModel}
        onSelect={onModelChange}
        onClose={() => setShowModelSelector(false)}
      />

      <VoiceSelectionModal
        isOpen={showVoiceSelection}
        currentVoicePack={currentVoicePack}
        availableVoicePacks={availableVoicePacks}
        isProcessing={isApplyingVoice}
        currentProgress={currentProgress}
        showProgress={showProgress}
        currentLanguage={currentLanguage}
        onSelect={onVoicePackSelected}
        onClose={onCancelVoiceSelection}
      />

      <ClarificationModal
        isOpen={!!pendingClarification}
        clarification={pendingClarification?.request || null}
        onSelect={optionId => {
          if (onClarificationChoice) onClarificationChoice(optionId)
        }}
        onCancel={() => {
          if (onCancelClarification) onCancelClarification()
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90vw] max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 md:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <HelpCircle className="text-purple-600" size={24} />
                  How to Use
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <p>• "make it shorter" - Concise instructions</p>
                <p>• "5 minute session" - Duration change</p>
                <p className="text-purple-600 dark:text-purple-400">
                  💡 Voice changes show real-time progress!
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowHelp(false)}
                className="w-full mt-4 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              >
                Got it!
              </motion.button>
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 md:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Mic className="text-purple-600" size={24} />
                  Upload Voice
                </h3>
                <button
                  onClick={() => setShowVoiceUpload(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Voice Pack Name
                  </label>
                  <input
                    type="text"
                    value={voiceName}
                    onChange={e => setVoiceName(e.target.value)}
                    placeholder="e.g., My Calm Voice"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Audio File
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {voiceFile ? (
                      <div className="flex items-center justify-center gap-2 text-purple-600">
                        <Check size={20} />
                        <span className="text-sm truncate">
                          {voiceFile.name}
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload
                          className="mx-auto mb-2 text-gray-400"
                          size={32}
                        />
                        <p className="text-sm text-gray-600">Click to browse</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowVoiceUpload(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleVoiceSubmit}
                    disabled={!voiceFile || !voiceName.trim()}
                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 text-sm"
                  >
                    Create
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
