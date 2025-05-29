"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut, User, Auth, signInWithEmailLink, isSignInWithEmailLink, sendSignInLinkToEmail } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Context interface
interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  sendSignInLink: (email: string) => Promise<void>;
  signInWithLink: (email: string) => Promise<User | null>;
}

// Create firebase context
const FirebaseContext = createContext<FirebaseContextValue>({
  app: null,
  auth: null,
  db: null,
  storage: null,
  user: null,
  loading: true,
  signOut: async () => {},
  sendSignInLink: async () => {},
  signInWithLink: async () => null,
});

// Firebase app provider
export function FirebaseAppProvider({ children }: { children: ReactNode }) {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [storage, setStorage] = useState<FirebaseStorage | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Firebase
  useEffect(() => {
    let firebaseApp;
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }

    const firebaseAuth = getAuth(firebaseApp);
    const firebaseDb = getFirestore(firebaseApp);
    const firebaseStorage = getStorage(firebaseApp);

    setApp(firebaseApp);
    setAuth(firebaseAuth);
    setDb(firebaseDb);
    setStorage(firebaseStorage);

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign out
  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  // Send sign-in link
  const handleSendSignInLink = async (email: string) => {
    if (auth) {
      const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
    }
  };

  // Sign in with link
  const handleSignInWithLink = async (email: string) => {
    if (auth && isSignInWithEmailLink(auth, window.location.href)) {
      try {
        const result = await signInWithEmailLink(auth, email);
        window.localStorage.removeItem("emailForSignIn");
        return result.user;
      } catch (error) {
        console.error("Error signing in with link:", error);
        return null;
      }
    }
    return null;
  };

  const value = {
    app,
    auth,
    db,
    storage,
    user,
    loading,
    signOut: handleSignOut,
    sendSignInLink: handleSendSignInLink,
    signInWithLink: handleSignInWithLink,
  };

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

// Hook to use firebase context
export const useFirebase = () => useContext(FirebaseContext);
