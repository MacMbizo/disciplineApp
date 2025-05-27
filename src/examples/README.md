# Firebase SDK Integration Examples

This directory contains proof-of-concept (POC) examples that demonstrate the integration of Firebase SDK in the MCC Discipline Tracker application. These examples serve as practical references for developers to understand how to use Firebase services in the application.

## Available Examples

### 1. Firebase Authentication POC (`FirebaseAuthPOC.tsx`)

This component demonstrates the core Firebase authentication and Firestore functionality implemented in the application.

**Features demonstrated:**

- User authentication (sign in, sign out)
- Firestore data operations (read, write)
- Role-based access control
- Offline persistence

### 2. Navigation with Authentication POC (`NavigationWithAuthPOC.tsx`)

This component demonstrates how to implement role-based navigation using Firebase authentication.

**Features demonstrated:**

- Protected routes based on authentication state
- Role-based access control for navigation
- Authentication state persistence
- Navigation guards

### How to Use

To use these examples in your development workflow:

1. Import the example component in your screen or navigation:

```tsx
import FirebaseAuthPOC from '../examples/FirebaseAuthPOC';

// Then use it in your component
const YourComponent = () => {
  return (
    <View>
      <FirebaseAuthPOC />
    </View>
  );
};
```

2. Ensure you have configured Firebase correctly in `src/config/firebaseConfig.ts`

3. Use valid Firebase Authentication credentials to test the functionality

## Testing Offline Capabilities

The Firebase Authentication POC includes a simulated network status toggle to demonstrate offline capabilities. In a real-world scenario, you would use React Native's NetInfo to detect actual network status changes.

## Security Rules Testing

The examples are designed to work with the security rules defined in `firestore.rules`. To fully test role-based access control:

1. Create users with different roles (admin, principal, teacher)
2. Sign in with each user type
3. Observe how the application behavior changes based on user roles

## Notes for Developers

- These examples are for demonstration purposes and should not be used directly in production
- They demonstrate best practices for Firebase integration in React Native
- Use these as reference when implementing similar functionality in the actual application
- The examples follow the established service layer pattern with proper error handling

## Related Files

- `src/config/firebaseConfig.ts` - Firebase configuration and initialization
- `firestore.rules` - Firestore security rules
- `src/services/authService.ts` - Authentication service implementation