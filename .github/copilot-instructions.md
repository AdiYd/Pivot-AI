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
   3. Repeat until owner sends **Done**.
3. **Inventory Cycle** (scheduled CF per supplier):

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

## 4. Data Model (Firestore)

```
/restaurants (collection)
  {restaurantId} (document)
    name              string   // display name
    legalId           string   // ח.פ
    businessName      string
    yearsActive       number
    createdAt         Timestamp
    isActivated       boolean
    primaryContact    map<Contact>
    payment           map<PaymentMeta>
    settings          map { timezone, locale }

    /suppliers (sub‑collection)
      {supplierId}
        name              string
        whatsapp          string
        deliveryDays      array<number>   // 0=Sun … 6=Sat
        cutoffHour        number          // 0‑23 local
        category          string          // "vegetables" etc.
        createdAt         Timestamp
        rating            number          // 1‑5 stars

        /products
          {productId}
            name              string
            unit              string        // "kg", "pcs"
            emoji             string
            parMidweek        number
            parWeekend        number
            createdAt         Timestamp

    /orders
      {orderId}
        supplierId        ref
        status            "pending"|"sent"|"delivered"
        items             array<ItemLine>
        midweek           boolean
        createdAt         Timestamp
        sentAt            Timestamp?
        receivedAt        Timestamp?
        invoiceUrl        string?
        shortages         array<ItemShortage>

    /inventorySnapshots
      {snapshotId}
        supplierId        ref
        lines             array<StockLine>
        createdAt         Timestamp
```

### Shared TypeScript interfaces (`/packages/schema/index.ts`)

