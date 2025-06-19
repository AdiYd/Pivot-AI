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



