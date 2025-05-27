/**
 * Discipline Service for MCC Discipline Tracker
 * 
 * This service handles all discipline incident management including
 * creating, updating, deleting, and querying discipline incidents.
 * Provides comprehensive incident tracking and reporting functionality.
 * 
 * @fileoverview Discipline incident management service
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import {
  doc,
  getDoc,
  getDocs,
  addDoc,
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
  Timestamp,
  FirestoreError,
} from 'firebase/firestore';
import { db, Collections } from '../config/firebaseConfig';
import { userService } from './userService';

// Import base services and utilities
import { withRetry, withRetryDecorator, isRetryableError } from './base/retryUtils';
import { validationService } from './base/validationService';
import { serviceRegistry } from './base/serviceRegistry';
import { cacheService, CacheStrategy } from './base/cacheService';
import { rateLimitUtils, createFirebaseRateLimiter, rateLimited } from './base/rateLimitUtils';
import { telemetryService, TelemetryEventType } from './base/telemetryService';
import { FirestoreService } from './base/firestoreService';

/**
 * Interface for discipline incident data
 */
export interface DisciplineIncident {
  id?: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  schoolId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  location: string;
  dateTime: Date;
  actionTaken: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  parentNotified: boolean;
  parentNotificationDate?: Date;
  status: IncidentStatus;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Enum for incident types
 */
export enum IncidentType {
  TARDINESS = 'tardiness',
  ABSENCE = 'absence',
  DISRUPTION = 'disruption',
  DISRESPECT = 'disrespect',
  FIGHTING = 'fighting',
  BULLYING = 'bullying',
  VANDALISM = 'vandalism',
  CHEATING = 'cheating',
  DRESS_CODE = 'dress_code',
  TECHNOLOGY_MISUSE = 'technology_misuse',
  OTHER = 'other',
}

/**
 * Enum for incident severity levels
 */
export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Enum for incident status
 */
export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * Interface for incident search filters
 */
export interface IncidentSearchFilters {
  schoolId?: string;
  studentId?: string;
  teacherId?: string;
  incidentType?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  followUpRequired?: boolean;
  parentNotified?: boolean;
}

/**
 * Interface for paginated incident results
 */
export interface PaginatedIncidents {
  incidents: DisciplineIncident[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
}

/**
 * Interface for incident statistics
 */
export interface IncidentStatistics {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  incidentsByType: Record<IncidentType, number>;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  followUpRequired: number;
  parentNotificationPending: number;
}

/**
 * Discipline service class providing comprehensive incident management functionality
 * Extends FirestoreService for common CRUD operations with enhanced error handling,
 * validation, caching, rate limiting, and telemetry tracking.
 */
export class DisciplineService extends FirestoreService {
  private static instance: DisciplineService;
  private readonly incidentValidator: any;
  private readonly readRateLimiter: any;
  private readonly writeRateLimiter: any;

  /**
   * Singleton pattern implementation
   * @returns DisciplineService instance
   */
  public static getInstance(): DisciplineService {
    if (!DisciplineService.instance) {
      DisciplineService.instance = new DisciplineService();
      // Register with service registry
      serviceRegistry.registerInstance('disciplineService', DisciplineService.instance);
    }
    return DisciplineService.instance;
  }

  /**
   * Private constructor for singleton pattern
   * Initializes validators, rate limiters, and registers with service registry
   */
  private constructor() {
    super(Collections.INCIDENTS, 'incident');
    
    // Initialize validators
    this.incidentValidator = validationService.getSchema('incident');
    
    // Initialize rate limiters
    this.readRateLimiter = createFirebaseRateLimiter('read');
    this.writeRateLimiter = createFirebaseRateLimiter('write');
    
    // Start telemetry
    telemetryService.trackUsage('service_initialized', 'DisciplineService');
  }

