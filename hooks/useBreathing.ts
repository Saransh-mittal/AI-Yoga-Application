// hooks/useBreathing.ts
// Custom hook for managing breathing exercise logic - FIXED COUNTDOWN
// File Location: hooks/useBreathing.ts (REPLACE EXISTING)
//
// FIXES:
// - Countdown timing is now consistent
// - "Begin!" spoken only when countdown reaches 0
// - Speech queue management prevents overlaps
// - Smooth transitions between countdown numbers

import { useState, useEffect, useRef } from 'react';
import { BreathingState, BreathingSettings, BreathingPhase, Nostril } from '@/models/types';
import { BREATHING_DEFAULTS } from '@/models/constants';
import { audioService } from '@/services/audioService';

export const useBreathing = (settings: BreathingSettings) => {
  // State
  const [state, setState] = useState<BreathingState>({
    isRunning: false,
    isCountingDown: false,
    countdown: BREATHING_DEFAULTS.COUNTDOWN_START,
    phase: 'inhale',
    nostril: 'left',
    phaseProgress: 0,
    cycleCount: 0,
    elapsedTime: 0,
    isCompletingFinalCycle: false,
  });

  // Refs
  const startTimeRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<string>('');
  const lastNostrilRef = useRef<string>('');
  const animationFrameRef = useRef<number | null>(null);
  const hasSpokenPhase = useRef<boolean>(false);
  const previousSeconds = useRef<number>(-1);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null); // NEW: For countdown timing
  const hasSpokenCountdownNumber = useRef<boolean>(false); // NEW: Track if current number was spoken

  // Helper functions
  const getPhaseDuration = (phase: BreathingPhase): number => {
    const durations = {
      inhale: settings.inhaleDuration,
      hold: settings.holdDuration,
      exhale: settings.exhaleDuration,
    };
    return durations[phase];
  };

  /**
   * NEW: Helper function to safely speak text with speech synthesis
   * Cancels any ongoing speech before starting new one
   */
  const speakText = (text: string, rate: number = 0.75) => {
    if (!settings.voiceGuidance) return;

    // Cancel any ongoing speech to prevent overlaps
    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    }, 50); // Small delay to ensure cancel completes
  };

  // FIXED: Countdown effect with proper timing and speech management
  useEffect(() => {
    if (state.isCountingDown) {
      // Clear any existing timer
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }

      if (state.countdown > 0) {
        // Speak the current countdown number (if not already spoken)
        if (!hasSpokenCountdownNumber.current && settings.voiceGuidance) {
          speakText(state.countdown.toString());
          hasSpokenCountdownNumber.current = true;
        }

        // Set timer for next countdown step
        countdownTimerRef.current = setTimeout(() => {
          hasSpokenCountdownNumber.current = false; // Reset for next number
          setState(prev => ({ ...prev, countdown: prev.countdown - 1 }));
        }, 1000);

        return () => {
          if (countdownTimerRef.current) {
            clearTimeout(countdownTimerRef.current);
          }
        };
      } else {
        // Countdown reached 0 - speak "Begin!" and start breathing
        if (settings.voiceGuidance) {
          speakText("Begin!");
        }

        // Small delay before starting to let "Begin!" play
        countdownTimerRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            isCountingDown: false,
            isRunning: true,
            countdown: BREATHING_DEFAULTS.COUNTDOWN_START,
          }));
          hasSpokenCountdownNumber.current = false;
        }, 1200); // 1.2s delay to let "Begin!" complete

        return () => {
          if (countdownTimerRef.current) {
            clearTimeout(countdownTimerRef.current);
          }
        };
      }
    }
  }, [state.isCountingDown, state.countdown, settings.voiceGuidance]);

  // Main breathing timer
  useEffect(() => {
    if (state.isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      const updateTimer = () => {
        const elapsed = (Date.now() - startTimeRef.current!) / 1000;
        const elapsedSeconds = Math.floor(elapsed);

        setState(prev => ({ ...prev, elapsedTime: elapsedSeconds }));

        if (settings.mode === 'simple') {
          // Simple timer mode
          if (settings.sessionDuration > 0 && elapsedSeconds >= settings.sessionDuration * 60) {
            setState(prev => ({ ...prev, isRunning: false }));
            audioService.cancelSpeech();
            setTimeout(() => {
              speakText("Session complete. Well done!");
            }, 500);
            return;
          }

          if (elapsedSeconds !== previousSeconds.current) {
            previousSeconds.current = elapsedSeconds;
            if (settings.voiceGuidance && !audioService.isCurrentlySpeaking()) {
              speakText(elapsedSeconds.toString());
            }
          }
        } else {
          // Guided breathing mode
          const fullCycleDuration =
            (settings.inhaleDuration + settings.holdDuration + settings.exhaleDuration) * 2;
          const cycleTime = elapsed % fullCycleDuration;

          // Check for session completion
          if (settings.sessionDuration > 0 && elapsedSeconds >= settings.sessionDuration * 60) {
            if (!state.isCompletingFinalCycle) {
              setState(prev => ({ ...prev, isCompletingFinalCycle: true }));
            }
            if (cycleTime < 0.1) {
              setState(prev => ({ ...prev, isRunning: false, isCompletingFinalCycle: false }));
              audioService.cancelSpeech();
              setTimeout(() => {
                speakText("Session complete. Well done!");
              }, 500);
              return;
            }
          }

          // Calculate current phase
          let currentPhase: BreathingPhase;
          let currentNostril: Nostril;
          let phaseElapsed: number;

          const halfCycle = settings.inhaleDuration + settings.holdDuration + settings.exhaleDuration;

          if (cycleTime < settings.inhaleDuration) {
            currentPhase = 'inhale';
            currentNostril = 'left';
            phaseElapsed = cycleTime;
          } else if (cycleTime < settings.inhaleDuration + settings.holdDuration) {
            currentPhase = 'hold';
            currentNostril = 'left';
            phaseElapsed = cycleTime - settings.inhaleDuration;
          } else if (cycleTime < halfCycle) {
            currentPhase = 'exhale';
            currentNostril = 'right';
            phaseElapsed = cycleTime - settings.inhaleDuration - settings.holdDuration;
          } else if (cycleTime < halfCycle + settings.inhaleDuration) {
            currentPhase = 'inhale';
            currentNostril = 'right';
            phaseElapsed = cycleTime - halfCycle;
          } else if (cycleTime < halfCycle + settings.inhaleDuration + settings.holdDuration) {
            currentPhase = 'hold';
            currentNostril = 'right';
            phaseElapsed = cycleTime - halfCycle - settings.inhaleDuration;
          } else {
            currentPhase = 'exhale';
            currentNostril = 'left';
            phaseElapsed = cycleTime - halfCycle - settings.inhaleDuration - settings.holdDuration;
          }

          const currentDuration = getPhaseDuration(currentPhase);
          const progress = Math.min((phaseElapsed / currentDuration) * 100, 100);

          // Calculate cycle count
          let completedCycles = Math.floor(elapsed / fullCycleDuration);
          if (state.isCompletingFinalCycle && cycleTime < 0.1 && elapsed >= fullCycleDuration) {
            completedCycles = Math.ceil(elapsed / fullCycleDuration);
          }

          setState(prev => ({
            ...prev,
            phase: currentPhase,
            nostril: currentNostril,
            phaseProgress: progress,
            cycleCount: completedCycles,
          }));

          // Construct phase key for audio service
          const phaseKey =
            currentPhase === 'hold' ? 'hold' : `${currentNostril}-${currentPhase}`;
          const lastPhaseKey =
            lastPhaseRef.current === 'hold' ? 'hold' : `${lastNostrilRef.current}-${lastPhaseRef.current}`;

          const isPhaseChange = phaseKey !== lastPhaseKey;
          const isFirstPhase = lastPhaseRef.current === '';

          if (isPhaseChange || isFirstPhase) {
            lastPhaseRef.current = currentPhase;
            lastNostrilRef.current = currentNostril;
            hasSpokenPhase.current = false;
            if (settings.phaseBeeps) {
              audioService.playPhaseBeep(currentPhase);
            }
          }

          // Play audio using pre-loaded voice pack
          if (!hasSpokenPhase.current && progress < 20 && !audioService.isCurrentlySpeaking()) {
            hasSpokenPhase.current = true;
            if (settings.voiceGuidance) {
              audioService.speak(phaseKey);
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };

      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isRunning, settings, state.isCompletingFinalCycle]);

  // Actions
  const toggleBreathing = () => {
    if (!state.isRunning && !state.isCountingDown) {
      // Reset all refs
      startTimeRef.current = null;
      lastPhaseRef.current = '';
      lastNostrilRef.current = '';
      hasSpokenPhase.current = false;
      previousSeconds.current = -1;
      hasSpokenCountdownNumber.current = false; // NEW: Reset countdown spoken flag

      // FIXED: Speak "Get ready" message before starting countdown
      if (settings.voiceGuidance) {
        // Cancel any ongoing speech first
        window.speechSynthesis.cancel();

        // Speak the initial message
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance("Get ready");
          utterance.rate = 0.75;

          // Wait for this message to finish before starting countdown
          utterance.onend = () => {
            // Start countdown after "Get ready" finishes
            setState(prev => ({
              ...prev,
              isCountingDown: true,
              countdown: BREATHING_DEFAULTS.COUNTDOWN_START,
              isCompletingFinalCycle: false,
            }));
          };

          window.speechSynthesis.speak(utterance);
        }, 100);
      } else {
        // If no voice guidance, start countdown immediately
        setState(prev => ({
          ...prev,
          isCountingDown: true,
          countdown: BREATHING_DEFAULTS.COUNTDOWN_START,
          isCompletingFinalCycle: false,
        }));
      }
    } else {
      // Stop breathing
      setState(prev => ({
        ...prev,
        isRunning: false,
        isCountingDown: false,
        countdown: BREATHING_DEFAULTS.COUNTDOWN_START,
      }));

      // Clean up countdown timer
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }

      audioService.cancelSpeech();
      window.speechSynthesis.cancel(); // NEW: Also cancel speech synthesis
    }
  };

  const reset = () => {
    setState({
      isRunning: false,
      isCountingDown: false,
      countdown: BREATHING_DEFAULTS.COUNTDOWN_START,
      phase: 'inhale',
      nostril: 'left',
      phaseProgress: 0,
      cycleCount: 0,
      elapsedTime: 0,
      isCompletingFinalCycle: false,
    });

    startTimeRef.current = null;
    lastPhaseRef.current = '';
    lastNostrilRef.current = '';
    hasSpokenPhase.current = false;
    previousSeconds.current = -1;
    hasSpokenCountdownNumber.current = false; // NEW: Reset countdown spoken flag

    // Clean up countdown timer
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    audioService.cancelSpeech();
    window.speechSynthesis.cancel(); // NEW: Also cancel speech synthesis
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    state,
    toggleBreathing,
    reset,
  };
};
