// hooks/useVoicePack.ts
// Voice Pack Hook - WITH SSE PROGRESS TRACKING & INDEXEDDB SUPPORT
// File Location: hooks/useVoicePack.ts

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
 * Voice Pack Hook with IndexedDB support and SSE progress tracking.
 * Scopes custom voice pack creation, listing, and updates by NextAuth user email.
 */
export const useVoicePack = (): UseVoicePackReturn => {
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || undefined;

  const [currentVoicePack, setCurrentVoicePack] = useState<VoicePack | null>(null);
  const [availableVoicePacks, setAvailableVoicePacks] = useState<VoicePackSummary[]>([]);
  const [userDefaultPackId, setUserDefaultPackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = useState<boolean>(false);

  // Progress tracking state
  const [currentProgress, setCurrentProgress] = useState<ProgressData | null>(null);
  const [showProgress, setShowProgress] = useState<boolean>(false);

  // Default guided voice packs
  const [defaultVoicePacks, setDefaultVoicePacks] = useState<VoicePackSummary[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultId = defaultVoicePreference.getUserDefaultVoicePack();
      setUserDefaultPackId(defaultId);
    }
  }, []);

  const refreshVoicePackList = useCallback(async () => {
    try {
      const packs = await voicePackService.listVoicePacks({ userEmail });
      setAvailableVoicePacks(packs);
    } catch (err) {
      console.error('Failed to load voice packs:', err);
      setError('Failed to load voice pack list');
    }
  }, [userEmail]);

  useEffect(() => {
    const autoLoadDefaultVoice = async () => {
      if (typeof window === 'undefined') return;
      if (status === 'loading') return; // Wait for NextAuth to resolve session
      if (hasAttemptedAutoLoad) return;

      setHasAttemptedAutoLoad(true);

      try {
        console.log('🔍 Auto-loading default voice pack...');

        await refreshVoicePackList();

        const preferredDefaultId = defaultVoicePreference.getUserDefaultVoicePack();

        if (!preferredDefaultId) {
          console.log('ℹ️ No default voice pack set');
          return;
        }

        console.log(`🎯 Loading default: ${preferredDefaultId}`);

        const pack = await voicePackService.getVoicePack(preferredDefaultId);
        if (pack) {
          await voicePackService.preloadVoicePack(pack);
          await audioService.setVoicePack(pack.id);
          setCurrentVoicePack(pack);
          console.log('✅ Default voice pack loaded');
        }
      } catch (err) {
        console.error('Failed to auto-load default voice:', err);
      }
    };

    autoLoadDefaultVoice();
  }, [hasAttemptedAutoLoad, status, userEmail, refreshVoicePackList]);

  useEffect(() => {
    if (status !== 'loading') {
      refreshVoicePackList();
    }
  }, [refreshVoicePackList, status]);

  /**
   * Progress callback handler
   */
  const handleProgress = useCallback((progress: ProgressData) => {
    console.log(`📊 Progress update: ${progress.progress?.toFixed(1) || '?'}%`);
    setCurrentProgress(progress);
  }, []);

  /**
   * Create voice pack with userEmail scope
   */
  const createVoicePack = useCallback(async (params: {
    name: string;
    voiceSample: File;
    instructions: MessagesConfig;
    language?: VoiceLanguage;
    speed?: number;
  }) => {
    console.log('🎯 Creating voice pack with progress tracking...');

    setIsLoading(true);
    setError(null);
    setShowProgress(true);
    setCurrentProgress(null);

    try {
      const voicePack = await voicePackService.createVoicePack({
        name: params.name,
        voiceSample: params.voiceSample,
        instructions: params.instructions,
        language: params.language || 'en',
        speed: params.speed || 1.0,
        onProgress: handleProgress,
        userEmail,
      });

      console.log('✅ Voice pack created:', voicePack.id);

      await refreshVoicePackList();
      await voicePackService.preloadVoicePack(voicePack);
      await audioService.setVoicePack(voicePack.id);
      setCurrentVoicePack(voicePack);

      setTimeout(() => {
        setShowProgress(false);
        setCurrentProgress(null);
      }, 2000);

    } catch (err) {
      console.error('❌ Voice pack creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create voice pack');

      setTimeout(() => {
        setShowProgress(false);
      }, 5000);

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleProgress, refreshVoicePackList, userEmail]);

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
   * Update voice pack instructions with self-healing recovery support
   */
  const updateVoicePack = useCallback(async (params: {
    packId: string;
    instructions: MessagesConfig;
    phasesToUpdate?: string[];
  }) => {
    console.log('🔄 Updating voice pack...');

    setIsLoading(true);
    setError(null);
    setShowProgress(true);
    setCurrentProgress(null);

    try {
      const voicePack = await voicePackService.updateVoicePack({
        packId: params.packId,
        instructions: params.instructions,
        phasesToUpdate: params.phasesToUpdate,
        onProgress: handleProgress,
        userEmail,
      });

      console.log('✅ Voice pack updated');

      await refreshVoicePackList();

      if (currentVoicePack?.id === params.packId || currentVoicePack?.id === voicePack.id) {
        await voicePackService.preloadVoicePack(voicePack);
        await audioService.setVoicePack(voicePack.id);
        setCurrentVoicePack(voicePack);

        // If the ID changed due to self-healing regeneration, update default preferences
        if (currentVoicePack?.id === params.packId && voicePack.id !== params.packId) {
          defaultVoicePreference.setUserDefaultVoicePack(voicePack.id);
          setUserDefaultPackId(voicePack.id);
        }
      }

      setTimeout(() => {
        setShowProgress(false);
        setCurrentProgress(null);
      }, 2000);

    } catch (err) {
      console.error('❌ Update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update voice pack');

      setTimeout(() => {
        setShowProgress(false);
      }, 5000);

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleProgress, currentVoicePack, refreshVoicePackList, userEmail]);

  /**
   * Update voice pack speed with self-healing recovery support
   */
  const updateVoicePackSpeed = useCallback(async (params: {
    packId: string;
    newSpeed: number;
  }) => {
    console.log('🎚️ Updating speed with progress tracking...');

    setIsLoading(true);
    setError(null);
    setShowProgress(true);
    setCurrentProgress(null);

    try {
      const voicePack = await voicePackService.updateVoicePackSpeed({
        packId: params.packId,
        newSpeed: params.newSpeed,
        onProgress: handleProgress,
        userEmail,
      });

      console.log('✅ Speed updated');

      await refreshVoicePackList();

      if (currentVoicePack?.id === params.packId || currentVoicePack?.id === voicePack.id) {
        await voicePackService.preloadVoicePack(voicePack);
        await audioService.setVoicePack(voicePack.id);
        setCurrentVoicePack(voicePack);

        // If the ID changed due to self-healing regeneration, update default preferences
        if (currentVoicePack?.id === params.packId && voicePack.id !== params.packId) {
          defaultVoicePreference.setUserDefaultVoicePack(voicePack.id);
          setUserDefaultPackId(voicePack.id);
        }
      }

      setTimeout(() => {
        setShowProgress(false);
        setCurrentProgress(null);
      }, 2000);

    } catch (err) {
      console.error('❌ Speed update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update speed');

      setTimeout(() => {
        setShowProgress(false);
      }, 5000);

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleProgress, currentVoicePack, refreshVoicePackList, userEmail]);

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
      console.log(`✅ Set ${packId} as default`);
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
      console.log('✅ Cleared default');
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
   */
  const fetchDefaultVoices = useCallback(async () => {
    try {
      const defaultPacks = await voicePackService.listVoicePacks({ category: 'default' });

      const guidedPacks = defaultPacks.filter(
        (pack) => pack.id.startsWith('default_') || pack.is_default === true
      );

      setDefaultVoicePacks(guidedPacks);
      console.log(`✅ Loaded ${guidedPacks.length} default voice packs`);
    } catch (err) {
      console.error('Error fetching default voices:', err);
      setDefaultVoicePacks([]);
    }
  }, []);

  useEffect(() => {
    fetchDefaultVoices();

    const interval = setInterval(fetchDefaultVoices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDefaultVoices]);

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
