/**
 * Telemetry Service for MCC Discipline Tracker
 * 
 * This service provides centralized telemetry for the application.
 * It implements error tracking, performance monitoring, and usage analytics.
 * 
 * @fileoverview Centralized telemetry service
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

/**
 * Telemetry event types
 */
export enum TelemetryEventType {
  ERROR = 'error',
  PERFORMANCE = 'performance',
  USAGE = 'usage',
  NETWORK = 'network',
}

/**
 * Telemetry event interface
 */
export interface TelemetryEvent {
  type: TelemetryEventType;
  name: string;
  timestamp: number;
  data: any;
}

/**
 * Error event interface
 */
export interface ErrorEvent extends TelemetryEvent {
  type: TelemetryEventType.ERROR;
  data: {
    message: string;
    stack?: string;
    code?: string;
    context?: any;
  };
}

/**
 * Performance event interface
 */
export interface PerformanceEvent extends TelemetryEvent {
  type: TelemetryEventType.PERFORMANCE;
  data: {
    duration: number;
    operation: string;
    context?: any;
  };
}

/**
 * Network event interface
 */
export interface NetworkEvent extends TelemetryEvent {
  type: TelemetryEventType.NETWORK;
  data: {
    url: string;
    method: string;
    status?: number;
    duration: number;
    success: boolean;
    errorMessage?: string;
  };
}

/**
 * Usage event interface
 */
export interface UsageEvent extends TelemetryEvent {
  type: TelemetryEventType.USAGE;
  data: {
    action: string;
    screen: string;
    parameters?: any;
  };
}

/**
 * Telemetry service singleton
 */
export class TelemetryService {
  private static instance: TelemetryService;
  private events: TelemetryEvent[] = [];
  private isEnabled: boolean = true;
  private bufferSize: number = 100;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;
  private performanceMarks: Map<string, number> = new Map();
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.startFlushTimer();
  }
  
  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }
  
  /**
   * Enable telemetry
   */
  public enable(): void {
    this.isEnabled = true;
  }
  
  /**
   * Disable telemetry
   */
  public disable(): void {
    this.isEnabled = false;
  }
  
  /**
   * Check if telemetry is enabled
   * @returns True if telemetry is enabled, false otherwise
   */
  public isEnabledState(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Set buffer size
   * @param size - Buffer size
   */
  public setBufferSize(size: number): void {
    this.bufferSize = size;
  }
  
  /**
   * Set flush interval
   * @param interval - Flush interval in milliseconds
   */
  public setFlushInterval(interval: number): void {
    this.flushInterval = interval;
    this.startFlushTimer();
  }
  
  /**
   * Track error
   * @param name - Error name
   * @param message - Error message
   * @param stack - Error stack trace
   * @param code - Error code
   * @param context - Additional context
   */
  public trackError(
    name: string,
    message: string,
    stack?: string,
    code?: string,
    context?: any
  ): void {
    if (!this.isEnabled) return;
    
    const event: ErrorEvent = {
      type: TelemetryEventType.ERROR,
      name,
      timestamp: Date.now(),
      data: {
        message,
        stack,
        code,
        context,
      },
    };
    
    this.addEvent(event);
    
    // Log to console in development
    if (__DEV__) {
      console.error(`[Telemetry] Error: ${name}`, event.data);
    }
  }
  
  /**
   * Track exception
   * @param error - Error object
   * @param context - Additional context
   */
  public trackException(error: Error, context?: any): void {
    this.trackError(
      error.name,
      error.message,
      error.stack,
      (error as any).code,
      context
    );
  }
  
  /**
   * Start performance measurement
   * @param name - Measurement name
   */
  public startMeasurement(name: string): void {
    if (!this.isEnabled) return;
    this.performanceMarks.set(name, Date.now());
  }
  
  /**
   * Stop performance measurement and track event
   * @param name - Measurement name
   * @param operation - Operation name
   * @param context - Additional context
   * @returns Duration in milliseconds
   */
  public stopMeasurement(
    name: string,
    operation: string,
    context?: any
  ): number {
    if (!this.isEnabled) return 0;
    
    const startTime = this.performanceMarks.get(name);
    if (!startTime) {
      console.warn(`[Telemetry] No start time found for measurement: ${name}`);
      return 0;
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    this.performanceMarks.delete(name);
    
    const event: PerformanceEvent = {
      type: TelemetryEventType.PERFORMANCE,
      name,
      timestamp: endTime,
      data: {
        duration,
        operation,
        context,
      },
    };
    
    this.addEvent(event);
    
    // Log to console in development
    if (__DEV__) {
      console.log(`[Telemetry] Performance: ${name} - ${duration}ms`);
    }
    
    return duration;
  }
  
  /**
   * Track network request
   * @param url - Request URL
   * @param method - Request method
   * @param status - Response status
   * @param duration - Request duration
   * @param success - Request success
   * @param errorMessage - Error message
   */
  public trackNetworkRequest(
    url: string,
    method: string,
    status?: number,
    duration?: number,
    success: boolean = true,
    errorMessage?: string
  ): void {
    if (!this.isEnabled) return;
    
    const event: NetworkEvent = {
      type: TelemetryEventType.NETWORK,
      name: 'network_request',
      timestamp: Date.now(),
      data: {
        url,
        method,
        status,
        duration: duration || 0,
        success,
        errorMessage,
      },
    };
    
    this.addEvent(event);
    
    // Log to console in development
    if (__DEV__ && !success) {
      console.warn(`[Telemetry] Network Error: ${method} ${url}`, event.data);
    }
  }
  
  /**
   * Track usage event
   * @param action - User action
   * @param screen - Screen name
   * @param parameters - Additional parameters
   */
  public trackUsage(
    action: string,
    screen: string,
    parameters?: any
  ): void {
    if (!this.isEnabled) return;
    
    const event: UsageEvent = {
      type: TelemetryEventType.USAGE,
      name: action,
      timestamp: Date.now(),
      data: {
        action,
        screen,
        parameters,
      },
    };
    
    this.addEvent(event);
  }
  
  /**
   * Add event to buffer
   * @param event - Telemetry event
   */
  private addEvent(event: TelemetryEvent): void {
    this.events.push(event);
    
    // Flush if buffer is full
    if (this.events.length >= this.bufferSize) {
      this.flush();
    }
  }
  
  /**
   * Flush events to backend
   */
  public flush(): void {
    if (!this.isEnabled || this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    // In a real implementation, this would send events to a backend service
    // For now, we'll just log to console in development
    if (__DEV__) {
      console.log(`[Telemetry] Flushing ${eventsToSend.length} events`);
    }
    
    // Simulate sending events to backend
    this.sendEvents(eventsToSend);
  }
  
  /**
   * Send events to backend
   * @param events - Events to send
   */
  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    // This is a placeholder for actual implementation
    // In a real implementation, this would send events to a backend service
    
    // Example implementation:
    // try {
    //   await fetch('https://api.example.com/telemetry', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       events,
    //       appVersion: '1.0.0',
    //       deviceInfo: {
    //         platform: Platform.OS,
    //         version: Platform.Version,
    //       },
    //     }),
    //   });
    // } catch (error) {
    //   console.error('Failed to send telemetry events:', error);
    // }
  }
  
  /**
   * Get events in buffer
   * @returns Array of events in buffer
   */
  public getEvents(): TelemetryEvent[] {
    return [...this.events];
  }
  
  /**
   * Clear events in buffer
   */
  public clearEvents(): void {
    this.events = [];
  }
}

// Export singleton instance
export const telemetryService = TelemetryService.getInstance();

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean;