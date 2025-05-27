/**
 * Authentication Service for MCC Discipline Tracker
 * 
 * This service handles all authentication-related operations including
 * user login, logout, registration, and authentication state management.
 * Follows the established service layer pattern with comprehensive error handling.
 * 
 * @fileoverview Authentication service with Firebase integration
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  AuthError,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, Collections, FirebaseErrorCodes, UserData, mapUserData } from '../config/firebaseConfig';
import { withRetry, DEFAULT_RETRY_OPTIONS } from './base/retryUtils';
import { ValidationService } from './base/validationService';
import { ServiceRegistry } from './base/serviceRegistry';
import { CacheService } from './base/cacheService';
import { firebaseRateLimiters } from './base/rateLimitUtils';
import { TelemetryService, EventType } from './base/telemetryService';

/**
 * Authentication service class providing comprehensive user authentication functionality
 */
export class AuthService {
  private static instance: AuthService;
  private authStateListeners: ((user: UserData | null) => void)[] = [];
  private validationService: ValidationService;
  private cacheService: CacheService;
  private telemetryService: TelemetryService;
  
  /**
   * Singleton pattern implementation
   * @returns AuthService instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private constructor() {
    // Get dependencies from service registry
    this.validationService = ServiceRegistry.getInstance().getService('ValidationService') as ValidationService;
    this.cacheService = ServiceRegistry.getInstance().getService('CacheService') as CacheService;
    this.telemetryService = ServiceRegistry.getInstance().getService('TelemetryService') as TelemetryService;
    
    this.initializeAuthStateListener();
  }

  /**
   * Initialize authentication state listener
   * Monitors authentication state changes and notifies subscribers
   */
  private initializeAuthStateListener(): void {
    onAuthStateChanged(auth, async (firebaseUser) => {
      let userData: UserData | null = null;
      
      if (firebaseUser) {
        try {
          userData = await this.fetchUserProfile(firebaseUser);
          // Update last login timestamp
          await this.updateLastLogin(firebaseUser.uid);
          
          // Track successful authentication
          this.telemetryService.trackEvent({
            type: EventType.AUTH,
            name: 'auth_state_changed',
            properties: {
              userId: firebaseUser.uid,
              authenticated: true,
            },
          });
        } catch (error) {
          console.error('Error fetching user profile:', error);
          userData = mapUserData(firebaseUser);
          
          // Track error
          this.telemetryService.trackError({
            name: 'auth_profile_fetch_error',
            message: 'Error fetching user profile during auth state change',
            stack: error instanceof Error ? error.stack : undefined,
            properties: {
              userId: firebaseUser.uid,
            },
          });
        }
      } else {
        // Track sign out
        this.telemetryService.trackEvent({
          type: EventType.AUTH,
          name: 'auth_state_changed',
          properties: {
            authenticated: false,
          },
        });
      }

      // Notify all listeners
      this.authStateListeners.forEach(listener => listener(userData));
    });
  }

  /**
   * Subscribe to authentication state changes
   * @param callback - Function to call when auth state changes
   * @returns Unsubscribe function
   */
  public subscribeToAuthChanges(callback: (user: UserData | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Legacy method for backward compatibility
   * @deprecated Use subscribeToAuthChanges instead
   */
  public onAuthStateChange(callback: (user: UserData | null) => void): () => void {
    return this.subscribeToAuthChanges(callback);
  }

  /**
   * Sign in user with email and password
   * @param email - User email address
   * @param password - User password
   * @returns Promise resolving to UserData
   * @throws AuthenticationError for authentication failures
   */
  public async signIn(email: string, password: string): Promise<UserData> {
    try {
      // Validate input
      const validationResult = this.validationService.validateLoginCredentials({ email, password });
      if (!validationResult.isValid) {
        throw new AuthenticationError(
          validationResult.errors[0].message,
          'validation-error'
        );
      }
      
      // Check rate limiting
      if (!firebaseRateLimiters.auth.isAllowed({ operation: 'signIn' })) {
        throw new AuthenticationError(
          'Too many sign-in attempts. Please try again later.',
          'rate-limit-exceeded'
        );
      }
      
      // Track sign in attempt
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'sign_in_attempt',
        properties: { email },
      });
      
      // Use retry logic for the sign in operation
      const userCredential = await withRetry(
        () => signInWithEmailAndPassword(auth, email, password),
        {
          maxRetries: 2,
          onRetry: (error, attempt) => {
            console.log(`Retrying sign in (attempt ${attempt})...`);
            this.telemetryService.trackEvent({
              type: EventType.AUTH,
              name: 'sign_in_retry',
              properties: { email, attempt },
            });
          },
        }
      );
      
      const userData = await this.fetchUserProfile(userCredential.user);
      
      // Track successful sign in
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'sign_in_success',
        properties: { email, userId: userData.uid },
      });
      
