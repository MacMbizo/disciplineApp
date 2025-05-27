import firebase from 'firebase/app';
import 'firebase/firestore';
import { openDB, IDBPDatabase } from 'indexeddb-promised';

export enum CacheStrategy {
  CACHE_ONLY,
  NETWORK_ONLY,
  NETWORK_FIRST,
  STALE_WHILE_REVALIDATE,
  CACHE_FIRST,
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // Default TTL: 5 minutes
  private firebaseApp: firebase.app.App; // Firebase app instance
  private db: IDBPDatabase | null = null; // IndexedDB database instance

  private static instance: CacheService;

  private constructor() {
    // Initialize Firebase (assuming it's already configured elsewhere)
    this.firebaseApp = firebase.initializeApp(); // Or get the default app

    // Initialize persistence (e.g., IndexedDB)
    this.initPersistence(); // Initialize IndexedDB for persistence
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initializes the IndexedDB for cache persistence.
   */
  private async initPersistence(): Promise<void> {
    try {
      this.db = await openDB('firebase-cache-db', 1, {
        upgrade(db) {
          db.createObjectStore('cache-entries');
        },
      });
      console.log('IndexedDB initialized for cache persistence.');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      // Continue without persistence if initialization fails
      this.db = null;
    }
  }

  /**
   * Sets a cache entry in memory and persists it to IndexedDB.
   * @param key The cache key.
   * @param value The value to cache.
   * @param ttl The time-to-live in milliseconds. Defaults to the service's default TTL.
   */
  public async set<T>(key: string, value: T, ttl = this.defaultTTL): Promise<void> {
    const entry: CacheEntry<T> = { value, timestamp: Date.now(), ttl };
    this.cache.set(key, entry);
    // Persist to IndexedDB
    if (this.db) {
      try {
        await this.db.put('cache-entries', entry, key);
      } catch (error) {
        console.error(`Failed to persist cache entry ${key} to IndexedDB:`, error);
      }
    }
  }

  /**
   * Retrieves a cache entry from memory or IndexedDB.
   * @param key The cache key.
   * @returns The cached value or undefined.
   */
  public async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (entry && !this.isExpired(entry)) {
      console.log(`Cache hit (memory) for key: ${key}`);
      return entry.value;
    }

    // Try to get from IndexedDB if not in memory cache or expired
    if (this.db) {
      try {
        const persistedEntry = await this.db.get('cache-entries', key);
        if (persistedEntry && !this.isExpired(persistedEntry)) {
          this.cache.set(key, persistedEntry); // Add to memory cache
          console.log(`Cache hit (IndexedDB) for key: ${key}`);
          return persistedEntry.value;
        }
      } catch (error) {
        console.error(`Failed to retrieve cache entry ${key} from IndexedDB:`, error);
      }
    }

    console.log(`Cache miss for key: ${key}`);
    return undefined;
  }

