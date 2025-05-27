# MCC Discipline Tracker API Documentation

## Overview

This document provides comprehensive documentation for the MCC Discipline Tracker application's API. The application follows a service-oriented architecture with a well-defined service layer that handles all business logic and data operations.

## Service Layer Architecture

The application's service layer is organized into the following core services:

1. **Authentication Service** - Handles user authentication and session management
2. **User Service** - Manages user profiles and user-related operations
3. **Discipline Service** - Handles discipline incident tracking and management
4. **Reporting Service** - Provides analytics, reporting, and data visualization

All services follow a consistent pattern:
- Singleton implementation for global access
- Comprehensive error handling
- TypeScript interfaces for type safety
- Integration with Firebase/Firestore
- Retry mechanisms for network operations
- Caching for performance optimization
- Rate limiting for API protection
- Telemetry for monitoring and analytics

## Authentication Service API

### Overview

The Authentication Service (`authService.ts`) handles all authentication-related operations including user login, logout, registration, and authentication state management.

### Methods

#### `signIn(email: string, password: string): Promise<UserData>`

Authenticate a user with email and password.

**Parameters:**
- `email` - User's email address
- `password` - User's password

**Returns:**
- Promise resolving to UserData object

**Throws:**
- `AuthenticationError` for invalid credentials or other auth failures

#### `signUp(email: string, password: string, displayName: string, role: string, schoolId: string): Promise<UserData>`

Register a new user account.

**Parameters:**
- `email` - User's email address
- `password` - User's password
- `displayName` - User's display name
- `role` - User's role (teacher, admin, principal)
- `schoolId` - ID of the user's school

**Returns:**
- Promise resolving to UserData object

**Throws:**
- `AuthenticationError` for registration failures

#### `signOut(): Promise<void>`

Sign out the current user.

**Returns:**
- Promise resolving when sign out is complete

#### `resetPassword(email: string): Promise<void>`

Send a password reset email to the user.

**Parameters:**
- `email` - User's email address

**Returns:**
- Promise resolving when reset email is sent

**Throws:**
- `AuthenticationError` for reset failures

#### `getCurrentUser(): UserData | null`

Get the currently authenticated user.

**Returns:**
- UserData object if authenticated, null otherwise

#### `onAuthStateChanged(listener: (user: UserData | null) => void): () => void`

Register a listener for authentication state changes.

**Parameters:**
- `listener` - Callback function to be called when auth state changes

**Returns:**
- Function to unsubscribe the listener

## User Service API

### Overview

The User Service (`userService.ts`) handles user profile management, user data operations, and user-related business logic.

### Methods

#### `getUserProfile(userId: string): Promise<UserData | null>`

Get a user's profile by ID.

**Parameters:**
- `userId` - ID of the user to fetch

**Returns:**
- Promise resolving to UserData object or null if not found

**Throws:**
- `UserServiceError` for fetch failures

#### `updateUserProfile(userId: string, profileData: UserProfileUpdate): Promise<UserData>`

Update a user's profile information.

**Parameters:**
- `userId` - ID of the user to update
- `profileData` - Object containing fields to update

**Returns:**
- Promise resolving to updated UserData object

**Throws:**
- `UserServiceError` for update failures

#### `searchUsers(filters: UserSearchFilters, pageSize: number = 20, lastDoc?: DocumentSnapshot): Promise<PaginatedUsers>`

Search for users with pagination.

**Parameters:**
- `filters` - Search filters (role, schoolId, searchTerm)
- `pageSize` - Number of results per page
- `lastDoc` - Last document from previous page for pagination

**Returns:**
- Promise resolving to PaginatedUsers object

**Throws:**
- `UserServiceError` for search failures

## Discipline Service API

### Overview

The Discipline Service (`disciplineService.ts`) handles all discipline incident management including creating, updating, deleting, and querying discipline incidents.

### Methods

#### `createIncident(incident: DisciplineIncident): Promise<DisciplineIncident>`

Create a new discipline incident.

**Parameters:**
- `incident` - Incident data object

**Returns:**
- Promise resolving to created DisciplineIncident with ID

**Throws:**
- `DisciplineServiceError` for creation failures

