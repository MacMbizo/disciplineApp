/**
 * Services Index for MCC Discipline Tracker
 * 
 * This file exports all service modules for easy importing throughout the application.
 * Provides a centralized access point for all business logic services.
 * 
 * @fileoverview Service layer exports
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

// Authentication Service
export {
  AuthService,
  AuthenticationError,
  authService,
} from './authService';
export type { UserData } from './authService';

// User Service
export {
  UserService,
  UserServiceError,
  userService,
} from './userService';
export type {
  UserProfileUpdate,
  UserSearchFilters,
  PaginatedUsers,
} from './userService';

// Discipline Service
export {
  DisciplineService,
  DisciplineServiceError,
  disciplineService,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from './disciplineService';
export type {
  DisciplineIncident,
  IncidentSearchFilters,
  PaginatedIncidents,
  IncidentStatistics,
} from './disciplineService';

// Reporting Service
export {
  ReportingService,
  ReportingServiceError,
  reportingService,
} from './reportingService';
export type {
  ReportFilters,
  TrendDataPoint,
  StudentBehaviorReport,
  TeacherPerformanceReport,
  SchoolReport,
  ExportOptions,
} from './reportingService';

/**
 * Service layer initialization
 * Call this function to initialize all services
 */
export const initializeServices = () => {
  console.log('Initializing MCC Discipline Tracker services...');
  
  // Services are initialized as singletons when imported
  // This function can be used for any additional setup if needed
  
  console.log('Services initialized successfully');
};

/**
 * Service health check
 * Verifies that all services are properly initialized
 */
export const checkServiceHealth = () => {
  const services = {
    auth: !!authService,
    user: !!userService,
    discipline: !!disciplineService,
    reporting: !!reportingService,
  };
  
  const allHealthy = Object.values(services).every(Boolean);
  
  console.log('Service health check:', services);
  
  return {
    healthy: allHealthy,
    services,
  };
};