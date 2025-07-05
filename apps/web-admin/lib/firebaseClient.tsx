"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback, use } from "react";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { 
  Firestore, 
  getFirestore, 
  collection, 
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  setDoc,
  deleteField,
  FieldValue,
  deleteDoc
} from "firebase/firestore";
import { DataBase, Order, Restaurant, Conversation, Contact, Supplier, Message } from "@/schema/types";
import { RestaurantSchema, OrderSchema, ConversationSchema, MessageSchema, SupplierSchema } from "@/schema/schemas";


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
export interface FirebaseContextValue {
  database: DataBase;
  databaseLoading: boolean;
  refreshDatabase: () => Promise<void>;
  toggleSource: () => void;
  source: string;
}

// Create firebase context with default values
const FirebaseContext = createContext<FirebaseContextValue>({
  database: {} as DataBase,
  databaseLoading: true,
  refreshDatabase: async () => {},
  toggleSource: () => {},
  source: '_simulator',
});

const emptyDatabase: DataBase = {
  restaurants: {},
  orders: {},
  conversations: {},
};

// Firebase provider that only manages database state
export function FirebaseAppProvider({ children }: { children: ReactNode }) {
  const [database, setDatabase] = useState<DataBase>(emptyDatabase);
  const [databaseLoading, setDatabaseLoading] = useState(true);
  const [source, setSource] = useState<string>('');


  // Helper function to fetch all collections and build database object
  const fetchDatabase = useCallback(async (): Promise<DataBase> => {
    if (typeof window === 'undefined' || !db) return emptyDatabase;

    try {
      setDatabaseLoading(true);
      // Fetch all collections in parallel
      const [restaurantsSnap, ordersSnap, conversationsSnap] = await Promise.all([
        getDocs(collection(db, `restaurants${source}`)),
        getDocs(collection(db, `orders${source}`)),
        getDocs(collection(db, `conversations${source}`))
      ]);


      // Parse restaurants with validation
      const restaurants: Record<string, Restaurant> = {};
      restaurantsSnap.forEach(async (docs) => {
        try {
          const data = { ...docs.data() };
          
          // Collect all suppliers from suppliers collection
          const suppliersCollection = collection(db, `restaurants${source}`, docs.id, 'suppliers');
          const suppliersSnap = await getDocs(suppliersCollection);
          const suppliers: Supplier[] = [];
          suppliersSnap.forEach((supplierDoc) => {
            const supplierData = { ...supplierDoc.data() };
            const parsed = SupplierSchema.parse(supplierData);
            suppliers.push(parsed);
          });
          data.suppliers = suppliers;

          const parsed = RestaurantSchema.parse(data);
          restaurants[docs.id] = parsed;
        } catch (error) {
          console.warn(`Failed to parse restaurant ${docs.id}:`, error);
        }
      });

      // Parse orders with validation
      const orders: Record<string, Order> = {};
      ordersSnap.forEach(async (doc) => {
        try {
          const data = {...doc.data() } as Order;
          const parsed = OrderSchema.parse(data);
          orders[doc.id] = parsed;
        } catch (error) {
          console.warn(`Failed to parse order ${doc.id}:`, error);
        }
      });

      // Parse conversations with validation
      const conversations: Record<string, Conversation> = {};
      // Create an array to store all the message loading promises
      const messageLoadingPromises: Promise<void>[] = [];

      conversationsSnap.forEach(async (doc) => {
        try {
          const data = { ...doc.data() };
          const parsed =  ConversationSchema.parse(data);
          // Add this conversation to the collection with empty messages initially
          conversations[doc.id] = {
            ...parsed,
          };
          
          // Create a promise for loading messages and add to our array
          const messagesPromise = async () => {
            // Fetch messages for this conversation order by timestamp with ascending order
            const messagesCollectionRef = query(collection(db, `conversations${source}`, doc.id, 'messages'), orderBy('createdAt', 'asc'));
            const messagesSnap = await getDocs(messagesCollectionRef);
            const loadedMessages = messagesSnap.docs.map(msgDoc => {
              const msgData = msgDoc.data() as Message;
              const parsed = MessageSchema.parse(msgData);
              return parsed;
            });
            // Update the conversation with loaded messages
            // conversations[doc.id].messages = [...conversations[doc.id].messages, ...loadedMessages];
            conversations[doc.id].messages = [ ...loadedMessages];
          };
          
          messageLoadingPromises.push(messagesPromise());
        } catch (error) {
          console.warn(`Failed to parse conversation ${doc.id}:`, error);
        }
      });

      // Wait for all message loading to complete
      await Promise.all(messageLoadingPromises);


      const databaseObject = {
        restaurants,
        orders,
        conversations,
      } as DataBase;
      console.log('Database:', databaseObject);

      // console.log(`Database loaded: ${Object.keys(restaurants).length} restaurants, ${Object.keys(orders).length} orders, ${Object.keys(conversations).length} conversations`);
      
      return databaseObject;
    } catch (error) {
      console.error('Error fetching database:', error);
      return emptyDatabase;
    } finally {
      setDatabaseLoading(false);
    }
  }, [source]);

  // Function to update contacts from array to map
  const updateContacts = async() => {
    // Iterate through each restaurant and convert contacts array to map (e.g from [{ whatsapp: '123', name: 'John' }] to { '123': { whatsapp: '123', name: 'John' } })
    const restaurantSnap = await getDocs(collection(db, 'restaurants_simulator'));
    restaurantSnap.forEach((doc) => {
      const data = doc.data();
      // Update the 'contacts' field to be a map (e.g from : [{ whatsapp: '123', name: 'John' }] to { '123': { whatsapp: '123', name: 'John' } })
      updateDoc(doc.ref, {
        contacts: data.contacts.reduce((acc: Record<string, Contact>, contact: { whatsapp: string; name: string, email: string , role: Contact['role'] }) => {
            acc[contact.whatsapp] = { whatsapp: contact.whatsapp, name: contact.name , ...(contact.email ? { email: contact.email } : {}), role: contact.role };
            return acc;
        }, {})
      });
      console.log(`Updated contacts for restaurant ${doc.id} with ${data.contacts.length} contacts`);
    });
  };

  // Refresh database function
  const refreshDatabase = useCallback(async () => {
    const db = await fetchDatabase();
    setDatabase(db);
  }, [fetchDatabase]);

    useEffect(() => {
    refreshDatabase();
  }, [source, refreshDatabase]);

  // Fetch database on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !db) return;
    fetchDatabase().then(setDatabase);
  }, [fetchDatabase]);

  const value = useMemo(() => ({
    database,
    databaseLoading,
    refreshDatabase,
    source,
    toggleSource: () => setSource(p => p ? '' : '_simulator')
  } as FirebaseContextValue), [database, databaseLoading, refreshDatabase, source]);

  return <FirebaseContext.Provider value={value}>
    {children}
    </FirebaseContext.Provider>;
}

// Simple hook to access Firebase context
export const useFirebase = () => useContext(FirebaseContext as React.Context<FirebaseContextValue>);