  /**
   * Create a new discipline incident
   * @param incidentData - Incident data to create
   * @param createdBy - User ID of the creator
   * @returns Promise resolving to created incident with ID
   * @throws DisciplineServiceError for creation failures
   */
  @withRetryDecorator()
  @rateLimited('writeRateLimiter')
  public async createIncident(
    incidentData: Omit<DisciplineIncident, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    createdBy: string
  ): Promise<DisciplineIncident> {
    // Start performance measurement
    telemetryService.startMeasurement('createIncident');
    
    try {
      // Validate user permissions
      const hasPermission = await userService.hasPermission(createdBy, 'create-incident');
      if (!hasPermission) {
        throw new DisciplineServiceError('Insufficient permissions to create incident', 'insufficient-permissions');
      }
      
      // Validate incident data
      validationService.validateOrThrow('incident', incidentData);
      
      const incident: Omit<DisciplineIncident, 'id'> = {
        ...incidentData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        updatedBy: createdBy,
      };

      // Prepare data for Firestore
      const firestoreData = {
        ...incident,
        dateTime: Timestamp.fromDate(incident.dateTime),
        followUpDate: incident.followUpDate ? Timestamp.fromDate(incident.followUpDate) : null,
        parentNotificationDate: incident.parentNotificationDate ? Timestamp.fromDate(incident.parentNotificationDate) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Create document with retry logic
      const docRef = await this.createDocument(firestoreData);

      const createdIncident: DisciplineIncident = {
        ...incident,
        id: docRef.id,
      };

      // Track successful creation
      telemetryService.trackUsage('incident_created', 'DisciplineService', {
        incidentId: docRef.id,
        incidentType: incidentData.incidentType,
        severity: incidentData.severity
      });
      
      telemetryService.stopMeasurement('createIncident', 'create_incident');
      return createdIncident;
    } catch (error) {
      // Track error
      telemetryService.trackException(error as Error, {
        method: 'createIncident',
        incidentType: incidentData.incidentType,
        severity: incidentData.severity
      });
      
      telemetryService.stopMeasurement('createIncident', 'create_incident_failed');
      
      if (error instanceof DisciplineServiceError) {
        throw error;
      }
      
      if (error instanceof FirestoreError) {
        const serviceError = DisciplineServiceError.fromFirestoreError(error, 'createIncident', {
          incidentType: incidentData.incidentType,
          severity: incidentData.severity,
          schoolId: incidentData.schoolId
        });
        throw serviceError;
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const serviceError = new DisciplineServiceError(
          `Validation error: ${error.message}`,
          'validation-error',
          { validationErrors: error.details }
        );
        throw serviceError;
      }
      
      throw new DisciplineServiceError(
        `Failed to create discipline incident: ${(error as Error).message}`,
        'create-incident-failed',
        { originalError: (error as Error).name }
      );
    }
  }

  /**
   * Get incident by ID
   * @param incidentId - Incident ID to fetch
   * @returns Promise resolving to DisciplineIncident or null if not found
   * @throws DisciplineServiceError for fetch failures
   */
  @withRetryDecorator()
  @rateLimited('readRateLimiter')
  public async getIncident(incidentId: string): Promise<DisciplineIncident | null> {
    // Start performance measurement
    telemetryService.startMeasurement('getIncident');
    
    // Define cache key
    const cacheKey = `incident:${incidentId}`;
    
    try {
      // Try to get from cache first
      return await cacheService.withCache<DisciplineIncident | null>(
        cacheKey,
        async () => {
          // Get document with retry logic
          const document = await this.getDocument(incidentId);
          
          if (document) {
            return this.mapFirestoreToIncident(incidentId, document);
          }
          
          return null;
        },
        5 * 60 * 1000, // 5 minute cache TTL
        CacheStrategy.CACHE_FIRST
      );
    } catch (error) {
      // Track error
      telemetryService.trackException(error as Error, {
        method: 'getIncident',
        incidentId
      });
      
      telemetryService.stopMeasurement('getIncident', 'get_incident_failed');
      
      if (error instanceof DisciplineServiceError) {
        throw error;
      }
      
      if (error instanceof FirestoreError) {
        throw DisciplineServiceError.fromFirestoreError(error, 'getIncident', {
          incidentId
        });
      }
      
      throw new DisciplineServiceError(
        `Failed to fetch incident: ${(error as Error).message}`,
        'fetch-incident-failed',
        { incidentId, errorType: (error as Error).name }
      );
    } finally {
      telemetryService.stopMeasurement('getIncident', 'get_incident');
    }
  }

  /**
   * Update an existing discipline incident
   * @param incidentId - ID of the incident to update
   * @param updateData - Partial incident data to update
   * @param updatedBy - User ID of the updater
   * @returns Promise resolving to updated incident
   * @throws DisciplineServiceError for update failures
   */
  @withRetryDecorator()
  @rateLimited('writeRateLimiter')
  public async updateIncident(
    incidentId: string,
    updateData: Partial<Omit<DisciplineIncident, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>,
    updatedBy: string
  ): Promise<DisciplineIncident> {
    // Start performance measurement
    telemetryService.startMeasurement('updateIncident');
    
    try {
      // Validate user permissions
      const hasPermission = await userService.hasPermission(updatedBy, 'update-incident');
      if (!hasPermission) {
        throw new DisciplineServiceError('Insufficient permissions to update incident', 'insufficient-permissions');
      }
      
      // Validate update data
      if (Object.keys(updateData).length > 0) {
        validationService.validateOrThrow('incident', updateData, { partial: true });
      }

      // Prepare update data with timestamps
      const updateWithTimestamps: any = {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy,
      };

      // Convert Date objects to Firestore Timestamps
      if (updateData.dateTime) {
        updateWithTimestamps.dateTime = Timestamp.fromDate(updateData.dateTime);
      }

      if (updateData.followUpDate) {
        updateWithTimestamps.followUpDate = Timestamp.fromDate(updateData.followUpDate);
      } else if (updateData.followUpDate === null) {
        updateWithTimestamps.followUpDate = null;
      }

      if (updateData.parentNotificationDate) {
        updateWithTimestamps.parentNotificationDate = Timestamp.fromDate(updateData.parentNotificationDate);
      } else if (updateData.parentNotificationDate === null) {
        updateWithTimestamps.parentNotificationDate = null;
      }

      // Update the document with retry logic
      await this.updateDocument(incidentId, updateWithTimestamps);
      
      // Clear cache for this incident
      cacheService.delete(`incident:${incidentId}`);

      // Fetch the updated incident
      const updatedIncident = await this.getIncident(incidentId);
      if (!updatedIncident) {
        throw new DisciplineServiceError('Incident not found after update', 'incident-not-found');
      }
      
      // Track successful update
      telemetryService.trackUsage('incident_updated', 'DisciplineService', {
        incidentId,
        updatedFields: Object.keys(updateData).join(','),
      });
      
      telemetryService.stopMeasurement('updateIncident', 'update_incident');
      return updatedIncident;
    } catch (error) {
      // Track error
      telemetryService.trackException(error as Error, {
        method: 'updateIncident',
        incidentId,
        updatedFields: Object.keys(updateData).join(','),
      });
      
      telemetryService.stopMeasurement('updateIncident', 'update_incident_failed');
      
      if (error instanceof DisciplineServiceError) {
        throw error;
      }
      
      if (error instanceof FirestoreError) {
        throw DisciplineServiceError.fromFirestoreError(error, 'updateIncident', {
          incidentId,
          updatedFields: Object.keys(updateData).join(',')
        });
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        throw new DisciplineServiceError(
          `Validation error: ${error.message}`,
          'validation-error',
          { validationErrors: error.details, incidentId }
        );
      }
      
      throw new DisciplineServiceError(
        `Failed to update discipline incident: ${(error as Error).message}`,
        'update-incident-failed',
        { incidentId, errorType: (error as Error).name }
      );
    }
  }

  /**
   * Delete a discipline incident
   * @param incidentId - ID of the incident to delete
   * @param deletedBy - User ID of the person deleting
   * @returns Promise resolving to true if successful
   * @throws DisciplineServiceError for deletion failures
   */
  @withRetryDecorator()
  @rateLimited('writeRateLimiter')
  public async deleteIncident(incidentId: string, deletedBy: string): Promise<boolean> {
    // Start performance measurement
    telemetryService.startMeasurement('deleteIncident');
    
    try {
      // Validate user permissions
      const hasPermission = await userService.hasPermission(deletedBy, 'delete-incident');
      if (!hasPermission) {
        throw new DisciplineServiceError('Insufficient permissions to delete incident', 'insufficient-permissions');
      }

      // Get incident data for telemetry before deletion
      const incident = await this.getIncident(incidentId);
      if (!incident) {
        throw new DisciplineServiceError('Incident not found', 'incident-not-found');
      }

      // Delete the document with retry logic
      await this.deleteDocument(incidentId);
      
      // Clear cache for this incident
      cacheService.delete(`incident:${incidentId}`);
      
      // Track successful deletion
      telemetryService.trackUsage('incident_deleted', 'DisciplineService', {
        incidentId,
        incidentType: incident.incidentType,
        severity: incident.severity
      });
      
      telemetryService.stopMeasurement('deleteIncident', 'delete_incident');
      return true;
    } catch (error) {
      // Track error
      telemetryService.trackException(error as Error, {
        method: 'deleteIncident',
        incidentId
      });
      
      telemetryService.stopMeasurement('deleteIncident', 'delete_incident_failed');
      
      if (error instanceof DisciplineServiceError) {
        throw error;
      }
      
      if (error instanceof FirestoreError) {
        throw DisciplineServiceError.fromFirestoreError(error, 'deleteIncident', {
          incidentId
        });
      }
      
      throw new DisciplineServiceError(
        `Failed to delete incident: ${(error as Error).message}`,
        'delete-incident-failed',
        { incidentId, errorType: (error as Error).name }
      );
    }
  }

  /**
   * Search incidents with filters and pagination
   * @param filters - Search filters
   * @param pageSize - Number of results per page
   * @param lastDoc - Last document for pagination
   * @returns Promise resolving to paginated incident results
   * @throws DisciplineServiceError for search failures
   */
  @withRetryDecorator()
  @rateLimited('readRateLimiter')
  public async searchIncidents(
    filters: IncidentSearchFilters,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<PaginatedIncidents> {
    // Start performance measurement
    telemetryService.startMeasurement('searchIncidents');
    
    try {
      let q = query(collection(db, Collections.INCIDENTS));

      // Apply filters
      if (filters.schoolId) {
        q = query(q, where('schoolId', '==', filters.schoolId));
      }
      if (filters.studentId) {
        q = query(q, where('studentId', '==', filters.studentId));
      }
      if (filters.teacherId) {
        q = query(q, where('teacherId', '==', filters.teacherId));
      }
      if (filters.incidentType) {
        q = query(q, where('incidentType', '==', filters.incidentType));
      }
      if (filters.severity) {
        q = query(q, where('severity', '==', filters.severity));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.followUpRequired !== undefined) {
        q = query(q, where('followUpRequired', '==', filters.followUpRequired));
      }
      if (filters.parentNotified !== undefined) {
        q = query(q, where('parentNotified', '==', filters.parentNotified));
      }

      // Add date range filters
      if (filters.dateFrom) {
        q = query(q, where('dateTime', '>=', Timestamp.fromDate(filters.dateFrom)));
      }
      if (filters.dateTo) {
        q = query(q, where('dateTime', '<=', Timestamp.fromDate(filters.dateTo)));
      }

      // Add ordering and pagination
      q = query(q, orderBy('dateTime', 'desc'), limit(pageSize + 1));

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      // Execute query with retry logic
      const querySnapshot = await getDocs(q);
      const incidents: DisciplineIncident[] = [];
      const docs = querySnapshot.docs;

      // Process results
      const hasMore = docs.length > pageSize;
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;

      resultDocs.forEach((doc) => {
        const incident = this.mapFirestoreToIncident(doc.id, doc.data());
        incidents.push(incident);
      });
      
      // Track successful search
      telemetryService.trackUsage('incidents_searched', 'DisciplineService', {
        filterCount: Object.keys(filters).length,
        resultCount: incidents.length,
        pageSize
      });
      
      telemetryService.stopMeasurement('searchIncidents', 'search_incidents');
      
      return {
        incidents,
        hasMore,
        lastDoc: hasMore ? resultDocs[resultDocs.length - 1] : undefined,
      };
    } catch (error) {
      // Track error
      telemetryService.trackException(error as Error, {
        method: 'searchIncidents',
        filters: JSON.stringify(filters)
      });
      
      telemetryService.stopMeasurement('searchIncidents', 'search_incidents_failed');
      
      if (error instanceof DisciplineServiceError) {
        throw error;
      }
      
      if (error instanceof FirestoreError) {
        throw DisciplineServiceError.fromFirestoreError(error, 'searchIncidents', {
          filterCount: Object.keys(filters).length,
          pageSize
        });
      }
      
      // Log error but don't expose internal details to caller
      console.error('Error searching incidents:', error);
      throw new DisciplineServiceError(
        `Failed to search incidents: ${(error as Error).message}`,
        'search-incidents-failed',
        { filterCount: Object.keys(filters).length, errorType: (error as Error).name }
      );
    }
  }

  /**
   * Get incident statistics for a school within a date range
   * @param schoolId - School ID to get statistics for
   * @param dateFrom - Start date for statistics period (optional)
   * @param dateTo - End date for statistics period (optional)
   * @returns Promise resolving to incident statistics
   * @throws DisciplineServiceError for statistics failures
   */
  @withRetryDecorator()
  @rateLimited('readRateLimiter')
  public async getIncidentStatistics(
    schoolId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<IncidentStatistics> {
    // Start performance measurement
    telemetryService.startMeasurement('getIncidentStatistics');
    
    // Generate cache key based on parameters
    const cacheKey = `incidents:stats:${schoolId}:${dateFrom?.toISOString() || 'all'}:${dateTo?.toISOString() || 'all'}`;
    
    try {
      // Try to get from cache first
      return await cacheService.withCache<IncidentStatistics>(
        cacheKey,
        async () => {
          const filters: IncidentSearchFilters = { schoolId };
          if (dateFrom) filters.dateFrom = dateFrom;
          if (dateTo) filters.dateTo = dateTo;

          // Fetch all incidents for the school within date range
          const allIncidents: DisciplineIncident[] = [];
          let hasMore = true;
          let lastDoc: DocumentSnapshot | undefined;

          while (hasMore) {
            const result = await this.searchIncidents(filters, 100, lastDoc);
            allIncidents.push(...result.incidents);
            hasMore = result.hasMore;
            lastDoc = result.lastDoc;
          }

          // Calculate statistics
          const statistics: IncidentStatistics = {
            totalIncidents: allIncidents.length,
            openIncidents: allIncidents.filter(i => i.status === IncidentStatus.OPEN || i.status === IncidentStatus.IN_PROGRESS).length,
            resolvedIncidents: allIncidents.filter(i => i.status === IncidentStatus.RESOLVED || i.status === IncidentStatus.CLOSED).length,
            incidentsByType: {} as Record<IncidentType, number>,
            incidentsBySeverity: {} as Record<IncidentSeverity, number>,
            followUpRequired: allIncidents.filter(i => i.followUpRequired && i.status !== IncidentStatus.CLOSED).length,
            parentNotificationPending: allIncidents.filter(i => !i.parentNotified).length,
          };

          // Initialize type and severity counters
          Object.values(IncidentType).forEach(type => {
            statistics.incidentsByType[type] = 0;
          });
          Object.values(IncidentSeverity).forEach(severity => {
            statistics.incidentsBySeverity[severity] = 0;
          });

          // Count incidents by type and severity
          allIncidents.forEach(incident => {
            statistics.incidentsByType[incident.incidentType]++;
            statistics.incidentsBySeverity[incident.severity]++;
          });
          
          // Track successful statistics retrieval
          telemetryService.trackUsage('incident_statistics_retrieved', 'DisciplineService', {
            schoolId,
            totalIncidents: statistics.totalIncidents,
            dateRange: `${dateFrom?.toISOString() || 'all'} to ${dateTo?.toISOString() || 'all'}`
          });
          
          return statistics;
        },
        10 * 60 * 1000, // 10 minute cache TTL
        CacheStrategy.CACHE_FIRST
      );
    } catch (error) {
      // Track error
      telemetryService.trackException(error as Error, {
        method: 'getIncidentStatistics',
        schoolId,
        dateRange: `${dateFrom?.toISOString() || 'all'} to ${dateTo?.toISOString() || 'all'}`
      });
      
      telemetryService.stopMeasurement('getIncidentStatistics', 'get_incident_statistics_failed');
      
      if (error instanceof DisciplineServiceError) {
        throw error;
      }
      
      if (error instanceof FirestoreError) {
        throw DisciplineServiceError.fromFirestoreError(error, 'getIncidentStatistics', {
          schoolId,
          dateRange: `${dateFrom?.toISOString() || 'all'} to ${dateTo?.toISOString() || 'all'}`
        });
      }
      
      // Log error but don't expose internal details to caller
      console.error('Error fetching incident statistics:', error);
      throw new DisciplineServiceError(
        `Failed to fetch incident statistics: ${(error as Error).message}`,
        'fetch-statistics-failed',
        { 
          schoolId, 
          dateRange: `${dateFrom?.toISOString() || 'all'} to ${dateTo?.toISOString() || 'all'}`,
          errorType: (error as Error).name 
        }
      );
    } finally {
      telemetryService.stopMeasurement('getIncidentStatistics', 'get_incident_statistics');
    }
  }

  /**
   * Get incidents requiring follow-up
   * @param schoolId - School ID to filter by
   * @param dueDate - Optional due date to filter by
   * @returns Promise resolving to array of incidents requiring follow-up
   * @throws DisciplineServiceError for fetch failures
   */
  @withRetryDecorator()
  @rateLimited('readRateLimiter')
  public async getIncidentsRequiringFollowUp(
    schoolId: string,
    dueDate?: Date
  ): Promise<DisciplineIncident[]> {
    // Start performance measurement
    telemetryService.startMeasurement('getIncidentsRequiringFollowUp');
    
    // Generate cache key based on parameters
    const cacheKey = `incidents:followup:${schoolId}:${dueDate?.toISOString() || 'all'}`;
    
    try {
      // Try to get from cache first
      return await cacheService.withCache<DisciplineIncident[]>(
        cacheKey,
        async () => {
          // Create base query for incidents requiring follow-up
          let followUpQuery = query(
            this.getCollectionRef(),
            where('schoolId', '==', schoolId),
            where('followUpRequired', '==', true),
            where('status', 'in', [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS])
          );

          // Add date filter if provided
          if (dueDate) {
            followUpQuery = query(
              followUpQuery,
              where('followUpDate', '<=', Timestamp.fromDate(dueDate))
            );
          }

          // Execute query with retry logic
          const snapshot = await this.executeQuery(followUpQuery);
          const incidents: DisciplineIncident[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            incidents.push(this.mapFirestoreToIncident(doc.id, data));
          });
          
          // Track successful retrieval
          telemetryService.trackUsage('incidents_requiring_followup_retrieved', 'DisciplineService', {
            schoolId,
            count: incidents.length,
            hasDueDate: !!dueDate
          });

          return incidents;
        },
        5 * 60 * 1000, // 5 minute cache TTL
        CacheStrategy.CACHE_FIRST
      );
    } catch (error) {
      // Track error
      telemetryService.trackException(error as Error, {
        method: 'getIncidentsRequiringFollowUp',
        schoolId,
        dueDate: dueDate?.toISOString()
      });
      
      telemetryService.stopMeasurement('getIncidentsRequiringFollowUp', 'get_incidents_requiring_followup_failed');
      
      if (error instanceof DisciplineServiceError) {
        throw error;
      }
      
      if (error instanceof FirestoreError) {
        throw DisciplineServiceError.fromFirestoreError(error, 'getIncidentsRequiringFollowUp', {
          schoolId,
          dueDate: dueDate?.toISOString()
        });
      }
      
      // Log error but don't expose internal details to caller
      console.error('Error fetching incidents requiring follow-up:', error);
      throw new DisciplineServiceError(
        `Failed to fetch incidents requiring follow-up: ${(error as Error).message}`,
        'fetch-followup-failed',
        { 
          schoolId, 
          dueDate: dueDate?.toISOString(),
          errorType: (error as Error).name 
        }
      );
    } finally {
      telemetryService.stopMeasurement('getIncidentsRequiringFollowUp', 'get_incidents_requiring_followup');
    }
  }

  /**
   * Map Firestore data to DisciplineIncident object
   * @param id - Document ID
   * @param data - Firestore document data
   * @returns DisciplineIncident object
   */
  private mapFirestoreToIncident(id: string, data: any): DisciplineIncident {
    try {
      // Validate required fields
      if (!data) {
        throw new DisciplineServiceError('Invalid incident data: data is null or undefined', 'invalid-incident-data');
      }
      
      if (!data.schoolId || !data.studentId || !data.incidentType || !data.severity || !data.status) {
        telemetryService.trackError('Missing required fields in incident data', {
          incidentId: id,
          missingFields: [
            !data.schoolId ? 'schoolId' : null,
            !data.studentId ? 'studentId' : null,
            !data.incidentType ? 'incidentType' : null,
            !data.severity ? 'severity' : null,
            !data.status ? 'status' : null
          ].filter(Boolean).join(',')
        });
      }
      
      // Handle potential missing or invalid timestamp fields
      const getDateFromTimestamp = (timestamp: any) => {
        if (!timestamp) return null;
        try {
          return timestamp.toDate ? timestamp.toDate() : null;
        } catch (error) {
          telemetryService.trackError('Invalid timestamp in incident data', {
            incidentId: id,
            error: (error as Error).message
          });
          return null;
        }
      };
      
      return {
        id,
        studentId: data.studentId || '',
        studentName: data.studentName || '',
        teacherId: data.teacherId || '',
        teacherName: data.teacherName || '',
        schoolId: data.schoolId || '',
        incidentType: data.incidentType || IncidentType.OTHER,
        severity: data.severity || IncidentSeverity.LOW,
        description: data.description || '',
        location: data.location || '',
        dateTime: getDateFromTimestamp(data.dateTime) || new Date(),
        actionTaken: data.actionTaken || '',
        followUpRequired: Boolean(data.followUpRequired),
        followUpDate: getDateFromTimestamp(data.followUpDate),
        parentNotified: Boolean(data.parentNotified),
        parentNotificationDate: getDateFromTimestamp(data.parentNotificationDate),
        status: data.status || IncidentStatus.OPEN,
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        createdAt: getDateFromTimestamp(data.createdAt) || new Date(),
        updatedAt: getDateFromTimestamp(data.updatedAt) || new Date(),
        createdBy: data.createdBy || '',
        updatedBy: data.updatedBy || '',
      };
    } catch (error) {
      telemetryService.trackException(error as Error, {
        method: 'mapFirestoreToIncident',
        incidentId: id
      });
      throw new DisciplineServiceError(
        `Failed to map Firestore data to incident: ${(error as Error).message}`,
        'mapping-failed',
        {
          incidentId: id,
          errorType: (error as Error).name,
          hasData: !!data,
          dataFields: data ? Object.keys(data).join(',') : 'none'
        }
      );
    }
  }
}

/**
 * Custom error class for discipline service-related errors
 */
export class DisciplineServiceError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;

  /**
   * Creates a new DisciplineServiceError
   * @param message - Error message
   * @param code - Error code for categorization
   * @param context - Additional context for debugging
   */
  constructor(message: string, code: string = 'unknown-error', context?: Record<string, any>) {
    super(message);
    this.name = 'DisciplineServiceError';
    this.code = code;
    this.context = context;
    
    // Log the error to telemetry if service is available
    if (typeof telemetryService !== 'undefined') {
      telemetryService.trackError('DisciplineServiceError', {
        errorCode: this.code,
        errorMessage: this.message,
        ...this.context
      });
    }
  }

  /**
   * Creates an error from a FirestoreError
   * @param error - Original Firestore error
   * @param operation - The operation that was being performed
   * @param context - Additional context
   * @returns DisciplineServiceError
   */
  static fromFirestoreError(error: FirestoreError, operation: string, context?: Record<string, any>): DisciplineServiceError {
    const errorCode = `firestore-${error.code}`;
    const message = `Firestore error during ${operation}: ${error.message}`;
    return new DisciplineServiceError(message, errorCode, {
      operation,
      firestoreCode: error.code,
      ...context
    });
  }
}

/**
 * Export singleton instance for easy access
 */
export const disciplineService = DisciplineService.getInstance();

/**
 * Export types and enums for external use
 */
export type {
  DisciplineIncident,
  IncidentSearchFilters,
  PaginatedIncidents,
  IncidentStatistics,
};