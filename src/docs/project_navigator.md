# Project Navigator

## Overview

This document serves as a central reference for quickly locating and implementing enhancements in the MCC Discipline Tracker application. It provides a comprehensive map of the project structure, key file locations, component relationships, and implementation patterns to streamline the development process.

## Project Structure

### Core Directories

```
src/
├── components/     # Reusable UI components
│   ├── feedback/   # Feedback components (alerts, notifications, etc.)
│   ├── layout/     # Layout components (containers, grids, etc.)
│   └── ui/         # UI components (buttons, inputs, etc.)
├── config/         # Configuration files
├── contexts/       # React contexts for state management
├── docs/           # Project documentation
├── examples/       # Example implementations and POCs
├── hooks/          # Custom React hooks
├── navigation/     # Navigation configuration
├── screens/        # Screen components organized by user role
│   ├── admin/      # Admin-specific screens
│   ├── auth/       # Authentication screens
│   ├── parent/     # Parent-specific screens
│   ├── student/    # Student-specific screens
│   └── teacher/    # Teacher-specific screens
├── services/       # Service layer for business logic and API interactions
│   └── base/       # Base service utilities and helpers
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Key Files and Their Purposes

### Configuration

- `src/config/firebaseConfig.ts` - Firebase configuration and initialization
- `src/config/theme.ts` - Application theme configuration

### Authentication

- `src/contexts/AuthContext.tsx` - Authentication context provider and hook
- `src/services/authService.ts` - Authentication service for Firebase integration

### Navigation

- `src/navigation/AppNavigator.tsx` - Main navigation configuration with conditional rendering based on auth state

## Implementation Patterns

### Authentication Flow

1. **Authentication Context**
   - Location: `src/contexts/AuthContext.tsx`
   - Purpose: Provides authentication state and methods to the entire application
   - Key Components:
     - `AuthProvider` - Context provider component
     - `useAuth` - Custom hook for accessing auth context
     - Authentication methods (login, logout, register, etc.)

2. **Authentication Service**
   - Location: `src/services/authService.ts`
   - Purpose: Handles Firebase authentication operations
   - Key Features:
     - Firebase integration
     - Error handling
     - User data mapping
     - Authentication state management

3. **Navigation Integration**
   - Location: `src/navigation/AppNavigator.tsx`
   - Purpose: Conditional rendering based on authentication state
   - Key Components:
     - `AuthStack` - Navigation stack for unauthenticated users
     - `MainAppStack` - Navigation stack for authenticated users
     - `LoadingScreen` - Screen shown during auth state determination

### Service Layer Pattern

1. **Service Implementation**
   - Singleton pattern for global access
   - Comprehensive error handling
   - TypeScript interfaces for type safety
   - Integration with Firebase/Firestore
   - Retry mechanisms for network operations
   - Caching for performance optimization
   - Rate limiting for API protection
   - Telemetry for monitoring and analytics

2. **Service Registration**
   - Services are registered in the service registry
   - Accessible through the registry or exported singleton instances

3. **Error Handling**
   - Custom error classes for different error types
   - Consistent error handling pattern across services
   - User-friendly error messages

### Reporting System

1. **Reporting Service**
   - Location: `src/services/reportingService.ts`
   - Purpose: Generates comprehensive reports and analytics for discipline incidents
   - Key Features:
     - Student behavior reports with risk assessment
     - Teacher performance reports
     - School-wide incident statistics
     - Trend analysis and data visualization
     - Automated recommendations based on data patterns
     - Export capabilities for reports

2. **Integration with Other Services**
   - Discipline Service: Fetches incident data for report generation
   - User Service: Retrieves user information for reports
   - Data aggregation and transformation for meaningful insights

3. **Report Types**
   - Student Behavior Reports: Incident breakdowns, risk levels, improvement trends
   - Teacher Performance Reports: Resolution times, follow-up compliance, notification rates
   - School Reports: Overall statistics, incident trends, top concerns, recommendations

## Quick Reference for Common Tasks

### Adding a New Screen

1. Create the screen component in the appropriate directory under `src/screens/`
2. Add the screen to the navigation stack in `src/navigation/AppNavigator.tsx`
3. Add the screen name to the `ScreenNames` enum
4. Add the screen parameters to the `RootStackParamList` type

### Creating a New Service

1. Create the service file in `src/services/`
2. Implement the service following the established pattern in `service_layer_patterns.md`
3. Register the service in the service registry
4. Export a singleton instance for easy access

### Adding a New Component

1. Create the component in the appropriate directory under `src/components/`
2. Implement the component with proper TypeScript typing
3. Add JSDoc comments for documentation
4. Create a barrel export in the directory's index file if applicable

### Implementing a New Feature

1. Identify the required components, services, and screens
2. Implement the service layer first (if applicable)
3. Create or update the necessary components
4. Integrate with the navigation system if needed
5. Add appropriate error handling and loading states
6. Update documentation in `progress_update.md` and other relevant files

### Implementing Reporting Features

1. **Adding a New Report Type**
   - Define interfaces in `reportingService.ts` for the new report type
   - Implement data fetching methods using `disciplineService` and/or `userService`
   - Create data transformation and aggregation methods
   - Add export options if needed
   - Implement UI components to display the report

2. **Enhancing Existing Reports**
   - Identify the report type in `reportingService.ts`
   - Extend the existing interfaces to include new data points
   - Update data aggregation methods
   - Update recommendation generation if applicable
   - Update UI components to display new data points

3. **Adding Data Visualization**
   - Use the trend data methods in `reportingService.ts`
   - Implement appropriate chart components
   - Ensure responsive design for different screen sizes
   - Consider accessibility requirements

## Common Pitfalls and Solutions

### Firebase Integration

- **Issue**: Firebase initialization errors
- **Solution**: Ensure Firebase config is correctly set up in `src/config/firebaseConfig.ts`

### Authentication

- **Issue**: Auth state not persisting
- **Solution**: Check Firebase persistence configuration in `authService.ts`

### Navigation

- **Issue**: Type errors in navigation
- **Solution**: Ensure screen is properly typed in `RootStackParamList`

### Service Layer

- **Issue**: Service not accessible
- **Solution**: Ensure service is registered in the service registry and exported correctly

### Reporting System

- **Issue**: Reports showing incomplete or incorrect data
- **Solution**: Check data fetching methods in `reportingService.ts` and ensure proper error handling

- **Issue**: Performance issues with large datasets
- **Solution**: Implement pagination in data fetching methods and optimize aggregation algorithms

- **Issue**: Trend data not displaying correctly
- **Solution**: Verify date handling in `aggregateByPeriod` method and ensure proper date formatting

- **Issue**: Recommendations not generating
- **Solution**: Check thresholds in `generateRecommendations` method and ensure sufficient data is available

## Enhancement Implementation Checklist

When implementing enhancements, follow this checklist to ensure all necessary steps are completed:

1. [ ] Understand the enhancement requirements
2. [ ] Identify affected files and components
3. [ ] Check for existing patterns and implementations
4. [ ] Implement changes following established patterns
5. [ ] Add appropriate error handling
6. [ ] Add loading states if applicable
7. [ ] Test the implementation
8. [ ] Update documentation
9. [ ] Update `progress_update.md`
10. [ ] Add any lessons learned to `lessons_learnt.md`

## Related Documentation

- `service_layer_patterns.md` - Detailed documentation of service layer patterns
- `lessons_learnt.md` - Lessons learned during development
- `progress_update.md` - Progress updates and next steps
- `api_documentation.md` - API documentation
- `firebase_integration_documentation.md` - Firebase integration documentation
- `testing_strategy.md` - Testing strategy and approach
- `user_guide.md` - User guide for the application