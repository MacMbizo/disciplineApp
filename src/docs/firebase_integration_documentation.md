# Firebase Integration Documentation

## Overview

This document provides comprehensive documentation for the Firebase integration in the MCC Discipline Tracker application. Firebase provides the backend infrastructure for authentication, database, and storage needs of the application.

## Firebase Configuration

The application uses Firebase for several core functionalities:

1. **Authentication** - User authentication and session management
2. **Firestore** - NoSQL database for storing application data
3. **Storage** - File storage for attachments and media
4. **Offline Support** - Data persistence for offline functionality

### Configuration Setup

The Firebase configuration is centralized in `firebaseConfig.ts`, which initializes all Firebase services and exports them for use throughout the application.

```typescript
// Key components of firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Firebase configuration object
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Set persistence to local for offline support
setPersistence(auth, browserLocalPersistence);

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  console.error('Firestore persistence error:', err);
});

// Export initialized services
export { app, auth, db };
```

### Environment Variables

Firebase configuration uses environment variables to keep sensitive information secure. These variables should be set in the appropriate `.env` file:

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

## Authentication Integration

The application uses Firebase Authentication for user management, with the following features:

1. **Email/Password Authentication** - Primary authentication method
2. **Persistent Sessions** - Using AsyncStorage/IndexedDB for session persistence
3. **Role-Based Access Control** - Custom claims for user roles
4. **Authentication State Listener** - Real-time auth state monitoring

### Authentication Service

The `AuthService` class in `authService.ts` encapsulates all authentication-related functionality:

```typescript
// Key components of AuthService
import { auth, db } from '../firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';

class AuthService {
  private static instance: AuthService;
  private authStateListeners: Array<(user: UserData | null) => void> = [];
  
  // Singleton pattern
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  // Initialize auth state listener
  public initializeAuthStateListener(): void {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get additional user data from Firestore
        const userData = await this.getUserData(user.uid);
        // Notify all listeners
        this.notifyAuthStateListeners(userData);
      } else {
        // Notify listeners of logout
        this.notifyAuthStateListeners(null);
      }
    });
  }
  
  // Sign in method
  public async signIn(email: string, password: string): Promise<UserData> {
    try {
      // Validate inputs
      validationService.validateEmail(email);
      validationService.validatePassword(password);
      
      // Check rate limiting
      rateLimitUtils.checkRateLimit('signIn', email);
      
      // Track sign in attempt
      telemetryService.trackEvent('auth_sign_in_attempt', { email });
      
      // Sign in with Firebase
      const userCredential = await retryUtils.withRetry(() => 
        signInWithEmailAndPassword(auth, email, password)
      );
      
      // Get additional user data
      const userData = await this.getUserData(userCredential.user.uid);
      
      // Track successful sign in
      telemetryService.trackEvent('auth_sign_in_success', { uid: userData.uid });
      
      return userData;
    } catch (error) {
      // Track failed sign in
      telemetryService.trackError('auth_sign_in_error', error);
      throw new AuthenticationError('Sign in failed', error);
    }
  }
  
  // Additional auth methods...
}
```

### Authentication State Management

The application uses a React Context to manage authentication state throughout the application:

```typescript
// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChanged((userData) => {
      setUser(userData);
      setLoading(false);
    });
    
    // Initialize auth state listener
    authService.initializeAuthStateListener();
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);
  
  // Auth context value
  const value = {
    user,
    loading,
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    resetPassword: authService.resetPassword.bind(authService),
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

## Firestore Database Integration

The application uses Firestore for data storage with the following features:

1. **Collection Structure** - Organized data collections
2. **Query Optimization** - Efficient querying with indexes
3. **Offline Persistence** - Data available offline
4. **Batch Operations** - Atomic updates for data integrity

### Collection Structure

The Firestore database is organized into the following collections:

| Collection | Description | Key Fields |
|------------|-------------|------------|
| `users` | User profiles | uid, email, displayName, role, schoolId |
| `schools` | School information | name, address, district, principal |
| `incidents` | Discipline incidents | studentId, teacherId, type, severity, date |
| `students` | Student information | name, grade, schoolId, guardianInfo |
| `teachers` | Teacher information | name, subjects, schoolId, classrooms |
| `notifications` | System notifications | userId, type, message, read, date |

### Service Integration

Each service integrates with Firestore for its specific data needs. For example, the `DisciplineService` handles incident data:

```typescript
// Key components of DisciplineService
import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from 'firebase/firestore';

class DisciplineService {
  private static instance: DisciplineService;
  private incidentsCollection = collection(db, 'incidents');
  
  // Singleton pattern
  public static getInstance(): DisciplineService {
    if (!DisciplineService.instance) {
      DisciplineService.instance = new DisciplineService();
    }
    return DisciplineService.instance;
  }
  
  // Create incident
  public async createIncident(incident: DisciplineIncident): Promise<DisciplineIncident> {
    try {
      // Validate incident data
      this.validateIncident(incident);
      
      // Add timestamp fields
      const now = new Date();
      const incidentWithTimestamps = {
        ...incident,
        createdAt: now,
        updatedAt: now,
      };
      
      // Add to Firestore
      const docRef = await addDoc(this.incidentsCollection, incidentWithTimestamps);
      
      // Return with ID
      return {
        ...incidentWithTimestamps,
        id: docRef.id,
      };
    } catch (error) {
      throw new DisciplineServiceError('Failed to create incident', error);
    }
  }
  
