/**
 * Firebase Configuration for MCC Discipline Tracker
 * 
 * This file configures Firebase SDK for Expo managed workflow.
 * Includes authentication and Firestore database setup.
 * 
 * @fileoverview Firebase configuration and initialization
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Firebase configuration object
 * These values should be replaced with your actual Firebase project configuration
 * For production, consider using environment variables or Expo Constants
 */
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  // Optional: measurementId for Google Analytics
  // measurementId: "your-measurement-id"
};

/**
 * Initialize Firebase app
 * Prevents multiple initialization in development with hot reloading
 */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Initialize Firebase Authentication with AsyncStorage persistence
 * This ensures authentication state persists across app restarts
 */
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If auth is already initialized, get the existing instance
  auth = getAuth(app);
}

/**
 * Initialize Firestore database
 */
const db = getFirestore(app);

/**
 * Enable offline persistence for Firestore
 * This allows the app to work offline and sync when back online
 */
enableMultiTabIndexedDbPersistence(db)
  .catch((err) => {
    console.error('Firebase persistence error:', err);
    // If we can't enable persistence, it will still work but offline support will be limited
  });

/**
 * Development configuration
 * Uncomment the following lines to use Firestore emulator in development
 */
// if (__DEV__) {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//   } catch (error) {
//     console.log('Firestore emulator connection failed:', error);
//   }
// }

/**
 * Export Firebase services for use throughout the application
 */
export { app, auth, db };

/**
 * Export Firebase configuration for reference
 */
export { firebaseConfig };

/**
 * Type definitions for Firebase user data
 */
export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: 'teacher' | 'admin' | 'principal';
  schoolId?: string;
  createdAt?: Date;
  lastLoginAt?: Date;
}

/**
 * Helper function to map Firebase user to UserData interface
 * @param user - Firebase User object
 * @returns UserData object with essential user information
 */
export const mapUserData = (user: any): UserData => {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    // Additional fields will be fetched from Firestore user profile
  };
};

/**
 * Firebase error codes for better error handling
 */
export const FirebaseErrorCodes = {
  AUTH: {
    USER_NOT_FOUND: 'auth/user-not-found',
    WRONG_PASSWORD: 'auth/wrong-password',
    EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
    WEAK_PASSWORD: 'auth/weak-password',
    INVALID_EMAIL: 'auth/invalid-email',
    NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
  },
  FIRESTORE: {
    PERMISSION_DENIED: 'permission-denied',
    NOT_FOUND: 'not-found',
    ALREADY_EXISTS: 'already-exists',
    RESOURCE_EXHAUSTED: 'resource-exhausted',
    UNAUTHENTICATED: 'unauthenticated',
  }
} as const;

/**
 * Firestore collection names
 */
export enum Collections {
  USERS = 'users',
  INCIDENTS = 'incidents',
  SCHOOLS = 'schools',
  STUDENTS = 'students',
}

/**
 * Firebase initialization status
 */
export const isFirebaseInitialized = () => {
  return getApps().length > 0;
};

console.log('Firebase initialized successfully:', isFirebaseInitialized());