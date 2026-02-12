// services/voicePackService.ts
// Voice Pack Service - WITH SSE PROGRESS TRACKING
// File Location: src/services/voicePackService.ts
//
// FEATURES:
// - SSE (Server-Sent Events) for real-time progress tracking
// - Two-step API flow: init â†’ get operation_id â†’ connect to SSE
// - Progress callbacks for UI updates
// - Audio caching and preloading
// - Full CRUD operations for voice packs
// - Backend connection testing
// - Error handling and logging

import { MessagesConfig, VoiceLanguage } from '@/models/types';
import { ProgressData } from '@/components/BreathingGuide/VoiceProgressBar';

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
}

/**
 * UpdateVoicePackParams - Parameters for updating voice pack instructions
 */
export interface UpdateVoicePackParams {
  packId: string;
  instructions: MessagesConfig;
  phasesToUpdate?: string[];
  onProgress?: (progress: ProgressData) => void;
}

/**
 * UpdateVoicePackSpeedParams - Parameters for changing voice pack speed
 */
export interface UpdateVoicePackSpeedParams {
  packId: string;
  newSpeed: number;
  onProgress?: (progress: ProgressData) => void;
}

/**
 * ListVoicePacksParams - Optional parameters for filtering voice pack lists
 */
export interface ListVoicePacksParams {
  category?: 'default' | 'user';
  language?: string;
}

/**
 * Voice Pack Service with SSE Progress Tracking
 *
 * This service implements a two-step process for long-running operations:
 * 1. Call init endpoint to start operation (returns operation_id)
 * 2. Connect to SSE endpoint to receive real-time progress
 * 3. Parse SSE events and call progress callback
 * 4. Resolve when completed, reject on error
 *
 * Key Concepts:
 * - EventSource: Browser API for Server-Sent Events (SSE)
 * - Server-Sent Events: One-way server-to-client real-time updates
 * - Callback pattern: onProgress called for each update
 * - Promise pattern: Async/await compatible
 *
 * Architecture:
 * - Single Service Instance: voicePackService singleton
 * - No React Dependency: Pure service logic
 * - Progress Callbacks: Hook manages state updates
 * - Audio Caching: Browser cache for loaded audio
 */
class VoicePackService {
  private backendUrl: string;
  private audioCache: Map<string, HTMLAudioElement>;

  constructor() {
    this.backendUrl = '';  // Set lazily on first use
    this.audioCache = new Map();
  }

  private getBackendUrl(): string {
    if (!this.backendUrl) {
      // Dynamic import to avoid SSR issues
      const { getXttsBackendUrl } = require('@/lib/config');
      this.backendUrl = getXttsBackendUrl();
    }
    return this.backendUrl;
  }

  /**
   * Create voice pack with SSE progress tracking
   *
   * Flow:
   * 1. POST to /api/voice-packs/init â†’ get operation_id
   * 2. Connect to /api/voice-packs/progress/{operation_id} via EventSource
   * 3. Receive progress updates via SSE
   * 4. Call onProgress callback for each update
   * 5. When status=completed, resolve with voice pack
   * 6. When status=error, reject with error message
   *
   * Backend Endpoint:
   * POST /api/voice-packs/init
   * - Body: FormData with name, voice_sample, instructions, language, speed
   * - Response: { operation_id: string }
   *
   * @param params - Creation parameters including progress callback
   * @returns Promise that resolves when creation completes
   * @throws Error if creation fails
   *
   * Example:
   * ```
   * const voicePack = await voicePackService.createVoicePack({
   *   name: 'My Voice',
   *   voiceSample: audioFile,
   *   instructions: { 'left-inhale': [...], ... },
   *   language: 'en',
   *   speed: 1.0,
   *   onProgress: (progress) => console.log(progress.percentage)
   * })
   * ```
   */
  async createVoicePack(params: CreateVoicePackParams): Promise<VoicePack> {
    const {
      name,
      voiceSample,
      instructions,
      language = 'en',
      speed = 1.0,
      onProgress,
    } = params;

    console.log('ðŸ”¤ Initializing voice pack creation:', name);

    try {
      // STEP 1: Initialize creation and get operation_id
      const formData = new FormData();
      formData.append('name', name);
      formData.append('voice_sample', voiceSample);
      formData.append('instructions', JSON.stringify(instructions));
      formData.append('language', language);
      formData.append('speed', speed.toString());

      const initResponse = await fetch(`${this.getBackendUrl()}/api/voice-packs/init`, {
        method: 'POST',
        body: formData,
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.detail || 'Failed to initialize voice pack creation');
      }

      const { operation_id } = await initResponse.json();
      console.log('âœ… Operation initialized:', operation_id);

      // STEP 2: Connect to SSE endpoint and wait for completion
      const voicePack = await this.connectToProgressStream(operation_id, onProgress);

      console.log('âœ… Voice pack created:', voicePack.id);
      return voicePack;

    } catch (error) {
      console.error('âŒ Voice pack creation failed:', error);
      throw error;
    }
  }

