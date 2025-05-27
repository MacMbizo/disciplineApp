# MCC Discipline Tracker - Service Layer Standardization Patterns

## Overview

This document defines standardized patterns for implementing service layers in the MCC Discipline Tracker application. Following these patterns ensures consistency, maintainability, and testability across all services.

## Service Layer Architecture

```
Application
├── UI Components
│   └── Screens
├── State Management
│   ├── Context API (Auth, Theme)
│   └── Redux (Complex State)
├── Service Layer ← This document focuses here
│   ├── API Services
│   ├── Firebase Services
│   └── Utility Services
└── External Dependencies
    ├── Firebase
    ├── Local Storage
    └── Other APIs
```

## Core Service Principles

1. **Single Responsibility**: Each service should focus on a specific domain (auth, incidents, students, etc.)
2. **Abstraction**: Services should abstract implementation details from consumers
3. **Testability**: Services should be designed for easy mocking and testing
4. **Error Handling**: Consistent error handling patterns across all services
5. **Type Safety**: Comprehensive TypeScript interfaces for all service inputs/outputs

## Standard Service Structure

### File Organization

```typescript
// src/services/[domainName]Service.ts

// 1. Imports
import { firebase } from '../config/firebaseConfig';
import { ServiceError } from '../types/errors';
import { DomainType, DomainResponseType } from '../types/domain';

// 2. Types & Interfaces
interface ServiceOptions {
  // Service-specific options
}

// 3. Constants
const COLLECTION_NAME = 'collectionName';

// 4. Helper Functions (private)
const mapFirebaseData = (doc: any): DomainType => {
  // Transform Firestore data to domain model
};

// 5. Service Methods
export const serviceMethod = async (params: any): Promise<DomainResponseType> => {
  try {
    // Implementation
    return result;
  } catch (error) {
    // Error handling
    throw new ServiceError('Error message', error);
  }
};

// 6. Export default object with all methods
export default {
  serviceMethod,
  // Other methods
};
```

## Firebase Interaction Patterns

### Authentication Service Pattern

```typescript
// src/services/authService.ts

import { firebase } from '../config/firebaseConfig';
import { User, AuthError } from '../types/auth';

// Map Firebase user to our User model
const mapUserData = (user: firebase.User): User => {
  return {
    id: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    emailVerified: user.emailVerified,
    // Add custom claims or additional data
  };
};

// Login with email/password
export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const result = await firebase.auth().signInWithEmailAndPassword(email, password);
    if (!result.user) throw new AuthError('User not found after login');
    
    // Get additional user data from Firestore if needed
    const userDoc = await firebase.firestore()
      .collection('users')
      .doc(result.user.uid)
      .get();
      
    return {
      ...mapUserData(result.user),
      role: userDoc.data()?.role || 'student',
      // Other custom fields
    };
  } catch (error) {
    throw new AuthError(getAuthErrorMessage(error), error);
  }
};

// Helper to get user-friendly error messages
const getAuthErrorMessage = (error: any): string => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No user found with this email address';
    case 'auth/wrong-password':
      return 'Incorrect password';
    // Other cases
    default:
      return error.message || 'Authentication failed';
  }
};
```

### Firestore Data Service Pattern

```typescript
// src/services/incidentService.ts

import { firebase } from '../config/firebaseConfig';
import { Incident, NewIncident } from '../types/incidents';
import { ServiceError } from '../types/errors';

const COLLECTION = 'incidents';

// Map Firestore document to Incident model
const mapIncident = (doc: firebase.firestore.DocumentSnapshot): Incident => {
  const data = doc.data();
  if (!data) throw new ServiceError('Incident data not found');
  
  return {
    id: doc.id,
    studentId: data.studentId,
    teacherId: data.teacherId,
    type: data.type,
    description: data.description,
    severity: data.severity,
    timestamp: data.timestamp?.toDate() || new Date(),
    location: data.location,
    witnesses: data.witnesses || [],
    attachments: data.attachments || [],
    status: data.status || 'pending',
  };
};

// Add new incident
export const addIncident = async (incident: NewIncident): Promise<Incident> => {
  try {
    // Validate incident data
    if (!incident.studentId || !incident.type) {
      throw new ServiceError('Missing required incident fields');
    }
    
    // Add server timestamp
    const incidentWithTimestamp = {
      ...incident,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
    };
    
    // Add to Firestore
    const docRef = await firebase.firestore()
      .collection(COLLECTION)
      .add(incidentWithTimestamp);
      
    // Get the created document
    const doc = await docRef.get();
    return mapIncident(doc);
  } catch (error) {
    throw new ServiceError('Failed to add incident', error);
  }
};

// Get incidents by teacher
export const getIncidentsByTeacher = async (teacherId: string): Promise<Incident[]> => {
  try {
    const snapshot = await firebase.firestore()
      .collection(COLLECTION)
      .where('teacherId', '==', teacherId)
      .orderBy('timestamp', 'desc')
      .get();
      
    return snapshot.docs.map(mapIncident);
  } catch (error) {
    throw new ServiceError('Failed to get teacher incidents', error);
  }
};
```