#### `getIncident(incidentId: string): Promise<DisciplineIncident | null>`

Get a discipline incident by ID.

**Parameters:**
- `incidentId` - ID of the incident to fetch

**Returns:**
- Promise resolving to DisciplineIncident or null if not found

**Throws:**
- `DisciplineServiceError` for fetch failures

#### `updateIncident(incidentId: string, updates: Partial<DisciplineIncident>): Promise<DisciplineIncident>`

Update a discipline incident.

**Parameters:**
- `incidentId` - ID of the incident to update
- `updates` - Object containing fields to update

**Returns:**
- Promise resolving to updated DisciplineIncident

**Throws:**
- `DisciplineServiceError` for update failures

#### `deleteIncident(incidentId: string): Promise<void>`

Delete a discipline incident.

**Parameters:**
- `incidentId` - ID of the incident to delete

**Returns:**
- Promise resolving when deletion is complete

**Throws:**
- `DisciplineServiceError` for deletion failures

#### `searchIncidents(filters: IncidentSearchFilters, pageSize: number = 20, lastDoc?: DocumentSnapshot): Promise<PaginatedIncidents>`

Search for incidents with pagination.

**Parameters:**
- `filters` - Search filters (studentId, teacherId, dateRange, etc.)
- `pageSize` - Number of results per page
- `lastDoc` - Last document from previous page for pagination

**Returns:**
- Promise resolving to PaginatedIncidents object

**Throws:**
- `DisciplineServiceError` for search failures

#### `getIncidentStatistics(schoolId: string, dateFrom: Date, dateTo: Date): Promise<IncidentStatistics>`

Get statistics for incidents in a date range.

**Parameters:**
- `schoolId` - ID of the school
- `dateFrom` - Start date for statistics
- `dateTo` - End date for statistics

**Returns:**
- Promise resolving to IncidentStatistics object

**Throws:**
- `DisciplineServiceError` for statistics failures

## Reporting Service API

### Overview

The Reporting Service (`reportingService.ts`) handles report generation, analytics, and data visualization for discipline incidents.

### Methods

#### `generateStudentReport(studentId: string, dateFrom: Date, dateTo: Date): Promise<StudentBehaviorReport>`

Generate a behavior report for a specific student.

**Parameters:**
- `studentId` - ID of the student
- `dateFrom` - Start date for report
- `dateTo` - End date for report

**Returns:**
- Promise resolving to StudentBehaviorReport object

**Throws:**
- `ReportingServiceError` for report generation failures

#### `generateTeacherReport(teacherId: string, dateFrom: Date, dateTo: Date): Promise<TeacherPerformanceReport>`

Generate a performance report for a specific teacher.

**Parameters:**
- `teacherId` - ID of the teacher
- `dateFrom` - Start date for report
- `dateTo` - End date for report

**Returns:**
- Promise resolving to TeacherPerformanceReport object

**Throws:**
- `ReportingServiceError` for report generation failures

#### `generateSchoolReport(schoolId: string, dateFrom: Date, dateTo: Date): Promise<SchoolReport>`

Generate a comprehensive report for a school.

**Parameters:**
- `schoolId` - ID of the school
- `dateFrom` - Start date for report
- `dateTo` - End date for report

**Returns:**
- Promise resolving to SchoolReport object

**Throws:**
- `ReportingServiceError` for report generation failures

#### `exportReport(report: any, options: ExportOptions): Promise<string>`

Export a report in the specified format.

**Parameters:**
- `report` - Report data to export
- `options` - Export options (format, filename, etc.)

**Returns:**
- Promise resolving to URL or path of exported file

**Throws:**
- `ReportingServiceError` for export failures

## Error Handling

All services use specialized error classes for different types of errors:

- `AuthenticationError` - For authentication-related errors
- `UserServiceError` - For user service-related errors
- `DisciplineServiceError` - For discipline service-related errors
- `ReportingServiceError` - For reporting service-related errors

Each error includes:
- Error message
- Original error (if applicable)
- Error code
- Additional context

## Data Types

### UserData

```typescript
interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'admin' | 'principal';
  schoolId: string;
  createdAt?: Date;
  lastLoginAt?: Date;
}
```

