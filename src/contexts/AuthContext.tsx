/**
 * Authentication Context for MCC Discipline Tracker
 * 
 * This context provides authentication state and methods to the entire application.
 * It integrates with Firebase Authentication and follows the established service layer pattern.
 * 
 * Features:
 * 1. User authentication state management
 * 2. Login, logout, and registration methods
 * 3. Role-based access control
 * 4. Integration with authService for Firebase operations
 * 
 * @fileoverview Authentication context provider and hook
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AuthService } from '../services/authService';
import { UserData } from '../config/firebaseConfig';

/**
 * Authentication context state and methods interface
 */
interface AuthContextType {
  // Authentication state
  user: UserData | null;
  isLoading: boolean;
  error: string | null;
  
  // Authentication methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, displayName: string, role?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  clearError: () => void;
}

// Create the authentication context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  resetPassword: async () => {},
  updateUserProfile: async () => {},
  clearError: () => {},
});

/**
 * Props for the AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 * Manages authentication state and provides authentication methods
 * 
 * @param {AuthProviderProps} props - Component props
 * @returns {JSX.Element} AuthProvider component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Authentication state
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get the authentication service instance
  const authService = AuthService.getInstance();
  
  // Initialize authentication state listener
  useEffect(() => {
    // Subscribe to auth state changes from the service
    const unsubscribe = authService.subscribeToAuthChanges((userData) => {
      setUser(userData);
      setIsLoading(false);
    });
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);
  
  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   */
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.login(email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Logout the current user
   */
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.logout();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} displayName - User display name
   * @param {string} role - User role (optional)
   */
  const register = async (
    email: string, 
    password: string, 
    displayName: string, 
    role?: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.register(email, password, displayName, role);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Send password reset email
   * @param {string} email - User email
   */
  const resetPassword = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.resetPassword(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Update user profile
   * @param {string} displayName - New display name
   */
  const updateUserProfile = async (displayName: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.updateUserProfile(displayName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Clear any authentication errors
   */
  const clearError = (): void => {
    setError(null);
  };
  
  // Context value
  const contextValue: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    logout,
    register,
    resetPassword,
    updateUserProfile,
    clearError,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the authentication context
 * @returns {AuthContextType} Authentication context value
 * @throws {Error} If used outside of an AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};