  // Additional methods for CRUD operations...
}
```

### Offline Support

The application implements offline support using Firestore's IndexedDB persistence:

```typescript
// In firebaseConfig.ts
import { enableIndexedDbPersistence } from 'firebase/firestore';

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support persistence
    console.warn('Persistence not supported by browser');
  }
});
```

### Caching Strategy

The application implements a multi-level caching strategy:

1. **Firestore Cache** - Automatic caching by Firestore
2. **Application Cache** - Custom caching layer in `CacheService`
3. **Memory Cache** - In-memory cache for frequently accessed data

```typescript
// CacheService implementation
class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, { data: any; expiry: number }> = new Map();
  
  // Singleton pattern
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
  
  // Set cache item
  public async set(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    const expiry = Date.now() + (ttlSeconds * 1000);
    
    // Store in memory cache
    this.memoryCache.set(key, { data, expiry });
    
    // Store in persistent storage
    try {
      await AsyncStorage.setItem(
        `cache_${key}`,
        JSON.stringify({ data, expiry })
      );
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }
  
  // Get cache item
  public async get(key: string): Promise<any | null> {
    // Try memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && memoryItem.expiry > Date.now()) {
      return memoryItem.data;
    }
    
    // Try persistent storage
    try {
      const storedItem = await AsyncStorage.getItem(`cache_${key}`);
      if (storedItem) {
        const parsedItem = JSON.parse(storedItem);
        if (parsedItem.expiry > Date.now()) {
          // Refresh memory cache
          this.memoryCache.set(key, parsedItem);
          return parsedItem.data;
        }
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
    
    return null;
  }
  
  // Additional cache methods...
}
```

## Security Rules

Firebase security rules protect the database and ensure proper access control:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isPrincipal() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'principal';
    }
    
    function isTeacher() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    
    function belongsToSameSchool(resourceId) {
      let userSchoolId = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.schoolId;
      let resourceSchoolId = get(/databases/$(database)/documents/$(resourceId)).data.schoolId;
      return userSchoolId == resourceSchoolId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow create: if isAdmin();
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Schools collection
    match /schools/{schoolId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Incidents collection
    match /incidents/{incidentId} {
      allow read: if isAuthenticated() && 
        (isAdmin() || isPrincipal() || 
         (isTeacher() && belongsToSameSchool(incidentId)));
      allow create: if isAuthenticated() && (isTeacher() || isAdmin() || isPrincipal());
      allow update: if isAuthenticated() && 
        (isAdmin() || isPrincipal() || 
         (isTeacher() && resource.data.teacherId == request.auth.uid));
      allow delete: if isAdmin() || isPrincipal();
    }
    
    // Additional collection rules...
  }
}
```

## Proof of Concept Examples

The application includes proof-of-concept examples demonstrating Firebase integration:

### Authentication POC

The `FirebaseAuthPOC.tsx` component demonstrates authentication flows:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const FirebaseAuthPOC: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({
            ...firebaseUser,
            ...userDoc.data(),
          });
        } else {
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Sign in handler
  const handleSignIn = async () => {
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  // Sign up handler
  const handleSignUp = async () => {
    try {
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName,
        role: 'teacher', // Default role
        schoolId: 'school-123', // Default school
        createdAt: new Date(),
      });
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  // Component rendering...
};
```

### Navigation with Auth POC

The `NavigationWithAuthPOC.tsx` component demonstrates role-based navigation:

```typescript
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Stack navigator
const Stack = createStackNavigator();

// Auth context
const AuthContext = React.createContext<any>(null);

// Navigation component
const NavigationWithAuthPOC: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({
            ...firebaseUser,
            ...userDoc.data(),
          });
        } else {
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Show loading screen
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <AuthContext.Provider value={{ user }}>
      <NavigationContainer>
        <Stack.Navigator>
          {user ? (
            // Authenticated routes based on role
            user.role === 'admin' ? (
              // Admin routes
              <>
                <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
                <Stack.Screen name="UserManagement" component={UserManagement} />
                <Stack.Screen name="SchoolSettings" component={SchoolSettings} />
              </>
            ) : user.role === 'teacher' ? (
              // Teacher routes
              <>
                <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
                <Stack.Screen name="RecordIncident" component={RecordIncident} />
                <Stack.Screen name="StudentList" component={StudentList} />
              </>
            ) : (
              // Default authenticated routes
              <Stack.Screen name="Dashboard" component={Dashboard} />
            )
          ) : (
            // Unauthenticated routes
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
};
```

## Best Practices

### Security

1. **Environment Variables** - Store Firebase configuration in environment variables
2. **Security Rules** - Implement comprehensive Firestore security rules
3. **Authentication** - Use Firebase Authentication for secure user management
4. **Data Validation** - Validate all data before writing to Firestore

### Performance

1. **Query Optimization** - Use indexes for frequently queried fields
2. **Batch Operations** - Use batch writes for multiple document updates
3. **Document Size** - Keep documents small and focused
4. **Caching** - Implement appropriate caching strategies

### Offline Support

1. **Persistence** - Enable IndexedDB persistence for offline data
2. **Conflict Resolution** - Implement strategies for handling conflicts
3. **UI Feedback** - Provide clear feedback for offline status
4. **Sync Status** - Track and display synchronization status

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check Firebase console for authentication settings
   - Verify email/password requirements
   - Check network connectivity

2. **Firestore Access Denied**
   - Review security rules
   - Check user authentication state
   - Verify user roles and permissions

3. **Offline Sync Issues**
   - Check IndexedDB support in browser
   - Verify persistence is enabled
   - Check for multiple tabs (persistence limitation)

### Debugging

1. **Firebase Console** - Use Firebase console for monitoring and debugging
2. **Authentication State** - Log authentication state changes
3. **Firestore Operations** - Log Firestore operations and errors
4. **Network Status** - Monitor and log network connectivity

## Conclusion

This documentation provides a comprehensive reference for the Firebase integration in the MCC Discipline Tracker application. Developers should follow the patterns and best practices outlined in this document when working with Firebase services in the application.