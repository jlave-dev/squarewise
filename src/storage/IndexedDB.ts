const DB_NAME = 'squarewise';
const DB_VERSION = 1;

interface DBSchema {
  settings: { key: string; value: unknown };
  stats: { key: string; value: unknown };
  savedGames: { key: string; value: unknown };
  dailyProgress: { key: string; value: unknown };
}

type StoreNames = keyof DBSchema;

/**
 * IndexedDB wrapper for persistent storage
 */
class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('stats')) {
          db.createObjectStore('stats', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('savedGames')) {
          db.createObjectStore('savedGames', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('dailyProgress')) {
          db.createObjectStore('dailyProgress', { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get a value from a store
   */
  async get<K extends StoreNames>(
    storeName: K,
    key: string
  ): Promise<DBSchema[K]['value'] | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => {
        console.error(`Failed to get ${key} from ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result?.value ?? null);
      };
    });
  }

  /**
   * Set a value in a store
   */
  async set<K extends StoreNames>(
    storeName: K,
    key: string,
    value: DBSchema[K]['value']
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({ key, value });

      request.onerror = () => {
        console.error(`Failed to set ${key} in ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Delete a value from a store
   */
  async delete<K extends StoreNames>(storeName: K, key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => {
        console.error(`Failed to delete ${key} from ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get all keys from a store
   */
  async getAllKeys<K extends StoreNames>(storeName: K): Promise<string[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();

      request.onerror = () => {
        console.error(`Failed to get keys from ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }

  /**
   * Clear all data from a store
   */
  async clear<K extends StoreNames>(storeName: K): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        console.error(`Failed to clear ${storeName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Check if IndexedDB is available
   */
  isAvailable(): boolean {
    try {
      return 'indexedDB' in window && window.indexedDB !== null;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const db = new IndexedDBManager();

// Convenience functions
export const getSetting = <T>(key: string, defaultValue: T): Promise<T> =>
  db.get('settings', key).then(v => (v as T) ?? defaultValue);

export const setSetting = <T>(key: string, value: T): Promise<void> =>
  db.set('settings', key, value);

export const getStat = <T>(key: string, defaultValue: T): Promise<T> =>
  db.get('stats', key).then(v => (v as T) ?? defaultValue);

export const setStat = <T>(key: string, value: T): Promise<void> =>
  db.set('stats', key, value);

export const saveGame = (key: string, state: unknown): Promise<void> =>
  db.set('savedGames', key, state);

export async function loadGame<T>(key: string): Promise<T | null> {
  return db.get('savedGames', key) as Promise<T | null>;
}

export const deleteSavedGame = (key: string): Promise<void> =>
  db.delete('savedGames', key);
