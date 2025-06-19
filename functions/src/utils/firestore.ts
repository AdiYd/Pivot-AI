import { z } from 'zod';
import * as admin from 'firebase-admin';
import {SupplierSchema, ConversationSchema, MessageSchema} from '../schema/schemas';
import { Conversation, Supplier,SupplierCategory, Restaurant, Contact, Message } from '../schema/types';
import { FieldValue, DocumentReference, Query, CollectionReference } from 'firebase-admin/firestore';



if (!admin.apps?.length) {
  admin.initializeApp();
}
const firestore = admin.firestore();
console.log(`[Firestore] Initialized Firestore with project ID: ${firestore.databaseId}`);

export type BaseName = 'restaurants' | 'orders' | 'conversations';

// Helper function to get collection name based on simulator mode
export function getCollectionName(baseName: BaseName, isSimulator: boolean = false): string {
  return isSimulator ? `${baseName}_simulator` : baseName;
}


// ==== RESTAURANT OPERATIONS ====

/**
 * Create a new restaurant
 * @param data Restaurant data
 * @param isSimulator Whether to use simulator collections
 * @returns The ID of the created restaurant
 */
export async function createRestaurant(data: Restaurant, isSimulator: boolean = false): Promise<string> {
  console.log(`[Firestore] Creating restaurant${isSimulator ? ' (simulator)' : ''}:`, {
    legalId: data.legalId,
    legalName: data.legalName,
    name: data.name
  });

  try {
    // Create the restaurant document
    const restaurantDoc: Restaurant = {
      legalId: data.legalId,
      legalName: data.legalName,
      name: data.name,
      isActivated: false,
      contacts: data.contacts || [{
        whatsapp: "",
        name: "",
        role: "",
        email: ""
      }],
      payment:  {
        provider: "trial",
        status: false,
      },
      suppliers: [],
      orders: [],
      createdAt: FieldValue.serverTimestamp()
    };

    // Use the correct collection based on simulator mode
    const collectionName = getCollectionName('restaurants', isSimulator);
    
    // Use the legalId as the restaurant document ID
    await firestore.collection(collectionName).doc(data.legalId).set(restaurantDoc);
    
    console.log(`[Firestore] ✅ Restaurant "${data.name}" created successfully with ID ${data.legalId}`);
    return data.legalId;
  } catch (error) {
    console.error(`[Firestore] ❌ Error creating restaurant:`, error);
    throw new Error(`Failed to create restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a restaurant by ID (legalId)
 * @param restaurantId Restaurant ID (legalId)
 * @param isSimulator Whether to use simulator collections
 * @returns Restaurant data or null if not found
 */
export async function getRestaurant(restaurantId: Restaurant['legalId'], isSimulator: boolean = false): Promise<Restaurant | null> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const doc = await firestore.collection(collectionName).doc(restaurantId).get();
    
    if (!doc.exists) {
      console.log(`[Firestore] No restaurant found with ID: ${restaurantId}`);
      return null;
    }
    
    return doc.data() as Restaurant;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting restaurant:`, error);
    throw new Error(`Failed to get restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a restaurant by phone number (of any signed contact)
 * @param phone Phone number
 * @param isSimulator Whether to use simulator collections
 * @returns Restaurant reference and data or null if not found
 */
export async function getRestaurantByPhone(
  phone: Contact['whatsapp'], 
  isSimulator: boolean = false
): Promise<{id: string, data: Restaurant, ref: DocumentReference} | null> {
  try {
    console.log(`[Firestore] Looking up restaurant by phone: ${phone}`);
    
    const collectionName = getCollectionName('restaurants', isSimulator);
    const snapshot = await firestore
      .collection(collectionName)
      .where('contacts', 'array-contains', { whatsapp: phone })
      .limit(1)
      .get();
      
    if (snapshot.empty) {
      console.log(`[Firestore] No restaurant found for phone: ${phone}`);
      return null;
    }
    
    const doc = snapshot.docs[0];
    console.log(`[Firestore] ✅ Found restaurant ${doc.id} for phone: ${phone}`);
    
    return {
      id: doc.id,
      data: doc.data() as Restaurant,
      ref: doc.ref
    };
  } catch (error) {
    console.error(`[Firestore] ❌ Error looking up restaurant by phone:`, error);
    throw error;
  }
}



/**
 * Update restaurant activation status (both isActivated and payment status)
 * @param restaurantId Restaurant ID
 * @param isActivated Activation status
 */
export async function updateRestaurantActivation(restaurantId: Restaurant['legalId'], isActivated: boolean, isSimulator: boolean = false): Promise<void> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    await firestore.collection(collectionName).doc(restaurantId).update({
      isActivated,
      'payment.status': isActivated
    });
    
    console.log(`[Firestore] ✅ Updated restaurant ${restaurantId} activation: ${isActivated}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error updating restaurant activation:`, error);
    throw new Error(`Failed to update restaurant activation: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * Get all restaurants
 * @param isSimulator Whether to use simulator collections
 * @returns Array of restaurants
 */
export async function getAllRestaurants(isSimulator: boolean = false): Promise<Restaurant[]> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const snapshot = await firestore.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`[Firestore] No restaurants found`);
      return [];
    }
    
    return snapshot.docs.map(doc => doc.data() as Restaurant);
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting all restaurants:`, error);
    throw new Error(`Failed to get restaurants: ${error instanceof Error ? error.message : String(error)}`);
  }
}



/**
 * Update restaurant contacts
 * @param restaurantId Restaurant ID
 * @param contacts Array of contact objects
 * @returns Updated restaurant data
 */
export async function updateRestaurantContacts(
  restaurantId: Restaurant['legalId'], 
  contacts: Contact[], 
  isSimulator: boolean = false
): Promise<Restaurant | null> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const restaurantRef = firestore.collection(collectionName).doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`);
    }

    await restaurantRef.update({ contacts });

    console.log(`[Firestore] ✅ Updated contacts for restaurant ${restaurantId}`);
    return  restaurantDoc.data() as Restaurant || null;
  } catch (error) {
    console.error(`[Firestore] ❌ Error updating restaurant contacts:`, error);
    throw new Error(`Failed to update restaurant contacts: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// ==== SUPPLIER OPERATIONS ====

/**
 * Add or update supplier for a restaurant
 * @param data Supplier data
 * @returns The supplier ID (whatsapp number)
 */
export async function updateSupplier(
  data: Supplier & { restaurantId: Restaurant['legalId'] },  
  isSimulator: boolean = false
): Promise<string> {
  console.log(`[Firestore] Adding/updating supplier to restaurant${isSimulator ? ' (simulator)' : ''}:`, {
    restaurantId: data.restaurantId,
    name: data.name,
    whatsapp: data.whatsapp
  });

  try {
    
    // Use correct collection based on simulator mode
    const restaurantsCollection = getCollectionName('restaurants', isSimulator);
    
    // Check if restaurant exists
    const restaurantRef = firestore.collection(restaurantsCollection).doc(data.restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
      throw new Error(`Restaurant with ID ${data.restaurantId} not found`);
    }

    // Use the whatsapp number as the supplier document ID for easy reference
    const supplierRef = restaurantRef.collection('suppliers').doc(data.whatsapp);
    
    console.log(`[Firestore] Writing to ${restaurantsCollection}/${data.restaurantId}/suppliers/${data.whatsapp}...`);

    // Check if supplier already exists to merge data properly
    const existingSupplier = await supplierRef.get();  // Returns DocumentSnapshot or null if not found
    // Validate input data
    const validData = SupplierSchema.parse(data);
    const supplierDoc: Supplier = {
      ...(existingSupplier.exists ? existingSupplier.data() : {}),
      ...validData,
      createdAt: existingSupplier.exists ? existingSupplier.data()?.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    };

    await supplierRef.set(supplierDoc, { merge: true });
    
    console.log(`[Firestore] ✅ Supplier "${validData.name}" ${existingSupplier.exists ? 'updated' : 'created'} successfully`);
    return validData.whatsapp;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Firestore] ❌ Invalid supplier data:`, error.errors);
      throw new Error(`Invalid supplier data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    
    console.error(`[Firestore] ❌ Error updating supplier:`, error);
    throw error;
  }
}

/**
 * Get list of suppliers of a restaurant
 * @param restaurantId Restaurant ID
 * @param category Optional category to filter by
 * @returns Array of suppliers
 */
export async function getSuppliersByCategory(restaurantId: Restaurant['legalId'], category?: SupplierCategory, isSimulator: boolean = false): Promise<Supplier[]> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    let query: Query | CollectionReference = firestore.collection(collectionName).doc(restaurantId).collection('suppliers');

    if (category) {
      query = query.where('category', 'array-contains', category)
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => doc.data() as Supplier);
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting suppliers:`, error);
    throw new Error(`Failed to get suppliers: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a specific supplier by ID
 * @param restaurantId Restaurant ID
 * @param supplierId Supplier ID (whatsapp)
 * @returns Supplier data or null if not found
 */
export async function getSupplier(restaurantId: Restaurant['legalId'], supplierId: Contact['whatsapp'], isSimulator: boolean = false): Promise<Supplier | null> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const doc = await firestore
      .collection(collectionName)
      .doc(restaurantId)
      .collection('suppliers')
      .doc(supplierId)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as Supplier;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting supplier:`, error);
    throw new Error(`Failed to get supplier: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ==== PRODUCT OPERATIONS ====


// ==== ORDER OPERATIONS ====



// ==== INVENTORY SNAPSHOT OPERATIONS ====





// ==== CONVERSATION STATE MANAGEMENT ====

/**
 * Get conversation state by phone number
 * @param phone The phone number (without whatsapp: prefix)
 * @param isSimulator Whether to use simulator collections
 * @returns The conversation state or null if not found
 */
export async function getConversationState(
  phone: Contact['whatsapp'],
  isSimulator: boolean = false
): Promise<Conversation | null> {
  try {
    console.log(`[Firestore] Getting conversation state for phone: ${phone}`);
    
    const collectionName = getCollectionName('conversations', isSimulator);
    const doc = await firestore
      .collection(collectionName)
      .doc(phone)
      .get();
      
    if (!doc.exists) {
      console.log(`[Firestore] No conversation state found for phone: ${phone}`);
      return null;
    }
    
    const state = doc.data() as Conversation;
    console.log(`[Firestore] ✅ Found conversation state for phone: ${phone}`, {
      currentState: state?.currentState,
      contextKeys: Object.keys(state?.context || {})
    });
    return state;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting conversation state:`, error);
    throw error;
  }
}

