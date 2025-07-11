import { z } from "zod";
import { BotState } from "./types";

// ==== ZOD SCHEMAS FOR DATA VALIDATION and TYPE SAFETY ====

// General schemas
export const textSchema = z.string().min(1, "שדה זה אינו יכול להיות ריק וצריך להכיל לפחות תו אחד");  // Generic text schema for non-empty strings
export const timestampSchema = z.any().optional(); // Placeholder for server timestamp, will be replaced with serverTimestamp in Firestore
export const daysSchema = z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]); // Enum for days of the week, used for cutoff, reminders and delivery days
export const timeSchema = z.string().regex(/^(0[6-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "שעה חייבת להיות בין 06:00 ל-23:59 ובפורמט HH:MM, לדוגמה: 20:00"); // Regex for time in HH:MM format, only between 06:00 and 23:59

// Onboarding Types
export const restaurantLegalIdSchema = z.string().regex(/^\d{9}$/, "מספר ח.פ של המסעדה חייב להיות באורך של 9 ספרות בלבד, לדוגמה: 123456789"); // 9-digit legal ID
export const restaurantLegalNameSchema = z.string().min(2, "השם החוקי של המסעדה חייב להיות באורך של לפחות 2 תווים");
export const restaurantNameSchema = z.string().min(2, "שם המסעדה (השם שהלקוחות מכירים) חייב להיות באורך של לפחות 2 תווים");
export const paymentProviderSchema = z.enum(["trial", "credit_card", "paypal"]).default("trial");


// Contact types
export const whatsappRegex = /^(05[0-9]{8})$/; // Regex for Israeli WhatsApp numbers starting with 05
export const whatsappSchema = z.string().regex(whatsappRegex, "מספר הוואטסאפ לא תקין, יש לכתוב מספר ללא תווים נוספים, לדוגמה: 0541234567");
export const nameSchema = z.string().min(2, "שם חייב להיות באורך של לפחות 2 תווים");
export const emailSchema = z.string().email("כתובת האימייל לא תקינה");
export const contactRoleSchema = z.enum(["בעלים", "מנהל מסעדה", "מנהל", "אחראי", "מנהל מטבח", "מנהל בר", "מטבח", "בר", "כללי", "ספק"], {
  description: "תפקיד איש הקשר במסעדה, לדוגמה: 'מנהל', 'ספק' וכו'"
});


// Product types
export const productUnitSchema = z.union([
  z.enum(['ק"ג', 'גרם', 'ליטר', 'מ"ל', 'מ"ג', 'יחידות', 'קופסה', 'אריזה', 'שקית','יחידה', 'חבית', 'צנצנת', 'בקבוק', 'פחית', 'חבילה','ארגז','מארז', 'אחר']),
  z.string().min(1, "יחידת המוצר חייבת להיות באורך של לפחות תו אחד")
]).default("אחר"); // Default unit is other, can be any string or predefined unit
export const productNameSchema = z.string().min(2, "שם המוצר חייב להיות באורך של לפחות 2 תווים");
export const parSchema = z.number().gt(0, "כמות מינימלית חייבת להיות מעל 0");
export const emojySchema = z.string().default("📦"); // Optional emoji for product representation


// Supplier types
export const supplierRatingSchema = z.number().min(0).max(5); // Rating from 0 to 5
export const supplierCategorySchema = z.string().min(2, 'קטגוריה חייבת להיות באורך של לפחות 2 תווים'); // Minimum 2 characters
export const supplierCutoffSchema = z.array(z.object({
  day: daysSchema,
  // Time in HH:MM format, e.g., 20:00 between 06:00 and 23:59
  time: timeSchema
}));
export const supplierCutoffHourSchema = z.number().min(0, "אנא הזן שעה תקינה בין 0 ל-23").max(23, 'שעת סיום חייבת להיות בין 0 ל-23'); // Cutoff hour for placing orders, default to 20:00

// Order types
export const orderIdSchema = z.string().min(5, "מספר ההזמנה חייב להיות באורך של לפחות 5 תווים");
export const orderStatusSchema = z.enum(["pending", "confirmed","cancelled"]).default("pending");


// Message types
const botStateValues: BotState[] = [
  "INIT",
  "INTERESTED",
  "ONBOARDING_COMPANY_NAME",
  "ONBOARDING_LEGAL_ID",
  "ONBOARDING_RESTAURANT_NAME",
  "ONBOARDING_CONTACT_NAME",
  "ONBOARDING_CONTACT_EMAIL",
  "ONBOARDING_PAYMENT_METHOD",
  "ONBOARDING_SIMULATOR",
  "WAITING_FOR_PAYMENT",
  "SETUP_SUPPLIERS_START",
  "SETUP_SUPPLIERS_ADDITIONAL",
  "SUPPLIER_CATEGORY",
  "SUPPLIER_CATEGORY2",
  "SUPPLIER_CONTACT",
  "SUPPLIER_CUTOFF",
  "PRODUCTS_LIST",
  "PRODUCTS_BASE_QTY",
  "RESTAURANT_FINISHED",
  "ORDER_CONFIRMATION",
  "RESTAURANT_INFO",
  "ORDERS_INFO",
  "IDLE",
  "HELP"
];
export const conversationStateSchema = z.enum(botStateValues as [BotState, ...BotState[]], {
  description: "מצב השיחה הנוכחי, לדוגמה: 'WAITING_FOR_PAYMENT', 'INVENTORY_SNAPSHOT_START', 'IDLE' וכו'",
});

// ========================= New collection for restaurants =========================

// Contact schema used in multiple places
export const ContactSchema = z.object({
  whatsapp: whatsappSchema,
  name: nameSchema,
  role: contactRoleSchema.default('כללי'),
  email: emailSchema.optional(),
  remindersForSuppliers: z.array(z.string()).optional(),
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
export const SupplierSchema = ContactSchema.pick({name: true, whatsapp: true, email: true}).extend({
    role: contactRoleSchema.default('ספק').transform(()=> "ספק"), // All suppliers have the role of "supplier"
    category: z.array(supplierCategorySchema).default([]), // Array of supplier categories, transformed to a Set for uniqueness
    cutoff: supplierCutoffSchema.default([]), // Array of cutoff times for the supplier
    products: z.array(ProductSchema).default([]), // Array of products of the supplier
    rating: supplierRatingSchema.default(0), // Rating from 0 to 5
    createdAt: timestampSchema,
    updatedAt: timestampSchema
});


// Restaurant schema for validation
export const RestaurantSchema = z.object({
  legalId: restaurantLegalIdSchema,                      // 9-digit legal ID will use also as restaurant ID
  legalName: restaurantLegalNameSchema,
  name: restaurantNameSchema,
  contacts: z.record(whatsappSchema, ContactSchema),   // Map of contacts for the restaurant
  payment: PaymentMetaSchema,
  suppliers: z.array(SupplierSchema).default([]),   // Array of supplier IDs
  orders: z.array(z.string()).default([]),         // Array of order IDs
  isActivated: z.boolean().default(true),        // Whether the restaurant is activated for service and orders
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});


// ========================= New collection for orders =========================

// Order schema (with all related entities) for validation
export const OrderSchema = z.object({
  id: orderIdSchema,
  category: z.array(supplierCategorySchema), // Only include necessary fields of the supplier
  supplier: SupplierSchema.pick({ whatsapp: true, name: true, email: true }), // Only include necessary fields of the supplier
  timeToDeliver: z.string().min(5, "זמן אספקה לא תקין"), // Time to deliver the order, e.g., "20:00"
  restaurant: RestaurantSchema.pick({
    legalId: true,
    name: true,
  }).extend({
    contact: ContactSchema,
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
  .max(500, "הערות מהמסעדה לספק, עד 500 תווים").default(""),    // Optional notes from the restaurant to the supplier
  supplierNotes: z.string()
  .max(500, "הערות מהספק למסעדה, עד 500 תווים").default(""),     // Optional notes for the supplier to the restaurant
  createdAt: timestampSchema, // Timestamp of when the order was created
  updatedAt: timestampSchema,
  deliveredAt: timestampSchema,
  invoiceUrl: z.string().url().optional()
});






// ========================= New collection for conversations =========================

// Conversations schemas (for conversation & messages)
export const MessageSchema = z.object({
    role: z.enum(["user", "assistant"]).default("user"),                     // Role of the message sender, e.g., "user", "assistant", "system"
    body: z.string().max(4000, "תוכן ההודעה לא יכול להיות ארוך מ-4000 תווים").default(""), // Content of the message
    templateId: z.string().optional(),                                     // Optional template ID for the message
    hasTemplate: z.boolean().optional(),                              // Whether the message has a whatsApp template
    mediaUrl: z.string().url().optional(),                               // Optional media URL for the message, e.g., image or video
    messageState: conversationStateSchema.default('IDLE'),                           // Current state of the state machine when the message is created
    createdAt: timestampSchema,                                        // Timestamp of when the message was created
});

// Conversation schema for validation
export const ConversationSchema = z.object({
    currentState: conversationStateSchema.default('INIT'),                           // Current state of the state machine of the conversation, e.g., "IDLE", "WAITING_FOR_PAYMENT" etc.
    context: z.record(z.any()).default({}),                            // Context of the conversation, can be any key-value pairs
    messages: z.array(MessageSchema).default([]),                     // Array of messages in the conversation
    restaurantId: restaurantLegalIdSchema.optional(),                // Optional restaurant ID to link between a conversation and a restaurant
    role: contactRoleSchema.default("כללי"),                        // Role of the contact in the conversation, e.g., "owner", "manager", etc.
    createdAt: timestampSchema,                                    // Timestamp of when the conversation was created
    updatedAt: timestampSchema,                                   // Timestamp of when the conversation was last updated (e.g., last message timestamp)
});


export const DatabaseSchema = z.object({
  restaurants: z.record(RestaurantSchema).default({}), // Record of restaurants
  orders: z.record(OrderSchema).default({}),           // Record of orders
  conversations: z.record(ConversationSchema).default({}) // Record of conversations
});