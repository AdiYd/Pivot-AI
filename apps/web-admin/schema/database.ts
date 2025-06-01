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
 *       ├─ category: SupplierCategory
 *       ├─ deliveryDays: number[]         // [0=Sun…6=Sat]
 *       ├─ cutoffHour: number            // 0–23 local
 *       ├─ rating: number               // 1–5
 *       └─ createdAt: Timestamp
 *
 *     /products (sub-collection)
 *       {productId} (doc)
 *         ├─ name: string
 *         ├─ emoji: string
 *         ├─ unit: string
 *         ├─ parMidweek: number
 *         ├─ parWeekend: number
 *         └─ createdAt: Timestamp
 *
 *   /orders (sub-collection)
 *     {orderId} (doc)
 *       ├─ supplierRef: DocumentReference<…/suppliers/{id}>
 *       ├─ status: "pending"|"sent"|"delivered"
 *       ├─ midweek: boolean
 *       ├─ items: ItemLine[]
 *       ├─ shortages: ItemShortage[]
 *       ├─ createdAt: Timestamp
 *       ├─ sentAt?: Timestamp
 *       ├─ receivedAt?: Timestamp
 *       └─ invoiceUrl?: string
 *
 *   /inventorySnapshots (sub-collection)
 *     {snapshotId} (doc)
 *       ├─ supplierRef: DocumentReference<…/suppliers/{id}>
 *       ├─ lines: StockLine[]
 *       └─ createdAt: Timestamp
 *
 * /conversations (collection)
 *   {phone} (doc)
 *     ├─ restaurantRef: DocumentReference<restaurants/{id}>
 *     ├─ currentState: BotState
 *     ├─ context: Map<string, any>
 *     ├─ lastMessageTimestamp: Timestamp
 *
 *   /messages (sub-collection)
 *     {messageId} (doc)
 *       ├─ body: string
 *       ├─ direction: "incoming"|"outgoing"
 *       ├─ currentState: BotState
 *       └─ createdAt: Timestamp
 */



