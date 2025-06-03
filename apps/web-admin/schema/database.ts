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
 *     ├─ currentState: BotState
 *     ├─ context: ConversationContext  // Complex object with partial fields from various types
 *     ├─ lastMessageTimestamp: Timestamp
 *
 *   /messages (sub-collection)
 *     {messageId} (doc)
 *       ├─ body: string
 *       ├─ direction: "incoming"|"outgoing"
 *       ├─ currentState: BotState
 *       └─ createdAt: Timestamp
 */