/**
 * Initialize a new conversation state for a phone number
 * @param phone Phone number without whatsapp prefix
 * @param restaurantId Restaurant ID
 * @param initialState Initial bot state
 * @param isSimulator Whether to use simulator collections
 * @returns The created conversation state
 */
export async function initializeConversationState(
  conversation: Conversation,
  phone: Contact['whatsapp'],
  isSimulator: boolean = false
): Promise<Conversation> {
  try {
    console.log(`[Firestore] Initializing conversation state for phone: ${phone}`);
    
    // Use correct collections based on simulator mode
    const restaurantDoc = (await getRestaurantByPhone(phone, isSimulator))?.data;
    const restaurantId = restaurantDoc?.legalId || null;

    const conversationsCollection = getCollectionName('conversations', isSimulator);


    const newState = ConversationSchema.parse({...conversation, ...(restaurantId ? { restaurantId } : {})});
    await firestore
      .collection(conversationsCollection)
      .doc(phone)
      .set(newState as Conversation, { merge: true });

    console.log(`[Firestore] ✅ Initialized conversation state for phone: ${phone}`);
    return newState;
  } catch (error) {
    console.error(`[Firestore] ❌ Error initializing conversation state:`, error);
    throw error;
  }
}



/**
 * Save conversation state using phone number as document ID
 * @param phone The phone number (without whatsapp: prefix)
 * @param state The conversation state to save
 * @param isSimulator Whether to use simulator collections
 */
