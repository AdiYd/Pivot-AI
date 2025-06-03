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
/ (root)
├─ restaurants (collection)
│  └─ {legalId} (document)           // Using legalId as the document ID
│     ├─ businessName: string
│     ├─ legalId: string             // Duplicate of document ID for queries
│     ├─ name: string
│     ├─ yearsActive: number
│     ├─ isActivated: boolean
│     ├─ primaryContact: {
│     │    whatsapp: string,
│     │    name: string,
│     │    role: string,
│     │    email?: string
│     │ }
│     ├─ payment: {
│     │    provider: "Stripe" | "Paylink",
│     │    customerId: string,
│     │    status: boolean
│     │ }
│     └─ createdAt: Timestamp
│
│     ├─ suppliers (sub-collection)
│     │  └─ {supplierWhatsapp} (document)  // Using WhatsApp number as ID
│     │     ├─ name: string
│     │     ├─ whatsapp: string            // Duplicate of document ID
│     │     ├─ category: string            // "vegetables", "fish", etc.
│     │     ├─ deliveryDays: number[]      // [0=Sun...6=Sat]
│     │     ├─ cutoffHour: number          // 0-23 hours
│     │     ├─ rating: number              // 1-5
│     │     └─ createdAt: Timestamp
│     │
│     │     └─ products (sub-collection)   // Nested under each supplier
│     │        └─ {productId} (document)
│     │           ├─ name: string
│     │           ├─ emoji: string
│     │           ├─ unit: string          // "kg", "pcs", etc.
│     │           ├─ parMidweek: number
│     │           ├─ parWeekend: number
│     │           └─ createdAt: Timestamp
│     │
│     ├─ orders (sub-collection)           // Direct sub-collection of restaurant
│     │  └─ {orderId} (document)
│     │     ├─ supplierRef: DocumentReference  // Points to supplier
│     │     ├─ status: "pending"|"sent"|"delivered"
│     │     ├─ midweek: boolean
│     │     ├─ items: [                    // Array of ordered items
│     │     │    {
│     │     │      productId: string,
│     │     │      qty: number
│     │     │    }
│     │     │ ]
│     │     ├─ shortages: [                // Array of short items
│     │     │    {
│     │     │      productId: string,
│     │     │      qty: number,
│     │     │      received: number
│     │     │    }
│     │     │ ]
│     │     ├─ createdAt: Timestamp
│     │     ├─ sentAt?: Timestamp
│     │     ├─ receivedAt?: Timestamp
│     │     └─ invoiceUrl?: string
│     │
│     └─ inventorySnapshots (sub-collection)
│        └─ {snapshotId} (document)
│           ├─ supplierRef: DocumentReference  // Points to supplier
│           ├─ lines: [                    // Array of stock lines
│           │    {
│           │      productId: string,
│           │      currentQty: number
│           │    }
│           │ ]
│           └─ createdAt: Timestamp
│
└─ conversations (collection)
   └─ {phone} (document)                  // Phone number as document ID
      ├─ restaurantRef: DocumentReference // Points to restaurant
      ├─ currentState: string             // Current bot state
      ├─ context: Map<string, any>        // Conversation context
      ├─ lastMessageTimestamp: Timestamp
      │
      └─ messages (sub-collection)
         └─ {messageId} (document)
            ├─ body: string
            ├─ direction: "incoming"|"outgoing"
            ├─ currentState: string       // Bot state during message
            └─ createdAt: Timestamp


```ts
import { Timestamp } from 'firebase-admin/firestore';
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
  status: Boolean;
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
  productId: Product["id"];
  currentQty: number;
}

export interface Order {
  id: string;
  supplierId: Supplier["whatsapp"];
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
  supplierId: Supplier["whatsapp"];
  lines: StockLine[];
  createdAt: Timestamp;
}

// Conversation state types for the WhatsApp bot
export interface ConversationState {
  restaurantId: Restaurant["legalId"];
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
  type: "SEND_MESSAGE" | "CREATE_RESTAURANT" | "UPDATE_SUPPLIER" | "UPDATE_PRODUCT" | "SEND_ORDER" | "LOG_DELIVERY";
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