  /**
   * Update voice pack instructions with SSE progress tracking
   *
   * Similar flow to createVoicePack but for updating instructions
   *
   * Backend Endpoint:
   * POST /api/voice-packs/{packId}/update/init
   * - Body: FormData with instructions, optional phases_to_update
   * - Response: { operation_id: string }
   *
   * @param params - Update parameters
   * @returns Promise that resolves when update completes
   * @throws Error if update fails
   */
  async updateVoicePack(params: UpdateVoicePackParams): Promise<VoicePack> {
    const { packId, instructions, phasesToUpdate, onProgress } = params;

    console.log('ðŸ”¤ Initializing voice pack update:', packId);

    try {
      // STEP 1: Initialize update and get operation_id
      const formData = new FormData();
      formData.append('instructions', JSON.stringify(instructions));

      if (phasesToUpdate) {
        formData.append('phases_to_update', JSON.stringify(phasesToUpdate));
      }

      const initResponse = await fetch(
        `${this.getBackendUrl()}/api/voice-packs/${packId}/update/init`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.detail || 'Failed to initialize voice pack update');
      }

      const { operation_id } = await initResponse.json();
      console.log('âœ… Update initialized:', operation_id);

      // STEP 2: Connect to SSE and wait for completion
      const voicePack = await this.connectToProgressStream(operation_id, onProgress);

      console.log('âœ… Voice pack updated');
      this.clearAudioCache(packId);

      return voicePack;

    } catch (error) {
      console.error('âŒ Voice pack update failed:', error);
      throw error;
    }
  }

  /**
   * Update voice pack speed with SSE progress tracking
   *
   * Changes playback speed of all audio files in the pack
   *
   * Backend Endpoint:
   * POST /api/voice-packs/{packId}/update-speed/init
   * - Body: FormData with new_speed
   * - Response: { operation_id: string }
   *
   * @param params - Speed update parameters
   * @returns Promise that resolves when update completes
   * @throws Error if update fails
   */
  async updateVoicePackSpeed(params: UpdateVoicePackSpeedParams): Promise<VoicePack> {
    const { packId, newSpeed, onProgress } = params;

    console.log('ðŸ”¤ Initializing speed update:', packId, newSpeed);

    try {
      // STEP 1: Initialize speed update
      const formData = new FormData();
      formData.append('new_speed', newSpeed.toString());

      const initResponse = await fetch(
        `${this.getBackendUrl()}/api/voice-packs/${packId}/update-speed/init`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.detail || 'Failed to initialize speed update');
      }

      const { operation_id } = await initResponse.json();
      console.log('âœ… Speed update initialized:', operation_id);

      // STEP 2: Connect to SSE and wait for completion
      const voicePack = await this.connectToProgressStream(operation_id, onProgress);

      console.log('âœ… Speed updated');
      this.clearAudioCache(packId);

      return voicePack;

    } catch (error) {
      console.error('âŒ Speed update failed:', error);
      throw error;
    }
  }

  /**
   * Connect to SSE progress stream
   *
   * This is the core SSE handling logic that:
   * 1. Creates EventSource connection
   * 2. Parses incoming SSE messages
   * 3. Calls progress callback for each update
   * 4. Resolves/rejects promise based on final status
   *
   * SSE Message Format:
   * ```
   * data: {
   *   "status": "processing",
   *   "progress": 45.5,
   *   "message": "Generating audio for left-inhale phase...",
   *   "voice_pack_id": "pack_123",
   *   "percentage": 45.5
   * }
   * ```
   *
   * Key Learning: EventSource automatically handles:
   * - Connection establishment
   * - Reconnection on temporary disconnect
   * - Message parsing
   * - Cleanup on close
   *
   * @param operationId - The operation to track
   * @param onProgress - Callback for progress updates
   * @returns Promise<VoicePack> when operation completes
   * @private
   */
  private async connectToProgressStream(
    operationId: string,
    onProgress?: (progress: ProgressData) => void
  ): Promise<VoicePack> {
    return new Promise((resolve, reject) => {
      const sseUrl = `${this.getBackendUrl()}/api/voice-packs/progress/${operationId}`;
      console.log('ðŸ“¡ Connecting to SSE:', sseUrl);

      const eventSource = new EventSource(sseUrl);
      let lastVoicePackId: string | null = null;

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        try {
          const progress: ProgressData = JSON.parse(event.data);

          console.log(
            `ðŸ“Š Progress: ${progress.progress?.toFixed(1) || '?'}% - ${progress.message}`
          );

          // Store voice_pack_id for final fetch
          if ((progress as any).voice_pack_id) {
            lastVoicePackId = (progress as any).voice_pack_id;
          }

          // Call progress callback if provided
          if (onProgress) {
            onProgress(progress);
          }

          // Handle completion
          if (progress.status === 'completed') {
            console.log('âœ… Operation completed');
            eventSource.close();

            // Fetch final voice pack metadata
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

          // Handle error
          if (progress.status === 'error') {
            console.error('âŒ Operation failed:', (progress as any).error_detail);
            eventSource.close();
            reject(new Error((progress as any).error_detail || progress.message));
          }

        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      // Handle connection errors
      eventSource.onerror = (error) => {
        console.error('âŒ SSE connection error:', error);
        eventSource.close();
        reject(new Error('SSE connection failed'));
      };

      // Timeout after 10 minutes
      setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          console.warn('â±ï¸ SSE timeout');
          eventSource.close();
          reject(new Error('Operation timeout'));
        }
      }, 600000); // 10 minutes
    });
  }

  /**
   * Get voice pack metadata by ID
   *
   * Backend Endpoint:
   * GET /api/voice-packs/{packId}
   * - Response: VoicePack object
   *
   * @param packId - Voice pack ID
   * @returns Promise<VoicePack | null> Voice pack or null if not found
   */
  async getVoicePack(packId: string): Promise<VoicePack | null> {
    try {
      const response = await fetch(`${this.getBackendUrl()}/api/voice-packs/${packId}`);

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
   * List all available voice packs with optional filtering
   *
   * Backend Endpoint:
   * GET /api/voice-packs
   * - Response: { voice_packs: VoicePackSummary[] }
   *
   * Optional Query Parameters:
   * - ?category=default - Only system voice packs
   * - ?category=user - Only user-created packs
   * - ?language=en - Filter by language
   *
   * @param params - Optional filter parameters (category, language)
   * @returns Promise<VoicePackSummary[]> Array of voice pack summaries
   *
   * Examples:
   * - listVoicePacks() - Get all packs
   * - listVoicePacks({ category: 'default' }) - Get only default/system packs
   * - listVoicePacks({ category: 'user' }) - Get only user-created packs
   * - listVoicePacks({ language: 'en' }) - Get only English packs
   * - listVoicePacks({ category: 'default', language: 'en' }) - Get default English packs
   */
  async listVoicePacks(params?: ListVoicePacksParams): Promise<VoicePackSummary[]> {
    try {
      // Build query string from parameters
      const queryParams = new URLSearchParams();
      if (params?.category) {
        queryParams.append('category', params.category);
      }
      if (params?.language) {
        queryParams.append('language', params.language);
      }

      const queryString = queryParams.toString();
      const url = `${this.getBackendUrl()}/api/voice-packs${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to list voice packs');
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.voice_packs || [];

    } catch (error) {
      console.error('Failed to list voice packs:', error);
      return [];
    }
  }

  /**
   * Delete a voice pack permanently
   *
   * Backend Endpoint:
   * DELETE /api/voice-packs/{packId}
   * - Response: { status: "deleted" }
   *
   * @param packId - Voice pack ID to delete
   * @returns Promise<boolean> True if successful, false otherwise
   */
  async deleteVoicePack(packId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBackendUrl()}/api/voice-packs/${packId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        return false;
      }

      this.clearAudioCache(packId);
      return true;

    } catch (error) {
      console.error('Failed to delete voice pack:', error);
      return false;
    }
  }

  /**
   * Get audio file URL for a specific phase variant
   *
   * URL Format:
   * /api/voice-packs/{packId}/audio/{phaseKey}/{variantIndex}
   *
   * @param packId - Voice pack ID
   * @param phaseKey - Breathing phase key (left-inhale, right-exhale, etc.)
   * @param variantIndex - Instruction variant index (0, 1, 2, ...)
   * @returns Audio URL string
   */
  getAudioUrl(packId: string, phaseKey: string, variantIndex: number): string {
    return `${this.getBackendUrl()}/api/voice-packs/${packId}/audio/${phaseKey}/${variantIndex}`;
  }

  /**
   * Pre-load all audio files for a voice pack into browser cache
   *
   * This loads HTMLAudioElements for all audio files, which:
   * - Ensures smooth playback when needed
   * - Catches loading errors early
   * - Stores in audioCache for instant access
   *
   * @param voicePack - Voice pack to preload
   * @returns Promise that resolves when all audio is loaded
   */
  async preloadVoicePack(voicePack: VoicePack): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [phaseKey, filenames] of Object.entries(voicePack.audio_files)) {
      for (let i = 0; i < filenames.length; i++) {
        const url = this.getAudioUrl(voicePack.id, phaseKey, i);
        const cacheKey = `${voicePack.id}-${phaseKey}-${i}`;

        if (this.audioCache.has(cacheKey)) {
          continue;
        }

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
   *
   * @param packId - Voice pack ID
   * @param phaseKey - Breathing phase key
   * @param variantIndex - Instruction variant index
   * @returns HTMLAudioElement or null if not cached
   */
  getCachedAudio(packId: string, phaseKey: string, variantIndex: number): HTMLAudioElement | null {
    const cacheKey = `${packId}-${phaseKey}-${variantIndex}`;
    return this.audioCache.get(cacheKey) || null;
  }

  /**
   * Clear audio cache for specific pack or all packs
   *
   * @param packId - Optional pack ID. If provided, clears only that pack's cache
   *                 If not provided, clears entire audio cache
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
   * Test backend connection
   *
   * Backend Endpoint:
   * GET /
   * - Response: { status: "healthy", ... }
   *
   * @returns Promise<boolean> True if backend is healthy, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBackendUrl()}/`);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'healthy';

    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Get backend status information
   *
   * Backend Endpoint:
   * GET /
   * - Response: { status: string, version: string, timestamp: string, ... }
   *
   * @returns Promise<any> Backend status object or null if error
   */
  async getBackendStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.getBackendUrl()}/`);

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

/**
 * Singleton instance of VoicePackService
 * Use this throughout the application
 *
 * Example:
 * ```
 * import { voicePackService } from '@/services/voicePackService'
 *
 * const packs = await voicePackService.listVoicePacks()
 * ```
 */
export const voicePackService = new VoicePackService();
