// hooks/useVoicePack.ts
// Voice Pack Hook with User Default Support - ENHANCED
// File Location: hooks/useVoicePack.ts (REPLACE EXISTING)
//
// NEW: Loads user's preferred default voice pack
// NEW: setAsDefault() function to change default
// NEW: Returns which pack is set as default

import { useState, useEffect, useCallback } from 'react';
import { MessagesConfig, VoiceLanguage } from '@/models/types';
import { voicePackService, VoicePack, VoicePackSummary } from '@/services/voicePackService';
import { audioService } from '@/services/audioService';
import { defaultVoicePreference } from '@/services/defaultVoicePreference';

const SYSTEM_DEFAULT_ID = 'default';

interface UseVoicePackReturn {
  currentVoicePack: VoicePack | null;
  availableVoicePacks: VoicePackSummary[];
  userDefaultPackId: string | null;
  systemDefaultId: string; // NEW
  isLoading: boolean;
  error: string | null;
  progressMessage: string | null;

  updateVoicePackSpeed: (params: { packId: string; newSpeed: number }) => Promise<void>; // NEW

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

  deleteVoicePack: (packId: string) => Promise<void>;

  setAsDefault: (packId: string) => void; // NEW
  clearDefault: () => void; // NEW

  refreshVoicePackList: () => Promise<void>;

  clearError: () => void;
}

