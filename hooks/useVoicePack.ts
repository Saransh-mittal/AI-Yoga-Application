// hooks/useVoicePack.ts
// Voice Pack Hook - WITH SSE PROGRESS TRACKING
// File Location: hooks/useVoicePack.ts (REPLACE ENTIRE FILE)
//
// EDUCATIONAL NOTES:
// - State management for progress data
// - Callback pattern for progress updates
// - Clean separation of concerns: service handles SSE, hook manages state

import { useState, useEffect, useCallback } from 'react';
import { MessagesConfig, VoiceLanguage } from '@/models/types';
import { voicePackService, VoicePack, VoicePackSummary } from '@/services/voicePackService';
import { audioService } from '@/services/audioService';
import { defaultVoicePreference } from '@/services/defaultVoicePreference';
import { ProgressData } from '@/components/BreathingGuide/VoiceProgressBar';

const SYSTEM_DEFAULT_ID = 'default';

interface UseVoicePackReturn {
  currentVoicePack: VoicePack | null;
  availableVoicePacks: VoicePackSummary[];
  userDefaultPackId: string | null;
  systemDefaultId: string;
  isLoading: boolean;
  error: string | null;

  // Progress tracking
  currentProgress: ProgressData | null;
  showProgress: boolean;

  defaultVoicePacks: VoicePackSummary[];
  refreshDefaultVoices: () => Promise<void>;

  createVoicePack: (params: {
    name: string;
    voiceSample: File;
    instructions: MessagesConfig;
    language?: VoiceLanguage;
    speed?: number;
  }) => Promise<void>;

  loadVoicePack: (packId: string) => Promise<void>;

  updateVoicePack: (params: {
    packId: string;
    instructions: MessagesConfig;
    phasesToUpdate?: string[];
  }) => Promise<void>;

  updateVoicePackSpeed: (params: {
    packId: string;
    newSpeed: number;
  }) => Promise<void>;

  deleteVoicePack: (packId: string) => Promise<void>;

  setAsDefault: (packId: string) => void;
  clearDefault: () => void;

  refreshVoicePackList: () => Promise<void>;

  clearError: () => void;
  clearProgress: () => void;
}

/**
 * Voice Pack Hook with SSE Progress Tracking
 *
 * This hook manages:
 * 1. Voice pack state (current pack, available packs)
 * 2. Progress state (current progress data, show/hide)
 * 3. Operations (create, load, update, delete)
 * 4. SSE progress callbacks
 *
 * Key Pattern: Progress Callback
 * - Service calls onProgress for each SSE update
 * - Hook updates state with progress data
 * - Component displays progress bar based on state
 *
 * State Flow:
 * User clicks create â†’ isLoading=true, showProgress=true
 * â†’ Service starts SSE connection
 * â†’ onProgress called for each update â†’ currentProgress updated
 * â†’ Operation completes â†’ isLoading=false, showProgress=false after delay
 */
