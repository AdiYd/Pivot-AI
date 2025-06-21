"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { 
  Firestore, 
  getFirestore, 
  collection, 
  getDocs
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
let db: Firestore;

// Only initialize Firebase if we're in the browser and it hasn't been initialized yet
if (typeof window !== 'undefined' && getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { app, db };

// Context interface for database only
interface FirebaseContextValue {
  database: DataBase | null;
  databaseLoading: boolean;
  refreshDatabase: () => Promise<void>;
}

// Create firebase context with default values
const FirebaseContext = createContext<FirebaseContextValue>({
  database: null,
  databaseLoading: true,
  refreshDatabase: async () => {},
});

// Firebase provider that only manages database state
export function FirebaseAppProvider({ children }: { children: ReactNode }) {
  const [database, setDatabase] = useState<DataBase | null>(null);
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
          const data = { ...doc.data() };
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
          const data = {...doc.data() };
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
          const data = { ...doc.data() };
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

      // console.log(`Database loaded: ${Object.keys(restaurants).length} restaurants, ${Object.keys(orders).length} orders, ${Object.keys(conversations).length} conversations`);
      
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

  // Fetch database on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !db) return;
    fetchDatabase().then(setDatabase);
  }, []);

  const value = {
    database,
    databaseLoading,
    refreshDatabase,
  };

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

// Simple hook to access Firebase context
export const useFirebase = () => useContext(FirebaseContext);