export const useVoicePack = (): UseVoicePackReturn => {
  const [currentVoicePack, setCurrentVoicePack] = useState<VoicePack | null>(null);
  const [availableVoicePacks, setAvailableVoicePacks] = useState<VoicePackSummary[]>([]);
  const [userDefaultPackId, setUserDefaultPackId] = useState<string | null>(null); // Will be set on mount
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = useState<boolean>(false);

  /**
   * Initialize user default pack ID on client side only
   */
  useEffect(() => {
    // Only run in browser
    if (typeof window !== 'undefined') {
      const defaultId = defaultVoicePreference.getUserDefaultVoicePack();
      setUserDefaultPackId(defaultId);
    }
  }, []);

  /**
   * Refresh voice pack list
   */
  const refreshVoicePackList = useCallback(async () => {
    try {
      const packs = await voicePackService.listVoicePacks();
      setAvailableVoicePacks(packs);
    } catch (err) {
      console.error('Failed to load voice packs:', err);
      setError('Failed to load voice pack list');
    }
  }, []);

  /**
   * Auto-load user's preferred default voice pack on mount (CLIENT-SIDE ONLY)
   */
  useEffect(() => {
    const autoLoadDefaultVoice = async () => {
      // SSR Safety: Only run in browser
      if (typeof window === 'undefined') {
        return;
      }

      if (hasAttemptedAutoLoad) return;

      setHasAttemptedAutoLoad(true);

      try {
        console.log('🔍 Checking for default voice pack...');

        // Load voice pack list first
        await refreshVoicePackList();

        // Get user's preferred default
        const preferredDefaultId = defaultVoicePreference.getUserDefaultVoicePack();

        if (!preferredDefaultId) {
          console.log('ℹ️ No default voice pack set by user');
          return;
        }

        console.log(`🎯 User's preferred default: ${preferredDefaultId}`);

        // Check if preferred pack exists
        const packs = await voicePackService.listVoicePacks();
        const preferredPack = packs.find(p => p.id === preferredDefaultId);

        if (preferredPack) {
          console.log(`✅ Loading user's default: ${preferredPack.name}`);
          setProgressMessage(`Loading ${preferredPack.name}...`);

          // Load the preferred pack
          const pack = await voicePackService.getVoicePack(preferredDefaultId);
          if (pack) {
            await voicePackService.preloadVoicePack(pack);
            await audioService.setVoicePack(pack.id);
            setCurrentVoicePack(pack);

            console.log('✅ User default voice pack loaded successfully');
            setProgressMessage(null);
          }
        } else {
          console.warn(`⚠️ User's preferred default (${preferredDefaultId}) not found`);

          // Fallback to system default if available
          const systemDefault = packs.find(p => p.id === SYSTEM_DEFAULT_ID);
          if (systemDefault) {
            console.log('📦 Falling back to system default');
            const pack = await voicePackService.getVoicePack(SYSTEM_DEFAULT_ID);
            if (pack) {
              await voicePackService.preloadVoicePack(pack);
              await audioService.setVoicePack(pack.id);
              setCurrentVoicePack(pack);
            }
          }

          setProgressMessage(null);
        }
      } catch (err) {
        console.error('Failed to auto-load default voice:', err);
        setProgressMessage(null);
      }
    };

    autoLoadDefaultVoice();
  }, [hasAttemptedAutoLoad, refreshVoicePackList]);

  /**
   * Load voice pack list on mount
   */
  useEffect(() => {
    refreshVoicePackList();
  }, [refreshVoicePackList]);

  /**
   * Create voice pack
   */
  const createVoicePack = useCallback(async (params: {
    name: string;
    voiceSample: File;
    instructions: MessagesConfig;
    language?: VoiceLanguage;
    speed?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    setProgressMessage('Starting voice pack creation...');

    try {
      const voicePack = await voicePackService.createVoicePack({
        name: params.name,
        voiceSample: params.voiceSample,
        instructions: params.instructions,
        language: params.language || 'en',
        speed: params.speed || 1.0,
        onProgress: (message) => {
          setProgressMessage(message);
        },
      });

      setProgressMessage('Pre-loading audio files...');

      await voicePackService.preloadVoicePack(voicePack);
      await audioService.setVoicePack(voicePack.id);

      setCurrentVoicePack(voicePack);
      setProgressMessage('Voice pack ready!');

      await refreshVoicePackList();

      setTimeout(() => setProgressMessage(null), 2000);

    } catch (err) {
      console.error('Voice pack creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create voice pack');
      setProgressMessage(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshVoicePackList]);

  /**
   * Load voice pack
   */
  const loadVoicePack = useCallback(async (packId: string) => {
    setIsLoading(true);
    setError(null);
    setProgressMessage('Loading voice pack...');

    try {
      const voicePack = await voicePackService.getVoicePack(packId);

      if (!voicePack) {
        throw new Error('Voice pack not found');
      }

      setProgressMessage('Pre-loading audio files...');

      await voicePackService.preloadVoicePack(voicePack);
      await audioService.setVoicePack(voicePack.id);

      setCurrentVoicePack(voicePack);
      setProgressMessage('Voice pack loaded!');

      setTimeout(() => setProgressMessage(null), 2000);

    } catch (err) {
      console.error('Failed to load voice pack:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voice pack');
      setProgressMessage(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update voice pack
   */
  const updateVoicePack = useCallback(async (params: {
    packId: string;
    instructions: MessagesConfig;
    phasesToUpdate?: string[];
  }) => {
    const { packId, instructions, phasesToUpdate } = params;

    setIsLoading(true);
    setError(null);
    setProgressMessage('Updating voice pack...');

    try {
      const updatedVoicePack = await voicePackService.updateVoicePack({
        packId,
        instructions,
        phasesToUpdate,
        onProgress: (message) => {
          setProgressMessage(message);
        },
      });

      setProgressMessage('Pre-loading updated audio...');

      await voicePackService.preloadVoicePack(updatedVoicePack);

      if (currentVoicePack?.id === packId) {
        await audioService.setVoicePack(updatedVoicePack.id);
        setCurrentVoicePack(updatedVoicePack);
      }

      setProgressMessage('Voice pack updated!');

      setTimeout(() => setProgressMessage(null), 2000);

    } catch (err) {
      console.error('Voice pack update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update voice pack');
      setProgressMessage(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentVoicePack]);

  /**
   * Delete voice pack
   */
  const deleteVoicePack = useCallback(async (packId: string) => {
    if (packId === SYSTEM_DEFAULT_ID) {
      setError('Cannot delete system default voice pack');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await voicePackService.deleteVoicePack(packId);

      if (!success) {
        throw new Error('Failed to delete voice pack');
      }

      // If deleted pack was user's default, clear preference
      if (defaultVoicePreference.isUserDefault(packId)) {
        console.log('⚠️ Deleted pack was user default, clearing preference');
        defaultVoicePreference.clearUserDefaultVoicePack();
        setUserDefaultPackId(defaultVoicePreference.getUserDefaultVoicePack());
      }

      // If deleted pack was currently loaded, load default
      if (currentVoicePack?.id === packId) {
        setCurrentVoicePack(null);
        audioService.clearVoicePack();

        // Try to auto-load system default
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
      setError(err instanceof Error ? err.message : 'Failed to delete voice pack');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentVoicePack, refreshVoicePackList]);

  /**
   * Set a voice pack as user's default (NEW)
   */
  const setAsDefault = useCallback((packId: string) => {
    // SSR Safety: Only run in browser
    if (typeof window === 'undefined') {
      console.warn('Cannot set default in SSR environment');
      return;
    }

    try {
      defaultVoicePreference.setUserDefaultVoicePack(packId);
      setUserDefaultPackId(packId);
      console.log(`✅ Set ${packId} as default voice pack`);
    } catch (err) {
      console.error('Failed to set default:', err);
      setError('Failed to set default voice pack');
    }
  }, []);

  /**
   * Clear user's default preference (NEW)
   */
  const clearDefault = useCallback(() => {
    // SSR Safety: Only run in browser
    if (typeof window === 'undefined') {
      console.warn('Cannot clear default in SSR environment');
      return;
    }

    try {
      defaultVoicePreference.clearUserDefaultVoicePack();
      setUserDefaultPackId(defaultVoicePreference.getUserDefaultVoicePack());
      console.log('✅ Cleared default voice pack preference');
    } catch (err) {
      console.error('Failed to clear default:', err);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

   /**
   * Update voice pack speed (NEW)
   */
  const updateVoicePackSpeed = useCallback(async (params: {
    packId: string;
    newSpeed: number;
  }) => {
    const { packId, newSpeed } = params;

    setIsLoading(true);
    setError(null);
    setProgressMessage('Regenerating audio at new speed...');

    try {
      const updatedVoicePack = await voicePackService.updateVoicePackSpeed({
        packId,
        newSpeed,
        onProgress: (message) => {
          setProgressMessage(message);
        },
      });

      setProgressMessage('Pre-loading updated audio...');

      await voicePackService.preloadVoicePack(updatedVoicePack);

      if (currentVoicePack?.id === packId) {
        await audioService.setVoicePack(updatedVoicePack.id);
        setCurrentVoicePack(updatedVoicePack);
      }

      setProgressMessage('Voice pack speed updated!');

      setTimeout(() => setProgressMessage(null), 2000);

    } catch (err) {
      console.error('Voice pack speed update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update voice pack speed');
      setProgressMessage(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentVoicePack]);

  return {
    currentVoicePack,
    availableVoicePacks,
    userDefaultPackId, // NEW
    systemDefaultId: SYSTEM_DEFAULT_ID, // NEW
    isLoading,
    error,
    progressMessage,
    updateVoicePackSpeed, // NEW
    createVoicePack,
    loadVoicePack,
    updateVoicePack,
    deleteVoicePack,
    setAsDefault, // NEW
    clearDefault, // NEW
    refreshVoicePackList,
    clearError,
  };
};
