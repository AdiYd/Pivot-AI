import { Timestamp } from 'firebase-admin/firestore';

// Represents a contact person for a restaurant or supplier
export interface Contact {
  whatsapp: string;  // This is also the document ID in Firestore
  name: string;
  role: "Owner" | "Manager" | "Shift" | "Other" | "Supplier";
  email?: string;
}

// Represents payment metadata for a restaurant - will be updated to true after payment by external API calls
export interface PaymentMeta {
  provider: "Stripe" | "Paylink";
  customerId: string;
  status: boolean; // true if payment is confirmed
}

// Represents a restaurant document with its details and primary contact
export interface Restaurant {
  legalId: string;                          // This is also the document ID in Firestore
  businessName: string;                    // The legal business name of the restaurant
  name: string;                           // The name of the restaurant (can be different from businessName)
  primaryContact: Contact;               // The primary contact person for the restaurant
  yearsActive: number;                  // Number of years the restaurant has been active
  payment: PaymentMeta;                // Payment metadata for the restaurant
  isActivated: boolean;               // true if the restaurant is activated and can use the bot
  suppliers?: Supplier[];            // Array of supplier IDs (WhatsApp numbers) for the restaurant
  inventory?: Inventory | null;     // Inventory details for the restaurant, can be null if not set up
  orders?: Order[];                // Array of orders placed by the restaurant
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
  restaurantId: string;             // ref→ /restaurants/{id}
  category: SupplierCategory[];    // Array of Category of the supplier (e.g vegetables, fruits, etc.)
  deliveryDays: number[];         // Array of delivery days (e.g 1=Monday, 2=Tuesday, etc.)
  cutoffHour: number;            // 0–23 local
  rating?: Rating;              // Rating of the supplier (1–5)
  createdAt: Timestamp;
}

// Represents a rating for a supplier
export type Rating = 1 | 2 | 3 | 4 | 5;

// Represents a category for suppliers (can be extended with custom categories)
export type SupplierCategory =
  | "vegetables" | "fruits" | "fish" | "meat" | "alcohol" | "dairy"
  | "oliveOil" | "disposables" | "dessert" | "juices" | "eggs" | string;

// Represents a unit of measurement for products
export type ProductUnit = "kg" | "pcs" | "l" | "bottle" | "box" | "pack" | string;

// Represents a product supplied by a supplier (e.g tomatoes, ice-cream, salmon, etc.)
export interface Product {
  id: string;                             // This is also the product's document ID in Firestore
  supplierId: Supplier["whatsapp"];      // ref→ /restaurants/{r}/suppliers/{s}
  category: SupplierCategory;           // Category of the product (e.g vegetables, fruits, etc.)
  name: string;                        // Name of the product (e.g tomatoes, ice-cream, salmon, etc.)
  emoji?: string;                     // Emoji representing the product
  unit: ProductUnit;                 // Unit of measurement for the product (e.g kg, pcs, etc.)
  parMidweek: number;               // Par stock level for midweek (e.g 50 <unit> of tomatoes)
  parWeekend: number;              // Par stock level for weekend (e.g 100 <unit> of tomatoes)
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
  productId: string; // ref→ /restaurants/{r}/suppliers/{s}/products/{id}
  currentQty: number;
}

export interface Order {
  id: string;
  supplierId: string;  // ref→ /restaurants/{r}/suppliers/{id}
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
  supplierId: string;  // ref→ /restaurants/{r}/suppliers/{id}
  lines: StockLine[];
  createdAt: Timestamp;
}

// Conversation state types for the WhatsApp bot
export interface ConversationState {
  currentState: BotState; // Current state of the bot conversation
  context: ConversationContext;  // Additional context for the conversation, to collect information and user input
  lastMessageTimestamp: Timestamp;
}

export interface ConversationContext extends Partial<Contact & Restaurant & Supplier & Product & Order & InventorySnapshot & ItemLine & ItemShortage & StockLine & ConversationState & { [key: string]: any }> {}



