/**
 * Offline Queue Service for MCC Discipline Tracker
 * 
 * This service provides offline support by queuing operations when the device
 * is offline and executing them when connectivity is restored.
 * 
 * @fileoverview Offline queue service for handling operations when offline
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Operation types that can be queued
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Interface for queued operations
 */
export interface QueuedOperation {
  id: string;
  type: OperationType;
  collectionName: string;
  documentId?: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * Offline queue service singleton
 */
export class OfflineQueue {
  private static instance: OfflineQueue;
  private queue: QueuedOperation[] = [];
  private isOnline: boolean = true;
  private isProcessing: boolean = false;
  private storageKey: string = '@offline_queue';
  private listeners: Set<() => void> = new Set();
  
  /**
   * Get singleton instance
   */
  public static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.initialize();
  }
  
  /**
   * Initialize offline queue
   * - Load queued operations from storage
   * - Set up network connectivity listener
   */
  private async initialize(): Promise<void> {
    try {
      // Load queue from storage
      await this.loadQueue();
      
      // Set up network connectivity listener
      NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;
        
        // If we just came online and we have operations in queue, process them
        if (!wasOnline && this.isOnline && this.queue.length > 0) {
          this.processQueue();
        }
        
        // Notify listeners of connectivity change
        this.notifyListeners();
      });
      
      // Check initial network state
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;
      
      // If online and we have operations in queue, process them
      if (this.isOnline && this.queue.length > 0) {
        this.processQueue();
      }
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  }
  
  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.storageKey);
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
    }
  }
  
  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }
  
  /**
   * Add operation to queue
   * @param operation - Operation to queue
   * @returns Promise that resolves when operation is added to queue
   */
  public async addToQueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = this.generateId();
    const queuedOperation: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || 3,
    };
    
    this.queue.push(queuedOperation);
    await this.saveQueue();
    
    // If online, process queue immediately
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }
    
    // Notify listeners
    this.notifyListeners();
    
    return id;
  }
  
  /**
   * Remove operation from queue
   * @param id - Operation ID
   * @returns Promise that resolves when operation is removed from queue
   */
  public async removeFromQueue(id: string): Promise<void> {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(op => op.id !== id);
    
    if (initialLength !== this.queue.length) {
      await this.saveQueue();
      this.notifyListeners();
    }
  }
  
  /**
   * Process queue
   * Executes queued operations in order
   */
  private async processQueue(): Promise<void> {
    // If already processing or offline, do nothing
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Process operations in order (oldest first)
      const sortedQueue = [...this.queue].sort((a, b) => a.timestamp - b.timestamp);
      
      for (const operation of sortedQueue) {
        try {
          // Check if we're still online
          const state = await NetInfo.fetch();
          if (!(state.isConnected ?? false)) {
            this.isOnline = false;
            break;
          }
          
          // Execute operation
          await this.executeOperation(operation);
          
          // Operation succeeded, remove from queue
          await this.removeFromQueue(operation.id);
        } catch (error) {
          console.error(`Failed to execute operation ${operation.id}:`, error);
          
          // Increment retry count
          operation.retryCount++;
          
          // If max retries reached, remove from queue
          if (operation.retryCount >= operation.maxRetries) {
            console.warn(`Operation ${operation.id} failed after ${operation.retryCount} retries, removing from queue`);
            await this.removeFromQueue(operation.id);
          } else {
            // Update operation in queue
            await this.saveQueue();
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }
  }
  
  /**
   * Execute operation
   * @param operation - Operation to execute
   * @returns Promise that resolves when operation is executed
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    // This is a placeholder for actual implementation
    // In a real implementation, this would call the appropriate service methods
    console.log(`Executing operation: ${operation.type} on ${operation.collectionName}${operation.documentId ? `/${operation.documentId}` : ''}`);
    
    // Simulate operation execution
    // In a real implementation, this would be replaced with actual service calls
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For demonstration purposes only
    // In a real implementation, this would be replaced with actual service calls
    switch (operation.type) {
      case OperationType.CREATE:
        // Call appropriate service create method
        // Example: await serviceRegistry.getService(operation.collectionName).create(operation.data);
        break;
        
      case OperationType.UPDATE:
        // Call appropriate service update method
        // Example: await serviceRegistry.getService(operation.collectionName).update(operation.documentId, operation.data);
        break;
        
      case OperationType.DELETE:
        // Call appropriate service delete method
        // Example: await serviceRegistry.getService(operation.collectionName).delete(operation.documentId);
        break;
    }
  }
  
  /**
   * Generate unique ID for operation
   * @returns Unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  /**
   * Get queue
   * @returns Array of queued operations
   */
  public getQueue(): QueuedOperation[] {
    return [...this.queue];
  }
  
  /**
   * Get queue length
   * @returns Number of queued operations
   */
  public getQueueLength(): number {
    return this.queue.length;
  }
  
  /**
   * Check if device is online
   * @returns True if online, false otherwise
   */
  public isDeviceOnline(): boolean {
    return this.isOnline;
  }
  
  /**
   * Add listener for queue changes
   * @param listener - Listener function
   */
  public addListener(listener: () => void): void {
    this.listeners.add(listener);
  }
  
  /**
   * Remove listener
   * @param listener - Listener function
   */
  public removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }
  
  /**
   * Notify listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
  
  /**
   * Clear queue
   * @returns Promise that resolves when queue is cleared
   */
  public async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
  }
}

// Export singleton instance
export const offlineQueue = OfflineQueue.getInstance();