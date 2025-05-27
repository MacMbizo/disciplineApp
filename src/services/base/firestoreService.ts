/**
 * Base Firestore Service for MCC Discipline Tracker
 * 
 * This abstract class provides common Firestore operations for all services.
 * It implements standard CRUD operations and error handling patterns.
 * Services should extend this class to inherit common functionality.
 * 
 * @fileoverview Base service with common Firestore operations
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
  QueryConstraint,
  DocumentReference,
  CollectionReference,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

/**
 * Base service error class for Firestore operations
 */
export class FirestoreServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'FirestoreServiceError';
    this.code = code;
  }
}

/**
 * Validation error class for data validation failures
 */
export class ValidationError extends Error {
  public readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'validation-error';
  }
}

/**
 * Interface for paginated results
 */
export interface PaginatedResults<T> {
  items: T[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
}

/**
 * Abstract base class for Firestore services
 * Provides common CRUD operations and error handling
 */
export abstract class FirestoreService<T> {
  // Cache for frequently accessed data
  protected cache: Map<string, {data: any, timestamp: number}> = new Map();
  protected CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Rate limiter for operations
  protected rateLimiter = new Map<string, {count: number, resetTime: number}>();
  
  /**
   * Abstract properties that must be implemented by subclasses
   */
  protected abstract collectionName: string;
  
  /**
   * Map Firestore document data to model
   * @param id - Document ID
   * @param data - Firestore document data
   * @returns Mapped model object
   */
  protected abstract mapFirestoreToModel(id: string, data: any): T;
  
  /**
   * Map model to Firestore document data
   * @param model - Model object
   * @returns Firestore document data
   */
  protected abstract mapModelToFirestore(model: T): any;
  
  /**
   * Get document by ID
   * @param id - Document ID
   * @returns Promise resolving to model or null if not found
   */
  protected async getDocument(id: string): Promise<T | null> {
    // Check cache first
    const cachedData = this.getCachedData<T>(`doc:${id}`);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const docRef = await getDoc(doc(db, this.collectionName, id));
      if (docRef.exists()) {
        const model = this.mapFirestoreToModel(id, docRef.data());
        this.setCachedData(`doc:${id}`, model);
        return model;
      }
      return null;
    } catch (error) {
      this.logError('getDocument', error, { id });
      throw this.handleFirestoreError(error);
    }
  }
  
