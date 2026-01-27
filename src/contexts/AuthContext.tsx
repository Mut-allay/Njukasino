// src/contexts/AuthContext.tsx

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import type { UserCredential, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { FirebaseError } from 'firebase/app';

interface UserData {
  phone: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  isOver18?: boolean;
  acceptedTerms?: boolean;
  onboarded?: boolean;
  onboardedAt?: string;
  createdAt?: string;
  email?: string;
  wallet?: number;
  wallet_balance?: number;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  signUpWithPhonePassword: (
    phone: string, 
    password: string, 
    firstName?: string, 
    lastName?: string
  ) => Promise<UserCredential | null>;
  signInWithPhonePassword: (phone: string, password: string) => Promise<UserCredential | null>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  // Real-time Firestore listener for user data
  useEffect(() => {
    if (!currentUser?.uid) {
      setUserData(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribeSnapshot = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
          setUserData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('User data snapshot error:', err);
        setError('Failed to load user data');
        setLoading(false);
      }
    );

    return unsubscribeSnapshot;
  }, [currentUser?.uid]);

  const formatFakeEmail = (phone: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = phone.replace(/[^0-9]/g, '');
    // Ensure phone doesn't start with +, create valid email
    return `phone_${cleaned}@njuka-auth.local`;
  };

  const signUpWithPhonePassword = async (
    phone: string, 
    password: string, 
    firstName?: string, 
    lastName?: string
  ) => {
    setError(null);
    try {
      const fakeEmail = formatFakeEmail(phone);
      const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
      
      // Create Firestore document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        phone,
        firstName: firstName || '',
        lastName: lastName || '',
        createdAt: new Date().toISOString(),
        email: fakeEmail,
        onboarded: false,
        wallet: 0,
        wallet_balance: 0,
      });

      return userCredential;
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            setError('This phone number is already registered.');
            break;
          case 'auth/invalid-email':
            setError('Invalid phone number format.');
            break;
          case 'auth/weak-password':
            setError('Password must be at least 6 characters.');
            break;
          case 'auth/network-request-failed':
            setError('Network error. Please check your connection.');
            break;
          default:
            setError('An error occurred during sign up. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
      console.error('Sign up error:', err);
      return null;
    }
  };

  const signInWithPhonePassword = async (phone: string, password: string) => {
    setError(null);
    try {
      // Validate phone and password
      if (!phone || !password) {
        setError('Phone number and password are required.');
        return null;
      }

      if (!/^\d{10,}$/.test(phone.replace(/\D/g, ''))) {
        setError('Invalid phone number format.');
        return null;
      }

      const fakeEmail = formatFakeEmail(phone);
      const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
      return userCredential;
    } catch (err) {
      if (err instanceof FirebaseError) {
        console.error(`FirebaseError [${err.code}]:`, err.message);
        switch (err.code) {
          case 'auth/user-not-found':
            setError('This phone number is not registered. Please sign up first.');
            break;
          case 'auth/wrong-password':
            setError('Incorrect password. Please try again.');
            break;
          case 'auth/invalid-credential':
            setError('Invalid phone number or password.');
            break;
          case 'auth/invalid-email':
            setError('Invalid phone number format.');
            break;
          case 'auth/too-many-requests':
            setError('Too many failed attempts. Please try again later.');
            break;
          default:
            setError(`Authentication error: ${err.code}. Please try again.`);
        }
      } else {
        setError('An unexpected error occurred.');
      }
      console.error('Sign in error:', err);
      return null;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUserData(null);
    } catch (err) {
      setError('Failed to log out. Please try again.');
      console.error('Logout error:', err);
    }
  };

  const refreshUserData = async () => {
    // onSnapshot handles real-time updates, but this can be called manually if needed
    return Promise.resolve();
  };

  const value = {
    currentUser,
    userData,
    loading,
    error,
    signUpWithPhonePassword,
    signInWithPhonePassword,
    logout,
    refreshUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (undefined === context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
