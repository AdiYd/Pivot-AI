import { Timestamp, DocumentReference } from 'firebase-admin/firestore';

// Represents a contact person for a restaurant or supplier
export interface Contact {
  whatsapp: string;  // This is also the document ID in Firestore
  name: string;
  role: "Owner" | "Manager" | "Shift" | "Other" | "Supplier";
  email?: string;
}

// Represents payment metadata for a restaurant
export interface PaymentMeta {
  provider: "Stripe" | "Paylink";
  customerId: string;
  status: "pending" | "active";
}

// Represents a restaurant with its details and primary contact
export interface Restaurant {
  legalId: string;  // This is also the document ID in Firestore
  businessName: string;
  name: string;
  primaryContact: Contact;
  yearsActive: number;
  payment: PaymentMeta;
  isActivated: boolean;
  settings: {
    timezone: string;
    locale: string;
  };
  inventory?: Inventory | null;
  createdAt: Timestamp;
}


export interface Inventory {
  [category: SupplierCategory]: {
    products: Product[];
    supplier: Supplier;
  };
}

// Represents a supplier with its details and products
export interface Supplier extends Contact {
  // The contact's WhatsApp number is used as the supplier ID in Firestore
  category: SupplierCategory;
  deliveryDays: number[];
  cutoffHour: number;    // 0–23 local
  rating?: Rating;
  createdAt: Timestamp;
}

// Represents a rating for a supplier
export type Rating = 1 | 2 | 3 | 4 | 5;

// Represents a category for suppliers (can be extended with custom categories)
export type SupplierCategory =
  | "vegetables" | "fruits" | "fish" | "meat" | "alcohol" | "dairy"
  | "oliveOil" | "disposables" | "dessert" | "juices" | "eggs" | string;

// Represents a product supplied by a supplier (e.g tomatoes, ice-cream, salmon, etc.)
export interface Product {
  id: string; // This is also the product's document ID in Firestore
  supplierId: Supplier["whatsapp"];
  category: SupplierCategory;
  name: string;
  emoji: string;
  unit: "kg" | "gram" | "liter" | "pcs" | "box" | "bottle" | string;
  parMidweek: number;
  parWeekend: number;
  createdAt: Timestamp;
}

// Represents a line item in an order
// Contains the product ID and quantity ordered
export interface ItemLine {
  productId: Product["id"];
  qty: number;
}

// Represents a shortage of an item in an order
// Contains the product ID, quantity ordered, and quantity received
export interface ItemShortage extends ItemLine {
  received: number;
}

// Stock line for inventory snapshots
// Represents the current stock level of a product
export interface StockLine {
  productRef: DocumentReference; // ref→ /restaurants/{r}/suppliers/{s}/products/{id}
  currentQty: number;
}

export interface Order {
  id: string;
  supplierRef: DocumentReference;  // ref→ /restaurants/{r}/suppliers/{id}
  status: "pending" | "sent" | "delivered";
  items: ItemLine[];
  shortages: ItemShortage[];
  midweek: boolean;
  sentAt?: Timestamp;
  receivedAt?: Timestamp;
  invoiceUrl?: string;
  createdAt: Timestamp;
}

export interface InventorySnapshot {
  id: string;
  supplierRef: DocumentReference;  // ref→ /restaurants/{r}/suppliers/{id}
  lines: StockLine[];
  createdAt: Timestamp;
}

// Conversation state types for the WhatsApp bot
export interface ConversationState {
  restaurantRef: DocumentReference; // ref→ /restaurants/{id}
  currentState: BotState; // Current state of the bot conversation
  context: Record<string, any>;  // Additional context for the conversation, to collect information and user input
  lastMessageTimestamp: Timestamp;
}

export type BotState =
  | "INIT" // Initial state when the bot starts
  | "ONBOARDING_COMPANY_NAME"         // Onboarding states for new restaurants
  | "ONBOARDING_LEGAL_ID"            // Legal ID collection
  | "ONBOARDING_RESTAURANT_NAME"    // Restaurant name collection
  | "ONBOARDING_YEARS_ACTIVE"      // Years active collection
  | "ONBOARDING_CONTACT_NAME"     // Contact name collection
  | "ONBOARDING_CONTACT_EMAIL"   // Contact email collection (Role defaults to "Owner")
  | "ONBOARDING_PAYMENT_METHOD" // Showing Payment Link
  | "WAITING_FOR_PAYMENT"      // Waiting for payment confirmation state - always shows the same message
  | "SETUP_SUPPLIERS_START"          // Starting supplier setup
  | "SUPPLIER_CATEGORY"             // Supplier category collection  (Iterative for each supplier)
  | "SUPPLIER_NAME"                // Supplier name collection
  | "SUPPLIER_WHATSAPP"           // Supplier WhatsApp collection
  | "SUPPLIER_DELIVERY_DAYS"     // Supplier delivery days collection
  | "SUPPLIER_CUTOFF_TIME"      // Supplier cutoff time collection
  | "PRODUCT_NAME"                  // Product name collection  (Iterative for each product within a supplier)
  | "PRODUCT_UNIT"                 // Product unit collection
  | "PRODUCT_QTY"                 // Product quantity collection
  | "PRODUCT_PAR_MIDWEEK"        // Product par midweek collection
  | "PRODUCT_PAR_WEEKEND"       // Product par weekend collection
  | "INVENTORY_SNAPSHOT_START"         // Starting inventory snapshot (Iterative for each supplier / caregory)
  | "INVENTORY_SNAPSHOT_CATEGORY"     // Inventory snapshot category selection
  | "INVENTORY_SNAPSHOT_PRODUCT"     // Inventory snapshot product selection
  | "INVENTORY_SNAPSHOT_QTY"        // Inventory snapshot quantity collection
  | "INVENTORY_CALCULATE_SNAPSHOT" // Calculating inventory snapshot and showing results
  | "ORDER_START"                        // Starting order process
  | "ORDER_CONFIRMATION"                // Order confirmation
  | "DELIVERY_START"                        // Starting delivery process
  | "DELIVERY_CHECK_ITEM"                  // Checking delivery items
  | "DELIVERY_RECEIVED_AMOUNT"            // Confirming received delivery amount
  | "DELIVERY_INVOICE_PHOTO"             // Requesting delivery invoice photo
  | "IDLE";   // Idle state when no conversation is active

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

// new Firestore‐doc shapes for conversations & messages
export interface ConversationDoc {
  restaurantRef: DocumentReference;         // points at /restaurants/{id}
  currentState: BotState;
  context: Record<string, any>;
  lastMessageTimestamp: Timestamp;
}

export interface MessageDoc {
  body: string;
  direction: "incoming" | "outgoing";
  currentState: BotState;
  createdAt: Timestamp;
}