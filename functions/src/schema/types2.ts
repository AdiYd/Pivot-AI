import { Timestamp } from 'firebase-admin/firestore';
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
  | "ONBOARDING_COMPANY_NAME"
  | "ONBOARDING_LEGAL_ID"
  | "ONBOARDING_RESTAURANT_NAME"
  | "ONBOARDING_YEARS_ACTIVE"
  | "ONBOARDING_CONTACT_NAME"
  | "ONBOARDING_CONTACT_EMAIL"
  | "ONBOARDING_PAYMENT_METHOD"
  | "WAITING_FOR_PAYMENT"
  | "SETUP_SUPPLIERS_START"
  | "SUPPLIER_CATEGORY"
  | "SUPPLIER_NAME"
  | "SUPPLIER_WHATSAPP"
  | "SUPPLIER_DELIVERY_DAYS"
  | "SUPPLIER_CUTOFF_TIME"
  | "PRODUCT_NAME"
  | "PRODUCT_UNIT"
  | "PRODUCT_QTY"
  | "PRODUCT_PAR_MIDWEEK"
  | "PRODUCT_PAR_WEEKEND"
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
  | "IDLE";

// Conversation state types
export interface ConversationState {
  currentState: BotState;
  context: ConversationContext;
  lastMessageTimestamp: Timestamp;
}

// Extended context that can contain fields from any type
export interface ConversationContext extends Record<string, any> {}

// Bot engine types
export interface IncomingMessage {
  from: Contact['whatsapp']; 
  body: string;
  mediaUrl?: string;
}

export interface BotAction {
  type: "SEND_MESSAGE" | "CREATE_RESTAURANT" | "UPDATE_SUPPLIER" | "UPDATE_PRODUCT" | "CREATE_INVENTORY_SNAPSHOT" | "SEND_ORDER" | "LOG_DELIVERY";
  payload: Record<string, any>;
}

export interface StateTransition {
  newState: ConversationState;
  actions: BotAction[];
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

// Firestore document shapes
export interface ConversationDoc {
  currentState: BotState;
  messages: MessageDoc[];
  context: ConversationContext;
  lastMessageTimestamp: Timestamp;
}

export interface MessageDoc {
  body: string;
  direction: "incoming" | "outgoing";
  currentState: BotState;
  createdAt: Timestamp;
}

export interface StateMessage {
  whatsappTemplate?: {
    id: string;
    type: "text" | "button" | "list" | "card";
    body: string;
    options?: Array<{
      name: string;
      id: string;
    }>;
    header?: {
      type: string;
      text?: string;
      mediaUrl?: string;
    };
  };
  message?: string;
  description: string;
  validationMessage?: string;
  validator?: "text" | "number" | "email" | "phone" | "yesNo" | "selection" | "days" | "time" | "photo" | "legalId" | "activeYears" | "skip";
}

// Re-export types with clearer names for external use
export type RestaurantData = z.infer<typeof RestaurantSchema>;
export type SupplierData = z.infer<typeof SupplierSchema>;
export type ProductData = z.infer<typeof ProductSchema>;
export type OrderData = z.infer<typeof OrderSchema>;
export type ConversationData = z.infer<typeof ConversationSchema>;
export type MessageData = z.infer<typeof MessageSchema>;