export const useVoicePack = (): UseVoicePackReturn => {
  const [currentVoicePack, setCurrentVoicePack] = useState<VoicePack | null>(null);
  const [availableVoicePacks, setAvailableVoicePacks] = useState<VoicePackSummary[]>([]);
  const [userDefaultPackId, setUserDefaultPackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = useState<boolean>(false);

  // Progress tracking state
  const [currentProgress, setCurrentProgress] = useState<ProgressData | null>(null);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  /**
 * Default guided voice packs (pre-generated from backend)
 * These are the system-provided voices like Anulom Vilom guided packs
 */
const [defaultVoicePacks, setDefaultVoicePacks] = useState<VoicePackSummary[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultId = defaultVoicePreference.getUserDefaultVoicePack();
      setUserDefaultPackId(defaultId);
    }
  }, []);

  const refreshVoicePackList = useCallback(async () => {
    try {
      const packs = await voicePackService.listVoicePacks();
      setAvailableVoicePacks(packs);
    } catch (err) {
      console.error('Failed to load voice packs:', err);
      setError('Failed to load voice pack list');
    }
  }, []);

  useEffect(() => {
    const autoLoadDefaultVoice = async () => {
      if (typeof window === 'undefined') return;
      if (hasAttemptedAutoLoad) return;

      setHasAttemptedAutoLoad(true);

      try {
        console.log('ðŸ” Auto-loading default voice pack...');

        await refreshVoicePackList();

        const preferredDefaultId = defaultVoicePreference.getUserDefaultVoicePack();

        if (!preferredDefaultId) {
          console.log('â„¹ï¸ No default voice pack set');
          return;
        }

        console.log(`ðŸŽ¯ Loading default: ${preferredDefaultId}`);

        const pack = await voicePackService.getVoicePack(preferredDefaultId);
        if (pack) {
          await voicePackService.preloadVoicePack(pack);
          await audioService.setVoicePack(pack.id);
          setCurrentVoicePack(pack);
          console.log('âœ… Default voice pack loaded');
        }
      } catch (err) {
        console.error('Failed to auto-load default voice:', err);
      }
    };

    autoLoadDefaultVoice();
  }, [hasAttemptedAutoLoad, refreshVoicePackList]);

  useEffect(() => {
    refreshVoicePackList();
  }, [refreshVoicePackList]);

  /**
   * Progress callback handler
   *
   * Called by voicePackService for each SSE progress update.
   * Updates the currentProgress state which triggers re-render
   * of the progress bar component.
   *
   * Learning: Callback Pattern
   * - Service doesn't know about React state
   * - Hook provides callback that updates state
   * - Clean separation between service logic and UI state
   */
  const handleProgress = useCallback((progress: ProgressData) => {
    console.log(`ðŸ“Š Progress update: ${progress.progress.toFixed(1)}%`);
    setCurrentProgress(progress);
  }, []);

  /**
   * Create voice pack with progress tracking
   */
  const createVoicePack = useCallback(async (params: {
    name: string;
    voiceSample: File;
    instructions: MessagesConfig;
    language?: VoiceLanguage;
    speed?: number;
  }) => {
    console.log('ðŸŽ¯ Creating voice pack with progress tracking...');

    setIsLoading(true);
    setError(null);
    setShowProgress(true);
    setCurrentProgress(null);

    try {
      // Pass progress callback to service
      const voicePack = await voicePackService.createVoicePack({
        name: params.name,
        voiceSample: params.voiceSample,
        instructions: params.instructions,
        language: params.language || 'en',
        speed: params.speed || 1.0,
        onProgress: handleProgress, // This is the key!
      });

      console.log('âœ… Voice pack created:', voicePack.id);

      await refreshVoicePackList();
      await voicePackService.preloadVoicePack(voicePack);
      await audioService.setVoicePack(voicePack.id);
      setCurrentVoicePack(voicePack);

      // Keep progress visible for 2 seconds after completion
      setTimeout(() => {
        setShowProgress(false);
        setCurrentProgress(null);
      }, 2000);

    } catch (err) {
      console.error('âŒ Voice pack creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create voice pack');

      // Keep error visible
      setTimeout(() => {
        setShowProgress(false);
      }, 5000);

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleProgress, refreshVoicePackList]);

  /**
   * Load voice pack
   */
  const loadVoicePack = useCallback(async (packId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const voicePack = await voicePackService.getVoicePack(packId);

      if (!voicePack) {
        throw new Error('Voice pack not found');
      }

      await voicePackService.preloadVoicePack(voicePack);
      await audioService.setVoicePack(voicePack.id);

      setCurrentVoicePack(voicePack);

    } catch (err) {
      console.error('Failed to load voice pack:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voice pack');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update voice pack - SIMPLIFIED VERSION
   */
  const updateVoicePack = useCallback(async (params: {
    packId: string;
    instructions: MessagesConfig;
    phasesToUpdate?: string[];
  }) => {
    console.log('ðŸ”„ Updating voice pack...');

    setIsLoading(true);
    setError(null);
    setShowProgress(true);
    setCurrentProgress(null);

    try {
      // Pass progress callback
      const voicePack = await voicePackService.updateVoicePack({
        packId: params.packId,
        instructions: params.instructions,
        phasesToUpdate: params.phasesToUpdate,
        onProgress: handleProgress,
      });

      console.log('âœ… Voice pack updated');

      // Refresh list and reload the pack
      await refreshVoicePackList();

      if (currentVoicePack?.id === params.packId) {
        await voicePackService.preloadVoicePack(voicePack);
        await audioService.setVoicePack(voicePack.id);
        setCurrentVoicePack(voicePack);
      }

      // Keep progress visible for 2 seconds
      setTimeout(() => {
        setShowProgress(false);
        setCurrentProgress(null);
      }, 2000);

    } catch (err) {
      console.error('âŒ Update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update voice pack');

      setTimeout(() => {
        setShowProgress(false);
      }, 5000);

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleProgress, currentVoicePack, refreshVoicePackList]);

  /**
   * Update voice pack speed with progress tracking
   */
  const updateVoicePackSpeed = useCallback(async (params: {
    packId: string;
    newSpeed: number;
  }) => {
    console.log('ðŸŽšï¸ Updating speed with progress tracking...');

    setIsLoading(true);
    setError(null);
    setShowProgress(true);
    setCurrentProgress(null);

    try {
      // Pass progress callback
      const voicePack = await voicePackService.updateVoicePackSpeed({
        packId: params.packId,
        newSpeed: params.newSpeed,
        onProgress: handleProgress,
      });

      console.log('âœ… Speed updated');

      await refreshVoicePackList();

      if (currentVoicePack?.id === params.packId) {
        await voicePackService.preloadVoicePack(voicePack);
        await audioService.setVoicePack(voicePack.id);
        setCurrentVoicePack(voicePack);
      }

      // Keep progress visible for 2 seconds
      setTimeout(() => {
        setShowProgress(false);
        setCurrentProgress(null);
      }, 2000);

    } catch (err) {
      console.error('âŒ Speed update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update speed');

      setTimeout(() => {
        setShowProgress(false);
      }, 5000);

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleProgress, currentVoicePack, refreshVoicePackList]);

  /**
   * Delete voice pack
   */
  const deleteVoicePack = useCallback(async (packId: string) => {
    if (packId === SYSTEM_DEFAULT_ID) {
      setError('Cannot delete system default');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await voicePackService.deleteVoicePack(packId);

      if (!success) {
        throw new Error('Failed to delete voice pack');
      }

      if (defaultVoicePreference.isUserDefault(packId)) {
        defaultVoicePreference.clearUserDefaultVoicePack();
        setUserDefaultPackId(defaultVoicePreference.getUserDefaultVoicePack());
      }

      if (currentVoicePack?.id === packId) {
        setCurrentVoicePack(null);
        audioService.clearVoicePack();

        try {
          const defaultPack = await voicePackService.getVoicePack(SYSTEM_DEFAULT_ID);
          if (defaultPack) {
            await voicePackService.preloadVoicePack(defaultPack);
            await audioService.setVoicePack(defaultPack.id);
            setCurrentVoicePack(defaultPack);
          }
        } catch (err) {
          console.warn('Could not auto-load default pack:', err);
        }
      }

      await refreshVoicePackList();

    } catch (err) {
      console.error('Failed to delete voice pack:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentVoicePack, refreshVoicePackList]);

  const setAsDefault = useCallback((packId: string) => {
    if (typeof window === 'undefined') return;

    try {
      defaultVoicePreference.setUserDefaultVoicePack(packId);
      setUserDefaultPackId(packId);
      console.log(`âœ… Set ${packId} as default`);
    } catch (err) {
      console.error('Failed to set default:', err);
      setError('Failed to set default');
    }
  }, []);

  const clearDefault = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      defaultVoicePreference.clearUserDefaultVoicePack();
      setUserDefaultPackId(defaultVoicePreference.getUserDefaultVoicePack());
      console.log('âœ… Cleared default');
    } catch (err) {
      console.error('Failed to clear default:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearProgress = useCallback(() => {
    setShowProgress(false);
    setCurrentProgress(null);
  }, []);

  /**
   * Fetch default guided voice packs from backend
   *
   * These are pre-generated voice packs (e.g., Anulom Vilom guided packs)
   * that come from the system and are available to all users.
   *
   * Now uses voicePackService.listVoicePacks({ category: 'default' })
   * which correctly routes to the backend URL.
   *
   * Key Learning: Always use service layer for API calls instead of direct fetch
   * - Service layer handles backend URL configuration
   * - Centralizes API logic for easier maintenance
   * - Provides consistent error handling
   * - Makes testing easier with mock services
   */
  const fetchDefaultVoices = useCallback(async () => {
    try {
      // Use voicePackService instead of direct fetch - this correctly uses backend URL
      const defaultPacks = await voicePackService.listVoicePacks({ category: 'default' });

      // Filter only default/guided packs (extra safety check)
      const guidedPacks = defaultPacks.filter(
        (pack) => pack.id.startsWith('default_') || pack.is_default === true
      );

      setDefaultVoicePacks(guidedPacks);
      console.log(`✅ Loaded ${guidedPacks.length} default voice packs`);
    } catch (err) {
      console.error('Error fetching default voices:', err);
      // Don't show error to user - default voices not loading shouldn't break app
      setDefaultVoicePacks([]);
    }
  }, []);

useEffect(() => {
  // Fetch default voices on mount
  fetchDefaultVoices()

  // Optional: Refresh default voices every 5 minutes
  const interval = setInterval(fetchDefaultVoices, 5 * 60 * 1000)
  return () => clearInterval(interval)
}, [fetchDefaultVoices])

  return {
    currentVoicePack,
    availableVoicePacks,
    userDefaultPackId,
    systemDefaultId: SYSTEM_DEFAULT_ID,
    isLoading,
    error,
    currentProgress,
    showProgress,
    defaultVoicePacks,
  refreshDefaultVoices: fetchDefaultVoices,
    createVoicePack,
    loadVoicePack,
    updateVoicePack,
    updateVoicePackSpeed,
    deleteVoicePack,
    setAsDefault,
    clearDefault,
    refreshVoicePackList,
    clearError,
    clearProgress,
  };
};