## Error Handling Pattern

```typescript
// src/types/errors.ts

// Base error class
export class ServiceError extends Error {
  originalError?: any;
  code?: string;
  
  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'ServiceError';
    this.originalError = originalError;
    
    // Extract error code if available
    if (originalError?.code) {
      this.code = originalError.code;
    }
  }
}

// Specialized error types
export class AuthError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'AuthError';
  }
}

export class NetworkError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ServiceError {
  validationErrors: Record<string, string>;
  
  constructor(message: string, validationErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}
```

## Data Transformation Utilities

```typescript
// src/utils/dataTransformers.ts

// Convert Firestore timestamp to Date
export const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
};

// Format date for display
export const formatDate = (date: Date, format: string = 'short'): string => {
  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'long':
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    case 'relative':
      // Implement relative time formatting (e.g., "2 hours ago")
      return getRelativeTimeString(date);
    default:
      return date.toISOString();
  }
};

// Helper for relative time
const getRelativeTimeString = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay < 30) return `${diffDay} days ago`;
  
  return formatDate(date, 'short');
};
```

## Testing Service Layers

```typescript
// src/services/__tests__/incidentService.test.ts

import { addIncident, getIncidentsByTeacher } from '../incidentService';
import { firebase } from '../../config/firebaseConfig';

// Mock Firebase
jest.mock('../../config/firebaseConfig', () => {
  return {
    firebase: {
      firestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        add: jest.fn(),
        get: jest.fn(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
      }),
      FieldValue: {
        serverTimestamp: jest.fn(),
      },
    },
  };
});

describe('incidentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('addIncident', () => {
    it('should add a new incident', async () => {
      // Mock implementation
      const mockDocRef = {
        get: jest.fn().mockResolvedValue({
          id: 'incident-123',
          data: () => ({
            studentId: 'student-1',
            teacherId: 'teacher-1',
            type: 'disruption',
            description: 'Test incident',
            severity: 'medium',
            timestamp: { toDate: () => new Date() },
          }),
        }),
      };
      
      firebase.firestore().collection().add.mockResolvedValue(mockDocRef);
      
      // Test the service
      const newIncident = {
        studentId: 'student-1',
        teacherId: 'teacher-1',
        type: 'disruption',
        description: 'Test incident',
        severity: 'medium',
      };
      
      const result = await addIncident(newIncident);
      
      // Assertions
      expect(firebase.firestore().collection).toHaveBeenCalledWith('incidents');
      expect(firebase.firestore().collection().add).toHaveBeenCalled();
      expect(result.id).toBe('incident-123');
      expect(result.studentId).toBe('student-1');
    });
  });
});
```

## Service Integration with UI Components

```typescript
// Example of a screen using services

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { getIncidentsByTeacher } from '../services/incidentService';
import { useAuth } from '../contexts/AuthContext';
import { IncidentCard, LoadingIndicator, ErrorMessage } from '../components';

const TeacherIncidentsScreen = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  useEffect(() => {
    const loadIncidents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const teacherIncidents = await getIncidentsByTeacher(user.id);
        setIncidents(teacherIncidents);
      } catch (err) {
        setError(err.message || 'Failed to load incidents');
      } finally {
        setLoading(false);
      }
    };
    
    loadIncidents();
  }, [user.id]);
  
  if (loading) return <LoadingIndicator />;
  if (error) return <ErrorMessage message={error} onRetry={() => loadIncidents()} />;
  
  return (
    <View>
      <Text>My Reported Incidents</Text>
      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IncidentCard incident={item} />}
        ListEmptyComponent={<Text>No incidents reported yet</Text>}
      />
    </View>
  );
};
```

## Service Layer Best Practices

1. **Keep Services Pure**: Services should focus on data operations without UI logic
2. **Consistent Naming**: Use consistent method naming across services (e.g., `getX`, `addX`, `updateX`, `deleteX`)
3. **Error Boundaries**: Handle all potential errors and provide meaningful error messages
4. **Caching Strategy**: Implement appropriate caching for frequently accessed data
5. **Batch Operations**: Support batch operations for better performance
6. **Offline Support**: Design services with offline-first approach where appropriate
7. **Pagination**: Implement pagination for large data sets
8. **Logging**: Add appropriate logging for debugging and monitoring
9. **Rate Limiting**: Implement rate limiting for API calls
10. **Retry Logic**: Add retry logic for transient failures

## Service Implementation Checklist

- [ ] Service has clear single responsibility
- [ ] All methods have proper TypeScript types
- [ ] Error handling is consistent with service layer patterns
- [ ] Data transformations are handled properly
- [ ] Service is testable with unit tests
- [ ] Documentation is complete with JSDoc comments
- [ ] Performance considerations are addressed
- [ ] Offline support is implemented if required