export async function saveConversationState(
  phone: string, 
  state: Conversation,
  isSimulator: boolean = false
): Promise<void> {
  try {
    console.log(`[Firestore] Saving conversation state for phone: ${phone}`, {
      currentState: state.currentState,
      contextKeys: Object.keys(state.context || {})
    });
    
    // Use correct collections based on simulator mode
    const restaurantsCollection = getCollectionName('restaurants', isSimulator);
    const conversationsCollection = getCollectionName('conversations', isSimulator);
    
    // Get restaurant reference if it doesn't exist in the update
    let restaurantRef;
    if (state.restaurantId) {
      restaurantRef = firestore.collection(restaurantsCollection).doc(state.restaurantId);
    }
    
    await firestore
      .collection(conversationsCollection)
      .doc(phone)
      .set({
        ...state,
        updatedAt: FieldValue.serverTimestamp(),
      } as Conversation, { merge: true });
      
    console.log(`[Firestore] ✅ Conversation state saved for phone: ${phone}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error saving conversation state:`, error);
    throw error;
  }
}

/**
 * Log a message in the conversation history
 * @param phone The phone number
 * @param message The message content
 * @param direction 'incoming' or 'outgoing'
 * @param currentState The current bot state when message was processed
 * @param isSimulator Whether to use simulator collections
 */
export async function logMessage(
  phone: Contact['whatsapp'],
  message: Message,
  isSimulator: boolean = false
): Promise<void> {
  try {
    console.log(`[Firestore] Logging ${message.role} message for phone: ${phone}`);

    const conversationsCollection = getCollectionName('conversations', isSimulator);
    const finalMessage = MessageSchema.parse(message)
    const now = new Date();
    console.log(`[Firestore] Writing message to ${conversationsCollection}/${phone}/messages...`, {
      message: message,
    });
    // Update the conversation document with the new message in the messages array
    await firestore
      .collection(conversationsCollection)
      .doc(phone)
      .update({
        messages: FieldValue.arrayUnion({
          ...finalMessage,
          createdAt: now,
        } as Message),
        updatedAt: now,
      });

    console.log(`[Firestore] ✅ Message logged for phone: ${phone}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error logging message:`, error);
    // Don't throw - message logging shouldn't break the flow
  }
}

// ==== SYSTEM CONFIGURATION ====
