/**
 * Application Navigation Configuration
 * 
 * This file defines the navigation structure for the application,
 * including authentication flow and main application screens.
 * 
 * @fileoverview Navigation configuration with auth and main app stacks
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import theme from '../config/theme';

// Import authentication screens
import LoginScreen from '../screens/auth/Login';
import RegisterScreen from '../screens/auth/Register';
import ForgotPasswordScreen from '../screens/auth/ForgotPassword';

// Import main app screens (using placeholders for now)
const HomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenText}>Home Screen</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenText}>Profile Screen</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenText}>Settings Screen</Text>
  </View>
);

// Placeholder screens for role-specific home screens
const AdminHomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenText}>Admin Dashboard</Text>
  </View>
);

const TeacherHomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenText}>Teacher Dashboard</Text>
  </View>
);

const StudentHomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenText}>Student Dashboard</Text>
  </View>
);

const ParentHomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenText}>Parent Dashboard</Text>
  </View>
);

/**
 * Screen name enum for type-safe navigation
 */
export enum ScreenNames {
  // Auth screens
  Login = 'Login',
  Register = 'Register',
  ForgotPassword = 'ForgotPassword',
  
  // Main app screens
  Home = 'Home',
  Profile = 'Profile',
  Settings = 'Settings',
  
  // Admin screens
  AdminHome = 'AdminHome',
  AdminProfile = 'AdminProfile',
  AdminSettings = 'AdminSettings',
  
  // Teacher screens
  TeacherHome = 'TeacherHome',
  TeacherProfile = 'TeacherProfile',
  TeacherSettings = 'TeacherSettings',
  
  // Student screens
  StudentHome = 'StudentHome',
  StudentProfile = 'StudentProfile',
  StudentSettings = 'StudentSettings',
  
  // Parent screens
  ParentHome = 'ParentHome',
  ParentProfile = 'ParentProfile',
  ParentSettings = 'ParentSettings',
  
  // Utility screens
  Loading = 'Loading',
}

/**
 * Root stack parameter list for type-safe navigation
 */
export type RootStackParamList = {
  // Auth screens
  [ScreenNames.Login]: undefined;
  [ScreenNames.Register]: undefined;
  [ScreenNames.ForgotPassword]: undefined;
  
  // Main app screens
  [ScreenNames.Home]: undefined;
  [ScreenNames.Profile]: undefined;
  [ScreenNames.Settings]: undefined;
  
  // Admin screens
  [ScreenNames.AdminHome]: undefined;
  [ScreenNames.AdminProfile]: undefined;
  [ScreenNames.AdminSettings]: undefined;
  
  // Teacher screens
  [ScreenNames.TeacherHome]: undefined;
  [ScreenNames.TeacherProfile]: undefined;
  [ScreenNames.TeacherSettings]: undefined;
  
  // Student screens
  [ScreenNames.StudentHome]: undefined;
  [ScreenNames.StudentProfile]: undefined;
  [ScreenNames.StudentSettings]: undefined;
  
  // Parent screens
  [ScreenNames.ParentHome]: undefined;
  [ScreenNames.ParentProfile]: undefined;
  [ScreenNames.ParentSettings]: undefined;
  
  // Utility screens
  [ScreenNames.Loading]: undefined;
};

// Create navigation stacks
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

/**
 * Default screen options for all screens
 */
const defaultScreenOptions = {
  headerStyle: {
    backgroundColor: theme.Colors.primary,
  },
  headerTintColor: theme.Colors.white,
  headerTitleStyle: {
    ...theme.Typography.h3,
  },
};

/**
 * Authentication stack navigator
 */
