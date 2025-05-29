import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps?.length) {
  admin.initializeApp({ projectId: 'pivot-chatbot-fdfe0' });
}
const firestore = admin.firestore();

// Zod schemas for data validation
const RestaurantDataSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(2),
  contactName: z.string().min(2),
  phone: z.string().min(10)
});

const SupplierDataSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(2),
  whatsapp: z.string().min(10),
  deliveryDays: z.array(z.number().min(0).max(6)),
  cutoffHour: z.number().min(0).max(23),
  category: z.string().default("general")
});

export type RestaurantData = z.infer<typeof RestaurantDataSchema>;
export type SupplierData = z.infer<typeof SupplierDataSchema>;

// export async function createRestaurant(data: RestaurantData): Promise<void> {
//   console.log(`[Firestore] Creating restaurant:`, {
//     restaurantId: data.restaurantId,
//     name: data.name,
//     contactName: data.contactName,
//     phoneLength: data.phone.length
//   });

//   try {
//     // Validate input data
//     const validData = RestaurantDataSchema.parse(data);
    
//     console.log(`[Firestore] Writing to restaurants/${validData.restaurantId}...`);

//     const restaurantDoc = {
//       name: validData.name,
//       businessName: validData.name, // Default to same as name
//       legalId: "", // To be filled later
//       yearsActive: 0, // To be filled later
//       isActivated: false,
//       primaryContact: {
//         name: validData.contactName,
//         phone: validData.phone,
//         role: "Owner" as const
//       },
//       payment: {
//         provider: "Stripe" as const,
//         customerId: "",
//         status: "pending" as const
//       },
//       settings: {
//         timezone: "Asia/Jerusalem",
//         locale: "he-IL"
//       },
//       createdAt: FieldValue.serverTimestamp()
//     };

//     await firestore.collection('restaurants').doc(validData.restaurantId).set(restaurantDoc);
    
//     console.log(`[Firestore] ✅ Restaurant "${validData.name}" created successfully with ID ${validData.restaurantId}`);
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       console.error(`[Firestore] ❌ Invalid restaurant data:`, error.errors);
//       throw new Error(`Invalid restaurant data: ${error.errors.map(e => e.message).join(', ')}`);
//     }
    
//     console.error(`[Firestore] ❌ Error creating restaurant:`, {
//       restaurantId: data.restaurantId,
//       error: error instanceof Error ? error.message : error
//     });
//     throw error;
//   }
// }

