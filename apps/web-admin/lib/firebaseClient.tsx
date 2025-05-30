"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  sendSignInLinkToEmail as firebaseSendSignInLink, 
  isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  type User 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Simple Firebase config directly from env vars
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Context interface with only what we need
interface FirebaseContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  sendSignInLink: (email: string) => Promise<void>;
  signInWithLink: (email: string) => Promise<User | null>;
}

// Create firebase context with default values
const FirebaseContext = createContext<FirebaseContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  sendSignInLink: async () => {},
  signInWithLink: async () => null,
});

// Simple Firebase provider that only manages auth state
export function FirebaseAppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Simple sign out function
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Send sign-in link with redirect URL based on current domain
  const handleSendSignInLink = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      };
      await firebaseSendSignInLink(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
    } catch (error) {
      console.error("Error sending sign-in link:", error);
      throw error;
    }
  };

  // Sign in with email link
  const handleSignInWithLink = async (email: string) => {
    try {
      if (firebaseIsSignInWithEmailLink(auth, window.location.href)) {
        const result = await firebaseSignInWithEmailLink(auth, email);
        window.localStorage.removeItem("emailForSignIn");
        return result.user;
      }
      return null;
    } catch (error) {
      console.error("Error signing in with link:", error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    signOut: handleSignOut,
    sendSignInLink: handleSendSignInLink,
    signInWithLink: handleSignInWithLink,
  };

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

// Simple hook to access Firebase context
export const useFirebase = () => useContext(FirebaseContext);


  // Sign in with link
  const handleSignInWithLink = async (email: string) => {
    if (auth) {
      try {
        const { isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth');
        if (isSignInWithEmailLink(auth, window.location.href)) {
          const result = await signInWithEmailLink(auth, email);
          window.localStorage.removeItem("emailForSignIn");
          return result.user;
        }
      } catch (error) {
        console.error("Error signing in with link:", error);
      }
    }
    return null;
  };


