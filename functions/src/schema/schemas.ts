import { z } from "zod";

// ==== ZOD SCHEMAS FOR DATA VALIDATION and TYPE SAFETY ====

export const textSchema = z.string().min(2, "שדה זה אינו יכול להיות ריק");  // Generic text schema for non-empty strings

// Onboarding Types
export const restaurantLegalIdSchema = z.string().regex(/^\d{9}$/, "מספר ח.פ של המסעדה חייב להיות באורך של 9 ספרות בלבד, לדוגמה: 123456789"); // 9-digit legal ID
export const restaurantLegalNameSchema = z.string().min(2, "השם החוקי של המסעדה חייב להיות באורך של לפחות 2 תווים");
export const restaurantNameSchema = z.string().min(2, "שם המסעדה חייב להיות באורך של לפחות 2 תווים");
export const paymentProviderSchema = z.enum(["trial", "stripe", "cash"]).default("trial");
export const timestampSchema = z.any().optional(); // Placeholder for server timestamp, will be replaced with serverTimestamp in Firestore


// Contact types
export const whatsappRegex = /^(05[0-9]{8})$/; // Regex for Israeli WhatsApp numbers starting with 05
export const whatsappSchema = z.string().regex(whatsappRegex, "מספר הוואטסאפ לא תקין, יש לכתוב מספר לא תווים נוספים לדוגמה: 0541234567");
export const nameSchema = z.string().min(2, "שם חייב להיות באורך של לפחות 2 תווים");
export const emailSchema = z.string().email("כתובת האימייל לא תקינה");
export const contactRoleSchema = z.enum(["owner", "manager", "shift", "general", "supplier"]);


// Product types
export const productUnitSchema = z.enum(["kg", "g", "l", "ml", "mg", "pcs", "box", "bag", "bottle", "can", "packet", "other"]).default("other");
export const productNameSchema = z.string().min(2, "שם המוצר חייב להיות באורך של לפחות 2 תווים");
export const parSchema = z.number().gt(0, "כמות מינימלית חייבת להיות מעל 0");
export const emojySchema = z.string().default("📦"); // Optional emoji for product representation


// Supplier types
export const supplierRatingSchema = z.number().min(0).max(5); // Rating from 0 to 5
export const supplierCategorySchema = z.union([z.enum(["general", "vegetables","fruits","herbs","coffee","spices", "meat", "dairy", "bakery", "beverages", "fish", "frozen", "dry", "other"]), z.string().min(2,'שם הקטגוריה חייב להיות לפחות 2 תווים')]).default("general");
export const supplierDeliveryDaysSchema = z.array(z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]));
export const supplierCutoffHourSchema = z.number().min(0, "אנא הזן שעה תקינה בין 0 ל-23").max(23, 'שעת סיום חייבת להיות בין 0 ל-23'); // Cutoff hour for placing orders, default to 20:00

// Order types
export const orderStatusSchema = z.enum(["pending", "confirmed","sent", "delivered","cancelled"]).default("pending");





// ========================= New collection for restaurants =========================

// Contact schema used in multiple places
export const ContactSchema = z.object({
  whatsapp: whatsappSchema,
  name: nameSchema,
  role: contactRoleSchema.default('general'),
  email: emailSchema.optional(),
});


// Payment metadata schema
export const PaymentMetaSchema = z.object({
  provider: paymentProviderSchema,
  status: z.boolean().default(false),
});


// Product schema
export const ProductSchema = z.object({
  name: productNameSchema,
  unit: productUnitSchema,
  emoji: emojySchema,
  parMidweek: parSchema,
  parWeekend: parSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});


// Supplier schema
export const SupplierSchema = ContactSchema.extend({
    role: contactRoleSchema.default('supplier').transform(()=> "supplier"), // All suppliers have the role of "supplier"
    category: supplierCategorySchema,
    deliveryDays: supplierDeliveryDaysSchema,
    cutoffHour: supplierCutoffHourSchema, 
    products: z.array(ProductSchema).default([]), // Array of products of the supplier
    rating: supplierRatingSchema.default(0), // Rating from 0 to 5
    createdAt: timestampSchema,
    updatedAt: timestampSchema
});


