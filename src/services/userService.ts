/**
 * User Service for MCC Discipline Tracker
 * 
 * This service handles user profile management, user data operations,
 * and user-related business logic. Works in conjunction with AuthService
 * to provide comprehensive user management functionality.
 * 
 * @fileoverview User management service with Firestore integration
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
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
  QuerySnapshot,
} from 'firebase/firestore';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { db, Collections, UserData } from '../config/firebaseConfig';
import { authService } from './authService';

/**
 * Interface for user profile update data
 */
export interface UserProfileUpdate {
  displayName?: string;
  email?: string;
  role?: 'teacher' | 'admin' | 'principal';
  schoolId?: string;
}

/**
 * Interface for user search filters
 */
export interface UserSearchFilters {
  role?: 'teacher' | 'admin' | 'principal';
  schoolId?: string;
  searchTerm?: string;
}

/**
 * Interface for paginated user results
 */
export interface PaginatedUsers {
  users: UserData[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
}

/**
 * User service class providing comprehensive user management functionality
 */
export class UserService {
  private static instance: UserService;

  /**
   * Singleton pattern implementation
   * @returns UserService instance
   */
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  private constructor() {}

  /**
   * Get user profile by ID
   * @param userId - User ID to fetch
   * @returns Promise resolving to UserData or null if not found
   * @throws UserServiceError for fetch failures
   */
  public async getUserProfile(userId: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(db, Collections.USERS, userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: userId,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          schoolId: data.schoolId,
          createdAt: data.createdAt?.toDate(),
          lastLoginAt: data.lastLoginAt?.toDate(),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new UserServiceError('Failed to fetch user profile', 'fetch-profile-failed');
    }
  }

  /**
   * Update user profile
   * @param userId - User ID to update
   * @param updates - Profile updates to apply
   * @returns Promise resolving to updated UserData
   * @throws UserServiceError for update failures
   */
  public async updateUserProfile(userId: string, updates: UserProfileUpdate): Promise<UserData> {
    try {
      const currentUser = authService.getCurrentUser();
      
      // Update Firebase Auth profile if display name or email changed
      if (currentUser && currentUser.uid === userId) {
        if (updates.displayName) {
          await updateProfile(currentUser, { displayName: updates.displayName });
        }
        if (updates.email && updates.email !== currentUser.email) {
          await updateEmail(currentUser, updates.email);
        }
      }

      // Update Firestore profile
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, Collections.USERS, userId), updateData);
      
      // Fetch and return updated profile
      const updatedProfile = await this.getUserProfile(userId);
      if (!updatedProfile) {
        throw new UserServiceError('Failed to fetch updated profile', 'update-fetch-failed');
      }
      