### DisciplineIncident

```typescript
interface DisciplineIncident {
  id?: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  schoolId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  location: string;
  dateTime: Date;
  actionTaken: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  parentNotified: boolean;
  parentNotificationDate?: Date;
  status: IncidentStatus;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

### IncidentType

```typescript
enum IncidentType {
  TARDINESS = 'tardiness',
  ABSENCE = 'absence',
  DISRUPTION = 'disruption',
  DISRESPECT = 'disrespect',
  FIGHTING = 'fighting',
  BULLYING = 'bullying',
  VANDALISM = 'vandalism',
  CHEATING = 'cheating',
  DRESS_CODE = 'dress_code',
  TECHNOLOGY_MISUSE = 'technology_misuse',
  OTHER = 'other',
}
```

### IncidentSeverity

```typescript
enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
```

### IncidentStatus

```typescript
enum IncidentStatus {
  REPORTED = 'reported',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  PENDING_FOLLOWUP = 'pending_followup',
  CLOSED = 'closed',
}
```

## Usage Examples

### Authentication

```typescript
import { authService } from '../services';

// Login
try {
  const user = await authService.signIn('teacher@school.edu', 'password123');
  console.log('Logged in user:', user);
} catch (error) {
  console.error('Login failed:', error.message);
}

// Register new user
try {
  const newUser = await authService.signUp(
    'new.teacher@school.edu',
    'securePassword123',
    'New Teacher',
    'teacher',
    'school-123'
  );
  console.log('Registered new user:', newUser);
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

### Incident Management

```typescript
import { disciplineService, IncidentType, IncidentSeverity, IncidentStatus } from '../services';

// Create new incident
try {
  const newIncident = await disciplineService.createIncident({
    studentId: 'student-123',
    studentName: 'John Doe',
    teacherId: 'teacher-456',
    teacherName: 'Jane Smith',
    schoolId: 'school-789',
    incidentType: IncidentType.DISRUPTION,
    severity: IncidentSeverity.MEDIUM,
    description: 'Disrupted class by talking loudly',
    location: 'Classroom 101',
    dateTime: new Date(),
    actionTaken: 'Verbal warning',
    followUpRequired: false,
    parentNotified: true,
    parentNotificationDate: new Date(),
    status: IncidentStatus.RESOLVED,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'teacher-456',
    updatedBy: 'teacher-456',
  });
  console.log('Created new incident:', newIncident);
} catch (error) {
  console.error('Failed to create incident:', error.message);
}
```

### Reporting

```typescript
import { reportingService } from '../services';

// Generate school report
try {
  const dateFrom = new Date('2023-01-01');
  const dateTo = new Date('2023-12-31');
  const schoolReport = await reportingService.generateSchoolReport('school-123', dateFrom, dateTo);
  console.log('School report:', schoolReport);
  
  // Export report as PDF
  const pdfUrl = await reportingService.exportReport(schoolReport, {
    format: 'pdf',
    filename: 'school-report-2023',
    includeCharts: true,
  });
  console.log('PDF report available at:', pdfUrl);
} catch (error) {
  console.error('Failed to generate report:', error.message);
}
```

## Best Practices

1. **Error Handling** - Always wrap service calls in try/catch blocks to handle errors gracefully
2. **Authentication** - Check user authentication status before making service calls
3. **Permissions** - Verify user permissions before accessing sensitive data
4. **Data Validation** - Validate input data before passing to service methods
5. **Offline Support** - Handle offline scenarios with appropriate UI feedback
6. **Loading States** - Show loading indicators during service operations
7. **Caching** - Utilize service caching for frequently accessed data
8. **Pagination** - Use pagination for large data sets to improve performance

## Service Dependencies

All services have dependencies on base utilities:

- `retryUtils` - For retrying failed operations
- `validationService` - For input validation
- `cacheService` - For data caching
- `rateLimitUtils` - For rate limiting API calls
- `telemetryService` - For tracking events and errors

## Conclusion

This API documentation provides a comprehensive reference for the MCC Discipline Tracker application's service layer. Developers should follow the patterns and best practices outlined in this document when interacting with the application's API.