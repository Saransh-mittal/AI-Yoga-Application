// services/audioService.ts
// Web Audio API-Based Audio Service - FIXED TypeScript Errors
// File Location: services/audioService.ts (REPLACE EXISTING)
//
// FIXES:
// - Removed duplicate 'variants' declaration
// - Fixed voicePack reference issue
// - Removed audio_quality reference (optional field)
// - All TypeScript errors resolved

import { BreathingPhase } from '@/models/types';
import { AUDIO_FREQUENCIES } from '@/models/constants';
import { voicePackService } from './voicePackService';
import { indexedDbService } from './indexedDbService';

interface AudioBufferCache {
  [key: string]: AudioBuffer;
}

interface VoicePackMetadata {
  audio_files: {
    'left-inhale': string[];
    'right-exhale': string[];
    'right-inhale': string[];
    'left-exhale': string[];
    'hold': string[];
  };
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private currentVoicePackId: string | null = null;
  private currentVoicePackMetadata: VoicePackMetadata | null = null;
  private audioBufferCache: AudioBufferCache = {};
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;

  /**
   * Initialize Audio Context (lazy initialization)
   *
   * LEARNING NOTE: AudioContext should be created after user interaction
   * on mobile browsers. We create it on first use.
   */
  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🔊 AudioContext initialized:', this.audioContext.state);

