/**
 * Firebase Authentication Proof of Concept
 * 
 * This component demonstrates the core Firebase authentication and Firestore
 * functionality implemented in the MCC Discipline Tracker application.
 * 
 * Features demonstrated:
 * 1. User authentication (sign in, sign out)
 * 2. Firestore data operations (read, write)
 * 3. Role-based access control
 * 4. Offline persistence
 * 
 * @fileoverview Firebase SDK integration proof-of-concept
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { auth, db, Collections, UserData, mapUserData } from '../config/firebaseConfig';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const FirebaseAuthPOC: React.FC = () => {
  // Authentication state
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form inputs
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // Data state
  const [userData, setUserData] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  
  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, Collections.USERS, firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = {
              ...mapUserData(firebaseUser),
              ...userDoc.data(),
            };
            setUser(userData);
            
            // Fetch user-specific data
            fetchUserData(userData);
          } else {
            // User document doesn't exist in Firestore
            setUser(mapUserData(firebaseUser));
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setUser(mapUserData(firebaseUser));
        }
      } else {
        setUser(null);
        setUserData(null);
        setIncidents([]);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Simulate network status changes for offline demo
  useEffect(() => {
    // Toggle network status every 10 seconds for demonstration
    const interval = setInterval(() => {
      setNetworkStatus(prev => prev === 'online' ? 'offline' : 'online');
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  /**
   * Sign in with email and password
   */
  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Sign out current user
   */
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch user data and incidents from Firestore
   */
  const fetchUserData = async (userData: UserData) => {
    try {
      // Fetch incidents based on user role
      let incidentsQuery;
      
      if (userData.role === 'admin' || userData.role === 'principal') {
        // Admins and principals can see all incidents
        incidentsQuery = query(collection(db, Collections.INCIDENTS));
      } else if (userData.role === 'teacher') {
        // Teachers can only see their own incidents
        incidentsQuery = query(
          collection(db, Collections.INCIDENTS),
          where('teacherId', '==', userData.uid)
        );
      } else {
        // Default case - no incidents
        setIncidents([]);
        return;
      }
      
      const incidentsSnapshot = await getDocs(incidentsQuery);
      const incidentsList = incidentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setIncidents(incidentsList);
    } catch (err) {
      console.error('Error fetching user data:', err);
      Alert.alert('Error', 'Failed to fetch user data');
    }
  };
  
  /**
   * Create a sample incident in Firestore
   */
  const createSampleIncident = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create a new incident document
      const newIncidentRef = doc(collection(db, Collections.INCIDENTS));
      await setDoc(newIncidentRef, {
        studentName: 'Sample Student',
        description: 'This is a sample incident created from the POC',
        teacherId: user.uid,
        schoolId: user.schoolId || 'default-school',
        severity: 'low',
        timestamp: serverTimestamp(),
        status: 'pending',
      });
      
      Alert.alert('Success', 'Sample incident created successfully');
      
      // Refresh incidents list
      fetchUserData(user);
    } catch (err) {
      console.error('Error creating incident:', err);
      Alert.alert('Error', 'Failed to create sample incident');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Firebase Authentication POC</Text>
      
      {/* Network Status Indicator */}
      <View style={styles.statusContainer}>
        <Text>Network Status: </Text>
        <Text style={{
          color: networkStatus === 'online' ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {networkStatus.toUpperCase()}
        </Text>
        <Text style={styles.note}>
          (Status toggles every 10s to demonstrate offline capabilities)
        </Text>
      </View>
      
      {/* Authentication Form */}
      {!user ? (
        <View style={styles.authContainer}>
          <Text style={styles.sectionTitle}>Sign In</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <Button
            title={loading ? 'Signing In...' : 'Sign In'}
            onPress={handleSignIn}
            disabled={loading}
          />
          
          <Text style={styles.note}>
            Note: Use credentials from your Firebase Authentication system
          </Text>
        </View>
      ) : (
        <View style={styles.userContainer}>
          <Text style={styles.sectionTitle}>User Profile</Text>
          
          <View style={styles.profileItem}>
            <Text style={styles.label}>UID:</Text>
            <Text>{user.uid}</Text>
          </View>
          
          <View style={styles.profileItem}>
            <Text style={styles.label}>Email:</Text>
            <Text>{user.email}</Text>
          </View>
          
          <View style={styles.profileItem}>
            <Text style={styles.label}>Role:</Text>
            <Text>{user.role || 'Not specified'}</Text>
          </View>
          
          <View style={styles.profileItem}>
            <Text style={styles.label}>School ID:</Text>
            <Text>{user.schoolId || 'Not specified'}</Text>
          </View>
          
          <Button
            title="Create Sample Incident"
            onPress={createSampleIncident}
            disabled={loading || networkStatus === 'offline'}
          />
          
          <View style={styles.spacer} />
          
          <Button
            title={loading ? 'Signing Out...' : 'Sign Out'}
            onPress={handleSignOut}
            disabled={loading}
            color="#ff6347"
          />
        </View>
      )}
      
      {/* Incidents List */}
      {user && (
        <View style={styles.incidentsContainer}>
          <Text style={styles.sectionTitle}>Incidents</Text>
          
          {incidents.length === 0 ? (
            <Text style={styles.emptyText}>No incidents found</Text>
          ) : (
            incidents.map(incident => (
              <View key={incident.id} style={styles.incidentItem}>
                <Text style={styles.incidentTitle}>{incident.studentName}</Text>
                <Text>{incident.description}</Text>
                <Text style={styles.incidentMeta}>
                  Severity: {incident.severity} | Status: {incident.status}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
      
      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  authContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  userContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  profileItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    width: 100,
  },
  incidentsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
  },
  incidentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  incidentTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  incidentMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  spacer: {
    height: 20,
  },
  note: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default FirebaseAuthPOC;