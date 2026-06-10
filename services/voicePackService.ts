// services/voicePackService.ts
// Voice Pack Service - WITH SSE PROGRESS TRACKING & INDEXEDDB CACHING
// File Location: src/services/voicePackService.ts

import { MessagesConfig, VoiceLanguage } from '@/models/types';
import { ProgressData } from '@/components/BreathingGuide/VoiceProgressBar';
import { indexedDbService, LocalVoicePack } from './indexedDbService';

/**
 * VoicePack - Complete voice pack data with audio files and metadata
 */
export interface VoicePack {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  language: string;
  speed: number;
  audio_files: {
    'left-inhale': string[];
    'right-exhale': string[];
    'right-inhale': string[];
    'left-exhale': string[];
    'hold': string[];
  };
  instructions: MessagesConfig;
  affirmations: MessagesConfig;
  total_audio_files: number;
}

/**
 * VoicePackSummary - Lightweight voice pack metadata for lists
 */
export interface VoicePackSummary {
  id: string;
  name: string;
  created_at: string;
  total_audio_files: number;
  description?: string;
  language?: string;
  gender?: string;
  is_default?: boolean;
  breathing_technique?: string;
  style?: string;
  source?: 'guided' | 'local';
}

/**
 * CreateVoicePackParams - Parameters for creating a new voice pack
 */
export interface CreateVoicePackParams {
  name: string;
  voiceSample: File;
  instructions: MessagesConfig;
  language?: VoiceLanguage;
  speed?: number;
  onProgress?: (progress: ProgressData) => void;
  userEmail?: string; // Isolated per user
}

/**
 * UpdateVoicePackParams - Parameters for updating voice pack instructions
 */
export interface UpdateVoicePackParams {
  packId: string;
  instructions: MessagesConfig;
  phasesToUpdate?: string[];
  onProgress?: (progress: ProgressData) => void;
  userEmail?: string; // Needed for self-healing
}

/**
 * UpdateVoicePackSpeedParams - Parameters for changing voice pack speed
 */
export interface UpdateVoicePackSpeedParams {
  packId: string;
  newSpeed: number;
  onProgress?: (progress: ProgressData) => void;
  userEmail?: string; // Needed for self-healing
}

/**
 * ListVoicePacksParams - Optional parameters for filtering voice pack lists
 */
export interface ListVoicePacksParams {
  category?: 'default' | 'user';
  language?: string;
  userEmail?: string; // Used to isolate user voice packs
}

/**
 * Voice Pack Service with SSE Progress Tracking and IndexedDB caching
 */
class VoicePackService {
  private backendUrl: string;
  private audioCache: Map<string, HTMLAudioElement>;

  constructor() {
    this.backendUrl = '';  // Set lazily on first use
    this.audioCache = new Map();
  }

  private getBackendUrl(): string {
    return '';
  }

