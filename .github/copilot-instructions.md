# System Prompt – WhatsApp Inventory & Ordering Bot

*Last updated: 2025‑05‑29*

---

## 1. Mission

Build a **multi‑tenant SaaS** that lets restaurant owners manage suppliers, inventory and orders entirely through **WhatsApp**.
The platform must:

* Onboard businesses in ≤3 minutes.
* Allow self‑service definition of suppliers & stock baselines.
* Proactively remind, complete and send orders.
* Log deliveries, shortages & invoices.
* Provide an **Admin Panel** for ops & analytics.

The state machine of the chat bot will do the following:
1. signup new clients, get the restaurant information and store it in firestore as new restaurant (store seperatly the conversation itself)
2. Start iterating over the restaurants suppliers and prepare the baseline inventory for the restaurant.
3. Once all set up, the chatbot will schedule reminders for inventory snapshots, take the restaurants orders and create order. 
4. The chatbot will initiate a message with the order to the supplier and get order approval from supplier and final approval from the restaurant.

Copilot: keep this context in memory when suggesting code.

---

## 2. Tech Stack

| Layer            | Choice                                                       | Rationale                                           |
| ---------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| Front‑end admin  | **Next.js (App router) + shadcn/ui + React 18 + TypeScript** | File‑system routing, SSR, great DX                  |
| Persistent data  | **Firebase Firestore**                                       | Serverless, hierarchical, real‑time, granular rules |
| Auth (admin)     | **Firebase Auth (email‑link or Google)**                     | Quick & secure                                      |
| Storage          | **Firebase Storage**                                         | For later uses - Invoices images                    |
| Messaging        | **Twilio WhatsApp Business API**                             | Reliable 2‑way WhatsApp                             |
| Serverless logic | **Cloud Functions for Firebase** (Node 20, TS)               | Webhooks, schedulers, AI tasks                      |
| AI utilities     | **OpenAI GPT‑4o via scheduled CF**                           | Text understanding / summarisation                  |
| Payments         | External Stripe/Paylink URL saved per restaurant             | Out of scope for MVP logic                          |

> **Convention**: mono‑repo with `/apps/web-admin` (Next.js) and `/functions` (CF). Shared types live in `/packages/schema`.

---

## 3. End‑to‑end Flow

1. **Onboarding** (WhatsApp → `/functions/whatsappWebhook`):

   1. Ask for restaurant + contact details.
   2. Send hosted payment link; mark `isActivated` on payment success webhook.
2. **Supplier & Product Setup** (iterative):

   1. Bot asks for supplier → delivery days → order cut‑off.
   2. Collect product list and weekday / weekend par‑levels.
   3. Repeat until owner confirms that all suppliers and their products are set up.
3. **Inventory Cycle** (scheduled Cloud Functions per supplier):

   1. At `inventoryReminderTime` send stock prompt sequence.
   2. Calculate shortages: `required = parLevel – current`.
   3. Offer +-20 % bump; confirm.
   4. Push order message to supplier WhatsApp with summary table + emojis.
4. **Receiving Goods**:

   * Notify receiver, step through checklist.
   * Accept photo; store in `storage://invoices/{orderId}.jpg`.
   * Record discrepancies → alert owner & supplier.
5. **Ongoing Reminders**:

   * Cron functions (`pubsub.schedule('every 1 hours')`) find upcoming cut‑offs and fire nudges.

