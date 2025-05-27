/**
 * Login Screen Component
 * 
 * This component provides the user interface for user authentication.
 * It integrates with the AuthContext to handle login functionality.
 * 
 * @fileoverview Login screen with email/password authentication
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

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, ScreenNames.Login>;

/**
 * Login Screen Component
 * Provides user interface for authentication with email and password
 */
const LoginScreen: React.FC = () => {
  // State for form fields and validation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Get authentication context and navigation
  const { login, error, clearError, isLoading } = useAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  
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
   * Handle login form submission
   */
  const handleLogin = async () => {
    // Clear any previous errors
    clearError();
    
    // Validate form fields
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    try {
      await login(email, password);
      // Navigation is handled by AppNavigator based on auth state
    } catch (err) {
      // Error is handled by AuthContext and displayed below
      console.error('Login error:', err);
    }
  };
  
  /**
   * Navigate to registration screen
   */
  const navigateToRegister = () => {
    navigation.navigate(ScreenNames.Register);
  };
  
  /**
   * Navigate to forgot password screen
   */
  const navigateToForgotPassword = () => {
    navigation.navigate(ScreenNames.ForgotPassword);
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
          <Text style={styles.headerText}>Login</Text>
          <Text style={styles.subHeaderText}>Sign in to your account</Text>
          
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
              placeholder="Enter your password"
              placeholderTextColor={theme.Colors.mediumGray}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onBlur={validatePassword}
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>
          
          {/* Forgot Password Link */}
          <TouchableOpacity 
            style={styles.forgotPasswordContainer} 
            onPress={navigateToForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
          
          {/* Login Button */}
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
          
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.registerLink}>Register</Text>
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: theme.Spacing.m,
  },
  forgotPasswordText: {
    ...theme.Typography.link,
  },
  loginButton: {
    backgroundColor: theme.Colors.primary,
    borderRadius: theme.Borders.radiusSmall,
    padding: theme.Spacing.m,
    alignItems: 'center',
    marginBottom: theme.Spacing.m,
  },
  loginButtonText: {
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.Spacing.m,
  },
  registerText: {
    ...theme.Typography.body1,
  },
  registerLink: {
    ...theme.Typography.link,
  },
});

export default LoginScreen;