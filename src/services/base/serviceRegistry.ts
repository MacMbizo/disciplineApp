/**
 * Service Registry for MCC Discipline Tracker
 * 
 * This service provides a centralized registry for all services in the application.
 * It implements dependency injection pattern to make services more testable and maintainable.
 * 
 * @fileoverview Service registry for dependency injection
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

/**
 * Service factory interface
 */
interface ServiceFactory<T> {
  create(): T;
}

/**
 * Service registry singleton
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();
  private factories: Map<string, ServiceFactory<any>> = new Map();
  private isMockMode: boolean = false;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}
  
  /**
   * Register service factory
   * @param serviceId - Service identifier
   * @param factory - Service factory
   */
  public registerFactory<T>(serviceId: string, factory: ServiceFactory<T>): void {
    this.factories.set(serviceId, factory);
    // Clear existing service instance if it exists
    this.services.delete(serviceId);
  }
  
  /**
   * Register service instance
   * @param serviceId - Service identifier
   * @param instance - Service instance
   */
  public registerInstance<T>(serviceId: string, instance: T): void {
    this.services.set(serviceId, instance);
  }
  
  /**
   * Get service
   * @param serviceId - Service identifier
   * @returns Service instance
   * @throws Error if service is not registered
   */
  public getService<T>(serviceId: string): T {
    // Check if service instance exists
    if (this.services.has(serviceId)) {
      return this.services.get(serviceId) as T;
    }
    
    // Check if factory exists
    if (this.factories.has(serviceId)) {
      const factory = this.factories.get(serviceId)!;
      const instance = factory.create();
      this.services.set(serviceId, instance);
      return instance as T;
    }
    
    throw new Error(`Service not registered: ${serviceId}`);
  }
  
  /**
   * Check if service is registered
   * @param serviceId - Service identifier
   * @returns True if service is registered, false otherwise
   */
  public hasService(serviceId: string): boolean {
    return this.services.has(serviceId) || this.factories.has(serviceId);
  }
  
  /**
   * Remove service
   * @param serviceId - Service identifier
   */
  public removeService(serviceId: string): void {
    this.services.delete(serviceId);
    this.factories.delete(serviceId);
  }
  
  /**
   * Clear all services
   */
  public clearServices(): void {
    this.services.clear();
    this.factories.clear();
  }
  
  /**
   * Enable mock mode
   * This is used for testing to replace real services with mocks
   */
  public enableMockMode(): void {
    this.isMockMode = true;
  }
  
  /**
   * Disable mock mode
   */
  public disableMockMode(): void {
    this.isMockMode = false;
  }
  
  /**
   * Check if mock mode is enabled
   * @returns True if mock mode is enabled, false otherwise
   */
  public isMockModeEnabled(): boolean {
    return this.isMockMode;
  }
  
  /**
   * Reset registry
   * Clears all services and factories and resets mock mode
   */
  public reset(): void {
    this.services.clear();
    this.factories.clear();
    this.isMockMode = false;
  }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();