      console.log('User signed in successfully:', userData.email);
      return userData;
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Track sign in error
      this.telemetryService.trackError({
        name: 'sign_in_error',
        message: error instanceof Error ? error.message : 'Unknown sign in error',
        stack: error instanceof Error ? error.stack : undefined,
        properties: { email },
      });
      
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Create new user account
   * @param email - User email address
   * @param password - User password
   * @param displayName - User display name
   * @param role - User role (teacher, admin, principal)
   * @param schoolId - School identifier
   * @returns Promise resolving to UserData
   * @throws AuthenticationError for registration failures
   */
  public async signUp(
    email: string,
    password: string,
    displayName: string,
    role: 'teacher' | 'admin' | 'principal',
    schoolId: string
  ): Promise<UserData> {
    try {
      // Validate input
      const validationResult = this.validationService.validateSignUpData({
        email,
        password,
        displayName,
        role,
        schoolId,
      });
      
      if (!validationResult.isValid) {
        throw new AuthenticationError(
          validationResult.errors[0].message,
          'validation-error'
        );
      }
      
      // Check rate limiting
      if (!firebaseRateLimiters.auth.isAllowed({ operation: 'signUp' })) {
        throw new AuthenticationError(
          'Too many sign-up attempts. Please try again later.',
          'rate-limit-exceeded'
        );
      }
      
      // Track sign up attempt
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'sign_up_attempt',
        properties: { email, role },
      });
      
