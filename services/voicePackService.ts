// services/voicePackService.ts
// Voice pack service with speed support - UPDATED
// File Location: services/voicePackService.ts (REPLACE EXISTING)
//
// KEY CHANGE: CreateVoicePackParams now includes speed parameter

import { MessagesConfig, VoiceLanguage } from '@/models/types';

export interface VoicePack {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  language: string;
  speed: number; // Voice speed multiplier
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

export interface VoicePackSummary {
  id: string;
  name: string;
  created_at: string;
  total_audio_files: number;
}

export interface CreateVoicePackParams {
  name: string;
  voiceSample: File;
  instructions: MessagesConfig;
  language?: VoiceLanguage;
  speed?: number; // NEW: Voice speed (0.5 to 2.0)
  onProgress?: (message: string) => void;
}

export interface UpdateVoicePackParams {
  packId: string;
  instructions: MessagesConfig;
  phasesToUpdate?: string[];
  onProgress?: (message: string) => void;
}

class VoicePackService {
  private backendUrl: string;
  private audioCache: Map<string, HTMLAudioElement>;

  constructor() {
    this.backendUrl = process.env.NEXT_PUBLIC_XTTS_BACKEND_URL || 'http://localhost:8000';
    this.audioCache = new Map();
  }

  /**
   * Create a new voice pack with language and speed support
   */
  async createVoicePack(params: CreateVoicePackParams): Promise<VoicePack> {
    const {
      name,
      voiceSample,
      instructions,
      language = 'en',
      speed = 1.0, // Default to normal speed
      onProgress
    } = params;

    try {
      onProgress?.('Preparing voice sample...');

      // Build form data
      const formData = new FormData();
      formData.append('name', name);
      formData.append('voice_sample', voiceSample);
      formData.append('instructions', JSON.stringify(instructions));
      formData.append('language', language);
      formData.append('speed', speed.toString()); // Include speed

      onProgress?.('Uploading to backend...');

      // Send request
      const response = await fetch(`${this.backendUrl}/api/voice-packs/create`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create voice pack');
      }

      onProgress?.('Processing complete!');

      const data = await response.json();
      return data.voice_pack;

    } catch (error) {
      console.error('Voice pack creation failed:', error);
      throw error;
    }
  }

  /**
   * Update specific instructions in an existing voice pack
   */
  async updateVoicePack(params: UpdateVoicePackParams): Promise<VoicePack> {
    const {
      packId,
      instructions,
      phasesToUpdate,
      onProgress
    } = params;

    try {
      onProgress?.('Regenerating audio...');

      const formData = new FormData();
      formData.append('instructions', JSON.stringify(instructions));

      if (phasesToUpdate) {
        formData.append('phases_to_update', JSON.stringify(phasesToUpdate));
      }

      const response = await fetch(`${this.backendUrl}/api/voice-packs/${packId}/update`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update voice pack');
      }

      onProgress?.('Update complete!');

      const data = await response.json();

      // Clear cache for updated audio files
      this.clearAudioCache(packId);

      return data.voice_pack;

    } catch (error) {
      console.error('Voice pack update failed:', error);
      throw error;
    }
  }

  /**
   * Get full details of a voice pack
   */
  async getVoicePack(packId: string): Promise<VoicePack | null> {
    try {
      const response = await fetch(`${this.backendUrl}/api/voice-packs/${packId}`);

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
   * List all available voice packs
   */
  async listVoicePacks(): Promise<VoicePackSummary[]> {
    try {
      const response = await fetch(`${this.backendUrl}/api/voice-packs`);

      if (!response.ok) {
        throw new Error('Failed to list voice packs');
      }

      const data = await response.json();
      return data.voice_packs;

    } catch (error) {
      console.error('Failed to list voice packs:', error);
      return [];
    }
  }

  /**
   * Delete a voice pack
   */
  async deleteVoicePack(packId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/api/voice-packs/${packId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        return false;
      }

      // Clear cache for this pack
      this.clearAudioCache(packId);

      return true;

    } catch (error) {
      console.error('Failed to delete voice pack:', error);
      return false;
    }
  }

  /**
   * Get URL for a specific audio file
   */
  getAudioUrl(packId: string, phaseKey: string, variantIndex: number): string {
    return `${this.backendUrl}/api/voice-packs/${packId}/audio/${phaseKey}/${variantIndex}`;
  }

  /**
   * Pre-load all audio files for a voice pack
   */
  async preloadVoicePack(voicePack: VoicePack): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [phaseKey, filenames] of Object.entries(voicePack.audio_files)) {
      for (let i = 0; i < filenames.length; i++) {
        const url = this.getAudioUrl(voicePack.id, phaseKey, i);
        const cacheKey = `${voicePack.id}-${phaseKey}-${i}`;

        // Skip if already cached
        if (this.audioCache.has(cacheKey)) {
          continue;
        }

        // Create audio element and preload
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

          // Start loading
          audio.load();
        });

        promises.push(promise);
      }
    }

    // Wait for all audio files to load
    await Promise.all(promises);
  }

  /**
   * Get a pre-loaded audio element from cache
   */
  getCachedAudio(packId: string, phaseKey: string, variantIndex: number): HTMLAudioElement | null {
    const cacheKey = `${packId}-${phaseKey}-${variantIndex}`;
    return this.audioCache.get(cacheKey) || null;
  }

  /**
   * Clear audio cache for a specific voice pack
   */
  clearAudioCache(packId?: string): void {
    if (packId) {
      // Clear only this pack's audio
      for (const key of this.audioCache.keys()) {
        if (key.startsWith(packId)) {
          this.audioCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.audioCache.clear();
    }
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/`);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'healthy' && data.voice_pack_manager_ready;

    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Update voice pack speed only (NEW)
   */
  async updateVoicePackSpeed(params: {
    packId: string;
    newSpeed: number;
    onProgress?: (message: string) => void;
  }): Promise<VoicePack> {
    const { packId, newSpeed, onProgress } = params;

    try {
      onProgress?.('Regenerating audio at new speed...');

      const formData = new FormData();
      formData.append('new_speed', newSpeed.toString());

      const response = await fetch(`${this.backendUrl}/api/voice-packs/${packId}/update-speed`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update voice pack speed');
      }

      onProgress?.('Speed update complete!');

      const data = await response.json();

      // Clear cache for updated audio files
      this.clearAudioCache(packId);

      return data.voice_pack;

    } catch (error) {
      console.error('Voice pack speed update failed:', error);
      throw error;
    }
  }

  /**
   * Get backend status information
   */
  async getBackendStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/`);

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

// Export singleton instance
export const voicePackService = new VoicePackService();
