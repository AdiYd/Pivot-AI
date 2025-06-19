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
| Payments         | External Credit card/Paylink URL saved per restaurant        | Out of scope for MVP logic                          |

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
/**
 * Firestore Data Model
 * 
 * Based on the Zod schemas defined in schemas.ts
 * Organized into 3 main collections: restaurants, orders, and conversations
 *
 * /restaurants (collection)
 *   {restaurantId} (doc)               // Use legalId as restaurantId
 *     ├─ legalId: string              // 9-digit legal ID
 *     ├─ legalName: string           // Legal business name
 *     ├─ name: string               // Restaurant name (customer-facing)
 *     ├─ contacts: Contact[]       // Array of contacts items, including primary contact ({whatsapp, name, role, email})
 *     ├─ isActivated: boolean     // Whether the restaurant is activated for service
 *     ├─ payment: PaymentMeta    // {provider, status (boolean)}
 *     ├─ orders: string[]       // Array of order IDs
 *     ├─ createdAt: Timestamp
 *     └─ updatedAt: Timestamp
 *
 *     /suppliers[] (array of suppliers objects)
 *         ├─ whatsapp: string                // WhatsApp number (matches document ID)
 *         ├─ name: string
 *         ├─ role: "supplier"              // Always "supplier"
 *         ├─ email: string (optional)
 *         ├─ category: string[]          // Array of supplier categories
 *         ├─ reminders: Reminder[]      // Array of reminders e.g. [{ day: "sun", time: "20:00" }]
 *         ├─ rating: number            // 0-5
 *         ├─ createdAt: Timestamp
 *         └─ updatedAt: Timestamp
 *
 *         /products[] (array of products objects)
 *             ├─ name: string
 *             ├─ unit: string                // "kg", "pcs", etc.
 *             ├─ emoji: string              // Emoji representation
 *             ├─ parMidweek: number        // Par stock level for midweek
 *             ├─ parWeekend: number       // Par stock level for weekend
 *             ├─ createdAt: Timestamp
 *             └─ updatedAt: Timestamp
 *
 * /orders (collection)
 *   {orderId} (doc)
 *     ├─ id: string                   // Order ID (matches document ID)
 *     ├─ restaurant: {               // Restaurant details
 *     │    legalId: string,
 *     │    name: string,
 *     │    contact: {
 *     │      whatsapp: string,
 *     │      name: string,
 *     │      email: string (optional)
 *     │    }
 *     │ }
 *     ├─ supplier: {                 // Supplier details
 *     │    whatsapp: string,
 *     │    name: string,
 *     │    email: string (optional)
 *     │ }
 *     ├─ category: string[]            // Supplier category for this order
 *     ├─ status: string               // "pending", "confirmed", "sent", "delivered", "cancelled"
 *     ├─ midweek: boolean            // Whether this is a midweek order or weekend order
 *     ├─ items: [                   // Array of ordered products
 *     │    {
 *     │      name: string,
 *     │      unit: string,
 *     │      emoji: string,
 *     │      qty: number
 *     │    },
 *     │    // ...
 *     │ ]
 *     ├─ shortages: [                // Array of product shortages
 *     │    {
 *     │      name: string,
 *     │      unit: string,
 *     │      emoji: string,
 *     │      requestedQty: number,
 *     │      deliveredQty: number
 *     │    },
 *     │    // ...
 *     │ ]
 *     ├─ restaurantNotes: string (optional)
 *     ├─ supplierNotes: string (optional)
 *     ├─ createdAt: Timestamp
 *     ├─ updatedAt: Timestamp
 *     ├─ deliveredAt: Timestamp (optional)
 *     └─ invoiceUrl: string (optional)
 * 
 * /conversations (collection)
 *   {phoneNumber} (doc)       // WhatsApp number as the document ID
 *     ├─ currentState: string  // Current state of the bot conversation
 *     ├─ context: object       // Contextual data for the conversation 
 *     ├─ restaurantId: string (optional) // Reference to associated restaurant
 *     ├─ role: string (optional) // Role of the contact in conversation
 *     ├─ createdAt: Timestamp
 *     └─ updatedAt: Timestamp
 *     
 *     /messages[] (array of messages objects)
 *         ├─ role: string      // "user" or "assistant"
 *         ├─ body: string      // Message content
 *         ├─ templateId: string (optional) // WhatsApp template ID
 *         ├─ hasTemplate: boolean // Whether the message uses a template
 *         ├─ mediaUrl: string (optional) // URL for attached media
 *         ├─ messageState: string // State when message was sent
 *         └─ createdAt: Timestamp

 */



```

---

## 5. Twilio WhatsApp Integration

* **Webhook endpoint**: `https://{region}-{project}.cloudfunctions.net/whatsappWebhook`
* Verify signature using `TWILIO_AUTH_TOKEN`.
* Use **Twilio Conversations API** for 2‑way threads.
* Outgoing messages built via `twilioClient.messages.create`.


---

## 6. Cloud Functions

| Trigger                                                      | Path                      | Responsibility                              |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------- |
| `https` `onRequest`                                          | `/whatsappWebhook`        | Parse WA webhook, route to state machine    |
| `pubsub.schedule('every 1 hours')`                           | `/cron/generateReminders` | Find pending reminders, enqueue WA messages |
| `firestore.document('/orders/{o}/') onUpdate`                | `/sync/orderStatus`       | Detect delivery completion, send summary    |

State machine draft is in `functions/src/schema/states` (see `.ts`).

---

## 7. Front‑End Admin (Next.js)
path: `apps/web-admin`

---

```

## 8. Coding Guidelines

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
