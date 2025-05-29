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

export interface Supplier {
  id: string;
  name: string;
  whatsapp: string;
  deliveryDays: number[];
  cutoffHour: number;
  category: SupplierCategory;
  products: Product[];
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

```
apps/web-admin/
  app/
    layout.tsx
    page.tsx               // dashboard
    (restaurants)/
      layout.tsx
      page.tsx
      suppliers/
      orders/
  lib/firebaseClient.ts    // modular SDK
  lib/api.ts               // fetch helpers (calls Cloud Functions)
  components/ui/...        // shadcn re‑exports
  types/ (re‑export from schema)
```

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

---

## 10. Open Tasks

| ID   | Area     | Description                                   |
| ---- | -------- | --------------------------------------------- |
| T‑01 | CF       | Implement `conversationState` reducer         |
| T‑02 | Admin UI | CRUD for suppliers & products                 |
| T‑03 | AI       | GPT‑based natural‑language inventory update   |
| T‑04 | Payments | Stripe checkout + webhook activate restaurant |

---

**End of system prompt.**  Keep this file updated as the single source of truth.
