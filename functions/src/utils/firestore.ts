import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue, DocumentReference, Query, CollectionReference } from 'firebase-admin/firestore';
import {
  Restaurant,
  Supplier,
  Product,
  BotState,
  // ItemLine,
  ItemShortage,
  StockLine,
  SupplierCategory,
  Order,
  InventorySnapshot
} from '../schema/types';

if (!admin.apps?.length) {
  admin.initializeApp({ projectId: 'pivot-chatbot-fdfe0' });
}
const firestore = admin.firestore();

// ==== ZOD SCHEMAS FOR DATA VALIDATION ====

// Contact schema used in multiple places
const ContactSchema = z.object({
  whatsapp: z.string().min(10),
  name: z.string().min(2),
  role: z.enum(["Owner", "Manager", "Shift", "Other", "Supplier"]),
  email: z.string().email().optional()
});

// Payment metadata schema
const PaymentMetaSchema = z.object({
  provider: z.enum(["Stripe", "Paylink"]),
  customerId: z.string().default(""),
  status: z.boolean()
});

// Restaurant schema for validation
const RestaurantSchema = z.object({
  legalId: z.string().regex(/^\d{9}$/),
  businessName: z.string().min(2),
  name: z.string().min(2),
  primaryContact: ContactSchema,
  yearsActive: z.number().min(0).max(100),
  payment: PaymentMetaSchema,
  isActivated: z.boolean().default(false),
  createdAt: z.any().optional() // Will be replaced with serverTimestamp
});

// Supplier schema for validation
const SupplierSchema = z.object({
  restaurantId: z.string(), // Parent restaurant ID
  name: z.string().min(2),
  whatsapp: z.string().min(10),
  category: z.string(),
  deliveryDays: z.array(z.number().min(0).max(6)),
  cutoffHour: z.number().min(0).max(23),
  rating: z.number().min(1).max(5).optional().default(0)
});

// Product schema for validation
const ProductSchema = z.object({
  name: z.string().min(2),
  emoji: z.string(),
  unit: z.enum(["kg", "gram", "liter", "ml", "pcs", "box", "bottle", "jar", "pack", "קילוגרם", "גרם", "ליטר", "מ\"ל", "יחידות", "קופסה", "בקבוק", "צנצנת", "אריזות"]),
  parMidweek: z.number().min(0),
  parWeekend: z.number().min(0)
});

// Order schema for validation
const OrderSchema = z.object({
  supplierId: z.string(),
  status: z.enum(["pending", "sent", "delivered"]),
  items: z.array(z.object({
    productId: z.string(),
    qty: z.number().min(0)
  })),
  shortages: z.array(z.object({
    productId: z.string(),
    qty: z.number().min(0),
    received: z.number().min(0)
  })).optional().default([]),
  midweek: z.boolean(),
  invoiceUrl: z.string().url().optional()
});

// Inventory snapshot schema for validation
const InventorySnapshotSchema = z.object({
  supplierId: z.string(),
  lines: z.array(z.object({
    productId: z.string(),
    currentQty: z.number().min(0)
  }))
});

// Conversation state schema
const ConversationStateSchema = z.object({
  restaurantId: z.string(),
  currentState: z.string(),
  context: z.record(z.any()),
  lastMessageTimestamp: z.any().optional() // Will be replaced with serverTimestamp
});

// ==== TYPE EXPORTS ====

export type RestaurantData = z.infer<typeof RestaurantSchema>;
export type SupplierData = z.infer<typeof SupplierSchema>;
export type ProductData = z.infer<typeof ProductSchema>;
export type OrderData = z.infer<typeof OrderSchema>;
export type InventorySnapshotData = z.infer<typeof InventorySnapshotSchema>;
export type ConversationData = z.infer<typeof ConversationStateSchema>;

// ==== RESTAURANT OPERATIONS ====

/**
 * Create a new restaurant
 * @param data Restaurant data
 * @returns The ID of the created restaurant
 */
