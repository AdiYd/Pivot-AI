import { Timestamp } from 'firebase-admin/firestore';

export interface Contact {
  name: string;
  role: "Owner" | "Manager" | "Shift" | "Other";
  phone: string;
  email?: string;
}

export interface PaymentMeta {
  provider: "Stripe" | "Paylink";
  customerId: string;
  status: "pending" | "active";
}

export interface Restaurant {
  id: string;
  name: string;
  legalId: string;
  businessName: string;
  yearsActive: number;
  createdAt: Timestamp;
  isActivated: boolean;
  primaryContact: Contact;
  payment: PaymentMeta;
  settings: {
    timezone: string;
    locale: string;
  };
}

export interface Supplier {
  id: string;
  name: string;
  whatsapp: string;
  deliveryDays: number[];
  cutoffHour: number;
  category: SupplierCategory;
  createdAt: Timestamp;
  rating: number;
}

export type SupplierCategory =
  | "vegetables" | "fruits" | "fish" | "meat" | "alcohol"
  | "oliveOil" | "disposables" | "dessert" | "juices" | "eggs" | string;

export interface Product {
  id: string;
  supplierId: string;
  name: string;
  emoji: string;
  unit: "kg" | "gram" | "liter" | "pcs" | "box" | "bottle" | string;
  parMidweek: number;
  parWeekend: number;
  createdAt: Timestamp;
}

export interface ItemLine {
  productId: string;
  qty: number;
}

export interface ItemShortage extends ItemLine {
  received: number;
}

export interface StockLine {
  productId: string;
  currentQty: number;
}

export interface Order {
  id: string;
  supplierId: string;
  status: "pending" | "sent" | "delivered";
  items: ItemLine[];
  midweek: boolean;
  createdAt: Timestamp;
  sentAt?: Timestamp;
  receivedAt?: Timestamp;
  invoiceUrl?: string;
  shortages: ItemShortage[];
}

export interface InventorySnapshot {
  id: string;
  supplierId: string;
  lines: StockLine[];
  createdAt: Timestamp;
}

// Conversation state types for the WhatsApp bot
export interface ConversationState {
  restaurantId: string;
  currentState: BotState;
  context: Record<string, any>;
  lastMessageTimestamp: Timestamp;
}

export type BotState =
  | "INIT"
  | "ONBOARDING_COMPANY_NAME"
  | "ONBOARDING_LEGAL_ID"
  | "ONBOARDING_RESTAURANT_NAME"
  | "ONBOARDING_YEARS_ACTIVE"
  | "ONBOARDING_CONTACT_NAME"
  | "ONBOARDING_CONTACT_ROLE"
  | "ONBOARDING_CONTACT_EMAIL"
  | "ONBOARDING_PAYMENT_METHOD"
  | "SETUP_SUPPLIERS_START"
  | "SUPPLIER_DETAILS"
  | "SUPPLIER_DELIVERY_DAYS"
  | "SUPPLIER_CUTOFF_TIME"
  | "SUPPLIER_PRODUCTS"
  | "PRODUCT_PAR_MIDWEEK"
  | "PRODUCT_PAR_WEEKEND"
  | "INVENTORY_START"
  | "INVENTORY_COUNT"
  | "INVENTORY_CALCULATE"
  | "ORDER_INCREASE"
  | "ORDER_CONFIRMATION"
  | "DELIVERY_START"
  | "DELIVERY_CHECK_ITEM"
  | "DELIVERY_RECEIVED_AMOUNT"
  | "DELIVERY_INVOICE_PHOTO"
  | "IDLE";

// Bot engine types
export interface IncomingMessage {
  from: string;
  body: string;
  mediaUrl?: string;
}

export interface BotAction {
  type: "SEND_MESSAGE" | "CREATE_RESTAURANT" | "UPDATE_SUPPLIER" | "UPDATE_PRODUCT" | "SEND_ORDER" | "LOG_DELIVERY";
  payload: Record<string, any>;
}

export interface StateTransition {
  newState: ConversationState;
  actions: BotAction[];
}
