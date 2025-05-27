/**
 * Rate Limiting Utilities for MCC Discipline Tracker
 * 
 * This module provides rate limiting functionality to prevent API abuse,
 * manage resource consumption, and ensure fair usage of Firebase services.
 * 
 * @fileoverview Rate limiting utilities for API calls
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  /** Maximum number of operations allowed in the time window */
  limit: number;
  
  /** Time window in milliseconds */
  windowMs: number;
  
  /** Optional key generator function to identify rate limit buckets */
  keyGenerator?: (context: any) => string;
  
  /** Optional callback when rate limit is exceeded */
  onLimitExceeded?: (key: string, context: any) => void;
}

/**
 * Rate limiter token bucket
 */
interface TokenBucket {
  /** Number of tokens remaining */
  tokens: number;
  
  /** Last refill timestamp */
  lastRefill: number;
}

/**
 * Rate limiter implementation using token bucket algorithm
 */
export class RateLimiter {
  private options: RateLimiterOptions;
  private buckets: Map<string, TokenBucket> = new Map();
  
  /**
   * Create a new rate limiter
   * @param options - Rate limiter options
   */
  constructor(options: RateLimiterOptions) {
    this.options = {
      keyGenerator: () => 'default',
      ...options,
    };
  }
  
  /**
   * Check if an operation is allowed under the rate limit
   * @param context - Context for the operation (used for key generation)
   * @returns Boolean indicating if operation is allowed
   */
  public isAllowed(context: any = {}): boolean {
    const key = this.options.keyGenerator!(context);
    const now = Date.now();
    
    // Get or create bucket
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: this.options.limit,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
      return true;
    }
    
    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsedMs / this.options.windowMs) * this.options.limit;
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.tokens + tokensToAdd, this.options.limit);
      bucket.lastRefill = now - (elapsedMs % this.options.windowMs);
    }
    
    // Check if operation is allowed
    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return true;
    } else {
      // Rate limit exceeded
      if (this.options.onLimitExceeded) {
        this.options.onLimitExceeded(key, context);
      }
      return false;
    }
  }
  
  /**
   * Execute an operation if allowed by rate limit
   * @param operation - Function to execute
   * @param context - Context for the operation
   * @returns Result of operation or null if rate limited
   * @throws RateLimitExceededError if rate limit is exceeded
   */
  public async execute<T>(operation: () => Promise<T>, context: any = {}): Promise<T> {
    if (this.isAllowed(context)) {
      return await operation();
    } else {
      throw new RateLimitExceededError('Rate limit exceeded');
    }
  }
  
  /**
   * Reset rate limiter state
   */
  public reset(): void {
    this.buckets.clear();
  }
  
  /**
   * Get remaining tokens for a specific key
   * @param key - Rate limit key
   * @returns Number of remaining tokens or null if key doesn't exist
   */
  public getRemainingTokens(key: string): number | null {
    const bucket = this.buckets.get(key);
    return bucket ? bucket.tokens : null;
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Create a rate limiter for Firebase operations
 * @param options - Rate limiter options
 * @returns RateLimiter instance
 */
export function createFirebaseRateLimiter(options: Partial<RateLimiterOptions> = {}): RateLimiter {
  return new RateLimiter({
    limit: 100,  // 100 operations
    windowMs: 60000,  // per minute
    keyGenerator: (context) => context.collection || 'default',
    onLimitExceeded: (key) => {
      console.warn(`Firebase rate limit exceeded for collection: ${key}`);
    },
    ...options,
  });
}

/**
 * Default Firebase rate limiters
 */
export const firebaseRateLimiters = {
  read: createFirebaseRateLimiter({
    limit: 500,  // 500 read operations
    windowMs: 60000,  // per minute
  }),
  write: createFirebaseRateLimiter({
    limit: 100,  // 100 write operations
    windowMs: 60000,  // per minute
  }),
  auth: createFirebaseRateLimiter({
    limit: 50,  // 50 auth operations
    windowMs: 60000,  // per minute
    keyGenerator: () => 'auth',
  }),
};

/**
 * Decorator for adding rate limiting to class methods
 * @param limiter - RateLimiter instance
 * @param contextGenerator - Function to generate context from method arguments
 * @returns Method decorator
 */
export function rateLimited(
  limiter: RateLimiter,
  contextGenerator: (...args: any[]) => any = () => ({})
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const context = contextGenerator(...args);
      return limiter.execute(() => originalMethod.apply(this, args), context);
    };
    
    return descriptor;
  };
}