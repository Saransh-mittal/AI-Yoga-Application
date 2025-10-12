// components/BreathingGuide/BreathingDisplay.tsx
// Enhanced breathing visualization with smooth Framer Motion animations
// Features: Organic breathing circle, color morphing, smooth transitions

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { BreathingState, BreathingSettings } from '@/models/types';

interface BreathingDisplayProps {
  state: BreathingState;
  settings: BreathingSettings;
  onToggle: () => void;
  onReset: () => void;
}

export const BreathingDisplay: React.FC<BreathingDisplayProps> = ({
  state,
  settings,
  onToggle,
  onReset,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = (): string => {
    if (settings.sessionDuration === 0) return 'Continuous';
    const remaining = Math.max(0, settings.sessionDuration * 60 - state.elapsedTime);
    return formatTime(remaining);
  };

  const getPhaseColor = (): string => {
    if (state.phase === 'hold') return 'from-purple-500 to-indigo-600';
    if (state.nostril === 'left') {
      return state.phase === 'inhale' ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-600';
    } else {
      return state.phase === 'inhale' ? 'from-orange-500 to-amber-500' : 'from-teal-500 to-cyan-600';
    }
  };

  const getPhaseText = (): string => {
    if (state.phase === 'hold') return 'Hold';
    return `${state.phase.charAt(0).toUpperCase() + state.phase.slice(1)} - ${state.nostril.charAt(0).toUpperCase() + state.nostril.slice(1)}`;
  };

  const getPhaseDuration = (): number => {
    if (state.phase === 'hold') return settings.holdDuration;
    if (state.phase === 'inhale') return settings.inhaleDuration;
    return settings.exhaleDuration;
  };

  // Countdown display with pulsing animation
  if (state.isCountingDown) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-6 sm:p-8 mb-6 text-center relative overflow-hidden"
      >
        {/* Animated background pulse */}
        <motion.div
          className="absolute inset-0 bg-white/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="relative z-10">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-white text-lg sm:text-xl font-medium mb-4"
          >
            {settings.mode === 'guided' ? 'Prepare Yourself...' : 'Get Ready...'}
          </motion.div>

          <motion.div
            key={state.countdown}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-6xl sm:text-7xl font-bold text-white mb-4"
          >
            {state.countdown === 0 ? (settings.mode === 'guided' ? '🧘‍♂️' : '🎯') : state.countdown}
          </motion.div>

          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white text-base sm:text-lg font-medium"
          >
            {state.countdown === 0 ? 'Begin!' : (settings.mode === 'guided' ? 'Get into position' : 'Starting soon')}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Simple timer mode with smooth animations
  if (settings.mode === 'simple') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 sm:p-8 mb-6 text-center relative overflow-hidden"
        >
          {/* Animated glow effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          <motion.div
            key={state.elapsedTime}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-4xl sm:text-5xl font-mono font-bold text-white mb-2 relative z-10"
          >
            {formatTime(state.elapsedTime)}
          </motion.div>
          <div className="text-white text-sm opacity-90 relative z-10">Elapsed Time</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-6 text-center"
        >
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {settings.sessionDuration > 0 ? 'Time Remaining' : 'Continuous Mode'}
          </div>
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-bold text-indigo-600 dark:text-indigo-400"
          >
            {getRemainingTime()}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-3 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggle}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full p-4 transition-all shadow-lg"
          >
            <motion.div
              animate={state.isRunning ? { rotate: 360 } : {}}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {state.isRunning ? <Pause size={24} /> : <Play size={24} />}
            </motion.div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, rotate: -90 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="bg-gray-500 hover:bg-gray-600 text-white rounded-full p-4 transition-all shadow-lg"
          >
            <RotateCcw size={24} />
          </motion.button>
        </motion.div>
      </>
    );
  }

  // Guided breathing mode with organic breathing animation
  // Scale calculation for natural breathing feel
  const scale = state.phase === 'inhale'
    ? 1 + (state.phaseProgress / 100)
    : state.phase === 'exhale'
    ? 2 - (state.phaseProgress / 100)
    : 1.5;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${getPhaseColor()} rounded-xl p-6 sm:p-8 mb-6 relative overflow-hidden transition-all duration-1000`}
      >
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-white/20 to-transparent"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Breathing circle with organic animation */}
        <div className="flex items-center justify-center mb-6 relative z-10">
          <motion.div
            animate={{
              scale: scale,
            }}
            transition={{
              duration: getPhaseDuration(),
              ease: "easeInOut",
            }}
            className="relative"
          >
            {/* Outer glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(255, 255, 255, 0.3)',
                  '0 0 60px rgba(255, 255, 255, 0.5)',
                  '0 0 20px rgba(255, 255, 255, 0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Main breathing circle */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/30 backdrop-blur-sm relative overflow-hidden">
              {/* Inner pulsing circle */}
              <motion.div
                className="absolute inset-4 rounded-full bg-white/40"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Phase info with smooth transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${state.phase}-${state.nostril}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center relative z-10"
          >
            <div className="text-xl sm:text-2xl font-bold text-white uppercase mb-2">
              {getPhaseText()}
            </div>
            <motion.div
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white text-sm opacity-90"
            >
              {Math.ceil((100 - state.phaseProgress) * getPhaseDuration() / 100)}s remaining
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar with smooth animation */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <motion.div
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${state.phaseProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Stats with staggered entrance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-6"
      >
        <div className="flex justify-around items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center"
          >
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Cycles</div>
            <motion.div
              key={state.cycleCount}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400"
            >
              {state.cycleCount}
            </motion.div>
          </motion.div>
          <div className="h-12 w-px bg-gray-300 dark:bg-gray-600"></div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center"
          >
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
              {settings.sessionDuration > 0 ? 'Remaining' : 'Elapsed'}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {settings.sessionDuration > 0 ? getRemainingTime() : formatTime(state.elapsedTime)}
            </div>
          </motion.div>
        </div>
        {state.isCompletingFinalCycle && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium text-center"
          >
            ✨ Completing final cycle...
          </motion.div>
        )}
      </motion.div>

      {/* Controls with bounce animations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center gap-3 mb-6"
      >
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full p-4 transition-all shadow-lg relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ scale: 0, opacity: 0.5 }}
            whileTap={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
          {state.isRunning ? <Pause size={24} /> : <Play size={24} />}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, rotate: -90 }}
          whileTap={{ scale: 0.9, rotate: -180 }}
          onClick={onReset}
          className="bg-gray-500 hover:bg-gray-600 text-white rounded-full p-4 transition-all shadow-lg"
        >
          <RotateCcw size={24} />
        </motion.button>
      </motion.div>

      {/* Message with fade animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${state.nostril}-${state.phase}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 sm:p-4 text-center"
        >
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {state.nostril === 'left' && state.phase === 'inhale' && "Breathe in healing energy"}
            {state.nostril === 'right' && state.phase === 'exhale' && "Release negativity"}
            {state.nostril === 'right' && state.phase === 'inhale' && "Absorb positive energy"}
            {state.nostril === 'left' && state.phase === 'exhale' && "Let go of stress"}
            {state.phase === 'hold' && "Feel the prana strengthening"}
          </p>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