const AuthStack = () => {
  return (
    <Stack.Navigator 
      initialRouteName={ScreenNames.Login}
      screenOptions={defaultScreenOptions}
    >
      <Stack.Screen 
        name={ScreenNames.Login} 
        component={LoginScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name={ScreenNames.Register} 
        component={RegisterScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name={ScreenNames.ForgotPassword} 
        component={ForgotPasswordScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

/**
 * Admin Navigator - Bottom Tab Navigator for admin users
 */
const AdminNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName={ScreenNames.AdminHome}
      screenOptions={{
        tabBarActiveTintColor: theme.Colors.primary,
        tabBarInactiveTintColor: theme.Colors.secondary,
        tabBarStyle: {
          height: theme.Spacing.bottomNavHeight,
          paddingBottom: theme.Spacing.s,
          paddingTop: theme.Spacing.xs,
        },
      }}
    >
      <Tab.Screen 
        name={ScreenNames.AdminHome} 
        component={AdminHomeScreen} 
        options={{ 
          title: 'Dashboard',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
      <Tab.Screen 
        name={ScreenNames.AdminProfile} 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
      <Tab.Screen 
        name={ScreenNames.AdminSettings} 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Teacher Navigator - Bottom Tab Navigator for teacher users
 */
const TeacherNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName={ScreenNames.TeacherHome}
      screenOptions={{
        tabBarActiveTintColor: theme.Colors.primary,
        tabBarInactiveTintColor: theme.Colors.secondary,
        tabBarStyle: {
          height: theme.Spacing.bottomNavHeight,
          paddingBottom: theme.Spacing.s,
          paddingTop: theme.Spacing.xs,
        },
      }}
    >
      <Tab.Screen 
        name={ScreenNames.TeacherHome} 
        component={TeacherHomeScreen} 
        options={{ 
          title: 'Home',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
      <Tab.Screen 
        name={ScreenNames.TeacherProfile} 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
      <Tab.Screen 
        name={ScreenNames.TeacherSettings} 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Student Navigator - Bottom Tab Navigator for student users
 */
const StudentNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName={ScreenNames.StudentHome}
      screenOptions={{
        tabBarActiveTintColor: theme.Colors.primary,
        tabBarInactiveTintColor: theme.Colors.secondary,
        tabBarStyle: {
          height: theme.Spacing.bottomNavHeight,
          paddingBottom: theme.Spacing.s,
          paddingTop: theme.Spacing.xs,
        },
      }}
    >
      <Tab.Screen 
        name={ScreenNames.StudentHome} 
        component={StudentHomeScreen} 
        options={{ 
          title: 'Home',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
      <Tab.Screen 
        name={ScreenNames.StudentProfile} 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
      <Tab.Screen 
        name={ScreenNames.StudentSettings} 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Parent Navigator - Bottom Tab Navigator for parent users
 */
const ParentNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName={ScreenNames.ParentHome}
      screenOptions={{
        tabBarActiveTintColor: theme.Colors.primary,
        tabBarInactiveTintColor: theme.Colors.secondary,
        tabBarStyle: {
          height: theme.Spacing.bottomNavHeight,
          paddingBottom: theme.Spacing.s,
          paddingTop: theme.Spacing.xs,
        },
      }}
    >
      <Tab.Screen 
        name={ScreenNames.ParentHome} 
        component={ParentHomeScreen} 
        options={{ 
          title: 'Home',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
      <Tab.Screen 
        name={ScreenNames.ParentProfile} 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
      <Tab.Screen 
        name={ScreenNames.ParentSettings} 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings',
          headerStyle: defaultScreenOptions.headerStyle,
          headerTintColor: defaultScreenOptions.headerTintColor,
          headerTitleStyle: defaultScreenOptions.headerTitleStyle,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Main application navigator based on user role
 */
const RoleBasedNavigator = ({ userRole }: { userRole?: string }) => {
  // Determine which navigator to render based on user role
  switch (userRole) {
    case 'admin':
      return <AdminNavigator />;
    case 'teacher':
      return <TeacherNavigator />;
    case 'student':
      return <StudentNavigator />;
    case 'parent':
      return <ParentNavigator />;
    default:
      // Fallback for unknown roles or if user.role is not yet available
      return <TeacherNavigator />; // Default to teacher view as fallback
  }
};

/**
 * Loading screen component
 */
const LoadingScreen = () => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.Colors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

/**
 * Main application navigator
 * Handles conditional rendering based on authentication state
 */
const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Handle initialization and loading states
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setIsInitializing(false);
    }, 1500); // Short delay to ensure auth state is properly loaded
    
    return () => clearTimeout(initTimer);
  }, []);
  
  // Show loading screen during initialization
  if (isInitializing || isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <NavigationContainer>
      {user ? <RoleBasedNavigator userRole={user.role} /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.Colors.white,
  },
  screenText: {
    ...theme.Typography.h2,
    color: theme.Colors.primary,
    marginBottom: theme.Spacing.m,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.Colors.white,
  },
  loadingText: {
    ...theme.Typography.body1,
    color: theme.Colors.primary,
    marginTop: theme.Spacing.m,
  },
});

export default AppNavigator;