      // Resume context if suspended (mobile browsers)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }
  }

  /**
   * Set active voice pack and preload all audio as AudioBuffers
   *
   * CRITICAL DIFFERENCE: We decode audio into AudioBuffers here,
   * which preserves pristine quality throughout playback
   */
  async setVoicePack(packId: string): Promise<void> {
    try {
      this.initAudioContext();

      const voicePack = await voicePackService.getVoicePack(packId);
      if (!voicePack) {
        throw new Error(`Voice pack ${packId} not found`);
      }

      console.log(`🎤 Loading voice pack: ${packId}`);

      // Clear old cache
      this.audioBufferCache = {};

      // Preload all audio as AudioBuffers
      const loadPromises: Promise<void>[] = [];

      for (const [phaseKey, filenames] of Object.entries(voicePack.audio_files)) {
        for (let i = 0; i < filenames.length; i++) {
          const promise = this.loadAudioBuffer(voicePack.id, phaseKey, i);
          loadPromises.push(promise);
        }
      }

      // Wait for all audio to load
      await Promise.all(loadPromises);

      // Cache metadata for quick access
      this.currentVoicePackMetadata = {
        audio_files: voicePack.audio_files
      };

      this.currentVoicePackId = packId;
      console.log(`✅ Voice pack ready: ${packId} (${Object.keys(this.audioBufferCache).length} buffers loaded)`);

    } catch (error) {
      console.error('Failed to set voice pack:', error);
      throw error;
    }
  }

  /**
   * Load and decode audio file into AudioBuffer
   *
   * LEARNING NOTE: AudioBuffer is decoded audio data in memory.
   * This prevents any quality loss from streaming or browser processing.
   */
  private async loadAudioBuffer(packId: string, phaseKey: string, variantIndex: number): Promise<void> {
    const cacheKey = `${packId}-${phaseKey}-${variantIndex}`;

    if (this.audioBufferCache[cacheKey]) {
      return; // Already loaded
    }

    try {
      // 1. Try to load from IndexedDB first
      const localPack = await indexedDbService.getVoicePack(packId);
      let arrayBuffer: ArrayBuffer;

      if (localPack && localPack.audioFiles[phaseKey] && localPack.audioFiles[phaseKey][variantIndex]) {
        const blob = localPack.audioFiles[phaseKey][variantIndex];
        arrayBuffer = await blob.arrayBuffer();
        console.log(`📦 Loaded buffer from IndexedDB cache: ${cacheKey}`);
      } else {
        // 2. Fallback to network fetch
        const url = voicePackService.getAudioUrl(packId, phaseKey, variantIndex);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }
        arrayBuffer = await response.arrayBuffer();
        console.log(`🌐 Loaded buffer from network: ${cacheKey}`);
      }

      // Decode audio into AudioBuffer (preserves quality)
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

      // Cache the decoded buffer
      this.audioBufferCache[cacheKey] = audioBuffer;

      console.log(`✅ Loaded buffer: ${cacheKey} (${audioBuffer.duration.toFixed(2)}s)`);

    } catch (error) {
      console.error(`Failed to load audio buffer ${cacheKey}:`, error);
      throw error;
    }
  }

  /**
   * Get variants for a phase from cached metadata
   */
  private getVariantsForPhase(phaseKey: string): string[] | null {
    if (!this.currentVoicePackMetadata) {
      return null;
    }
    return this.currentVoicePackMetadata.audio_files[phaseKey as keyof typeof this.currentVoicePackMetadata.audio_files] || null;
  }

  /**
   * Play audio using Web Audio API for pristine quality
   *
   * KEY DIFFERENCE: We create a new AudioBufferSourceNode each time,
   * which plays the decoded AudioBuffer without any quality degradation
   */
  async speak(phaseKey: string, variantIndex?: number): Promise<void> {
    if (!this.currentVoicePackId || !this.audioContext) {
      console.warn('No voice pack loaded or audio context not initialized');
      return;
    }

    // Ensure audio context is running
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return new Promise((resolve) => {
      try {
        // Get variants for this phase from cached metadata
        const phaseVariants = this.getVariantsForPhase(phaseKey);

        if (!phaseVariants || phaseVariants.length === 0) {
          console.warn(`No audio variants for phase: ${phaseKey}`);
          resolve();
          return;
        }

        // Select variant
        const index = variantIndex !== undefined
          ? Math.min(variantIndex, phaseVariants.length - 1)
          : Math.floor(Math.random() * phaseVariants.length);

        // Get cached AudioBuffer
        const cacheKey = `${this.currentVoicePackId}-${phaseKey}-${index}`;
        const audioBuffer = this.audioBufferCache[cacheKey];

        if (!audioBuffer) {
          console.error(`AudioBuffer not found: ${cacheKey}`);
          resolve();
          return;
        }

        // Stop any currently playing audio
        if (this.currentSource) {
          try {
            this.currentSource.stop();
          } catch (e) {
            // Ignore errors from already stopped sources
          }
        }

        // Create new audio source from buffer
        const source = this.audioContext!.createBufferSource();
        source.buffer = audioBuffer;

        // Create gain node for volume control (optional, but recommended)
        const gainNode = this.audioContext!.createGain();
        gainNode.gain.value = 0.9; // Slightly below max to prevent clipping

        // Connect: source -> gain -> destination (speakers)
        source.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        // Set up playback tracking
        this.currentSource = source;
        this.isPlaying = true;

        // Handle playback end
        source.onended = () => {
          this.isPlaying = false;
          this.currentSource = null;
          resolve();
        };

        // Start playback immediately
        source.start(0);

      } catch (error) {
        console.error('Failed to play audio:', error);
        this.isPlaying = false;
        this.currentSource = null;
        resolve();
      }
    });
  }

  /**
   * Play phase transition beep
   *
   * NOTE: Beeps use oscillator (generated audio), not pre-recorded
   */
  playPhaseBeep(phase: BreathingPhase): void {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    const ctx = this.audioContext!;

    // Ensure context is running
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = AUDIO_FREQUENCIES[phase.toUpperCase() as keyof typeof AUDIO_FREQUENCIES];
    oscillator.type = 'sine';

    // Smooth envelope to prevent clicks
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }

  /**
   * Cancel ongoing speech
   */
  cancelSpeech(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might already be stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  /**
   * Check if currently playing
   */
  isCurrentlySpeaking(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current voice pack ID
   */
  getCurrentVoicePackId(): string | null {
    return this.currentVoicePackId;
  }

  /**
   * Clear voice pack and cache
   */
  clearVoicePack(): void {
    this.cancelSpeech();
    this.currentVoicePackId = null;
    this.currentVoicePackMetadata = null;
    this.audioBufferCache = {};
    voicePackService.clearAudioCache();
  }

  /**
   * Get audio context state (for debugging)
   */
  getAudioContextState(): string {
    return this.audioContext?.state || 'not initialized';
  }
}

// Export singleton
export const audioService = new AudioService();