      // Use retry logic for the sign up operation
      const userCredential = await withRetry(
        () => createUserWithEmailAndPassword(auth, email, password),
        {
          maxRetries: 2,
          onRetry: (error, attempt) => {
            console.log(`Retrying sign up (attempt ${attempt})...`);
            this.telemetryService.trackEvent({
              type: EventType.AUTH,
              name: 'sign_up_retry',
              properties: { email, attempt },
            });
          },
        }
      );
      
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, { displayName });

      // Create user profile in Firestore
      const userData: UserData = {
        uid: user.uid,
        email: user.email,
        displayName,
        role,
        schoolId,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await this.createUserProfile(userData);
      
      // Track successful sign up
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'sign_up_success',
        properties: { email, userId: userData.uid, role },
      });
      
      console.log('User account created successfully:', userData.email);
      return userData;
    } catch (error) {
      console.error('Sign up error:', error);
      
      // Track sign up error
      this.telemetryService.trackError({
        name: 'sign_up_error',
        message: error instanceof Error ? error.message : 'Unknown sign up error',
        stack: error instanceof Error ? error.stack : undefined,
        properties: { email, role },
      });
      
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Sign out current user
   * @returns Promise that resolves when sign out is complete
   * @throws AuthenticationError for sign out failures
   */
  public async signOut(): Promise<void> {
    try {
      // Track sign out attempt
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'sign_out_attempt',
        properties: { userId: auth.currentUser?.uid },
      });
      
      await withRetry(() => signOut(auth), {
        maxRetries: 1,
      });
      
      // Clear user-related cache
      this.cacheService.clearByPattern('user:*');
      
      // Track successful sign out
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'sign_out_success',
      });
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Track sign out error
      this.telemetryService.trackError({
        name: 'sign_out_error',
        message: error instanceof Error ? error.message : 'Unknown sign out error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Send password reset email
   * @param email - User email address
   * @returns Promise that resolves when email is sent
   * @throws AuthenticationError for reset failures
   */
  public async resetPassword(email: string): Promise<void> {
    try {
      // Validate email
      const validationResult = this.validationService.validateEmail(email);
      if (!validationResult.isValid) {
        throw new AuthenticationError(
          validationResult.errors[0].message,
          'validation-error'
        );
      }
      
      // Check rate limiting
      if (!firebaseRateLimiters.auth.isAllowed({ operation: 'resetPassword' })) {
        throw new AuthenticationError(
          'Too many password reset attempts. Please try again later.',
          'rate-limit-exceeded'
        );
      }
      
      // Track password reset attempt
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'password_reset_attempt',
        properties: { email },
      });
      
      await withRetry(() => sendPasswordResetEmail(auth, email), {
        maxRetries: 2,
      });
      
      // Track successful password reset
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'password_reset_success',
        properties: { email },
      });
      
      console.log('Password reset email sent to:', email);
    } catch (error) {
      console.error('Password reset error:', error);
      
      // Track password reset error
      this.telemetryService.trackError({
        name: 'password_reset_error',
        message: error instanceof Error ? error.message : 'Unknown password reset error',
        stack: error instanceof Error ? error.stack : undefined,
        properties: { email },
      });
      
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Get current authenticated user
   * @returns Current UserData or null if not authenticated
   */
  public getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Check if user is currently authenticated
   * @returns Boolean indicating authentication status
   */
  public isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  /**
   * Fetch user profile from Firestore
   * @param firebaseUser - Firebase User object
   * @returns Promise resolving to UserData
   */
  private async fetchUserProfile(firebaseUser: User): Promise<UserData> {
    const cacheKey = `user:${firebaseUser.uid}:profile`;
    
    try {
      // Try to get from cache first
      const cachedProfile = await this.cacheService.get<UserData>(cacheKey);
      if (cachedProfile) {
        return cachedProfile;
      }
      
      // If not in cache, fetch from Firestore with retry
      const userDoc = await withRetry(
        () => getDoc(doc(db, Collections.USERS, firebaseUser.uid)),
        DEFAULT_RETRY_OPTIONS
      );
      
      if (userDoc.exists()) {
        const firestoreData = userDoc.data();
        const userData: UserData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role: firestoreData.role,
          schoolId: firestoreData.schoolId,
          createdAt: firestoreData.createdAt?.toDate(),
          lastLoginAt: firestoreData.lastLoginAt?.toDate(),
        };
        
        // Cache the profile
        await this.cacheService.set(cacheKey, userData, 60 * 5); // Cache for 5 minutes
        
        return userData;
      } else {
        // Fallback to Firebase Auth data if Firestore profile doesn't exist
        const basicUserData = mapUserData(firebaseUser);
        
        // Cache the basic profile
        await this.cacheService.set(cacheKey, basicUserData, 60); // Cache for 1 minute
        
        return basicUserData;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      // Track error
      this.telemetryService.trackError({
        name: 'fetch_user_profile_error',
        message: error instanceof Error ? error.message : 'Unknown error fetching user profile',
        stack: error instanceof Error ? error.stack : undefined,
        properties: { userId: firebaseUser.uid },
      });
      
      return mapUserData(firebaseUser);
    }
  }

  /**
   * Create user profile in Firestore
   * @param userData - User data to store
   * @returns Promise that resolves when profile is created
   */
  private async createUserProfile(userData: UserData): Promise<void> {
    try {
      await withRetry(
        () => setDoc(doc(db, Collections.USERS, userData.uid), {
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          schoolId: userData.schoolId,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        }),
        DEFAULT_RETRY_OPTIONS
      );
      
      // Cache the new profile
      const cacheKey = `user:${userData.uid}:profile`;
      await this.cacheService.set(cacheKey, userData, 60 * 5); // Cache for 5 minutes
    } catch (error) {
      console.error('Error creating user profile:', error);
      
      // Track error
      this.telemetryService.trackError({
        name: 'create_user_profile_error',
        message: error instanceof Error ? error.message : 'Unknown error creating user profile',
        stack: error instanceof Error ? error.stack : undefined,
        properties: { userId: userData.uid },
      });
      
      throw new AuthenticationError('Failed to create user profile', 'profile-creation-failed');
    }
  }

  /**
   * Update user's last login timestamp
   * @param uid - User ID
   * @returns Promise that resolves when timestamp is updated
   */
  private async updateLastLogin(uid: string): Promise<void> {
    try {
      await withRetry(
        () => updateDoc(doc(db, Collections.USERS, uid), {
          lastLoginAt: serverTimestamp(),
        }),
        {
          ...DEFAULT_RETRY_OPTIONS,
          maxRetries: 1, // Less retries for non-critical operation
        }
      );
      
      // Invalidate cache
      const cacheKey = `user:${uid}:profile`;
      await this.cacheService.invalidate(cacheKey);
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw error for this non-critical operation
      
      // Track error
      this.telemetryService.trackError({
        name: 'update_last_login_error',
        message: error instanceof Error ? error.message : 'Unknown error updating last login',
        stack: error instanceof Error ? error.stack : undefined,
        properties: { userId: uid },
        isFatal: false,
      });
    }
  }

  /**
   * Handle Firebase authentication errors
   * @param error - Firebase AuthError
   * @returns AuthenticationError with user-friendly message
   */
  private handleAuthError(error: AuthError): AuthenticationError {
    let message: string;
    let code: string = error.code;

    switch (error.code) {
      case FirebaseErrorCodes.AUTH.USER_NOT_FOUND:
        message = 'No account found with this email address.';
        break;
      case FirebaseErrorCodes.AUTH.WRONG_PASSWORD:
        message = 'Incorrect password. Please try again.';
        break;
      case FirebaseErrorCodes.AUTH.EMAIL_ALREADY_IN_USE:
        message = 'An account with this email already exists.';
        break;
      case FirebaseErrorCodes.AUTH.WEAK_PASSWORD:
        message = 'Password is too weak. Please choose a stronger password.';
        break;
      case FirebaseErrorCodes.AUTH.INVALID_EMAIL:
        message = 'Invalid email address format.';
        break;
      case FirebaseErrorCodes.AUTH.NETWORK_REQUEST_FAILED:
        message = 'Network error. Please check your connection and try again.';
        break;
      default:
        message = 'Authentication failed. Please try again.';
        code = 'auth-unknown-error';
    }

    return new AuthenticationError(message, code);
  }
}