---
<!-- You can see the Firestore data model and TypeScript interfaces in the code snippets below -->
## 4. Data Model (Firestore Structure and TypeScript Interfaces)
/**
 * Firestore Data Model
 *
 * /restaurants (collection)
 *   {restaurantId} (doc)      // Use legalId as restaurantId
 *     ├─ businessName: string
 *     ├─ legalId: string
 *     ├─ name: string
 *     ├─ yearsActive: number
 *     ├─ isActivated: boolean
 *     ├─ primaryContact: Contact          // {whatsapp, name, role, email?}
 *     ├─ payment: PaymentMeta            // {provider, customerId, status (boolean)}
 *     └─createdAt: Timestamp
 * 
 *   /suppliers (sub-collection)
 *     {supplierWhatsapp} (doc)
 *       ├─ name: string
 *       ├─ whatsapp: string
 *       ├─ role: "Supplier"
 *       ├─ restaurantId: string         // ref→ /restaurants/{id}
 *       ├─ category: SupplierCategory[]  // Array of categories (e.g ["vegetables", "fruits"])
 *       ├─ deliveryDays: number[]       // Array of delivery days (e.g 1=Monday, 2=Tuesday, etc.)
 *       ├─ cutoffHour: number          // 0–23 local
 *       ├─ rating?: Rating             // 1–5
 *       └─ createdAt: Timestamp
 *
 *     /products (sub-collection)
 *       {productId} (doc)
 *         ├─ id: string                   // Same as document ID
 *         ├─ supplierId: string          // ref→ /restaurants/{r}/suppliers/{s}
 *         ├─ category: SupplierCategory  // Category of the product
 *         ├─ name: string
 *         ├─ emoji?: string
 *         ├─ unit: ProductUnit
 *         ├─ parMidweek: number
 *         ├─ parWeekend: number
 *         └─ createdAt: Timestamp
 *
 *   /orders (sub-collection)
 *     {orderId} (doc)
 *       ├─ id: string                   // Same as document ID
 *       ├─ supplierId: string          // ref→ /restaurants/{r}/suppliers/{id}
 *       ├─ status: "pending"|"sent"|"delivered"
 *       ├─ midweek: boolean
 *       ├─ items: ItemLine[]           // Array of {productId, qty}
 *       ├─ shortages: ItemShortage[]   // Array of {productId, qty, received}
 *       ├─ createdAt: Timestamp
 *       ├─ sentAt?: Timestamp
 *       ├─ receivedAt?: Timestamp
 *       └─ invoiceUrl?: string
 *
 *   /inventorySnapshots (sub-collection)
 *     {snapshotId} (doc)
 *       ├─ id: string                 // Same as document ID
 *       ├─ supplierId: string        // ref→ /restaurants/{r}/suppliers/{id}
 *       ├─ lines: StockLine[]       // Array of {productId, currentQty}
 *       └─ createdAt: Timestamp
 *
 * /conversations (collection)
 *   {phone} (doc)
 *     ├─ currentState: BotState          // Current state of the conversation
 *     ├─ context: ConversationContext   // Complex object with partial fields from various types
 *     ├─ lastMessageTimestamp: Timestamp
 *
 *   /messages (sub-collection)
 *     {messageId} (doc)
 *       ├─ body: string
 *       ├─ direction: "incoming"|"outgoing"
 *       ├─ currentState: BotState     // State when the message was sent
 *       └─ createdAt: Timestamp
 */


```typescript
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
```

---

## 5. Twilio WhatsApp Integration

* **Webhook endpoint**: `https://{region}-{project}.cloudfunctions.net/whatsappWebhook`
* Verify signature using `TWILIO_AUTH_TOKEN`.
* Use **Twilio Conversations API** for 2‑way threads.
* Register **message templates** for:

  * `onboarding_payment_link`
  * `inventory_reminder`
  * `order_summary`
  * `delivery_check`
* Outgoing messages built via `twilioClient.messages.create`.
* Media (invoice photos) → download URL → store in Firebase Storage.

---

## 6. Cloud Functions

| Trigger                                                      | Path                      | Responsibility                              |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------- |
| `https` `onRequest`                                          | `/whatsappWebhook`        | Parse WA webhook, route to state machine    |
| `pubsub.schedule('every 1 hours')`                           | `/cron/generateReminders` | Find pending reminders, enqueue WA messages |
| `firestore.document('/restaurants/{r}/orders/{o}') onUpdate` | `/sync/orderStatus`       | Detect delivery completion, send summary    |
| `https` `onRequest`                                          | `/admin/exportCsv` (auth) | Export reports                              |

State machine draft is in `/packages/botEngine` (see `conversationState.ts`).

---

## 7. Front‑End Admin (Next.js)

Folder sketch:


* Use **TanStack Query** + **firestore.onSnapshot** for live data.
* Role‑based access via `claim.admin === true`.

---

## 8. Environment Variables

```
# Firebase
GOOGLE_CLOUD_PROJECT=
FIREBASE_CONFIG=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Stripe / Paylink
PAYMENT_WEBHOOK_SECRET=
```

---

## 9. Coding Guidelines

1. **TypeScript strict** – no `any`.
2. Validate all external input with **Zod** before writing to Firestore.
3. Store dates as **Timestamps**, never strings.
4. Keep Twilio & Firebase SDK calls in thin **service** modules.
5. Write idempotent CFs; retries are possible.
6. Lint: ESLint + Prettier (monorepo config).
7. Commit format: `feat(orders): calculate shortages correctly`.
8. Always use error handling in CFs (try/catch).
9. Use **shadcn/ui** components for the admin UI.
10. Use **TanStack Query** for data fetching in the admin.


**End of system prompt.**  Keep this file updated as the single source of truth.
