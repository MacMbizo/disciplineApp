/**
 * Registration Screen Component
 * 
 * This component provides the user interface for new user registration.
 * It integrates with the AuthContext to handle registration functionality.
 * 
 * @fileoverview Registration screen with email/password/name fields
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../../contexts/AuthContext';
import { RootStackParamList, ScreenNames } from '../../../navigation/AppNavigator';
import theme from '../../../config/theme';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, ScreenNames.Register>;

/**
 * Registration Screen Component
 * Provides user interface for new user registration
 */
const RegisterScreen: React.FC = () => {
  // State for form fields and validation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  
  // Get authentication context and navigation
  const { register, error, clearError, isLoading } = useAuth();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  
  /**
   * Validate email format
   * @returns boolean indicating if email is valid
   */
  const validateEmail = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!isValid) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError('');
    return true;
  };
  
  /**
   * Validate password
   * @returns boolean indicating if password is valid
   */
  const validatePassword = (): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    
    setPasswordError('');
    return true;
  };
  
  /**
   * Validate confirm password
   * @returns boolean indicating if confirm password is valid
   */
  const validateConfirmPassword = (): boolean => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    
    setConfirmPasswordError('');
    return true;
  };
  
  /**
   * Validate display name
   * @returns boolean indicating if display name is valid
   */
  const validateDisplayName = (): boolean => {
    if (!displayName) {
      setDisplayNameError('Name is required');
      return false;
    } else if (displayName.length < 2) {
      setDisplayNameError('Name must be at least 2 characters');
      return false;
    }
    
    setDisplayNameError('');
    return true;
  };
  
  /**
   * Handle registration form submission
   */
  const handleRegister = async () => {
    // Clear any previous errors
    clearError();
    
    // Validate form fields
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();
    const isDisplayNameValid = validateDisplayName();
    
    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isDisplayNameValid) {
      return;
    }
    
    try {
      await register(email, password, displayName);
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully. You can now log in.',
        [{ text: 'OK', onPress: () => navigation.navigate(ScreenNames.Login) }]
      );
    } catch (err) {
      // Error is handled by AuthContext and displayed below
      console.error('Registration error:', err);
    }
  };
  
  /**
   * Navigate to login screen
   */
  const navigateToLogin = () => {
    navigation.navigate(ScreenNames.Login);
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../../assets/mcc-logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>MCC Discipline Tracker</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.headerText}>Register</Text>
          <Text style={styles.subHeaderText}>Create a new account</Text>
          
          {/* Display Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, displayNameError ? styles.inputError : null]}
              placeholder="Enter your full name"
              placeholderTextColor={theme.Colors.mediumGray}
              autoCapitalize="words"
              value={displayName}
              onChangeText={setDisplayName}
              onBlur={validateDisplayName}
            />
            {displayNameError ? <Text style={styles.errorText}>{displayNameError}</Text> : null}
          </View>
          
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Enter your email"
              placeholderTextColor={theme.Colors.mediumGray}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onBlur={validateEmail}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>
          
          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="Create a password"
              placeholderTextColor={theme.Colors.mediumGray}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onBlur={validatePassword}
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>
          
          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={[styles.input, confirmPasswordError ? styles.inputError : null]}
              placeholder="Confirm your password"
              placeholderTextColor={theme.Colors.mediumGray}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={validateConfirmPassword}
            />
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
          </View>
          
          {/* Register Button */}
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
          
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.Colors.white,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.Spacing.m,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.Spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: theme.Spacing.s,
  },
  appTitle: {
    ...theme.Typography.h2,
    color: theme.Colors.primary,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: theme.Colors.white,
    borderRadius: theme.Borders.radiusMedium,
    padding: theme.Spacing.m,
    ...theme.Shadows.card,
  },
  headerText: {
    ...theme.Typography.h1,
    marginBottom: theme.Spacing.xs,
    textAlign: 'center',
  },
  subHeaderText: {
    ...theme.Typography.body1,
    marginBottom: theme.Spacing.l,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: theme.Spacing.m,
  },
  inputLabel: {
    ...theme.Typography.body2,
    marginBottom: theme.Spacing.xs,
    color: theme.Colors.textPrimary,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.Colors.dividerGray,
    borderRadius: theme.Borders.radiusSmall,
    paddingHorizontal: theme.Spacing.m,
    ...theme.Typography.inputText,
  },
  inputError: {
    borderColor: theme.Colors.error,
  },
  registerButton: {
    backgroundColor: theme.Colors.primary,
    borderRadius: theme.Borders.radiusSmall,
    padding: theme.Spacing.m,
    alignItems: 'center',
    marginBottom: theme.Spacing.m,
  },
  registerButtonText: {
    ...theme.Typography.buttonTextPrimary,
  },
  errorContainer: {
    backgroundColor: theme.Colors.primaryUltraLight,
    borderWidth: 1,
    borderColor: theme.Colors.error,
    borderRadius: theme.Borders.radiusSmall,
    padding: theme.Spacing.m,
    marginBottom: theme.Spacing.m,
  },
  errorText: {
    color: theme.Colors.error,
    ...theme.Typography.body2,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.Spacing.m,
  },
  loginText: {
    ...theme.Typography.body1,
  },
  loginLink: {
    ...theme.Typography.link,
  },
});

export default RegisterScreen;