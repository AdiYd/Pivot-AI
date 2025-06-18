import { z } from 'zod';
import {
  ContactSchema,
  PaymentMetaSchema,
  ProductSchema,
  RestaurantSchema,
  SupplierSchema,
  OrderSchema,
  ConversationSchema,
  MessageSchema,
  productUnitSchema,
  supplierCategorySchema,
  orderStatusSchema,
} from './schemas';

// ======== Schema-based types using z.infer ========

// Core types derived directly from schemas
export type Contact = z.infer<typeof ContactSchema>;
export type PaymentMeta = z.infer<typeof PaymentMetaSchema>;
export type paymentProvider = z.infer<typeof PaymentMetaSchema.shape.provider>;
export type Product = z.infer<typeof ProductSchema>;
export type Supplier = z.infer<typeof SupplierSchema>;
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;

// Derived types from enum schemas
export type ProductUnit = z.infer<typeof productUnitSchema>;
export type SupplierCategory = z.infer<typeof supplierCategorySchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// ======== Extended or custom types ========

// Rating type (1-5)
export type Rating = 1 | 2 | 3 | 4 | 5;


// Bot state types
export type BotState =
  | "INIT"

// Onboarding states  - restaurant creation
  | "ONBOARDING_COMPANY_NAME"
  | "ONBOARDING_LEGAL_ID"
  | "ONBOARDING_RESTAURANT_NAME"
  | "ONBOARDING_CONTACT_NAME"
  | "ONBOARDING_CONTACT_EMAIL"
  | "ONBOARDING_PAYMENT_METHOD"
  | "WAITING_FOR_PAYMENT"

// Supplier setup states 
  | "SETUP_SUPPLIERS_START"
  | "SETUP_SUPPLIERS_ADDITIONAL"
  | "SUPPLIER_CATEGORY"
  | "SUPPLIER_CONTACT"
  | "SUPPLIER_REMINDERS"
// Product setup states
  | "PRODUCTS_LIST"
// Base quantity setup states
  | "PRODUCTS_BASE_QTY"

// Finalization restaurant creation
  | "RESTAURANT_FINISHED"

 // Order states 
  | "INVENTORY_SNAPSHOT_START"
  | "INVENTORY_SNAPSHOT_CATEGORY"
  | "INVENTORY_SNAPSHOT_PRODUCT"
  | "INVENTORY_SNAPSHOT_QTY"
  | "INVENTORY_CALCULATE_SNAPSHOT"
  | "ORDER_SETUP_START"
  | "ORDER_CONFIRMATION"
  | "DELIVERY_START"
  | "DELIVERY_CHECK_ITEM"
  | "DELIVERY_RECEIVED_AMOUNT"
  | "DELIVERY_INVOICE_PHOTO"

// IDLE state
  | "IDLE";



// Extended context that can contain fields from any type
export interface ConversationContext extends Record<string, any> {}

// Bot engine types
export interface IncomingMessage {
  from: Contact['whatsapp']; 
  body: string;
  mediaUrl?: string;
}

export interface BotAction {
  type: "SEND_MESSAGE" | "CREATE_RESTAURANT" | "CREATE_SUPPLIER" | "UPDATE_SUPPLIER" | "UPDATE_PRODUCT" | "CREATE_INVENTORY_SNAPSHOT" | "SEND_ORDER" | "LOG_DELIVERY";
  payload: Record<string, any>;
}


export interface BotConfig {
  inventoryReminderInterval: number;
  orderCutoffReminderHours: number;
  supplierCategories: SupplierCategory[];
  showPaymentLink: boolean;
  paymentLink: string;
  skipPaymentCoupon: string;
  paymentMethods: string[];
}


export interface StateObject {
  // If defined, use a WhatsApp template with structured responses
  whatsappTemplate?: {
    id: string;                // Template ID registered with WhatsApp Business API
    type: "text" | "button" | "list" | "card";  // Template type
    body: string;              // Main message body
    options?: Array<{         // Response options
      name: string;           // Human-readable option text
      id: string;             // Machine-readable option identifier
    }>;
    header?: {               // Optional header for templates that support it
      type: string;          // "text" or "media"
      text?: string;         // Header text if type is "text"
      mediaUrl?: string;     // Media URL if type is "media"
    };
  };
  
  // Regular message text (used if whatsappTemplate is undefined)
  message?: string;
  
  // Description of this state for developers
  description: string;
  
  // Message to show if validation fails
  validationMessage?: string;
  
  // Type of validation to perform (if any)
  validator?: z.ZodTypeAny;

  // callback function to execute when this state is reached
  callback?: (context: ConversationContext, data: any) => void;

  // Use ai for validation
  aiValidation?: {
    prompt?: string; // The prompt to send to the AI for validation
    schema?: z.ZodTypeAny; // If provided, use this schema to validate the response
  }

  nextState?: Record<string, BotState>; // Mapping of user responses to next states

  action?: BotAction['type']; // Optional action to perform when this state is finished
}
// Re-export types with clearer names for external use
export type RestaurantData = z.infer<typeof RestaurantSchema>;
export type SupplierData = z.infer<typeof SupplierSchema>;
export type ProductData = z.infer<typeof ProductSchema>;
export type OrderData = z.infer<typeof OrderSchema>;
export type ConversationData = z.infer<typeof ConversationSchema>;