  /**
   * Create document
   * @param data - Model data to create
   * @param id - Optional document ID (if not provided, Firestore will generate one)
   * @returns Promise resolving to created model with ID
   */
  protected async createDocument(data: Omit<T, 'id'>, id?: string): Promise<T> {
    try {
      const firestoreData = this.mapModelToFirestore(data as T);
      
      let docRef: DocumentReference;
      if (id) {
        // Use provided ID
        docRef = doc(db, this.collectionName, id);
        await setDoc(docRef, {
          ...firestoreData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Let Firestore generate ID
        docRef = await addDoc(collection(db, this.collectionName), {
          ...firestoreData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      const createdModel = this.mapFirestoreToModel(
        docRef.id,
        {
          ...firestoreData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
      
      return createdModel;
    } catch (error) {
      this.logError('createDocument', error, { data });
      throw this.handleFirestoreError(error);
    }
  }
  
  /**
   * Update document
   * @param id - Document ID
   * @param data - Partial model data to update
   * @returns Promise resolving to updated model
   */
  protected async updateDocument(id: string, data: Partial<T>): Promise<T> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const firestoreData = this.mapModelToFirestore(data as T);
      
      await updateDoc(docRef, {
        ...firestoreData,
        updatedAt: serverTimestamp(),
      });
      
      // Clear cache for this document
      this.clearCacheForKey(`doc:${id}`);
      
      // Fetch updated document to return
      const updatedDoc = await this.getDocument(id);
      if (!updatedDoc) {
        throw new FirestoreServiceError('Document not found after update', 'not-found');
      }
      
      return updatedDoc;
    } catch (error) {
      this.logError('updateDocument', error, { id, data });
      throw this.handleFirestoreError(error);
    }
  }
  
  /**
   * Delete document
   * @param id - Document ID
   * @returns Promise that resolves when document is deleted
   */
  protected async deleteDocument(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      
      // Clear cache for this document
      this.clearCacheForKey(`doc:${id}`);
    } catch (error) {
      this.logError('deleteDocument', error, { id });
      throw this.handleFirestoreError(error);
    }
  }
  
  /**
   * Query documents with pagination
   * @param queryConstraints - Firestore query constraints
   * @param pageSize - Number of documents per page
   * @param lastDoc - Last document from previous page for pagination
   * @returns Promise resolving to paginated results
   */
  protected async queryDocuments(
    queryConstraints: QueryConstraint[],
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<PaginatedResults<T>> {
    try {
      // Generate cache key based on query constraints and pagination
      const cacheKey = `query:${JSON.stringify(queryConstraints)}:${pageSize}:${lastDoc?.id || 'first'}`;
      
      // Check cache first
      const cachedData = this.getCachedData<PaginatedResults<T>>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // Build query
      let queryRef = query(
        collection(db, this.collectionName),
        ...queryConstraints,
        limit(pageSize)
      );
      
      // Add pagination if lastDoc is provided
      if (lastDoc) {
        queryRef = query(queryRef, startAfter(lastDoc));
      }
      
      // Execute query
      const querySnapshot = await getDocs(queryRef);
      
      // Map results to models
      const items: T[] = [];
      querySnapshot.forEach((doc) => {
        items.push(this.mapFirestoreToModel(doc.id, doc.data()));
      });
      
      const results: PaginatedResults<T> = {
        items,
        hasMore: items.length === pageSize,
        lastDoc: items.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : undefined,
      };
      
      // Cache results
      this.setCachedData(cacheKey, results);
      
      return results;
    } catch (error) {
      this.logError('queryDocuments', error, { queryConstraints, pageSize });
      throw this.handleFirestoreError(error);
    }
  }
  
  /**
   * Get cached data
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  protected getCachedData<R>(key: string): R | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as R;
    }
    return null;
  }
  
  /**
   * Set cached data
   * @param key - Cache key
   * @param data - Data to cache
   */
  protected setCachedData(key: string, data: any): void {
    this.cache.set(key, {data, timestamp: Date.now()});
  }
  
  /**
   * Clear cache for specific key
   * @param key - Cache key to clear
   */
  protected clearCacheForKey(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache
   */
  protected clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Check rate limit for operation
   * @param userId - User ID
   * @param operation - Operation name
   * @param limit - Rate limit (operations per hour)
   */
  protected checkRateLimit(userId: string, operation: string, limit = 100): void {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const entry = this.rateLimiter.get(key) || { count: 0, resetTime: now + 3600000 };
    
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + 3600000;
    } else {
      entry.count += 1;
    }
    
    this.rateLimiter.set(key, entry);
    
    if (entry.count > limit) {
      throw new FirestoreServiceError('Rate limit exceeded', 'rate-limit-exceeded');
    }
  }
  
  /**
   * Convert JavaScript Date to Firestore Timestamp
   * @param date - JavaScript Date object
   * @returns Firestore Timestamp or null if date is undefined
   */
  protected dateToTimestamp(date?: Date): Timestamp | null {
    return date ? Timestamp.fromDate(date) : null;
  }
  
  /**
   * Convert Firestore Timestamp to JavaScript Date
   * @param timestamp - Firestore Timestamp
   * @returns JavaScript Date or undefined if timestamp is null
   */
  protected timestampToDate(timestamp: any): Date | undefined {
    return timestamp?.toDate ? timestamp.toDate() : undefined;
  }
  
  /**
   * Log error with context
   * @param method - Method name where error occurred
   * @param error - Error object
   * @param context - Additional context for error
   */
  protected logError(method: string, error: any, context?: any): void {
    // Log to console for development
    console.error(`[${this.constructor.name}] ${method} error:`, error, context);
    
    // In production, send to error tracking service
    // errorTrackingService.captureError(error, {
    //   service: this.constructor.name,
    //   method,
    //   context
    // });
  }
  
  /**
   * Handle Firestore errors and convert to service errors
   * @param error - Original error
   * @returns FirestoreServiceError with appropriate message and code
   */
  protected handleFirestoreError(error: any): FirestoreServiceError {
    let message: string;
    let code: string = error.code || 'unknown-error';
    
    switch (code) {
      case 'permission-denied':
        message = 'You do not have permission to perform this operation.';
        break;
      case 'not-found':
        message = 'The requested document was not found.';
        break;
      case 'already-exists':
        message = 'The document already exists.';
        break;
      case 'resource-exhausted':
        message = 'Service temporarily unavailable. Please try again later.';
        break;
      case 'failed-precondition':
        message = 'Operation failed due to a precondition failure.';
        break;
      case 'unavailable':
        message = 'Service is currently unavailable. Please try again later.';
        break;
      default:
        message = 'An error occurred while accessing the database.';
        code = 'firestore-error';
    }
    
    return new FirestoreServiceError(message, code);
  }
  
  /**
   * Execute operation with retry logic for network failures
   * @param operation - Function to execute
   * @param maxRetries - Maximum number of retry attempts
   * @returns Promise resolving to operation result
   */
  protected async withRetry<R>(operation: () => Promise<R>, maxRetries = 3): Promise<R> {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        // Only retry on network errors
        if (!error.code?.includes('unavailable') && 
            !error.code?.includes('network') &&
            !error.message?.includes('network')) {
          throw error;
        }
        
        // Log retry attempt
        console.log(`Retry attempt ${attempt}/${maxRetries} for operation due to network error`);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
    throw lastError;
  }
}