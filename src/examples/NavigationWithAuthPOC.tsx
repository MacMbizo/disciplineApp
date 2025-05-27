/**
 * Navigation with Authentication Proof of Concept
 * 
 * This component demonstrates how to implement role-based navigation
 * using Firebase authentication in the MCC Discipline Tracker application.
 * 
 * Features demonstrated:
 * 1. Protected routes based on authentication state
 * 2. Role-based access control for navigation
 * 3. Authentication state persistence
 * 4. Navigation guards
 * 
 * @fileoverview Role-based navigation with Firebase authentication
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth, db, Collections } from '../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Define the navigation stack
const Stack = createStackNavigator();

// Mock screens for demonstration
const LoginScreen = ({ navigation }: any) => {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Login Screen</Text>
      <Button 
        title="Go to Firebase Auth POC" 
        onPress={() => navigation.navigate('AuthPOC')} 
      />
    </View>
  );
};

const AdminDashboardScreen = () => {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Admin Dashboard</Text>
      <Text style={styles.screenDescription}>
        This screen is only accessible to users with the 'admin' role.
      </Text>
    </View>
  );
};

const PrincipalDashboardScreen = () => {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Principal Dashboard</Text>
      <Text style={styles.screenDescription}>
        This screen is only accessible to users with the 'principal' role.
      </Text>
    </View>
  );
};

const TeacherDashboardScreen = () => {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Teacher Dashboard</Text>
      <Text style={styles.screenDescription}>
        This screen is only accessible to users with the 'teacher' role.
      </Text>
    </View>
  );
};

// Import the Firebase Auth POC
import FirebaseAuthPOC from './FirebaseAuthPOC';

// Main navigation component
const NavigationWithAuthPOC: React.FC = () => {
  // Authentication state
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, Collections.USERS, firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || null);
          } else {
            setUserRole(null);
          }
          setUser(firebaseUser);
        } catch (err) {
          console.error('Error fetching user role:', err);
          setUser(firebaseUser);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          // Authenticated routes based on user role
          <>
            {userRole === 'admin' && (
              <Stack.Screen 
                name="AdminDashboard" 
                component={AdminDashboardScreen} 
                options={{ title: 'Admin Dashboard' }}
              />
            )}
            {userRole === 'principal' && (
              <Stack.Screen 
                name="PrincipalDashboard" 
                component={PrincipalDashboardScreen} 
                options={{ title: 'Principal Dashboard' }}
              />
            )}
            {userRole === 'teacher' && (
              <Stack.Screen 
                name="TeacherDashboard" 
                component={TeacherDashboardScreen} 
                options={{ title: 'Teacher Dashboard' }}
              />
            )}
            {/* Fallback if role is not recognized */}
            {(!userRole || !['admin', 'principal', 'teacher'].includes(userRole)) && (
              <Stack.Screen 
                name="AuthPOC" 
                component={FirebaseAuthPOC} 
                options={{ title: 'Firebase Auth POC' }}
              />
            )}
          </>
        ) : (
          // Unauthenticated routes
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ title: 'Login' }}
            />
            <Stack.Screen 
              name="AuthPOC" 
              component={FirebaseAuthPOC} 
              options={{ title: 'Firebase Auth POC' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  screenDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
});

export default NavigationWithAuthPOC;