export async function createRestaurant(data: {
  restaurantId: string;
  companyName: string;
  legalId: string;
  name: string;
  yearsActive: number;
  contactName: string;
  contactRole: string;
  contactEmail?: string;
  paymentMethod: string;
  phone: string;
}): Promise<string> {
  console.log(`[Firestore] Creating restaurant:`, {
    legalId: data.legalId,
    businessName: data.companyName,
    name: data.name
  });

  try {
    // Create the restaurant document
    const restaurantDoc = {
      legalId: data.legalId,
      businessName: data.companyName,
      name: data.name,
      yearsActive: data.yearsActive,
      isActivated: false,
      primaryContact: {
        whatsapp: data.phone,
        name: data.contactName,
        role: data.contactRole,
        email: data.contactEmail || ""
      },
      payment: {
        provider: data.paymentMethod === "creditCard" ? "Stripe" : "Paylink",
        customerId: "",
        status: false
      },
      settings: {
        timezone: "Asia/Jerusalem",
        locale: "he-IL"
      },
      createdAt: FieldValue.serverTimestamp()
    };

    // Use the legalId as the restaurant document ID
    await firestore.collection('restaurants').doc(data.legalId).set(restaurantDoc);
    
    console.log(`[Firestore] ✅ Restaurant "${data.name}" created successfully with ID ${data.legalId}`);
    return data.legalId;
  } catch (error) {
    console.error(`[Firestore] ❌ Error creating restaurant:`, error);
    throw new Error(`Failed to create restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a restaurant by ID
 * @param restaurantId Restaurant ID (legalId)
 * @returns Restaurant data or null if not found
 */
export async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
  try {
    const doc = await firestore.collection('restaurants').doc(restaurantId).get();
    
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
 * Get a restaurant by phone number
 * @param phone Phone number
 * @returns Restaurant reference and data or null if not found
 */
export async function getRestaurantByPhone(phone: string): Promise<{id: string, data: Restaurant, ref: DocumentReference} | null> {
  try {
    console.log(`[Firestore] Looking up restaurant by phone: ${phone}`);
    
    const snapshot = await firestore
      .collection('restaurants')
      .where('primaryContact.whatsapp', '==', phone)
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
 * Update restaurant activation status
 * @param restaurantId Restaurant ID
 * @param isActivated Activation status
 */
export async function updateRestaurantActivation(restaurantId: string, isActivated: boolean): Promise<void> {
  try {
    await firestore.collection('restaurants').doc(restaurantId).update({
      isActivated,
      'payment.status': isActivated
    });
    
    console.log(`[Firestore] ✅ Updated restaurant ${restaurantId} activation: ${isActivated}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error updating restaurant activation:`, error);
    throw new Error(`Failed to update restaurant activation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ==== SUPPLIER OPERATIONS ====

/**
 * Add or update supplier for a restaurant
 * @param data Supplier data
 * @returns The supplier ID (whatsapp number)
 */
export async function updateSupplier(data: SupplierData): Promise<string> {
  console.log(`[Firestore] Adding/updating supplier to restaurant:`, {
    restaurantId: data.restaurantId,
    name: data.name,
    whatsapp: data.whatsapp
  });

  try {
    // Validate input data
    const validData = SupplierSchema.parse(data);
    
    // Check if restaurant exists
    const restaurantRef = firestore.collection('restaurants').doc(validData.restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
      throw new Error(`Restaurant with ID ${validData.restaurantId} not found`);
    }

    // Use the whatsapp number as the supplier document ID for easy reference
    const supplierRef = restaurantRef.collection('suppliers').doc(validData.whatsapp);
    
    console.log(`[Firestore] Writing to restaurants/${validData.restaurantId}/suppliers/${validData.whatsapp}...`);

    const supplierDoc = {
      name: validData.name,
      whatsapp: validData.whatsapp,
      deliveryDays: validData.deliveryDays,
      cutoffHour: validData.cutoffHour,
      category: validData.category,
      rating: validData.rating || 0,
      createdAt: FieldValue.serverTimestamp()
    };

    await supplierRef.set(supplierDoc, { merge: true });
    
    console.log(`[Firestore] ✅ Supplier "${validData.name}" updated successfully`);
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
 * Get suppliers for a restaurant
 * @param restaurantId Restaurant ID
 * @param category Optional category to filter by
 * @returns Array of suppliers
 */
export async function getSuppliers(restaurantId: string, category?: SupplierCategory): Promise<Supplier[]> {
  try {
    let query: Query | CollectionReference = firestore.collection('restaurants').doc(restaurantId).collection('suppliers');
    
    if (category) {
      query = query.where('category', '==', category)
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
export async function getSupplier(restaurantId: string, supplierId: string): Promise<Supplier | null> {
  try {
    const doc = await firestore
      .collection('restaurants')
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

/**
 * Add or update a product for a supplier
 * @param restaurantId Restaurant ID
 * @param supplierId Supplier ID (whatsapp)
 * @param productData Product data
 * @returns The product ID
 */
export async function updateProduct(
  restaurantId: string,
  supplierId: string,
  productData: ProductData
): Promise<string> {
  try {
    // Validate product data
    const validProduct = ProductSchema.parse(productData);
    
    // Get a reference to the products subcollection
    const productsRef = firestore
      .collection('restaurants')
      .doc(restaurantId)
      .collection('suppliers')
      .doc(supplierId)
      .collection('products');
    
    // Create a new product ID if not updating an existing one
    const productRef = productsRef.doc();
    
    const productDoc = {
      ...validProduct,
      createdAt: FieldValue.serverTimestamp()
    };
    
    await productRef.set(productDoc);
    
    console.log(`[Firestore] ✅ Product "${validProduct.name}" added for supplier ${supplierId}`);
    return productRef.id;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Firestore] ❌ Invalid product data:`, error.errors);
      throw new Error(`Invalid product data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    
    console.error(`[Firestore] ❌ Error adding product:`, error);
    throw error;
  }
}

/**
 * Add multiple products for a supplier in a batch operation
 * @param restaurantId Restaurant ID
 * @param supplierId Supplier ID (whatsapp)
 * @param products Array of product data
 * @returns Array of product IDs
 */
export async function batchAddProducts(
  restaurantId: string,
  supplierId: string,
  products: ProductData[]
): Promise<string[]> {
  try {
    if (products.length === 0) {
      return [];
    }
    
    const batch = firestore.batch();
    const productIds: string[] = [];
    
    products.forEach(product => {
      try {
        // Validate each product
        const validProduct = ProductSchema.parse(product);
        
        // Get a reference to the products subcollection
        const productsRef = firestore
          .collection('restaurants')
          .doc(restaurantId)
          .collection('suppliers')
          .doc(supplierId)
          .collection('products');
        
        // Create a new product document
        const productRef = productsRef.doc();
        productIds.push(productRef.id);
        
        batch.set(productRef, {
          ...validProduct,
          createdAt: FieldValue.serverTimestamp()
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(`[Firestore] ❌ Skipping invalid product:`, error.errors);
        } else {
          console.error(`[Firestore] ❌ Error processing product:`, error);
        }
      }
    });
    
    await batch.commit();
    
    console.log(`[Firestore] ✅ Added ${productIds.length} products for supplier ${supplierId}`);
    return productIds;
  } catch (error) {
    console.error(`[Firestore] ❌ Error batch adding products:`, error);
    throw error;
  }
}

/**
 * Get all products for a supplier
 * @param restaurantId Restaurant ID
 * @param supplierId Supplier ID (whatsapp)
 * @returns Array of products with their IDs
 */
export async function getProducts(restaurantId: string, supplierId: string): Promise<(Product & { id: string })[]> {
  try {
    const snapshot = await firestore
      .collection('restaurants')
      .doc(restaurantId)
      .collection('suppliers')
      .doc(supplierId)
      .collection('products')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Product & { id: string }));
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting products:`, error);
    throw new Error(`Failed to get products: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ==== ORDER OPERATIONS ====

/**
 * Create a new order
 * @param restaurantId Restaurant ID
 * @param orderData Order data
 * @returns The order ID
 */
export async function createOrder(restaurantId: string, orderData: OrderData): Promise<string> {
  try {
    // Validate order data
    const validOrder = OrderSchema.parse(orderData);
    
    // Reference to orders subcollection
    const ordersRef = firestore.collection('restaurants').doc(restaurantId).collection('orders');
    const orderRef = ordersRef.doc();
    
    // Create supplier reference
    const supplierRef = firestore
      .collection('restaurants')
      .doc(restaurantId)
      .collection('suppliers')
      .doc(validOrder.supplierId);
    
    const orderDoc = {
      supplierRef: supplierRef,
      status: validOrder.status,
      items: validOrder.items,
      shortages: validOrder.shortages || [],
      midweek: validOrder.midweek,
      createdAt: FieldValue.serverTimestamp(),
      invoiceUrl: validOrder.invoiceUrl
    };
    
    await orderRef.set(orderDoc);
    
    console.log(`[Firestore] ✅ Created order ${orderRef.id} for restaurant ${restaurantId}`);
    return orderRef.id;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Firestore] ❌ Invalid order data:`, error.errors);
      throw new Error(`Invalid order data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    
    console.error(`[Firestore] ❌ Error creating order:`, error);
    throw error;
  }
}

/**
 * Update an existing order
 * @param restaurantId Restaurant ID
 * @param orderId Order ID
 * @param status New status
 * @param shortages Optional array of shortages
 * @param invoiceUrl Optional URL to invoice image
 */
export async function updateOrder(
  restaurantId: string,
  orderId: string,
  status: "pending" | "sent" | "delivered",
  shortages?: ItemShortage[],
  invoiceUrl?: string
): Promise<void> {
  try {
    const orderRef = firestore
      .collection('restaurants')
      .doc(restaurantId)
      .collection('orders')
      .doc(orderId);
    
    const updates: Record<string, any> = { status };
    
    if (shortages) {
      updates.shortages = shortages;
    }
    
    if (invoiceUrl) {
      updates.invoiceUrl = invoiceUrl;
    }
    
    // Add appropriate timestamp based on status
    if (status === "sent") {
      updates.sentAt = FieldValue.serverTimestamp();
    } else if (status === "delivered") {
      updates.receivedAt = FieldValue.serverTimestamp();
    }
    
    await orderRef.update(updates);
    
    console.log(`[Firestore] ✅ Updated order ${orderId} status to ${status}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error updating order:`, error);
    throw error;
  }
}

/**
 * Get orders for a restaurant
 * @param restaurantId Restaurant ID
 * @param supplierId Optional supplier ID to filter by
 * @param status Optional status to filter by
 * @returns Array of orders
 */
export async function getOrders(
  restaurantId: string,
  supplierId?: string,
  status?: "pending" | "sent" | "delivered"
): Promise<(Order & { id: string })[]> {
  try {
    let query: Query | CollectionReference = firestore.collection('restaurants').doc(restaurantId).collection('orders');
    
    if (supplierId) {
      const supplierRef = firestore
        .collection('restaurants')
        .doc(restaurantId)
        .collection('suppliers')
        .doc(supplierId);
      
      query = query.where('supplierRef', '==', supplierRef);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order & { id: string }));
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting orders:`, error);
    throw error;
  }
}

// ==== INVENTORY SNAPSHOT OPERATIONS ====

/**
 * Create a new inventory snapshot
 * @param restaurantId Restaurant ID
 * @param snapshotData Inventory snapshot data
 * @returns The snapshot ID
 */
export async function createInventorySnapshot(
  restaurantId: string,
  snapshotData: InventorySnapshotData
): Promise<string> {
  try {
    // Validate snapshot data
    const validSnapshot = InventorySnapshotSchema.parse(snapshotData);
    
    // Reference to inventory snapshots subcollection
    const snapshotsRef = firestore
      .collection('restaurants')
      .doc(restaurantId)
      .collection('inventorySnapshots');
    
    const snapshotRef = snapshotsRef.doc();
    
    // Create supplier reference
    const supplierRef = firestore
      .collection('restaurants')
      .doc(restaurantId)
      .collection('suppliers')
      .doc(validSnapshot.supplierId);
    
    // Convert product IDs to references for the lines
    const lines: StockLine[] = await Promise.all(
      validSnapshot.lines.map(async line => {
        const productRef = firestore
          .collection('restaurants')
          .doc(restaurantId)
          .collection('suppliers')
          .doc(validSnapshot.supplierId)
          .collection('products')
          .doc(line.productId);
        
        return {
          productId: productRef.id,
          currentQty: line.currentQty
        };
      })
    );
    
    const snapshotDoc = {
      supplierRef,
      lines,
      createdAt: FieldValue.serverTimestamp()
    };
    
    await snapshotRef.set(snapshotDoc);
    
    console.log(`[Firestore] ✅ Created inventory snapshot ${snapshotRef.id}`);
    return snapshotRef.id;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Firestore] ❌ Invalid inventory snapshot data:`, error.errors);
      throw new Error(`Invalid inventory snapshot data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    
    console.error(`[Firestore] ❌ Error creating inventory snapshot:`, error);
    throw error;
  }
}

/**
 * Get the latest inventory snapshot for a supplier
 * @param restaurantId Restaurant ID
 * @param supplierId Supplier ID
 * @returns The latest inventory snapshot or null if not found
 */
export async function getLatestInventorySnapshot(
  restaurantId: string,
  supplierId: string
): Promise<InventorySnapshot | null> {
  try {
    const supplierRef = firestore
      .collection('restaurants')
      .doc(restaurantId)
      .collection('suppliers')
      .doc(supplierId);
    
    const snapshot = await firestore
      .collection('restaurants')
      .doc(restaurantId)
      .collection('inventorySnapshots')
      .where('supplierRef', '==', supplierRef)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as InventorySnapshot;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting latest inventory snapshot:`, error);
    throw error;
  }
}

// ==== CONVERSATION STATE MANAGEMENT ====

/**
 * Get conversation state by phone number
 * @param phone The phone number (without whatsapp: prefix)
 * @returns The conversation state or null if not found
 */
export async function getConversationState(phone: string): Promise<ConversationData | null> {
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
    
    const state = doc.data() as ConversationData;
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
 * @returns The created conversation state
 */
export async function initializeConversationState(
  phone: string,
  restaurantId: string,
  initialState: BotState = "INIT"
): Promise<ConversationData> {
  try {
    console.log(`[Firestore] Initializing conversation state for phone: ${phone}`);
    
    // Get a reference to the restaurant
    const restaurantRef = firestore.collection('restaurants').doc(restaurantId);
    
    const newState: ConversationData = {
      restaurantId,
      currentState: initialState,
      context: {}
    };
    
    await firestore
      .collection('conversations')
      .doc(phone)
      .set({
        ...newState,
        restaurantRef, // Add reference to the restaurant
        lastMessageTimestamp: FieldValue.serverTimestamp()
      });
    
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
 */
export async function saveConversationState(phone: string, state: ConversationData): Promise<void> {
  try {
    console.log(`[Firestore] Saving conversation state for phone: ${phone}`, {
      currentState: state.currentState,
      contextKeys: Object.keys(state.context || {})
    });
    
    // Get restaurant reference if it doesn't exist in the update
    let restaurantRef;
    if (state.restaurantId) {
      restaurantRef = firestore.collection('restaurants').doc(state.restaurantId);
    }
    
    await firestore
      .collection('conversations')
      .doc(phone)
      .set({
        ...state,
        restaurantRef: restaurantRef, // Add reference to restaurant
        lastMessageTimestamp: FieldValue.serverTimestamp()
      }, { merge: true });
      
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

// ==== SYSTEM CONFIGURATION ====

/**
 * Store or update bot messages in Firestore
 */
export async function updateBotMessages(messages: any): Promise<void> {
  try {
    await firestore.collection('system').doc('botMessages').set({
      messages,
      updatedAt: FieldValue.serverTimestamp(),
      version: Date.now()
    });
    
    console.log(`[Firestore] ✅ Bot messages updated successfully`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error updating bot messages:`, error);
    throw error;
  }
}

/**
 * Get bot messages from Firestore
 */
export async function getBotMessages(): Promise<any> {
  try {
    const doc = await firestore.collection('system').doc('botMessages').get();
    
    if (!doc.exists) {
      console.log(`[Firestore] No bot messages found, using defaults`);
      return null;
    }
    
    return doc.data()?.messages;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting bot messages:`, error);
    return null;
  }
}
