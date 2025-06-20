"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  sendSignInLinkToEmail as firebaseSendSignInLink, 
  isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  type User, 
  Auth
} from "firebase/auth";
import { 
  doc, 
  Firestore, 
  getFirestore, 
  onSnapshot, 
  collection, 
  getDocs,
  DocumentData,
  QuerySnapshot
} from "firebase/firestore";
import { DataBase, Order, Restaurant, Conversation } from "@/schema/types";
import { RestaurantSchema, OrderSchema, ConversationSchema } from "@/schema/schemas";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only on the client side
let app: FirebaseApp | undefined;
let auth: Auth;
let db: Firestore;

// Only initialize Firebase if we're in the browser and it hasn't been initialized yet
if (typeof window !== 'undefined' && getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };

// Context interface with only what we need
interface FirebaseContextValue {
  user: User | null;
  database: DataBase | null;
  loading: boolean;
  databaseLoading: boolean;
  signOut: () => Promise<void>;
  sendSignInLink: (email: string) => Promise<void>;
  signInWithLink: (email: string) => Promise<User | null>;
  refreshDatabase: () => Promise<void>;
}

// Create firebase context with default values
const FirebaseContext = createContext<FirebaseContextValue>({
  user: null,
  database: null,
  loading: true,
  databaseLoading: true,
  signOut: async () => {},
  sendSignInLink: async () => {},
  signInWithLink: async () => null,
  refreshDatabase: async () => {},
});

// Simple Firebase provider that only manages auth state
export function FirebaseAppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [database, setDatabase] = useState<DataBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [databaseLoading, setDatabaseLoading] = useState(true);

  // Helper function to fetch all collections and build database object
  const fetchDatabase = async (): Promise<DataBase | null> => {
    if (typeof window === 'undefined' || !db) return null;

    try {
      setDatabaseLoading(true);

      // Fetch all collections in parallel
      const [restaurantsSnap, ordersSnap, conversationsSnap] = await Promise.all([
        getDocs(collection(db, 'restaurants_simulator')),
        getDocs(collection(db, 'orders_simulator')),
        getDocs(collection(db, 'conversations_simulator'))
      ]);

      // Parse restaurants with validation
      const restaurants: Record<string, Restaurant> = {};
      restaurantsSnap.forEach((doc) => {
        try {
          const data = { id: doc.id, ...doc.data() };
          const parsed = RestaurantSchema.parse(data);
          restaurants[doc.id] = parsed;
        } catch (error) {
          console.warn(`Failed to parse restaurant ${doc.id}:`, error);
        }
      });

      // Parse orders with validation
      const orders: Record<string, Order> = {};
      ordersSnap.forEach((doc) => {
        try {
          const data = { id: doc.id, ...doc.data() };
          const parsed = OrderSchema.parse(data);
          orders[doc.id] = parsed;
        } catch (error) {
          console.warn(`Failed to parse order ${doc.id}:`, error);
        }
      });

      // Parse conversations with validation
      const conversations: Record<string, Conversation> = {};
      conversationsSnap.forEach((doc) => {
        try {
          const data = { id: doc.id, ...doc.data() };
          const parsed = ConversationSchema.parse(data);
          conversations[doc.id] = parsed;
        } catch (error) {
          console.warn(`Failed to parse conversation ${doc.id}:`, error);
        }
      });

      const databaseObject: DataBase = {
        restaurants,
        orders,
        conversations
      };

      console.log(`Database loaded: ${Object.keys(restaurants).length} restaurants, ${Object.keys(orders).length} orders, ${Object.keys(conversations).length} conversations`);
      
      return databaseObject;
    } catch (error) {
      console.error('Error fetching database:', error);
      return null;
    } finally {
      setDatabaseLoading(false);
    }
  };

  // Refresh database function
  const refreshDatabase = async () => {
    const db = await fetchDatabase();
    setDatabase(db);
  };

  // Get database from firestore on mount and when user changes
  useEffect(() => {
    if (typeof window === 'undefined' || !db) return;

    // Only fetch database if user is authenticated
    if (user) {
      fetchDatabase().then(setDatabase);
    } else {
      setDatabase(null);
      setDatabaseLoading(false);
    }
  }, [user]);

  // Listen for auth state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetchDatabase().then(setDatabase);

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
      setDatabase(null); // Clear database on sign out
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
    database,
    loading,
    databaseLoading,
    signOut: handleSignOut,
    sendSignInLink: handleSendSignInLink,
    signInWithLink: handleSignInWithLink,
    refreshDatabase,
  };
  console.log('Firebase context:', value);

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

// Simple hook to access Firebase context
export const useFirebase = () => useContext(FirebaseContext);