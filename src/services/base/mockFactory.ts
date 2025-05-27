/**
 * Mock Factory for MCC Discipline Tracker
 * 
 * This service provides mock data factories for testing.
 * It implements factory methods for creating mock data for different entities.
 * 
 * @fileoverview Mock data factory for testing
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import { Collections } from '../../config/firebaseConfig';

/**
 * User role enum
 */
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STAFF = 'staff',
}

/**
 * User profile interface
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  schoolId?: string;
  metadata?: Record<string, any>;
}

/**
 * Incident type enum
 */
export enum IncidentType {
  BEHAVIORAL = 'behavioral',
  ACADEMIC = 'academic',
  ATTENDANCE = 'attendance',
}

/**
 * Incident severity enum
 */
export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Incident status enum
 */
export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * Discipline incident interface
 */
export interface DisciplineIncident {
  id: string;
  studentId: string;
  reporterId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  location?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  witnesses?: string[];
  attachments?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Mock factory singleton
 */
export class MockFactory {
  private static instance: MockFactory;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockFactory {
    if (!MockFactory.instance) {
      MockFactory.instance = new MockFactory();
    }
    return MockFactory.instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}
  
  /**
   * Create mock user profile
   * @param overrides - Optional property overrides
   * @returns Mock user profile
   */
  public createUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    const id = overrides.id || this.generateId();
    
    return {
      id,
      email: overrides.email || `user_${id}@example.com`,
      displayName: overrides.displayName || `User ${id}`,
      role: overrides.role || UserRole.TEACHER,
      photoURL: overrides.photoURL,
      createdAt: overrides.createdAt || new Date(),
      lastLogin: overrides.lastLogin,
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      schoolId: overrides.schoolId,
      metadata: overrides.metadata,
    };
  }
  
  /**
   * Create multiple mock user profiles
   * @param count - Number of profiles to create
   * @param baseOverrides - Base property overrides for all profiles
   * @returns Array of mock user profiles
   */
  public createUserProfiles(
    count: number,
    baseOverrides: Partial<UserProfile> = {}
  ): UserProfile[] {
    const profiles: UserProfile[] = [];
    
    for (let i = 0; i < count; i++) {
      profiles.push(this.createUserProfile({
        ...baseOverrides,
        id: baseOverrides.id || `user_${this.generateId()}`,
      }));
    }
    
    return profiles;
  }
  
  /**
   * Create mock discipline incident
   * @param overrides - Optional property overrides
   * @returns Mock discipline incident
   */
  public createDisciplineIncident(overrides: Partial<DisciplineIncident> = {}): DisciplineIncident {
    const id = overrides.id || this.generateId();
    const now = new Date();
    
    return {
      id,
      studentId: overrides.studentId || `student_${this.generateId()}`,
      reporterId: overrides.reporterId || `reporter_${this.generateId()}`,
      type: overrides.type || IncidentType.BEHAVIORAL,
      severity: overrides.severity || IncidentSeverity.MEDIUM,
      status: overrides.status || IncidentStatus.OPEN,
      description: overrides.description || `Incident description ${id}`,
      location: overrides.location,
      date: overrides.date || now,
      createdAt: overrides.createdAt || now,
      updatedAt: overrides.updatedAt || now,
      resolvedAt: overrides.resolvedAt,
      resolution: overrides.resolution,
      witnesses: overrides.witnesses,
      attachments: overrides.attachments,
      tags: overrides.tags,
      metadata: overrides.metadata,
    };
  }
  
  /**
   * Create multiple mock discipline incidents
   * @param count - Number of incidents to create
   * @param baseOverrides - Base property overrides for all incidents
   * @returns Array of mock discipline incidents
   */
  public createDisciplineIncidents(
    count: number,
    baseOverrides: Partial<DisciplineIncident> = {}
  ): DisciplineIncident[] {
    const incidents: DisciplineIncident[] = [];
    
    for (let i = 0; i < count; i++) {
      incidents.push(this.createDisciplineIncident({
        ...baseOverrides,
        id: baseOverrides.id || `incident_${this.generateId()}`,
      }));
    }
    
    return incidents;
  }
  
  /**
   * Create mock Firestore document data for user profile
   * @param profile - User profile
   * @returns Firestore document data
   */
  public createUserProfileFirestoreData(profile: UserProfile): Record<string, any> {
    return {
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      photoURL: profile.photoURL || null,
      createdAt: profile.createdAt,
      lastLogin: profile.lastLogin || null,
      isActive: profile.isActive,
      schoolId: profile.schoolId || null,
      metadata: profile.metadata || {},
    };
  }
  
  /**
   * Create mock Firestore document data for discipline incident
   * @param incident - Discipline incident
   * @returns Firestore document data
   */
  public createDisciplineIncidentFirestoreData(incident: DisciplineIncident): Record<string, any> {
    return {
      studentId: incident.studentId,
      reporterId: incident.reporterId,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      description: incident.description,
      location: incident.location || null,
      date: incident.date,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      resolvedAt: incident.resolvedAt || null,
      resolution: incident.resolution || null,
      witnesses: incident.witnesses || [],
      attachments: incident.attachments || [],
      tags: incident.tags || [],
      metadata: incident.metadata || {},
    };
  }
  
  /**
   * Create mock Firestore document snapshot
   * @param collection - Collection name
   * @param id - Document ID
   * @param data - Document data
   * @returns Mock document snapshot
   */
  public createDocumentSnapshot(
    collection: Collections,
    id: string,
    data: Record<string, any>
  ): any {
    return {
      id,
      ref: {
        id,
        path: `${collection}/${id}`,
        parent: {
          id: collection,
          path: collection,
        },
      },
      data: () => data,
      exists: () => true,
      get: (field: string) => data[field],
    };
  }
  
  /**
   * Create mock Firestore query snapshot
   * @param collection - Collection name
   * @param documents - Document snapshots
   * @returns Mock query snapshot
   */
  public createQuerySnapshot(
    collection: Collections,
    documents: any[]
  ): any {
    return {
      docs: documents,
      size: documents.length,
      empty: documents.length === 0,
      forEach: (callback: (doc: any) => void) => {
        documents.forEach(callback);
      },
      map: <T>(callback: (doc: any) => T) => {
        return documents.map(callback);
      },
    };
  }
  
  /**
   * Generate unique ID
   * @returns Unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Export singleton instance
export const mockFactory = MockFactory.getInstance();