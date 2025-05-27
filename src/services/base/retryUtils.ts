/**
 * Retry Utilities for MCC Discipline Tracker
 * 
 * This module provides retry functionality for handling transient errors
 * in network operations, Firebase calls, and other async operations.
 * 
 * @fileoverview Retry utilities for error handling
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

/**
 * Options for retry operation
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  
  /** Whether to use exponential backoff strategy */
  useExponentialBackoff: boolean;
  
  /** Optional function to determine if an error is retryable */
  isRetryable?: (error: any) => boolean;
  
  /** Optional callback for retry attempts */
  onRetry?: (error: any, attempt: number) => void;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  useExponentialBackoff: true,
};

/**
 * Common retryable error types
 */
export const RETRYABLE_ERROR_CODES = [
  // Firebase/Firestore error codes
  'unavailable',
  'resource-exhausted',
  'deadline-exceeded',
  'cancelled',
  'internal',
  
  // Network error codes
  'network-request-failed',
  'auth/network-request-failed',
  
  // Custom error codes
  'timeout',
  'connection-error',
];

/**
 * Default function to determine if an error is retryable
 * @param error - The error to check
 * @returns Boolean indicating if the error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  // Check for error code
  if (error?.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
    return true;
  }
  
  // Check for network errors
  if (error instanceof TypeError && error.message.includes('network')) {
    return true;
  }
  
  // Check for timeout errors
  if (error instanceof Error && 
      (error.message.includes('timeout') || 
       error.message.includes('timed out'))) {
    return true;
  }
  
  return false;
};

/**
 * Calculate delay for next retry attempt using exponential backoff
 * @param attempt - Current attempt number (0-based)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
export const calculateBackoff = (attempt: number, options: RetryOptions): number => {
  if (options.useExponentialBackoff) {
    // Exponential backoff with jitter: baseDelay * 2^attempt + random jitter
    const exponentialDelay = options.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * options.baseDelay;
    return Math.min(exponentialDelay + jitter, options.maxDelay);
  } else {
    // Linear backoff
    return Math.min(options.baseDelay * (attempt + 1), options.maxDelay);
  }
};

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Execute an async operation with retry logic
 * @param operation - Async function to execute
 * @param options - Retry options
 * @returns Promise resolving to the operation result
 * @throws Last encountered error after all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  // Merge with default options
  const retryOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };
  
  // Set default isRetryable function if not provided
  if (!retryOptions.isRetryable) {
    retryOptions.isRetryable = isRetryableError;
  }
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      // First attempt (attempt = 0) or retry attempts
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we've exhausted all retry attempts
      if (attempt >= retryOptions.maxRetries) {
        break;
      }
      
      // Check if error is retryable
      if (!retryOptions.isRetryable(error)) {
        break;
      }
      
      // Calculate backoff delay
      const delay = calculateBackoff(attempt, retryOptions);
      
      // Call onRetry callback if provided
      if (retryOptions.onRetry) {
        retryOptions.onRetry(error, attempt + 1);
      }
      
      // Wait before next retry
      await sleep(delay);
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

/**
 * Decorator function to add retry capability to any async method
 * @param options - Retry options
 * @returns Method decorator
 */
export function withRetryDecorator(options: Partial<RetryOptions> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };
    
    return descriptor;
  };
}

/**
 * Execute multiple async operations with retry logic in parallel
 * @param operations - Array of async functions to execute
 * @param options - Retry options
 * @returns Promise resolving to array of operation results
 */
export async function withRetryAll<T>(
  operations: Array<() => Promise<T>>,
  options: Partial<RetryOptions> = {}
): Promise<T[]> {
  return Promise.all(operations.map(operation => withRetry(operation, options)));
}