// Restaurant schema for validation
export const RestaurantSchema = z.object({
  legalId: restaurantLegalIdSchema,                    // 9-digit legal ID will use also as restaurant ID
  legalName: restaurantLegalNameSchema,
  name: restaurantNameSchema,
  contacts: z.array(ContactSchema),                  // Array of contacts for the restaurant
  payment: PaymentMetaSchema,
  suppliers: z.array(SupplierSchema).default([]),   // Array of supplier IDs
  orders: z.array(z.string()).default([]),         // Array of order IDs
  isActivated: z.boolean().default(false),        // Whether the restaurant is activated for service and orders
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});


// ========================= New collection for orders =========================

// Order schema (with all related entities) for validation
export const OrderSchema = z.object({
  id: z.string().min(5, "מספר ההזמנה חייב להיות באורך של לפחות 5 תווים"),
  category: SupplierSchema.pick({ category: true }), // Only include necessary fields of the supplier
  supplier: SupplierSchema.pick({ whatsapp: true, name: true, email: true }), // Only include necessary fields of the supplier
  restaurant: RestaurantSchema.pick({
    legalId: true,
    name: true,
  }).extend({
    contact: ContactSchema.pick({
      whatsapp: true, name: true, email: true
    })
  }), // Only include necessary fields of the restaurant
  status: orderStatusSchema,
  items: z.array(                                 // Array of product and their details to be ordered from the supplier
    ProductSchema
    .pick({name: true, unit: true, emoji: true})
    .extend({
      qty: z.number().gt(0, "כמות חייבת להיות מעל 0"),
    })
  ).default([]), 
  shortages: z.array(                           // Array of shortages with their details that were not delivered by the supplier
    ProductSchema.pick({name: true, unit: true, emoji: true}).extend({
        requestedQty: z.number().gt(0, "כמות חייבת להיות מעל 0"), // Quantity of the product that was requested
        deliveredQty: z.number().min(0, "כמות חייבת להיות מעל 0"), // Quantity of the product that can be delivered
    })
  ).default([]), 
  midweek: z.boolean(),                       // Whether the order is for midweek or weekend
  restaurantNotes: z.string()
  .max(500, "הערות מהמסעדה לספק, עד 500 תווים").optional(),    // Optional notes from the restaurant to the supplier
  supplierNotes: z.string()
  .max(500, "הערות מהספק למסעדה, עד 500 תווים").optional(),     // Optional notes for the supplier to the restaurant
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  deliveredAt: timestampSchema,
  invoiceUrl: z.string().url().optional()
});






// ========================= New collection for conversations =========================

// Conversations schemas (for conversation & messages)
export const MessageSchema = z.object({
    role: z.enum(["user", "assistant"]).default("user"),                     // Role of the message sender, e.g., "user", "assistant", "system"
    body: z.string().max(1024, "תוכן ההודעה לא יכול להיות ארוך מ-1024 תווים").default(""), // Content of the message
    templateId: z.string().uuid().optional(),                              // Optional template ID for the message
    hasTemplate: z.boolean().default(false),                              // Whether the message has a whatsApp template
    mediaUrl: z.string().url().optional(),                               // Optional media URL for the message, e.g., image or video
    messageState: z.string().default('IDLE'),                           // Current state of the state machine when the message is created
    createdAt: timestampSchema,                                        // Timestamp of when the message was created
});

// Conversation schema for validation
export const ConversationSchema = z.object({
    currentState: z.string().default('IDLE'),                           // Current state of the state machine of the conversation, e.g., "IDLE", "WAITING_FOR_PAYMENT" etc.
    context: z.record(z.any()).default({}),                            // Context of the conversation, can be any key-value pairs
    messages: z.array(MessageSchema).default([]),                     // Array of messages in the conversation
    restaurantId: restaurantLegalIdSchema.optional(),                // Optional restaurant ID to link between a conversation and a restaurant
    role: contactRoleSchema.optional(),                             // Role of the contact in the conversation, e.g., "owner", "manager", etc.
    createdAt: timestampSchema,                                    // Timestamp of when the conversation was created
    updatedAt: timestampSchema,                                   // Timestamp of when the conversation was last updated
});

