/**
 * Forgot Password Screen Component
 * 
 * This component provides the user interface for password reset functionality.
 * It integrates with the AuthContext to handle password reset requests.
 * 
 * @fileoverview Forgot password screen with email field
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

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, ScreenNames.ForgotPassword>;

/**
 * Forgot Password Screen Component
 * Provides user interface for password reset requests
 */
const ForgotPasswordScreen: React.FC = () => {
  // State for form fields and validation
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  
  // Get authentication context and navigation
  const { resetPassword, error, clearError, isLoading } = useAuth();
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  
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
   * Handle password reset request submission
   */
  const handleResetPassword = async () => {
    // Clear any previous errors
    clearError();
    
    // Validate email
    const isEmailValid = validateEmail();
    if (!isEmailValid) {
      return;
    }
    
    try {
      await resetPassword(email);
      setResetSent(true);
      Alert.alert(
        'Reset Email Sent',
        'If an account exists with this email, you will receive password reset instructions.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      // Error is handled by AuthContext and displayed below
      console.error('Password reset error:', err);
    }
  };
  
  /**
   * Navigate to login screen
   */
  const navigateToLogin = () => {
    navigation.navigate(ScreenNames.Login);
  };
  
  /**
   * Navigate to registration screen
   */
  const navigateToRegister = () => {
    navigation.navigate(ScreenNames.Register);
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
          <Text style={styles.headerText}>Reset Password</Text>
          <Text style={styles.subHeaderText}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
          
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
          
          {/* Reset Password Button */}
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={handleResetPassword}
            disabled={isLoading || resetSent}
          >
            <Text style={styles.resetButtonText}>
              {isLoading ? 'Sending...' : resetSent ? 'Email Sent' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
          
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {/* Success Message */}
          {resetSent && !error ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                Reset instructions sent. Please check your email inbox.
              </Text>
            </View>
          ) : null}
          
          {/* Login Link */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Remember your password? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
          
          {/* Register Link */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.link}>Register</Text>
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
  resetButton: {
    backgroundColor: theme.Colors.primary,
    borderRadius: theme.Borders.radiusSmall,
    padding: theme.Spacing.m,
    alignItems: 'center',
    marginBottom: theme.Spacing.m,
  },
  resetButtonText: {
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
  successContainer: {
    backgroundColor: theme.Colors.successLight,
    borderWidth: 1,
    borderColor: theme.Colors.success,
    borderRadius: theme.Borders.radiusSmall,
    padding: theme.Spacing.m,
    marginBottom: theme.Spacing.m,
  },
  successText: {
    color: theme.Colors.success,
    ...theme.Typography.body2,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.Spacing.s,
  },
  linkText: {
    ...theme.Typography.body1,
  },
  link: {
    ...theme.Typography.link,
  },
});

export default ForgotPasswordScreen;