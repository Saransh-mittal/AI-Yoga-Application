// components/BreathingGuide/index.tsx
// Redesigned main component with mobile-first navigation
// Location: components/BreathingGuide/index.tsx (REPLACE EXISTING)

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BreathingSettings,
  MessagesConfig,
  AIModel,
  VoiceLanguage,
} from '@/models/types'
import { getDefaultMessages, BREATHING_DEFAULTS } from '@/models/constants'
import { useBreathing } from '@/hooks/useBreathing'
import { useChat } from '@/hooks/useChat'
import { useVoicePack } from '@/hooks/useVoicePack'

// New Components
import { BottomNavigation } from './BottomNavigation'
import { OnboardingTour } from './OnboardingTour'
import { QuickSettings } from './QuickSettings'
import { EnhancedBreathingDisplay } from './EnhancedBreathingDisplay'

// Modern Components
import { SettingsPanel } from './ModernSettingsPanel'

// Existing Components (ChatPanel has more features, keep it for now)
import { ChatPanel } from './ChatPanel'
import { VoicePackManager } from './VoicePackManager'
import { FloatingParticles } from '@/components/FloatingParticles'

type NavigationTab = 'breathe' | 'guide' | 'settings' | 'voice'

export default function BreathingGuide() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('breathe')
  const [currentLanguage, setCurrentLanguage] = useState<VoiceLanguage>('en')

  // Settings State
  const [settings, setSettings] = useState<BreathingSettings>({
    mode: 'guided',
    sessionDuration: BREATHING_DEFAULTS.SESSION_DURATION,
    inhaleDuration: BREATHING_DEFAULTS.INHALE_DURATION,
    holdDuration: BREATHING_DEFAULTS.HOLD_DURATION,
    exhaleDuration: BREATHING_DEFAULTS.EXHALE_DURATION,
    voiceGuidance: true,
    phaseBeeps: true,
    voiceSpeed: BREATHING_DEFAULTS.VOICE_SPEED,
  })

  const [aiModel, setAIModel] = useState<AIModel>('gpt-5-nano')
  const [inputMessage, setInputMessage] = useState<string>('')

  // Voice Messages
  const [customMessages, setCustomMessages] = useState<MessagesConfig>(
    getDefaultMessages(currentLanguage),
  )

  // Update messages when language changes
  useEffect(() => {
    setCustomMessages(getDefaultMessages(currentLanguage))
  }, [currentLanguage])

  // Voice Pack Hook
  const {
    currentVoicePack,
    availableVoicePacks,
    updateVoicePack,
    updateVoicePackSpeed,
    createVoicePack,
    isLoading: isVoicePackLoading,
  } = useVoicePack()

  // Breathing Hook
  const { state, toggleBreathing, reset } = useBreathing(settings)

  // Chat Hook
  const {
    messages,
    isThinking,
    showVoiceSelection,
    pendingClarification,
    sendMessage,
    applyPreview,
    handleVoicePackSelected,
    cancelVoiceSelection,
    handleClarificationChoice,
    cancelClarification,
  } = useChat(
    customMessages,
    settings,
    aiModel,
    async (instructions, packId, onProgress) => {
      setCustomMessages(instructions)
      try {
        onProgress('Regenerating audio...')
        const changedPhases: string[] = []
        for (const key of Object.keys(instructions)) {
          if (
            JSON.stringify(instructions[key as keyof MessagesConfig]) !==
            JSON.stringify(customMessages[key as keyof MessagesConfig])
          ) {
            changedPhases.push(key)
          }
        }
        await updateVoicePack({
          packId,
          instructions,
          phasesToUpdate: changedPhases.length > 0 ? changedPhases : undefined,
        })
        onProgress('Updated successfully!')
      } catch (error) {
        console.error('Failed to update voice pack:', error)
        onProgress('Warning: Instructions updated but regeneration failed')
      }
    },
    partialSettings => {
      if (
        partialSettings.voiceSpeed !== undefined &&
        currentVoicePack &&
        partialSettings.voiceSpeed !== currentVoicePack.speed
      ) {
        const newSpeed = partialSettings.voiceSpeed
        updateVoicePackSpeed({
          packId: currentVoicePack.id,
          newSpeed,
        }).catch(error => {
          console.error('Failed to update voice pack speed:', error)
        })
      }
      setSettings(prev => ({ ...prev, ...partialSettings }))
    },
  )

  const handleSettingsChange = (newSettings: Partial<BreathingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isThinking) {
      sendMessage(inputMessage)
      setInputMessage('')
    }
  }

  const handleVoicePackLoaded = () => {
    if (currentVoicePack?.language) {
      const packLanguage = currentVoicePack.language as VoiceLanguage
      if (packLanguage === 'en' || packLanguage === 'hi') {
        setCurrentLanguage(packLanguage)
      }
    }
  }

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'breathe':
        return (
          <div className="flex flex-col h-full pt-4 md:pt-0 pb-16 md:pb-0">
            {/* Quick Settings Bar */}
            <div className="flex justify-center pb-2 px-4 shrink-0">
              <QuickSettings
                settings={settings}
                onSettingsChange={handleSettingsChange}
                isBreathing={state.isRunning || state.isCountingDown}
              />
            </div>

            {/* Breathing Display - scrollable if needed */}
            <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto overflow-x-hidden">
              <EnhancedBreathingDisplay
                state={state}
                settings={settings}
                onToggle={toggleBreathing}
                onReset={reset}
              />
            </div>
          </div>
        )

      case 'guide':
        return (
          <div className="h-full pb-16 md:pb-0">
            <ChatPanel
              messages={messages}
              isThinking={isThinking}
              inputMessage={inputMessage}
              aiModel={aiModel}
              currentSettings={settings}
              currentInstructions={customMessages}
              currentLanguage={currentLanguage}
              currentVoicePack={
                currentVoicePack
                  ? { id: currentVoicePack.id, name: currentVoicePack.name }
                  : null
              }
              availableVoicePacks={availableVoicePacks}
              showVoiceSelection={showVoiceSelection}
              isApplyingVoice={isVoicePackLoading}
              pendingClarification={pendingClarification}
              onClarificationChoice={handleClarificationChoice}
              onCancelClarification={cancelClarification}
              onInputChange={setInputMessage}
              onSendMessage={handleSendMessage}
              onModelChange={setAIModel}
              onApplyPreview={applyPreview}
              onVoicePackSelected={handleVoicePackSelected}
              onCancelVoiceSelection={cancelVoiceSelection}
              onVoiceUpload={async (file, name) => {
                try {
                  await createVoicePack({
                    name,
                    voiceSample: file,
                    instructions: customMessages,
                    language: currentLanguage,
                    speed: settings.voiceSpeed,
                  })
                  handleVoicePackLoaded()
                } catch (error) {
                  console.error('Failed to create voice pack:', error)
                }
              }}
              onClose={() => setActiveTab('breathe')}
            />
          </div>
        )

      case 'settings':
        return (
          <div className="h-full overflow-y-auto px-4 py-6 pb-20 md:pb-6">
            <div className="max-w-3xl mx-auto">
              <SettingsPanel
                settings={settings}
                currentInstructions={customMessages}
                currentLanguage={currentLanguage}
                onSettingsChange={handleSettingsChange}
                onLanguageChange={setCurrentLanguage}
                onVoicePackLoaded={handleVoicePackLoaded}
              />
            </div>
          </div>
        )

      case 'voice':
        return (
          <div className="h-full overflow-y-auto px-4 py-6 pb-20 md:pb-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Voice Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create and manage your personalized voice packs
              </p>

              <VoicePackManager
                currentInstructions={customMessages}
                currentLanguage={currentLanguage}
                onVoicePackLoaded={handleVoicePackLoaded}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      {/* Onboarding Tour */}
      <OnboardingTour />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-purple-950/20 dark:to-indigo-950/20 relative overflow-hidden">
        {/* Floating Particles */}
        <FloatingParticles />

        {/* Decorative Gradients */}
        <motion.div
          animate={{
            x: [0, 50, -50, 0],
            y: [0, -50, 50, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-20 left-20 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{
            x: [0, -70, 70, 0],
            y: [0, 70, -70, 0],
            scale: [1, 0.8, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none"
        />

        {/* Main Content Container */}
        <div className="relative z-10 h-screen flex flex-col max-h-screen">
          {/* Header (Desktop) */}
          <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="hidden md:block pt-6 px-8 shrink-0"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                >
                  🧘
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    AI Yoga Guide
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Anulom Vilom • Alternate Nostril Breathing
                  </p>
                </div>
              </div>

              {/* Current Voice Pack Badge */}
              {currentVoicePack && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {currentVoicePack.name}
                </motion.div>
              )}
            </div>
          </motion.header>

          {/* Mobile Header */}
          <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="md:hidden pt-4 px-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shrink-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-xl">
                  🧘
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    AI Yoga
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Anulom Vilom
                  </p>
                </div>
              </div>

              {currentVoicePack && (
                <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Active
                </div>
              )}
            </div>
          </motion.header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden min-h-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </main>

          {/* Bottom Navigation */}
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasNotification={messages.length > 0 && activeTab !== 'guide'}
          />
        </div>
      </div>
    </>
  )
}
