// services/defaultVoicePreference.ts
// User's Default Voice Preference Management - SSR-SAFE
// File Location: services/defaultVoicePreference.ts (REPLACE EXISTING)
//
// PURPOSE: Allows users to set their preferred default voice pack
// STORAGE: Uses localStorage for persistence across sessions
// SSR-SAFE: Handles Next.js server-side rendering properly
//
// CRITICAL FIX: Checks for browser environment before accessing localStorage
// This prevents "localStorage is not defined" errors during SSR

const STORAGE_KEY = 'ai-yoga-default-voice-pack';
const SYSTEM_DEFAULT_ID = 'default';

/**
 * Check if code is running in browser (not SSR)
 */
const isBrowser = typeof window !== 'undefined';

class DefaultVoicePreference {
  /**
   * Get user's preferred default voice pack ID
   *
   * Returns:
   *   - User's chosen pack ID if set
   *   - System default ID if not set
   *   - null if user explicitly chose "none"
   *   - System default if running on server (SSR)
   */
  getUserDefaultVoicePack(): string | null {
    // SSR Safety: Return system default if not in browser
    if (!isBrowser) {
      console.log('SSR: Returning system default (localStorage not available)');
      return SYSTEM_DEFAULT_ID;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored === null) {
        // Not set, use system default
        return SYSTEM_DEFAULT_ID;
      }

      if (stored === 'none') {
        // User explicitly chose no default
        return null;
      }

      return stored;
    } catch (error) {
      console.error('Failed to read default voice preference:', error);
      return SYSTEM_DEFAULT_ID;
    }
  }

  /**
   * Set user's preferred default voice pack
   *
   * Args:
   *   packId: Voice pack ID to set as default
   */
  setUserDefaultVoicePack(packId: string): void {
    // SSR Safety: Do nothing if not in browser
    if (!isBrowser) {
      console.warn('SSR: Cannot set default voice (localStorage not available)');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, packId);
      console.log(`✅ Default voice set to: ${packId}`);
    } catch (error) {
      console.error('Failed to set default voice preference:', error);
      throw new Error('Failed to save default voice preference');
    }
  }

  /**
   * Clear user's default preference (use system default)
   */
  clearUserDefaultVoicePack(): void {
    // SSR Safety: Do nothing if not in browser
    if (!isBrowser) {
      console.warn('SSR: Cannot clear default voice (localStorage not available)');
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✅ Default voice preference cleared');
    } catch (error) {
      console.error('Failed to clear default voice preference:', error);
    }
  }

  /**
   * Set to explicitly have no default (don't auto-load any pack)
   */
  setNoDefaultVoicePack(): void {
    // SSR Safety: Do nothing if not in browser
    if (!isBrowser) {
      console.warn('SSR: Cannot set no default (localStorage not available)');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, 'none');
      console.log('✅ Set to no default voice');
    } catch (error) {
      console.error('Failed to set no default preference:', error);
    }
  }

  /**
   * Check if a pack is the user's default
   */
  isUserDefault(packId: string): boolean {
    const userDefault = this.getUserDefaultVoicePack();
    return userDefault === packId;
  }

  /**
   * Check if using system default
   */
  isUsingSystemDefault(): boolean {
    const userDefault = this.getUserDefaultVoicePack();
    return userDefault === SYSTEM_DEFAULT_ID || userDefault === null;
  }

  /**
   * Get system default pack ID
   */
  getSystemDefaultId(): string {
    return SYSTEM_DEFAULT_ID;
  }

  /**
   * Check if running in browser (for components to check)
   */
  isBrowserEnvironment(): boolean {
    return isBrowser;
  }
}

// Export singleton
export const defaultVoicePreference = new DefaultVoicePreference();
