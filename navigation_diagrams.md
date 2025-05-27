# MCC Discipline Tracker - Navigation Diagrams

## Overview

This document provides visual and descriptive navigation flows for the MCC Discipline Tracker application. These diagrams serve as a reference for implementing role-based navigation and ensuring proper access control throughout the application.

## Navigation Structure

### Root Navigation

```
AppNavigator
├── AuthStack (unauthenticated users)
│   ├── LoginScreen
│   ├── RegistrationScreen
│   └── ForgotPasswordScreen
└── MainNavigator (authenticated users)
    ├── AdminNavigator (role: admin)
    ├── TeacherNavigator (role: teacher)
    ├── StudentNavigator (role: student)
    └── ParentNavigator (role: parent)
```

## Role-Based Navigation Flows

### Administrator Flow

```
AdminNavigator (Bottom Tab Navigator)
├── DashboardStack (Stack Navigator)
│   ├── AdminDashboardScreen
│   ├── SystemMetricsScreen
│   └── UserActivityScreen
├── ManagementStack (Stack Navigator)
│   ├── ManagementHomeScreen
│   ├── StudentManagementScreen
│   │   ├── StudentListScreen
│   │   ├── StudentDetailScreen
│   │   └── StudentEditScreen
│   ├── TeacherManagementScreen
│   │   ├── TeacherListScreen
│   │   ├── TeacherDetailScreen
│   │   └── TeacherEditScreen
│   ├── ClassManagementScreen
│   │   ├── ClassListScreen
│   │   ├── ClassDetailScreen
│   │   └── ClassEditScreen
│   └── BehaviorConfigScreen
│       ├── MisdemeanorConfigScreen
│       ├── MeritConfigScreen
│       └── HeatBarConfigScreen
├── ReportingStack (Stack Navigator)
│   ├── ReportingHomeScreen
│   ├── GenerateReportScreen
│   ├── ScheduledReportsScreen
│   └── ReportDetailScreen
└── ProfileStack (Stack Navigator)
    ├── AdminProfileScreen
    ├── SettingsScreen
    └── HelpScreen
```

### Teacher Flow

```
TeacherNavigator (Bottom Tab Navigator)
├── HomeStack (Stack Navigator)
│   ├── TeacherHomeScreen
│   └── AnnouncementsScreen
├── StudentsStack (Stack Navigator)
│   ├── ClassListScreen
│   ├── StudentListScreen
│   └── StudentDetailScreen
│       ├── StudentBehaviorHistoryScreen
│       └── StudentHeatBarScreen
├── BehaviorStack (Stack Navigator)
│   ├── BehaviorHomeScreen
│   ├── LogIncidentScreen
│   ├── LogMeritScreen
│   └── MyLogsScreen
├── AnalyticsStack (Stack Navigator)
│   ├── ClassAnalyticsScreen
│   ├── StudentComparisonScreen
│   └── BehaviorTrendsScreen
└── ProfileStack (Stack Navigator)
    ├── TeacherProfileScreen
    ├── SettingsScreen
    └── HelpScreen
```

### Student Flow

```
StudentNavigator (Bottom Tab Navigator)
├── HomeStack (Stack Navigator)
│   ├── StudentHomeScreen
│   └── AnnouncementsScreen
├── BehaviorStack (Stack Navigator)
│   ├── MyBehaviorScreen
│   ├── IncidentHistoryScreen
│   └── MeritHistoryScreen
├── ProgressStack (Stack Navigator)
│   ├── MyProgressScreen
│   └── HeatBarHistoryScreen
└── ProfileStack (Stack Navigator)
    ├── StudentProfileScreen
    ├── SettingsScreen
    └── HelpScreen
```

### Parent Flow

```
ParentNavigator (Bottom Tab Navigator)
├── HomeStack (Stack Navigator)
│   ├── ParentHomeScreen
│   └── AnnouncementsScreen
├── ChildrenStack (Stack Navigator)
│   ├── ChildListScreen
│   └── ChildDetailScreen
│       ├── ChildBehaviorHistoryScreen
│       └── ChildHeatBarScreen
├── CommunicationStack (Stack Navigator)
│   ├── MessagesScreen
│   ├── TeacherContactScreen
│   └── NotificationHistoryScreen
└── ProfileStack (Stack Navigator)
    ├── ParentProfileScreen
    ├── SettingsScreen
    └── HelpScreen
```

## Navigation Guards & Best Practices

Navigation guards ensure users can only access screens appropriate for their role. The implementation should also incorporate best practices for type safety, maintainability, and consistent styling.