export type BotState =
  | "INIT" // Initial state when the bot starts - Ask what the user wants to do (e.g "sign in new restaurant", "Ask a question")
  
  // Onboarding states for new restaurants - collecting necessary information
  | "ONBOARDING_COMPANY_NAME"         // Onboarding states for new restaurants - Company name collection
  | "ONBOARDING_LEGAL_ID"            // Legal ID collection
  | "ONBOARDING_RESTAURANT_NAME"    // Restaurant name collection
  | "ONBOARDING_YEARS_ACTIVE"      // Years active collection
  | "ONBOARDING_CONTACT_NAME"     // Contact (owner) name collection
  | "ONBOARDING_CONTACT_EMAIL"   // Contact email collection (Role defaults to "Owner")
  | "ONBOARDING_PAYMENT_METHOD" // Showing Payment Link
  | "WAITING_FOR_PAYMENT"      // Waiting for payment confirmation state - show until payment is confirmed
  
  // Setting up restaurant's base inventory
  | "SETUP_SUPPLIERS_START"         
    // Supplier details collection states  (Iterate here for each supplier within a restaurant)
    | "SUPPLIER_CATEGORY"             // Supplier category collection (this is a multi-select and can be multiple categories)
    | "SUPPLIER_NAME"                // Supplier name collection
    | "SUPPLIER_WHATSAPP"           // Supplier WhatsApp collection
    | "SUPPLIER_DELIVERY_DAYS"     // Supplier delivery days collection
    | "SUPPLIER_CUTOFF_TIME"      // Supplier cutoff time collection
      // Supplier products collection states (Iterative here for each product within a supplier)
      | "PRODUCT_NAME"                  // Product name collection 
      | "PRODUCT_UNIT"                 // Product unit collection
      | "PRODUCT_QTY"                 // Product quantity collection
      | "PRODUCT_PAR_MIDWEEK"        // Product par midweek collection
      | "PRODUCT_PAR_WEEKEND"       // Product par weekend collection
 
  // Inventory snapshot states (snapshot of current stock levels and generating orders)
  | "INVENTORY_SNAPSHOT_START"              // Starting inventory snapshot (Iterative for each supplier / category)
  | "INVENTORY_SNAPSHOT_CATEGORY"          // Inventory snapshot category selection
  | "INVENTORY_SNAPSHOT_PRODUCT"          // Inventory snapshot product selection
  | "INVENTORY_SNAPSHOT_QTY"             // Inventory snapshot quantity collection
  | "INVENTORY_CALCULATE_SNAPSHOT"      // Calculating inventory snapshot and showing results

  // Order management states (creating and managing orders)
  | "ORDER_SETUP_START"                     // Starting order process
  | "ORDER_CONFIRMATION"                   // Order confirmation by the user
  | "DELIVERY_START"                      // Starting delivery process
  | "DELIVERY_CHECK_ITEM"                // Checking delivery items
  | "DELIVERY_RECEIVED_AMOUNT"          // Confirming received delivery amount
  | "DELIVERY_INVOICE_PHOTO"           // Requesting delivery invoice photo
  | "IDLE";                   // Idle state when no conversation is active - suggest options like "Add or edit Supplier", "Add or edit Product", "Create order", etc.

// Bot engine types
export interface IncomingMessage {
  from: Contact['whatsapp']; 
  body: string;
  mediaUrl?: string;
}

export interface BotAction {
  type: "SEND_MESSAGE" | "CREATE_RESTAURANT" | "UPDATE_SUPPLIER" | "UPDATE_PRODUCT" | "CREATE_INVENTORY_SNAPSHOT" | "SEND_ORDER" | "LOG_DELIVERY";
  payload: Record<string, any>;  // Additional data needed for the action
}


export interface StateTransition {
  newState: ConversationState;
  actions: BotAction[];
}

export interface BotConfig {
  inventoryReminderInterval: number;          // Set the interval in hours for inventory reminders
  orderCutoffReminderHours: number;          // Set the cutoff time in hours for order reminders (meaning the bot will remind the restaurant to place an order before this time)
  supplierCategories: SupplierCategory[];   // List of supplier categories to be used in the bot
  showPaymentLink: boolean;                // Whether to show the payment link during onboarding
  paymentLink: string;                    // Payment link to be shown during onboarding (if showPaymentLink is true)
  skipPaymentCoupon: string;             // Coupon code to skip payment during onboarding
  paymentMethods: string[];             // List of payment methods to be used in the bot (e.g ["Stripe", "Paylink"])
}

// new Firestore‐doc shapes for conversations & messages
export interface ConversationDoc {
  currentState: BotState;   // Current state of the bot conversation
  messages: MessageDoc[];
  context: ConversationContext;
  lastMessageTimestamp: Timestamp;
}

export interface MessageDoc {
  body: string;
  direction: "incoming" | "outgoing";
  currentState: BotState;   // State when the message was sent
  createdAt: Timestamp;
}

export interface StateMessage {
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
  validator?: "text" | "number" | "email" | "phone" | "yesNo" | "selection" | "days" | "time" | "photo" | "legalId" | "activeYears" | "skip";
}