```ts
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
  | "WAITING_FOR_PAYMENT"
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

This is an example of the data structure as it would be stored in Firestore, including restaurants, suppliers, products, orders, and conversations. The data is structured to facilitate easy querying and management of restaurant inventory and supplier relationships:

 {
  restaurants: [
    {
      id: "rest-001",
      data: {
        name: "Olive Branch",
        businessName: "Olive Branch Ltd.",
        legalId: "123456789",
        yearsActive: 5,
        isActivated: true,
        createdAt: new Date("2025-05-01T08:00:00Z") as unknown as Timestamp,
        primaryContact: { name: "Maya Cohen", role: "Owner", phone: "0501001000", email: "maya@olive.com" },
        payment: { provider: "Stripe", customerId: "cus_ABC", status: "active" },
        settings: { timezone: "Asia/Jerusalem", locale: "he-IL" }
      },
      suppliers: [
        {
          id: "sup-veg-001",
          data: {
            name: "Green Farms",
            whatsapp: "0502002000",
            deliveryDays: [1, 3, 5],
            cutoffHour: 14,
            category: "vegetables",
            rating: 4,
            createdAt: new Date("2025-05-02T09:00:00Z") as unknown as Timestamp
          },
          products: [
            { id: "prod-veg-001", supplierId: "sup-veg-001", name: "מלפפונים", emoji: "🥒", unit: "kg", parMidweek: 10, parWeekend: 15, createdAt: new Date("2025-05-02T09:05:00Z") as unknown as Timestamp },
            { id: "prod-veg-002", supplierId: "sup-veg-001", name: "חסה", emoji: "🥬", unit: "pcs", parMidweek: 20, parWeekend: 25, createdAt: new Date("2025-05-02T09:06:00Z") as unknown as Timestamp }
          ]
        },
        {
          id: "sup-fish-001",
          data: {
            name: "Sea Fresh",
            whatsapp: "0503003000",
            deliveryDays: [2, 4],
            cutoffHour: 12,
            category: "fish",
            rating: 5,
            createdAt: new Date("2025-05-03T10:00:00Z") as unknown as Timestamp
          },
          products: [
            { id: "prod-fish-001", supplierId: "sup-fish-001", name: "דג סלמון", emoji: "🐟", unit: "kg", parMidweek: 5, parWeekend: 8, createdAt: new Date("2025-05-03T10:10:00Z") as unknown as Timestamp }
          ]
        }
      ],
      orders: [
        {
          id: "ord-001",
          data: {
            supplierId: "sup-veg-001",
            status: "delivered",
            items: [{ productId: "prod-veg-001", qty: 10 }],
            midweek: true,
            createdAt: new Date("2025-05-25T08:00:00Z") as unknown as Timestamp,
            sentAt: new Date("2025-05-25T08:05:00Z") as unknown as Timestamp,
            receivedAt: new Date("2025-05-26T09:00:00Z") as unknown as Timestamp,
            invoiceUrl: "https://storage.example.com/inv-001.jpg",
            shortages: [{ productId: "prod-veg-002", qty: 25, received: 20 }]
          }
        }
      ],
      inventorySnapshots: [
        {
          id: "snap-001",
          data: {
            supplierId: "sup-veg-001",
            lines: [{ productId: "prod-veg-001", currentQty: 3 }, { productId: "prod-veg-002", currentQty: 5 }],
            createdAt: new Date("2025-05-26T07:00:00Z") as unknown as Timestamp
          }
        }
      ]
    },

    {
      id: "rest-002",
      data: {
        name: "Sunset Grill",
        businessName: "Sunset Grill Inc.",
        legalId: "987654321",
        yearsActive: 2,
        isActivated: false,
        createdAt: new Date("2025-04-15T08:00:00Z") as unknown as Timestamp,
        primaryContact: { name: "Eli Levi", role: "Manager", phone: "0504004000" },
        payment: { provider: "Paylink", customerId: "pl_123", status: "pending" },
        settings: { timezone: "Asia/Jerusalem", locale: "he-IL" }
      },
      suppliers: [],
      orders: [],
      inventorySnapshots: []
    },

    {
      id: "rest-003",
      data: {
        name: "Cafe Aroma",
        businessName: "Aroma Ltd.",
        legalId: "111222333",
        yearsActive: 10,
        isActivated: true,
        createdAt: new Date("2025-03-01T08:00:00Z") as unknown as Timestamp,
        primaryContact: { name: "Dana Katz", role: "Shift", phone: "0505005000", email: "dana@aroma.co.il" },
        payment: { provider: "Stripe", customerId: "cus_XYZ", status: "active" },
        settings: { timezone: "Asia/Jerusalem", locale: "he-IL" }
      },
      suppliers: [
        {
          id: "sup-meat-001",
          data: {
            name: "Butcher's Best",
            whatsapp: "0506006000",
            deliveryDays: [0, 6],
            cutoffHour: 16,
            category: "meat",
            rating: 3,
            createdAt: new Date("2025-03-05T09:00:00Z") as unknown as Timestamp
          },
          products: []
        }
      ],
      orders: [],
      inventorySnapshots: []
    },

    {
      id: "rest-004",
      data: {
        name: "Spice Route",
        businessName: "Spice Route LLC",
        legalId: "555666777",
        yearsActive: 3,
        isActivated: true,
        createdAt: new Date("2025-02-20T08:00:00Z") as unknown as Timestamp,
        primaryContact: { name: "Yonatan Sapir", role: "Other", phone: "0507007000" },
        payment: { provider: "Paylink", customerId: "pl_456", status: "active" },
        settings: { timezone: "Asia/Jerusalem", locale: "he-IL" }
      },
      suppliers: [
        {
          id: "sup-alc-001",
          data: {
            name: "Wine & Spirits",
            whatsapp: "0508008000",
            deliveryDays: [4],
            cutoffHour: 18,
            category: "alcohol",
            rating: 5,
            createdAt: new Date("2025-02-25T10:00:00Z") as unknown as Timestamp
          },
          products: [
            { id: "prod-alc-001", supplierId: "sup-alc-001", name: "יין אדום", emoji: "🍷", unit: "bottle", parMidweek: 12, parWeekend: 20, createdAt: new Date("2025-02-25T10:15:00Z") as unknown as Timestamp }
          ]
        }
      ],
      orders: [],
      inventorySnapshots: []
    },

    {
      id: "rest-005",
      data: {
        name: "Bakery Bliss",
        businessName: "Bliss Bakes",
        legalId: "222333444",
        yearsActive: 7,
        isActivated: false,
        createdAt: new Date("2025-01-10T08:00:00Z") as unknown as Timestamp,
        primaryContact: { name: "Rachel Dayan", role: "Manager", phone: "0509009000" },
        payment: { provider: "Stripe", customerId: "cus_DEF", status: "pending" },
        settings: { timezone: "Asia/Jerusalem", locale: "he-IL" }
      },
      suppliers: [],
      orders: [],
      inventorySnapshots: []
    }
  ],

  conversations: [
    {
      id: "0501001000",
      data: {
        restaurantId: "rest-001",
        currentState: "IDLE",
        context: { restaurantName: "Olive Branch", contactName: "Maya Cohen" },
        lastMessageTimestamp: new Date("2025-05-26T10:00:00Z") as unknown as Timestamp,
        updatedAt: new Date("2025-05-26T10:00:00Z") as unknown as Timestamp
      },
      messages: [
        { body: "שלום", direction: "incoming", currentState: "IDLE", createdAt: new Date("2025-05-26T09:59:00Z") as unknown as Timestamp },
        { body: "👋 שלום Maya Cohen!\n...", direction: "outgoing", currentState: "IDLE", createdAt: new Date("2025-05-26T10:00:00Z") as unknown as Timestamp }
      ]
    },

    {
      id: "0504004000",
      data: {
        restaurantId: "rest-002",
        currentState: "WAITING_FOR_PAYMENT",
        context: { contactName: "Eli Levi", restaurantName: "Sunset Grill" },
        lastMessageTimestamp: new Date("2025-05-30T12:00:00Z") as unknown as Timestamp,
        updatedAt: new Date("2025-05-30T12:00:00Z") as unknown as Timestamp
      },
      messages: [
        { body: "דלג", direction: "incoming", currentState: "ONBOARDING_CONTACT_EMAIL", createdAt: new Date("2025-05-30T11:50:00Z") as unknown as Timestamp },
        { body: "💳 ...", direction: "outgoing", currentState: "WAITING_FOR_PAYMENT", createdAt: new Date("2025-05-30T12:00:00Z") as unknown as Timestamp }
      ]
    },

    {
      id: "0505005000",
      data: {
        restaurantId: "rest-003",
        currentState: "SUPPLIER_DETAILS",
        context: { currentCategoryIndex: 0, currentSupplier: { name: "Butcher's Best", whatsapp: "0506006000", category: "meat" } },
        lastMessageTimestamp: new Date("2025-05-28T14:00:00Z") as unknown as Timestamp,
        updatedAt: new Date("2025-05-28T14:00:00Z") as unknown as Timestamp
      },
      messages: [
        { body: "משהו", direction: "incoming", currentState: "IDLE", createdAt: new Date("2025-05-28T13:50:00Z") as unknown as Timestamp },
        { body: "🏪 בואו נתחיל...", direction: "outgoing", currentState: "SUPPLIER_DETAILS", createdAt: new Date("2025-05-28T14:00:00Z") as unknown as Timestamp }
      ]
    },
    
    {
      id: "0507007000",
      data: {
        restaurantId: "rest-004",
        currentState: "PRODUCT_PAR_MIDWEEK",
        context: {
          currentCategoryIndex: 2,
          currentSupplier: { name: "Wine & Spirits", whatsapp: "0508008000", category: "alcohol", deliveryDays: [4], cutoffHour: 18, products: [
            { id: "prod-alc-001", name: "יין אדום", emoji: "🍷", unit: "bottle", parMidweek: 12 }
          ] },
          currentProductIndex: 0
        },
        lastMessageTimestamp: new Date("2025-05-24T16:00:00Z") as unknown as Timestamp,
        updatedAt: new Date("2025-05-24T16:00:00Z") as unknown as Timestamp
      },
      messages: [
        { body: "10 bottle", direction: "incoming", currentState: "PRODUCT_PAR_MIDWEEK", createdAt: new Date("2025-05-24T15:55:00Z") as unknown as Timestamp }
      ]
    },
    {
      id: "0509009000",
      data: {
        restaurantId: "rest-005",
        currentState: "ONBOARDING_COMPANY_NAME",
        context: {},
        lastMessageTimestamp: new Date("2025-06-01T09:00:00Z") as unknown as Timestamp,
        updatedAt: new Date("2025-06-01T09:00:00Z") as unknown as Timestamp
      },
      messages: [
        { body: "Coffee Shop", direction: "incoming", currentState: "INIT", createdAt: new Date("2025-06-01T08:59:00Z") as unknown as Timestamp },
        { body: "❌ אנא הזן שם חברה תקין", direction: "outgoing", currentState: "ONBOARDING_COMPANY_NAME", createdAt: new Date("2025-06-01T09:00:00Z") as unknown as Timestamp }
      ]
    }
  ]
}

**End of system prompt.**  Keep this file updated as the single source of truth.