      console.log('User profile updated successfully:', userId);
      return updatedProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new UserServiceError('Failed to update user profile', 'update-profile-failed');
    }
  }

  /**
   * Change user password
   * @param newPassword - New password
   * @returns Promise that resolves when password is updated
   * @throws UserServiceError for password update failures
   */
  public async changePassword(newPassword: string): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new UserServiceError('No authenticated user found', 'no-auth-user');
      }

      await updatePassword(currentUser, newPassword);
      
      // Update password change timestamp in Firestore
      await updateDoc(doc(db, Collections.USERS, currentUser.uid), {
        passwordChangedAt: serverTimestamp(),
      });
      
      console.log('Password updated successfully for user:', currentUser.uid);
    } catch (error) {
      console.error('Error changing password:', error);
      throw new UserServiceError('Failed to change password', 'change-password-failed');
    }
  }

  /**
   * Get users by school ID
   * @param schoolId - School identifier
   * @param role - Optional role filter
   * @returns Promise resolving to array of UserData
   * @throws UserServiceError for fetch failures
   */
  public async getUsersBySchool(schoolId: string, role?: string): Promise<UserData[]> {
    try {
      let q = query(
        collection(db, Collections.USERS),
        where('schoolId', '==', schoolId),
        orderBy('displayName')
      );

      if (role) {
        q = query(
          collection(db, Collections.USERS),
          where('schoolId', '==', schoolId),
          where('role', '==', role),
          orderBy('displayName')
        );
      }

      const querySnapshot = await getDocs(q);
      const users: UserData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          schoolId: data.schoolId,
          createdAt: data.createdAt?.toDate(),
          lastLoginAt: data.lastLoginAt?.toDate(),
        });
      });

      return users;
    } catch (error) {
      console.error('Error fetching users by school:', error);
      throw new UserServiceError('Failed to fetch school users', 'fetch-school-users-failed');
    }
  }

  /**
   * Search users with filters and pagination
   * @param filters - Search filters
   * @param pageSize - Number of results per page
   * @param lastDoc - Last document for pagination
   * @returns Promise resolving to paginated user results
   * @throws UserServiceError for search failures
   */
  public async searchUsers(
    filters: UserSearchFilters,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<PaginatedUsers> {
    try {
      let q = query(collection(db, Collections.USERS));

      // Apply filters
      if (filters.schoolId) {
        q = query(q, where('schoolId', '==', filters.schoolId));
      }
      if (filters.role) {
        q = query(q, where('role', '==', filters.role));
      }

      // Add ordering and pagination
      q = query(q, orderBy('displayName'), limit(pageSize + 1));

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const users: UserData[] = [];
      const docs = querySnapshot.docs;

      // Process results
      const hasMore = docs.length > pageSize;
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;

      resultDocs.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          schoolId: data.schoolId,
          createdAt: data.createdAt?.toDate(),
          lastLoginAt: data.lastLoginAt?.toDate(),
        });
      });

      // Apply client-side search term filter if provided
      let filteredUsers = users;
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredUsers = users.filter(
          (user) =>
            user.displayName?.toLowerCase().includes(searchTerm) ||
            user.email?.toLowerCase().includes(searchTerm)
        );
      }

      return {
        users: filteredUsers,
        hasMore,
        lastDoc: hasMore ? resultDocs[resultDocs.length - 1] : undefined,
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw new UserServiceError('Failed to search users', 'search-users-failed');
    }
  }

  /**
   * Delete user profile (admin only)
   * @param userId - User ID to delete
   * @returns Promise that resolves when user is deleted
   * @throws UserServiceError for deletion failures
   */
  public async deleteUser(userId: string): Promise<void> {
    try {
      // Check if current user has admin privileges
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new UserServiceError('No authenticated user found', 'no-auth-user');
      }

      const currentUserProfile = await this.getUserProfile(currentUser.uid);
      if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        throw new UserServiceError('Insufficient permissions', 'insufficient-permissions');
      }

      // Delete user profile from Firestore
      await deleteDoc(doc(db, Collections.USERS, userId));
      
      console.log('User deleted successfully:', userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new UserServiceError('Failed to delete user', 'delete-user-failed');
    }
  }

  /**
   * Get user statistics for a school
   * @param schoolId - School identifier
   * @returns Promise resolving to user statistics
   * @throws UserServiceError for statistics fetch failures
   */
  public async getUserStatistics(schoolId: string): Promise<{
    totalUsers: number;
    teacherCount: number;
    adminCount: number;
    principalCount: number;
  }> {
    try {
      const users = await this.getUsersBySchool(schoolId);
      
      const statistics = {
        totalUsers: users.length,
        teacherCount: users.filter(user => user.role === 'teacher').length,
        adminCount: users.filter(user => user.role === 'admin').length,
        principalCount: users.filter(user => user.role === 'principal').length,
      };

      return statistics;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw new UserServiceError('Failed to fetch user statistics', 'fetch-statistics-failed');
    }
  }

  /**
   * Check if user has permission for specific action
   * @param userId - User ID to check
   * @param action - Action to check permission for
   * @returns Promise resolving to boolean indicating permission
   */
  public async hasPermission(userId: string, action: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        return false;
      }

      // Define permission matrix
      const permissions: Record<string, string[]> = {
        'create-incident': ['teacher', 'admin', 'principal'],
        'edit-incident': ['admin', 'principal'],
        'delete-incident': ['admin', 'principal'],
        'manage-users': ['admin', 'principal'],
        'view-reports': ['teacher', 'admin', 'principal'],
        'manage-school': ['principal'],
      };

      const allowedRoles = permissions[action] || [];
      return allowedRoles.includes(userProfile.role);
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }
}

/**
 * Custom error class for user service-related errors
 */
export class UserServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'UserServiceError';
    this.code = code;
  }
}

/**
 * Export singleton instance for easy access
 */
export const userService = UserService.getInstance();

/**
 * Export types for external use
 */
export type { UserData, UserProfileUpdate, UserSearchFilters, PaginatedUsers };