  /**
   * Checks if a cache entry exists and is not expired.
   * This method now also checks IndexedDB if not found in memory.
   * @param key The cache key.
   * @returns True if the entry exists and is not expired, false otherwise.
   */
  public async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry && !this.isExpired(entry)) {
      return true;
    }
    // Check IndexedDB if not in memory or expired
    if (this.db) {
      try {
        const persistedEntry = await this.db.get('cache-entries', key);
        return !!(persistedEntry && !this.isExpired(persistedEntry));
      } catch (error) {
        console.error(`Failed to check existence of cache entry ${key} in IndexedDB:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Checks if a cache entry is expired.
   * @param entry The cache entry.
   * @returns True if the entry is expired, false otherwise.
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Deletes a cache entry by key from memory and IndexedDB.
   * @param key The key of the entry to delete.
   */
  public async delete(key: string): Promise<void> {
    this.cache.delete(key);
    // Delete from IndexedDB
    if (this.db) {
      try {
        await this.db.delete('cache-entries', key);
      } catch (error) {
        console.error(`Failed to delete cache entry ${key} from IndexedDB:`, error);
      }
    }
  }

  /**
   * Clears all entries from the cache (memory and IndexedDB).
   */
  public async clear(): Promise<void> {
    this.cache.clear();
    // Clear IndexedDB
    if (this.db) {
      try {
        await this.db.clear('cache-entries');
      } catch (error) {
        console.error('Failed to clear IndexedDB:', error);
      }
    }
  }

  /**
   * Clears only expired entries from the cache (memory and IndexedDB).
   */
  public async clearExpired(): Promise<void> {
    const now = Date.now();
    // Clear expired from memory
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
    // Clear expired from IndexedDB
    if (this.db) {
      try {
        const keys = await this.db.getAllKeys('cache-entries');
        for (const key of keys) {
          const entry = await this.db.get('cache-entries', key);
          if (entry && this.isExpired(entry)) {
            await this.db.delete('cache-entries', key);
          }
        }
      } catch (error) {
        console.error('Failed to clear expired entries from IndexedDB:', error);
      }
    }
  }

  /**
   * Gets the current size of the memory cache.
   * Note: This does not include entries only in IndexedDB.
   * @returns The number of entries in the memory cache.
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Gets all keys currently in the memory cache.
   * Note: This does not include keys only in IndexedDB.
   * @returns An array of cache keys.
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Fetches data using the specified caching strategy.
   * @param strategy The caching strategy to use.
   * @param key The cache key.
   * @param operation The asynchronous operation to fetch data from the network (e.g., Firebase). **Replace this with your actual Firebase fetching logic.**
   * @param fallbackOperation An optional fallback operation to execute if the primary operation fails.
   * @param ttl The time-to-live for the cache entry.
   * @returns A promise resolving with the fetched data.
   */
  public async fetchWithCache<T>(
    strategy: CacheStrategy,
    key: string,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    switch (strategy) {
      case CacheStrategy.CACHE_ONLY:
        return this.cacheOnly(key, fallbackOperation);
      case CacheStrategy.NETWORK_ONLY:
        return this.networkOnly(key, operation, fallbackOperation, ttl);
      case CacheStrategy.NETWORK_FIRST:
        return this.networkFirst(key, operation, fallbackOperation, ttl);
      case CacheStrategy.STALE_WHILE_REVALIDATE:
        return this.staleWhileRevalidate(key, operation, fallbackOperation, ttl);
      case CacheStrategy.CACHE_FIRST:
      default:
        return this.cacheFirst(key, operation, fallbackOperation, ttl);
    }
  }

  /**
   * Cache Only strategy: Returns data from cache (memory or IndexedDB) or throws an error.
   */
  private async cacheOnly<T>(key: string, fallbackOperation?: () => Promise<T>): Promise<T> {
    const cachedData = await this.get<T>(key);
    if (cachedData) {
      return cachedData;
    }
    if (fallbackOperation) {
      return fallbackOperation();
    }
    throw new Error(`Cache miss for key: ${key}`);
  }

  /**
   * Network Only strategy: Fetches data from the network and updates cache (memory and IndexedDB).
   */
  private async networkOnly<T>(key: string, operation: () => Promise<T>, fallbackOperation?: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      const networkData = await operation();
      await this.set(key, networkData, ttl); // Persists to IndexedDB
      return networkData;
    } catch (error) {
      if (fallbackOperation) {
        return fallbackOperation();
      }
      throw error;
    }
  }

  /**
   * Network First strategy: Tries network first, falls back to cache (memory or IndexedDB) on failure.
   */
  private async networkFirst<T>(key: string, operation: () => Promise<T>, fallbackOperation?: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      const networkData = await operation();
      await this.set(key, networkData); // This now persists too
      return networkData;
    } catch (error) {
      console.warn(`Network failed for key ${key}, trying cache:`, error);
      // If network fails, try cache (which now checks persistence)
      const cachedData = await this.get<T>(key);
      if (cachedData) {
        return cachedData;
      }
      if (fallbackOperation) {
        return fallbackOperation();
      }
      throw error;
    }
  }

  /**
   * Stale While Revalidate strategy: Returns cached data (memory or IndexedDB) immediately if available,
   * then updates cache from network in background.
   */
  private async staleWhileRevalidate<T>(key: string, operation: () => Promise<T>, fallbackOperation?: () => Promise<T>, ttl?: number): Promise<T> {
    const cachedData = await this.get<T>(key); // This now checks persistence
    const networkPromise = operation().then(async (networkData) => {
      await this.set(key, networkData); // This now persists
      return networkData;
    }).catch(error => {
      console.error(`Network operation failed for key ${key}:`, error);
      throw error; // Re-throw to be caught by the main try-catch if needed
    });

    if (cachedData) {
      // Update cache in background
      this.updateCacheInBackground(networkPromise);
      return cachedData;
    } else {
      // No cached data, wait for network
      try {
        return await networkPromise;
      } catch (error) {
        if (fallbackOperation) {
          return fallbackOperation();
        }
        throw error;
      }
    }
  }

  /**
   * Cache First strategy: Tries cache (memory or IndexedDB) first, falls back to network on miss.
   */
  private async cacheFirst<T>(key: string, operation: () => Promise<T>, fallbackOperation?: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      const cachedData = await this.get<T>(key); // This now checks persistence too
      if (cachedData) {
        return cachedData;
      }
      const networkData = await operation();
      await this.set(key, networkData); // This now persists too
      return networkData;
    } catch (error) {
      if (fallbackOperation) {
        return fallbackOperation();
      }
      throw error;
    }
  }

  /**
   * Helper function to update cache in the background without blocking the main thread.
   */
  private updateCacheInBackground<T>(promise: Promise<T>): void {
    promise.catch(error => {
      console.error('Background cache update failed:', error);
    });
  }

  // Placeholder for actual Firebase data fetching integration
  // **IMPORTANT:** Replace the content of this method with your actual Firebase Firestore or Realtime Database fetching logic.
  // The `path` parameter could represent a Firestore document path or a Realtime Database path.
  private async fetchFromFirebase<T>(path: string): Promise<T> {
    console.log(`Simulating fetching data from Firebase path: ${path}`);
    // Example Firestore fetch:
    // const docRef = this.firebaseApp.firestore().doc(path);
    // const docSnap = await docRef.get();
    // if (docSnap.exists) {
    //   return docSnap.data() as T;
    // } else {
    //   throw new Error(`Document not found at path: ${path}`);
    // }

    // Example Realtime Database fetch:
    // const dbRef = this.firebaseApp.database().ref(path);
    // const snapshot = await dbRef.once('value');
    // if (snapshot.exists()) {
    //   return snapshot.val() as T;
    // } else {
    //   throw new Error(`Data not found at path: ${path}`);
    // }

    // For now, simulate a network delay and return dummy data
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Simulated data fetched for path: ${path}`);
    return { id: path.split('/').pop(), data: 'simulated data' } as T; // Replace with actual data structure
  }
}

export const cacheService = CacheService.getInstance();