```typescript
// Example enhanced implementation in AppNavigator.tsx
import { ScreenNames, RootStackParamList } from './AppNavigator'; // Assuming types are co-located or imported
import { theme } from '../config/theme'; // For styling

// ... (useAuth hook and other necessary imports)

const AppNavigator = () => {
  const { user, isAuthenticated } = useAuth(); // Example auth context hook

  // Define default screen options using the theme
  const defaultScreenOptions: StackNavigationOptions = {
    headerStyle: {
      backgroundColor: theme.colors.primary,
    },
    headerTintColor: theme.colors.white,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  };

  return (
    <NavigationContainer>
      {/* Conditional rendering based on authentication state */}
      {!isAuthenticated ? (
        <AuthStack screenOptions={defaultScreenOptions} /> // Pass screenOptions to sub-navigators
      ) : (
        <MainNavigator userRole={user.role} screenOptions={defaultScreenOptions} />
      )}
    </NavigationContainer>
  );
};

// Example AuthStack (Illustrative)
const AuthStack = ({ screenOptions }) => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name={ScreenNames.Login} component={LoginScreen} />
    <Stack.Screen name={ScreenNames.Register} component={RegisterScreen} />
    {/* ... other auth screens */}
  </Stack.Navigator>
);

// Example MainNavigator (Illustrative)
const MainNavigator = ({ userRole, screenOptions }) => {
  // It's recommended to use a dedicated navigator for each role's stack
  // This keeps AppNavigator clean and delegates role-specific navigation
  switch (userRole) {
    case 'admin':
      return <AdminNavigator screenOptions={screenOptions} />;
    case 'teacher':
      return <TeacherNavigator screenOptions={screenOptions} />;
    case 'student':
      return <StudentNavigator screenOptions={screenOptions} />;
    case 'parent':
      return <ParentNavigator screenOptions={screenOptions} />;
    default:
      // Fallback for unknown roles or if user.role is not yet available
      // Could be a loading screen or a restricted access screen
      return <Stack.Navigator screenOptions={screenOptions}><Stack.Screen name={ScreenNames.TempPlaceholder} component={PlaceholderScreen} /></Stack.Navigator>; 
  }
};

// Each role-specific navigator (e.g., AdminNavigator) would then define its own screens:
// const AdminNavigator = ({ screenOptions }) => (
//   <Stack.Navigator screenOptions={screenOptions}>
//     <Stack.Screen name={ScreenNames.Home} component={AdminDashboardScreen} />
//     {/* ... other admin screens */}
//   </Stack.Navigator>
// );
```

**Key Best Practices Applied:**

*   **Screen Name Constants**: Use an `enum` (e.g., `ScreenNames`) for screen names to ensure consistency and avoid typos.
*   **Type-Safe Parameters**: Define `RootStackParamList` (and similar for sub-navigators) to specify parameters for each screen, enhancing type safety.
*   **Modular Navigators**: Consider separate navigator components for different parts of the app (e.g., `AuthNavigator`, `AdminNavigator`, `TeacherNavigator`). This improves organization and scalability.
*   **Theme Integration**: Apply styles from the global theme (e.g., `theme.colors.primary`) to navigator elements like headers for a consistent UI. Define `defaultScreenOptions` for reusability.
*   **JSDoc Comments**: Document navigators, screen name enums, and parameter types for better code understanding and maintainability.

## Deep Linking Structure

The application supports deep linking with the following URL structure:

```
mccdiscipline://
├── auth/
│   ├── login
│   ├── register
│   └── forgot-password
├── admin/
│   ├── dashboard
│   ├── management/
│   │   ├── students
│   │   ├── teachers
│   │   └── classes
│   └── reports
├── teacher/
│   ├── home
│   ├── students
│   ├── behavior/
│   │   ├── log-incident
│   │   └── log-merit
│   └── analytics
├── student/
│   ├── home
│   ├── behavior
│   └── progress
└── parent/
    ├── home
    ├── children
    └── messages
```

## Navigation Testing Strategy

1. **Unit Tests**: Test navigation guards and role-based access control
2. **Integration Tests**: Verify correct screen rendering based on user role
3. **End-to-End Tests**: Validate complete navigation flows for each user role

## Implementation Guidelines

1. Use React Navigation 6.x with TypeScript for type-safe navigation
2. Implement navigation guards at multiple levels:
   - Root level (authenticated vs. unauthenticated)
   - Role level (admin, teacher, student, parent)
   - Screen level (additional permission checks)
3. Extract navigation logic into custom hooks for reusability
4. Implement deep linking support for notifications and external links
5. Use screen options for consistent headers and transitions