export async function updateSupplier(data: SupplierData): Promise<void> {
  console.log(`[Firestore] Adding supplier to restaurant:`, {
    restaurantId: data.restaurantId,
    name: data.name,
    whatsappLength: data.whatsapp.length,
    deliveryDaysCount: data.deliveryDays.length,
    cutoffHour: data.cutoffHour,
    category: data.category
  });

  try {
    // Validate input data
    const validData = SupplierDataSchema.parse(data);
    
    // Check if restaurant exists
    const restaurantRef = firestore.collection('restaurants').doc(validData.restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
      throw new Error(`Restaurant with ID ${validData.restaurantId} not found`);
    }

    const supplierRef = restaurantRef.collection('suppliers').doc();
    
    console.log(`[Firestore] Writing to restaurants/${validData.restaurantId}/suppliers/${supplierRef.id}...`);

    const supplierDoc = {
      name: validData.name,
      whatsapp: validData.whatsapp,
      deliveryDays: validData.deliveryDays,
      cutoffHour: validData.cutoffHour,
      category: validData.category,
      rating: 0,
      createdAt: FieldValue.serverTimestamp()
    };

    await supplierRef.set(supplierDoc);
    
    console.log(`[Firestore] ✅ Supplier "${validData.name}" added successfully to restaurant ${validData.restaurantId}`, {
      supplierId: supplierRef.id,
      deliveryDaysCount: validData.deliveryDays.length,
      cutoffHour: validData.cutoffHour
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Firestore] ❌ Invalid supplier data:`, error.errors);
      throw new Error(`Invalid supplier data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    
    console.error(`[Firestore] ❌ Error updating supplier:`, {
      restaurantId: data.restaurantId,
      supplierName: data.name,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

export async function getRestaurantByPhone(phone: string): Promise<{id: string, data: any} | null> {
  try {
    console.log(`[Firestore] Looking up restaurant by phone: ${phone}`);
    
    const snapshot = await firestore
      .collection('restaurants')
      .where('primaryContact.phone', '==', phone)
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
      data: doc.data()
    };
  } catch (error) {
    console.error(`[Firestore] ❌ Error looking up restaurant by phone:`, error);
    throw error;
  }
}

/**
 * Get conversation state by phone number (phone number is the document ID)
 * @param phone The phone number (without whatsapp: prefix)
 * @returns The conversation state or null if not found
 */
export async function getConversationState(phone: string): Promise<any | null> {
  try {
    console.log(`[Firestore] Getting conversation state for phone: ${phone}`);
    
    const doc = await firestore
      .collection('conversations')
      .doc(phone)
      .get();
      
    if (!doc.exists) {
      console.log(`[Firestore] No conversation state found for phone: ${phone}`);
      return null;
    }
    
    const state = doc.data();
    console.log(`[Firestore] ✅ Found conversation state for phone: ${phone}`, {
      currentState: state?.currentState,
      contextKeys: Object.keys(state?.context || {}),
      restaurantId: state?.restaurantId
    });
    return state;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting conversation state:`, error);
    throw error;
  }
}

/**
 * Save conversation state using phone number as document ID
 * @param phone The phone number (without whatsapp: prefix)
 * @param state The conversation state to save
 */
export async function saveConversationState(phone: string, state: any): Promise<void> {
  try {
    console.log(`[Firestore] Saving conversation state for phone: ${phone}`, {
      currentState: state.currentState,
      contextKeys: Object.keys(state.context || {}),
      restaurantId: state.restaurantId
    });
    
    await firestore
      .collection('conversations')
      .doc(phone)
      .set({
        ...state,
        lastMessageTimestamp: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      
    console.log(`[Firestore] ✅ Conversation state saved for phone: ${phone}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error saving conversation state:`, error);
    throw error;
  }
}

/**
 * Log an incoming or outgoing message for audit trail
 * @param phone The phone number
 * @param message The message content
 * @param direction 'incoming' or 'outgoing'
 * @param currentState The current bot state when message was processed
 */
export async function logMessage(
  phone: string, 
  message: string, 
  direction: 'incoming' | 'outgoing',
  currentState?: string
): Promise<void> {
  try {
    console.log(`[Firestore] Logging ${direction} message for phone: ${phone}`);
    
    await firestore
      .collection('conversations')
      .doc(phone)
      .collection('messages')
      .add({
        body: message,
        direction,
        currentState: currentState || 'unknown',
        createdAt: FieldValue.serverTimestamp()
      });
      
    console.log(`[Firestore] ✅ Message logged for phone: ${phone}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error logging message:`, error);
    // Don't throw - message logging shouldn't break the flow
  }
}

/**
 * Create a new restaurant and link it to the phone number conversation
 * @param phone The phone number that will own this restaurant
 * @param data Restaurant creation data
 */
export async function createRestaurant(data: RestaurantData & { phone: string }): Promise<void> {
  console.log(`[Firestore] Creating restaurant for phone:`, {
    phone: data.phone,
    restaurantId: data.restaurantId,
    name: data.name,
    contactName: data.contactName
  });

  try {
    // Validate input data
    const validData = RestaurantDataSchema.extend({
      phone: z.string().min(10)
    }).parse(data);
    
    console.log(`[Firestore] Writing to restaurants/${validData.restaurantId}...`);

    const restaurantDoc = {
      name: validData.name,
      businessName: validData.name, // Default to same as name
      legalId: "", // To be filled later
      yearsActive: 0, // To be filled later
      isActivated: false,
      primaryContact: {
        name: validData.contactName,
        phone: validData.phone,
        role: "Owner" as const
      },
      payment: {
        provider: "Stripe" as const,
        customerId: "",
        status: "pending" as const
      },
      settings: {
        timezone: "Asia/Jerusalem",
        locale: "he-IL"
      },
      createdAt: FieldValue.serverTimestamp()
    };

    await firestore.collection('restaurants').doc(validData.restaurantId).set(restaurantDoc);
    
    console.log(`[Firestore] ✅ Restaurant "${validData.name}" created successfully with ID ${validData.restaurantId}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Firestore] ❌ Invalid restaurant data:`, error.errors);
      throw new Error(`Invalid restaurant data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    
    console.error(`[Firestore] ❌ Error creating restaurant:`, {
      restaurantId: data.restaurantId,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}
