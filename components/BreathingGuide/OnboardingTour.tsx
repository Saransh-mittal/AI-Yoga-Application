// components/BreathingGuide/OnboardingTour.tsx
// First-time user onboarding with visual guides
// Location: components/BreathingGuide/OnboardingTour.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wind, Sparkles, Settings, X, ChevronRight, Check } from 'lucide-react'

const STORAGE_KEY = 'yoga-app-onboarding-completed'

interface OnboardingStep {
  id: string
  icon: React.ElementType
  title: string
  description: string
  illustration: string
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: Wind,
    title: 'Welcome to Anulom Vilom',
    description:
      'Experience AI-guided alternate nostril breathing. This ancient practice balances your mind and body.',
    illustration: '🧘‍♀️',
  },
  {
    id: 'breathing',
    icon: Wind,
    title: 'Follow Your Breath',
    description:
      'The breathing circle guides you through each phase. Breathe in sync with the animations and voice guidance.',
    illustration: '🌬️',
  },
  {
    id: 'customize',
    icon: Sparkles,
    title: 'Personalize Your Practice',
    description:
      'Adjust timing, voice guidance, and language. Use AI to customize instructions or create your own voice pack.',
    illustration: '✨',
  },
]

export const OnboardingTour: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(STORAGE_KEY)
    if (!completed) {
      // Show after 500ms delay
      setTimeout(() => setIsVisible(true), 500)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsVisible(false)
  }

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon
  const isLastStep = currentStep === steps.length - 1

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-blue-900/95 backdrop-blur-md"
        >
          {/* Content Container */}
          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative w-full max-w-md"
          >
            {/* Skip Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSkip}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors z-10"
            >
              <X size={20} />
            </motion.button>

            {/* Main Card */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
              {/* Illustration */}
              <div className="relative h-56 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center overflow-hidden">
                {/* Animated Background */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="absolute inset-0 opacity-20"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
                </motion.div>

                {/* Illustration Emoji */}
                <motion.div
                  key={currentStep}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="text-8xl relative z-10 drop-shadow-2xl"
                >
                  {currentStepData.illustration}
                </motion.div>

                {/* Icon Badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', damping: 15 }}
                  className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
                >
                  <Icon size={24} className="text-white" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="p-8">
                <motion.h2
                  key={`title-${currentStep}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-bold text-gray-900 dark:text-white mb-3"
                >
                  {currentStepData.title}
                </motion.h2>

                <motion.p
                  key={`desc-${currentStep}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-6"
                >
                  {currentStepData.description}
                </motion.p>

                {/* Progress Dots */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {steps.map((_, index) => (
                    <motion.div
                      key={index}
                      animate={{
                        width: index === currentStep ? 32 : 8,
                        backgroundColor:
                          index === currentStep
                            ? 'rgb(147, 51, 234)'
                            : index < currentStep
                            ? 'rgb(192, 132, 252)'
                            : 'rgb(209, 213, 219)',
                      }}
                      className="h-2 rounded-full transition-all"
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="flex-1 px-6 py-3.5 border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 font-semibold rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                      Back
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNext}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isLastStep ? (
                      <>
                        <Check size={20} />
                        Get Started
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight size={20} />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Decorative Elements */}
          <motion.div
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, 20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute bottom-20 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