/**
 * Custom error class for authentication-related errors
 */
export class AuthenticationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

  /**
   * Login with email and password (alias for signIn)
   * @param email - User email address
   * @param password - User password
   * @returns Promise resolving to UserData
   */
  public async login(email: string, password: string): Promise<UserData> {
    return this.signIn(email, password);
  }

  /**
   * Logout current user (alias for signOut)
   * @returns Promise that resolves when logout is complete
   */
  public async logout(): Promise<void> {
    return this.signOut();
  }

  /**
   * Register a new user (simplified version of signUp)
   * @param email - User email address
   * @param password - User password
   * @param displayName - User display name
   * @param role - User role (defaults to 'teacher')
   * @returns Promise resolving to UserData
   */
  public async register(
    email: string,
    password: string,
    displayName: string,
    role: string = 'teacher'
  ): Promise<UserData> {
    // Default schoolId for now - this would be determined by the app context in a real scenario
    const schoolId = 'default-school';
    return this.signUp(email, password, displayName, role as 'teacher' | 'admin' | 'principal', schoolId);
  }

  /**
   * Update user profile
   * @param displayName - New display name
   * @returns Promise that resolves when profile is updated
   */
  public async updateUserProfile(displayName: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new AuthenticationError('No authenticated user found', 'no-user');
    }

    try {
      // Track profile update attempt
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'profile_update_attempt',
        properties: { userId: user.uid },
      });

      await updateProfile(user, { displayName });

      // Invalidate cache
      const cacheKey = `user:${user.uid}:profile`;
      await this.cacheService.invalidate(cacheKey);

      // Track successful profile update
      this.telemetryService.trackEvent({
        type: EventType.AUTH,
        name: 'profile_update_success',
        properties: { userId: user.uid },
      });

      console.log('User profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);

      // Track profile update error
      this.telemetryService.trackError({
        name: 'profile_update_error',
        message: error instanceof Error ? error.message : 'Unknown profile update error',
        stack: error instanceof Error ? error.stack : undefined,
        properties: { userId: user.uid },
      });

      throw this.handleAuthError(error as AuthError);
    }
  }
}

/**
 * Custom error class for authentication-related errors
 */
export class AuthenticationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

/**
 * Export singleton instance for easy access
 */
export const authService = AuthService.getInstance();

/**
 * Register service in the registry
 */
ServiceRegistry.getInstance().registerService('AuthService', authService);

/**
 * Export types for external use
 */
export type { UserData };