// services/indexedDbService.ts
// IndexedDB Service for persisting custom voice packs on client-side
// File Location: services/indexedDbService.ts
//
// FEATURES:
// - Stores custom voice pack metadata, original voice sample file Blob, and generated audio Blobs
// - Maps voice packs to the authenticated user's email
// - Implements clean async wrapper over browser IndexedDB API
// - Scopes listings by userEmail for isolation

import { MessagesConfig } from '@/models/types';

export interface LocalVoicePack {
  id: string;             // The backend pack ID (UUID)
  userEmail: string;      // NextAuth session email
  name: string;
  language: string;
  speed: number;
  instructions: MessagesConfig;
  createdAt: string;
  voiceSampleBlob: Blob;  // Original uploaded voice sample
  audioFiles: {           // Generated audio files for each phase key
    [phaseKey: string]: Blob[];
  };
}

const DB_NAME = 'YogaBreathingDB';
const DB_VERSION = 1;
const STORE_NAME = 'voice_packs';

class IndexedDbService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize / open IndexedDB database
   */
  private init(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is only available in browser environments'));
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // Create userEmail index to filter voice packs per user
          store.createIndex('userEmail', 'userEmail', { unique: false });
          console.log('🏁 IndexedDB store "voice_packs" and index "userEmail" created.');
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save (insert or update) a custom voice pack
   */
  async saveVoicePack(pack: LocalVoicePack): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(pack);

      request.onsuccess = () => {
        console.log(`💾 Saved voice pack ${pack.id} to local IndexedDB.`);
        resolve();
      };

      request.onerror = () => {
        console.error(`Failed to save voice pack ${pack.id} to IndexedDB:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a single voice pack by ID
   */
  async getVoicePack(packId: string): Promise<LocalVoicePack | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(packId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error(`Failed to get voice pack ${packId} from IndexedDB:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * List all voice packs owned by the specified email
   */
  async listVoicePacks(email: string): Promise<LocalVoicePack[]> {
    if (!email) return [];
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('userEmail');
      const request = index.getAll(email);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error(`Failed to list voice packs for ${email} from IndexedDB:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a voice pack by ID
   */
  async deleteVoicePack(packId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(packId);

      request.onsuccess = () => {
        console.log(`🗑️ Deleted voice pack ${packId} from local IndexedDB.`);
        resolve();
      };

      request.onerror = () => {
        console.error(`Failed to delete voice pack ${packId} from IndexedDB:`, request.error);
        reject(request.error);
      };
    });
  }
}

export const indexedDbService = new IndexedDbService();