  /**
   * Helper to download all generated audio files as Blobs for local caching
   */
  private async downloadAudioBlobs(packId: string, audioFiles: VoicePack['audio_files']): Promise<{ [key: string]: Blob[] }> {
    const downloadedBlobs: { [key: string]: Blob[] } = {};
    const phaseKeys = ['left-inhale', 'right-exhale', 'right-inhale', 'left-exhale', 'hold'];

    for (const phaseKey of phaseKeys) {
      downloadedBlobs[phaseKey] = [];
      const filenames = audioFiles[phaseKey as keyof typeof audioFiles] || [];
      for (let i = 0; i < filenames.length; i++) {
        const url = this.getAudioUrl(packId, phaseKey, i);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download audio variant ${i} for phase ${phaseKey}`);
        }
        const blob = await response.blob();
        downloadedBlobs[phaseKey].push(blob);
      }
    }
    return downloadedBlobs;
  }

  /**
   * Create voice pack with SSE progress tracking and local IndexedDB cache
   */
  async createVoicePack(params: CreateVoicePackParams): Promise<VoicePack> {
    const {
      name,
      voiceSample,
      instructions,
      language = 'en',
      speed = 1.0,
      onProgress,
      userEmail,
    } = params;

    console.log('🔄 Initializing voice pack creation:', name);

    try {
      // STEP 1: Initialize creation and get operation_id
      const formData = new FormData();
      formData.append('name', name);
      formData.append('voice_sample', voiceSample);
      formData.append('instructions', JSON.stringify(instructions));
      formData.append('language', language);
      formData.append('speed', speed.toString());

      const initResponse = await fetch(`${this.getBackendUrl()}/api/xtts-proxy/init`, {
        method: 'POST',
        body: formData,
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.detail || 'Failed to initialize voice pack creation');
      }

      const { operation_id } = await initResponse.json();
      console.log('✅ Operation initialized:', operation_id);

      // STEP 2: Connect to SSE endpoint and wait for completion
      const voicePack = await this.connectToProgressStream(operation_id, onProgress);

      // STEP 3: Cache the generated voice pack and audio Blobs locally in IndexedDB
      if (userEmail) {
        try {
          if (onProgress) {
            onProgress({
              operation_id,
              status: 'processing',
              progress: 98.0,
              message: 'Saving voice pack to local browser storage...'
            });
          }

          const audioBlobs = await this.downloadAudioBlobs(voicePack.id, voicePack.audio_files);

          await indexedDbService.saveVoicePack({
            id: voicePack.id,
            userEmail,
            name: voicePack.name,
            language: voicePack.language,
            speed: voicePack.speed,
            instructions: voicePack.instructions,
            createdAt: voicePack.created_at,
            voiceSampleBlob: voiceSample,
            audioFiles: audioBlobs
          });

          console.log(`✅ Cached voice pack ${voicePack.id} in IndexedDB for ${userEmail}`);
        } catch (cacheError) {
          console.error('⚠️ Failed to cache voice pack in IndexedDB:', cacheError);
        }
      }

      console.log('✅ Voice pack created:', voicePack.id);
      return voicePack;

    } catch (error) {
      console.error('❌ Voice pack creation failed:', error);
      throw error;
    }
  }

  /**
   * Update voice pack instructions with SSE progress tracking and self-healing on server restart
   */
  async updateVoicePack(params: UpdateVoicePackParams): Promise<VoicePack> {
    const { packId, instructions, phasesToUpdate, onProgress, userEmail } = params;

    console.log('🔄 Initializing voice pack update:', packId);

    try {
      // STEP 1: Initialize update
      const formData = new FormData();
      formData.append('instructions', JSON.stringify(instructions));

      if (phasesToUpdate) {
        formData.append('phases_to_update', JSON.stringify(phasesToUpdate));
      }

      const initResponse = await fetch(
        `${this.getBackendUrl()}/api/xtts-proxy/${packId}/update/init`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Self-healing: if server returned 404 (not found) and we have local backup, re-create voice pack
      if (initResponse.status === 404 && userEmail) {
        console.warn(`⚠️ Voice pack ${packId} not found on server. Attempting auto-recovery from IndexedDB...`);
        const localPack = await indexedDbService.getVoicePack(packId);
        if (localPack && localPack.voiceSampleBlob) {
          if (onProgress) {
            onProgress({
              operation_id: 'recovery',
              status: 'processing',
              progress: 5.0,
              message: 'Server restarted. Recovering voice pack from browser storage...'
            });
          }

          // Trigger recreate with the stored sample and new instructions
          const voiceSampleFile = new File([localPack.voiceSampleBlob], 'voice_sample.wav', { type: 'audio/wav' });
          const newPack = await this.createVoicePack({
            name: localPack.name,
            voiceSample: voiceSampleFile,
            instructions: instructions, // use the new instructions
            language: localPack.language as any,
            speed: localPack.speed,
            userEmail,
            onProgress
          });

          // Clean up old local record
          await indexedDbService.deleteVoicePack(packId);
          return newPack;
        }
      }

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.detail || 'Failed to initialize voice pack update');
      }

      const { operation_id } = await initResponse.json();
      console.log('✅ Update initialized:', operation_id);

      // STEP 2: Connect to SSE and wait for completion
      const voicePack = await this.connectToProgressStream(operation_id, onProgress);

      // STEP 3: Update local IndexedDB cache with the new audio files
      if (userEmail) {
        try {
          if (onProgress) {
            onProgress({
              operation_id,
              status: 'processing',
              progress: 98.0,
              message: 'Updating local browser storage...'
            });
          }

          const localPack = await indexedDbService.getVoicePack(packId);
          if (localPack) {
            const audioBlobs = await this.downloadAudioBlobs(voicePack.id, voicePack.audio_files);
            localPack.instructions = voicePack.instructions;
            localPack.audioFiles = audioBlobs;
            await indexedDbService.saveVoicePack(localPack);
            console.log(`✅ Updated voice pack ${packId} in IndexedDB.`);
          }
        } catch (cacheError) {
          console.error('⚠️ Failed to update local IndexedDB cache:', cacheError);
        }
      }

      console.log('✅ Voice pack updated');
      this.clearAudioCache(packId);

      return voicePack;

    } catch (error) {
      console.error('❌ Voice pack update failed:', error);
      throw error;
    }
  }

  /**
   * Update voice pack speed with SSE progress tracking and self-healing on server restart
   */
  async updateVoicePackSpeed(params: UpdateVoicePackSpeedParams): Promise<VoicePack> {
    const { packId, newSpeed, onProgress, userEmail } = params;

    console.log('🔄 Initializing speed update:', packId, newSpeed);

    try {
      // STEP 1: Initialize speed update
      const formData = new FormData();
      formData.append('new_speed', newSpeed.toString());

      const initResponse = await fetch(
        `${this.getBackendUrl()}/api/xtts-proxy/${packId}/update-speed/init`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Self-healing: if server returned 404 (not found) and we have local backup, re-create voice pack
      if (initResponse.status === 404 && userEmail) {
        console.warn(`⚠️ Voice pack ${packId} not found on server. Attempting auto-recovery from IndexedDB...`);
        const localPack = await indexedDbService.getVoicePack(packId);
        if (localPack && localPack.voiceSampleBlob) {
          if (onProgress) {
            onProgress({
              operation_id: 'recovery',
              status: 'processing',
              progress: 5.0,
              message: 'Server restarted. Recovering voice pack from browser storage...'
            });
          }

          // Trigger recreate with the stored sample and new speed
          const voiceSampleFile = new File([localPack.voiceSampleBlob], 'voice_sample.wav', { type: 'audio/wav' });
          const newPack = await this.createVoicePack({
            name: localPack.name,
            voiceSample: voiceSampleFile,
            instructions: localPack.instructions,
            language: localPack.language as any,
            speed: newSpeed, // use the new speed
            userEmail,
            onProgress
          });

          // Clean up old local record
          await indexedDbService.deleteVoicePack(packId);
          return newPack;
        }
      }

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.detail || 'Failed to initialize speed update');
      }

      const { operation_id } = await initResponse.json();
      console.log('✅ Speed update initialized:', operation_id);

      // STEP 2: Connect to SSE and wait for completion
      const voicePack = await this.connectToProgressStream(operation_id, onProgress);

      // STEP 3: Update local IndexedDB cache with the new audio files
      if (userEmail) {
        try {
          if (onProgress) {
            onProgress({
              operation_id,
              status: 'processing',
              progress: 98.0,
              message: 'Updating local browser storage...'
            });
          }

          const localPack = await indexedDbService.getVoicePack(packId);
          if (localPack) {
            const audioBlobs = await this.downloadAudioBlobs(voicePack.id, voicePack.audio_files);
            localPack.speed = voicePack.speed;
            localPack.audioFiles = audioBlobs;
            await indexedDbService.saveVoicePack(localPack);
            console.log(`✅ Updated speed for voice pack ${packId} in IndexedDB.`);
          }
        } catch (cacheError) {
          console.error('⚠️ Failed to update local IndexedDB cache:', cacheError);
        }
      }

      console.log('✅ Speed updated');
      this.clearAudioCache(packId);

      return voicePack;

    } catch (error) {
      console.error('❌ Speed update failed:', error);
      throw error;
    }
  }

  /**
   * Connect to SSE progress stream
   */
  private async connectToProgressStream(
    operationId: string,
    onProgress?: (progress: ProgressData) => void
  ): Promise<VoicePack> {
    return new Promise((resolve, reject) => {
      const sseUrl = `${this.getBackendUrl()}/api/xtts-proxy/progress/${operationId}`;
      console.log('📡 Connecting to SSE:', sseUrl);

      const eventSource = new EventSource(sseUrl);
      let lastVoicePackId: string | null = null;

      eventSource.onmessage = (event) => {
        try {
          const progress: ProgressData = JSON.parse(event.data);

          console.log(
            `📊 Progress: ${progress.progress?.toFixed(1) || '?'}% - ${progress.message}`
          );

          if ((progress as any).voice_pack_id) {
            lastVoicePackId = (progress as any).voice_pack_id;
          }

          if (onProgress) {
            onProgress(progress);
          }

          if (progress.status === 'completed') {
            console.log('✅ Operation completed');
            eventSource.close();

            if (lastVoicePackId) {
              this.getVoicePack(lastVoicePackId)
                .then((voicePack) => {
                  if (voicePack) {
                    resolve(voicePack);
                  } else {
                    reject(new Error('Failed to fetch completed voice pack'));
                  }
                })
                .catch(reject);
            } else {
              reject(new Error('No voice pack ID in completion message'));
            }
          }

          if (progress.status === 'error') {
            console.error('❌ Operation failed:', (progress as any).error_detail);
            eventSource.close();
            reject(new Error((progress as any).error_detail || progress.message));
          }

        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        eventSource.close();
        reject(new Error('SSE connection failed'));
      };

      setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          console.warn('⏱️ SSE timeout');
          eventSource.close();
          reject(new Error('Operation timeout'));
        }
      }, 900000); // 15 minutes
    });
  }

  /**
   * Get voice pack metadata by ID (Checks IndexedDB first, falls back to server)
   */
  async getVoicePack(packId: string): Promise<VoicePack | null> {
    try {
      // 1. Check local IndexedDB cache first
      const localPack = await indexedDbService.getVoicePack(packId);
      if (localPack) {
        console.log(`📦 Serving metadata for ${packId} from IndexedDB cache.`);
        return {
          id: localPack.id,
          name: localPack.name,
          created_at: localPack.createdAt,
          language: localPack.language,
          speed: localPack.speed,
          audio_files: {
            'left-inhale': localPack.audioFiles['left-inhale']?.map((_, i) => `left-inhale_variant_${i}.wav`) || [],
            'right-exhale': localPack.audioFiles['right-exhale']?.map((_, i) => `right-exhale_variant_${i}.wav`) || [],
            'right-inhale': localPack.audioFiles['right-inhale']?.map((_, i) => `right-inhale_variant_${i}.wav`) || [],
            'left-exhale': localPack.audioFiles['left-exhale']?.map((_, i) => `left-exhale_variant_${i}.wav`) || [],
            'hold': localPack.audioFiles['hold']?.map((_, i) => `hold_variant_${i}.wav`) || []
          },
          instructions: localPack.instructions,
          affirmations: localPack.instructions, // fallback
          total_audio_files: Object.values(localPack.audioFiles).reduce((acc, arr) => acc + arr.length, 0)
        };
      }

      // 2. Fetch from backend if not in local IndexedDB
      const response = await fetch(`${this.getBackendUrl()}/api/xtts-proxy/${packId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch voice pack');
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to get voice pack:', error);
      return null;
    }
  }

  /**
   * List all available voice packs.
   * - System default packs are fetched from the backend.
   * - Custom voice packs are retrieved exclusively from local IndexedDB (filtered by user email).
   */
  async listVoicePacks(params?: ListVoicePacksParams): Promise<VoicePackSummary[]> {
    try {
      const category = params?.category;
      const language = params?.language;
      const userEmail = params?.userEmail;

      let systemDefaults: VoicePackSummary[] = [];
      let userPacks: VoicePackSummary[] = [];

      // 1. Fetch system defaults from backend (if not requesting only user packs)
      if (category !== 'user') {
        const queryParams = new URLSearchParams();
        queryParams.append('category', 'default');
        if (language) {
          queryParams.append('language', language);
        }

        const url = `${this.getBackendUrl()}/api/xtts-proxy?${queryParams.toString()}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          systemDefaults = Array.isArray(data) ? data : data.voice_packs || [];
          systemDefaults = systemDefaults.map(p => ({ ...p, source: 'guided' }));
        }
      }

      // 2. Retrieve custom user voice packs from IndexedDB (if userEmail is available and not requesting defaults only)
      if (category !== 'default' && userEmail) {
        const localPacks = await indexedDbService.listVoicePacks(userEmail);
        userPacks = localPacks.map(pack => ({
          id: pack.id,
          name: pack.name,
          created_at: pack.createdAt,
          total_audio_files: Object.values(pack.audioFiles).reduce((acc, arr) => acc + arr.length, 0),
          language: pack.language,
          source: 'local'
        }));

        if (language) {
          userPacks = userPacks.filter(p => p.language?.toLowerCase() === language.toLowerCase());
        }
      }

      // 3. Merge system default packs and local user packs
      const packs = [...systemDefaults, ...userPacks];

      console.log(`📋 Listed ${packs.length} voice packs (${systemDefaults.length} system defaults, ${userPacks.length} user local)`);
      return packs;

    } catch (error) {
      console.error('Failed to list voice packs:', error);
      return [];
    }
  }

  /**
   * Delete a voice pack permanently from backend and local IndexedDB
   */
  async deleteVoicePack(packId: string): Promise<boolean> {
    try {
      // 1. Delete from IndexedDB
      await indexedDbService.deleteVoicePack(packId);

      // 2. Attempt to delete from backend (best-effort)
      await fetch(`${this.getBackendUrl()}/api/xtts-proxy/${packId}`, {
        method: 'DELETE',
      }).catch(err => {
        console.warn('Backend deletion failed or skipped (likely server offline/restarted):', err);
      });

      this.clearAudioCache(packId);
      return true;

    } catch (error) {
      console.error('Failed to delete voice pack:', error);
      return false;
    }
  }

  /**
   * Get audio file URL for a specific phase variant
   */
  getAudioUrl(packId: string, phaseKey: string, variantIndex: number): string {
    return `${this.getBackendUrl()}/api/xtts-proxy/${packId}/audio/${phaseKey}/${variantIndex}`;
  }

  /**
   * Pre-load all audio files for a voice pack into browser cache
   */
  async preloadVoicePack(voicePack: VoicePack): Promise<void> {
    const promises: Promise<void>[] = [];

    // Check if it is a local pack in IndexedDB
    const localPack = await indexedDbService.getVoicePack(voicePack.id);

    for (const [phaseKey, filenames] of Object.entries(voicePack.audio_files)) {
      for (let i = 0; i < filenames.length; i++) {
        const cacheKey = `${voicePack.id}-${phaseKey}-${i}`;

        if (this.audioCache.has(cacheKey)) {
          continue;
        }

        // If local, we don't need to load a network Audio element; audioService will decode directly from Blob.
        // But we can create a dummy object URL to cache it if needed, or simply skip since audioService handles IndexedDB directly.
        if (localPack) {
          continue;
        }

        const url = this.getAudioUrl(voicePack.id, phaseKey, i);
        const promise = new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          audio.preload = 'auto';

          audio.addEventListener('canplaythrough', () => {
            this.audioCache.set(cacheKey, audio);
            resolve();
          }, { once: true });

          audio.addEventListener('error', (e) => {
            console.error(`Failed to preload: ${cacheKey}`, e);
            reject(e);
          }, { once: true });

          audio.load();
        });

        promises.push(promise);
      }
    }

    await Promise.all(promises);
  }

  /**
   * Get cached audio element for a specific phase variant
   */
  getCachedAudio(packId: string, phaseKey: string, variantIndex: number): HTMLAudioElement | null {
    const cacheKey = `${packId}-${phaseKey}-${variantIndex}`;
    return this.audioCache.get(cacheKey) || null;
  }

  /**
   * Clear audio cache for specific pack or all packs
   */
  clearAudioCache(packId?: string): void {
    if (packId) {
      for (const key of this.audioCache.keys()) {
        if (key.startsWith(packId)) {
          this.audioCache.delete(key);
        }
      }
    } else {
      this.audioCache.clear();
    }
  }

  /**
   * Test backend connection via proxy
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBackendUrl()}/api/xtts-proxy`);
      return response.ok;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Get backend status information via proxy
   */
  async getBackendStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.getBackendUrl()}/api/xtts-proxy`);

      if (!response.ok) {
        throw new Error('Backend not responding');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get backend status:', error);
      return null;
    }
  }
}

export const voicePackService = new VoicePackService();
