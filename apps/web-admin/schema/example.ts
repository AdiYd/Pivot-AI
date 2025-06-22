import { Timestamp } from 'firebase/firestore';
import { BotState, Conversation, Message, Order, Product, Restaurant, Supplier } from './types';

/**
 * Example Data
 * This file provides a comprehensive example of all data structures in the system.
 * It serves as a reference for development and testing.
 * 
 * Firestore hierarchy:
 * 
 * /restaurants/{legalId}/...
 *   - /suppliers/{supplierWhatsapp}/...
 *     - /products/{productId}
 * /orders/{orderId}
 * /conversations/{phoneNumber}/...
 *   - /messages/{messageId}
 */

// Helper for creating timestamps (now and relative dates)
const now = Timestamp.now();
const daysAgo = (days: number, hoursOffset = 0) => {
  const date = new Date(now.toDate().getTime() - days * 86400000);
  if (hoursOffset) date.setHours(date.getHours() - hoursOffset);
  return Timestamp.fromDate(date);
};

// ======== RESTAURANTS COLLECTION WITH NESTED SUPPLIERS AND PRODUCTS ========

export const exampleRestaurants: Record<Restaurant['legalId'], Restaurant> = {
  // Restaurant 1: Fine dining restaurant
  "123456789": {
    legalId: "123456789",
    legalName: "לה בל קוויזין בע״מ",
    name: "לה בל קוויזין",
    contacts: {
      "0501234567": {
        whatsapp: "0501234567",
        name: "דוד כהן",
        role: "owner",
        email: "david@labellecuisine.com"
      },
      "0501234568": {
        whatsapp: "0501234568",
        name: "יעל לוי",
        role: "manager",
        email: "yael@labellecuisine.com"
      }
    },
    isActivated: true,
    payment: {
      provider: "credit_card",
      status: true
    },
    orders: [
      "order-001",
      "order-002",
      "order-003"
    ],
    createdAt: daysAgo(120),
    updatedAt: daysAgo(5),
    
    // Nested suppliers sub-collection
    suppliers: [
      {
        whatsapp: "0541111111",
        name: "תוצרת שדות טריים",
        role: "supplier",
        email: "freshfields@example.com",
        category: ["vegetables", "fruits"],
        reminders: [
          { day: "mon", time: "14:00" },
          { day: "wed", time: "14:00" },
          { day: "fri", time: "10:00" }
        ],
        rating: 5,
        createdAt: daysAgo(110),
        updatedAt: daysAgo(20),
        
        // Nested products sub-collection
        products: [
          {
            name: "עגבניות שרי",
            unit: "kg",
            emoji: "🍅",
            parMidweek: 5,
            parWeekend: 8,
            createdAt: daysAgo(110),
            updatedAt: daysAgo(110)
          },
          {
            name: "ארוגולה",
            unit: "kg",
            emoji: "🥬",
            parMidweek: 2,
            parWeekend: 3,
            createdAt: daysAgo(110),
            updatedAt: daysAgo(110)
          },
          {
            name: "מלפפונים",
            unit: "kg",
            emoji: "🥒",
            parMidweek: 4,
            parWeekend: 7,
            createdAt: daysAgo(110),
            updatedAt: daysAgo(110)
          }
        ]
      },
       {
        whatsapp: "0542222222",
        name: "פירות ים תיכוניים",
        role: "supplier",
        category: ["fish"],
        reminders: [
          { day: "tue", time: "13:00" },
          { day: "fri", time: "09:00" }
        ],
        rating: 4,
        createdAt: daysAgo(108),
        updatedAt: daysAgo(15),
        
        // Nested products sub-collection
        products: [
          {
            name: "סלמון טרי",
            unit: "kg",
            emoji: "🐟",
            parMidweek: 6,
            parWeekend: 12,
            createdAt: daysAgo(108),
            updatedAt: daysAgo(108)
          },
          {
            name: "פילה דג בס",
            unit: "kg",
            emoji: "🐟",
            parMidweek: 3,
            parWeekend: 8,
            createdAt: daysAgo(108),
            updatedAt: daysAgo(108)
          }
        ]
      },
      {
        whatsapp: "0543333333",
        name: "בשרים מובחרים",
        role: "supplier",
        category: ["meats"],
        reminders: [
          { day: "mon", time: "12:00" },
          { day: "thu", time: "12:00" }
        ],
        rating: 5,
        createdAt: daysAgo(105),
        updatedAt: daysAgo(25),
        
        // Nested products sub-collection
        products: [
          {
            name: "אנטריקוט אנגוס",
            unit: "kg",
            emoji: "🥩",
            parMidweek: 5,
            parWeekend: 10,
            createdAt: daysAgo(105),
            updatedAt: daysAgo(105)
          },
          {
            name: "צלעות טלה",
            unit: "kg",
            emoji: "🍖",
            parMidweek: 3,
            parWeekend: 6,
            createdAt: daysAgo(105),
            updatedAt: daysAgo(105)
          }
        ]
      }
    ]
    },
  
  // Restaurant 2: Urban bistro
  "987654321": {
    legalId: "987654321",
    legalName: "ביסטרו אורבני בע״מ",
    name: "ביסטרו אורבני",
    contacts: {
      "0523456789": {
        whatsapp: "0523456789",
        name: "שרה לוי",
        role: "manager",
        email: "sarah@urbanbistro.com"
      }
    },
    isActivated: true,
    payment: {
      provider: "paypal",
      status: true
    },
    orders: [
      "order-004",
      "order-005"
    ],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
    
    // Nested suppliers sub-collection
    suppliers: [
      {
        whatsapp: "0534444444",
        name: "מטרו תוצרת",
        role: "supplier",
        category: ["vegetables"],
        reminders: [
          { day: "tue", time: "17:00" },
          { day: "thu", time: "17:00" },
          { day: "sat", time: "10:00" }
        ],
        rating: 4,
        createdAt: daysAgo(85),
        updatedAt: daysAgo(10),
        
        // Nested products sub-collection
        products: [
          {
            name: "חסה מעורבת",
            unit: "box",
            emoji: "🥬",
            parMidweek: 4,
            parWeekend: 6,
            createdAt: daysAgo(85),
            updatedAt: daysAgo(85)
          },
          {
            name: "עגבניות",
            unit: "kg",
            emoji: "🍅",
            parMidweek: 3,
            parWeekend: 5,
            createdAt: daysAgo(85),
            updatedAt: daysAgo(85)
          }
        ]
      },
      {
        whatsapp: "0535555555",
        name: "תנובה",
        role: "supplier",
        email: "orders@tnuva.com",
        category: ["dairy"],
        reminders: [
          { day: "mon", time: "14:00" },
          { day: "wed", time: "14:00" },
          { day: "fri", time: "09:00" }
        ],
        rating: 5,
        createdAt: daysAgo(80),
        updatedAt: daysAgo(5),
        
        // Nested products sub-collection
        products: [
          {
            name: "חלב",
            unit: "l",
            emoji: "🥛",
            parMidweek: 10,
            parWeekend: 15,
            createdAt: daysAgo(80),
            updatedAt: daysAgo(80)
          },
          {
            name: "גבינה צהובה",
            unit: "kg",
            emoji: "🧀",
            parMidweek: 2,
            parWeekend: 4,
            createdAt: daysAgo(80),
            updatedAt: daysAgo(80)
          }
        ]
      }
    ]
  },
  
  // Restaurant 3: Cafe (not yet activated)
  "567890123": {
    legalId: "567890123",
    legalName: "קפה הבוקר בע״מ",
    name: "קפה הבוקר",
    contacts: {
      "0547890123": {
        whatsapp: "0547890123",
        name: "מיכאל בן-דוד",
        role: "owner",
        email: "michael@morningcafe.com"
      }
    },
    isActivated: false,
    payment: {
      provider: "trial",
      status: false
    },
    orders: [],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    
    // Nested suppliers sub-collection
    suppliers: [
      {
        whatsapp: "0556666666",
        name: "מאפיית הלחם",
        role: "supplier",
        category: ["disposables"],
        reminders: [
          { day: "sun", time: "10:00" },
          { day: "tue", time: "10:00" },
          { day: "thu", time: "10:00" }
        ],
        rating: 4,
        createdAt: daysAgo(25),
        updatedAt: daysAgo(25),
        
        // Nested products sub-collection
        products: [
          {
            name: "מפיות",
            unit: "pack",
            emoji: "🧻",
            parMidweek: 12,
            parWeekend: 18,
            createdAt: daysAgo(25),
            updatedAt: daysAgo(25)
          },
         {
            name: "כוסות פלסטיק",
            unit: "pack",
            emoji: "🥤",
            parMidweek: 20,
            parWeekend: 30,
            createdAt: daysAgo(25),
            updatedAt: daysAgo(25)
          }
        ]
      },
      {
        whatsapp: "0557777777",
        name: "קפה ג׳ו",
        role: "supplier",
        category: ["general"],
        reminders: [
          { day: "mon", time: "09:00" },
          { day: "wed", time: "09:00" },
          { day: "fri", time: "09:00" }
        ],
        rating: 5,
        createdAt: daysAgo(20),
        updatedAt: daysAgo(20),
        
        // Nested products sub-collection
        products: [
          {
            name: "פולי קפה",
            unit: "kg",
            emoji: "☕",
            parMidweek: 3,
            parWeekend: 5,
            createdAt: daysAgo(20),
            updatedAt: daysAgo(20)
          }
        ]
      }
    ]
  }
};

// ======== ORDERS COLLECTION (TOP LEVEL) ========

export const exampleOrders: Record<string, Order> = {
  "order-001": {
    id: "order-001",
    restaurant: {
      legalId: "123456789",
      name: "לה בל קוויזין",
      contact: {
        whatsapp: "0501234567",
        name: "דוד כהן",
        email: "david@labellecuisine.com"
      }
    },
    supplier: {
      whatsapp: "0541111111",
      name: "תוצרת שדות טריים",
      email: "freshfields@example.com"
    },
    category: ["vegetables"],
    status: "delivered",
    midweek: true,
    items: [
      { name: "עגבניות שרי", unit: "kg", emoji: "🍅", qty: 6 },
      { name: "ארוגולה", unit: "kg", emoji: "🥬", qty: 3 },
      { name: "מלפפונים", unit: "kg", emoji: "🥒", qty: 5 }
    ],
    shortages: [
      { name: "ארוגולה", unit: "kg", emoji: "🥬", requestedQty: 3, deliveredQty: 2 }
    ],
    restaurantNotes: "נא לוודא שהעגבניות טריות",
    supplierNotes: "אין ארוגולה מספיק, מספקים פחות",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
    deliveredAt: daysAgo(6),
    invoiceUrl: "https://storage.googleapis.com/invoices/invoice-001.jpg"
  },
  "order-002": {
    id: "order-002",
    restaurant: {
      legalId: "123456789",
      name: "לה בל קוויזין",
      contact: {
        whatsapp: "0501234567",
        name: "דוד כהן",
        email: "david@labellecuisine.com"
      }
    },
    supplier: {
      whatsapp: "0542222222",
      name: "פירות ים תיכוניים"
    },
    category: ["fish"],
    status: "sent",
    midweek: false,
    items: [
      { name: "סלמון טרי", unit: "kg", emoji: "🐟", qty: 8 },
      { name: "פילה דג בס", unit: "kg", emoji: "🐟", qty: 4 }
    ],
    shortages: [],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    deliveredAt: daysAgo(0)
  },
  "order-003": {
    id: "order-003",
    restaurant: {
      legalId: "123456789",
      name: "לה בל קוויזין",
      contact: {
        whatsapp: "0501234567",
        name: "דוד כהן",
        email: "david@labellecuisine.com"
      }
    },
    supplier: {
      whatsapp: "0543333333",
      name: "בשרים מובחרים"
    },
    category: ["meats"],
    status: "pending",
    midweek: true,
    items: [
      { name: "אנטריקוט אנגוס", unit: "kg", emoji: "🥩", qty: 7 },
      { name: "צלעות טלה", unit: "kg", emoji: "🍖", qty: 4 }
    ],
    shortages: [],
    createdAt: now,
    updatedAt: now,
    deliveredAt: now
  },
  "order-004": {
    id: "order-004",
    restaurant: {
      legalId: "987654321",
      name: "ביסטרו אורבני",
      contact: {
        whatsapp: "0523456789",
        name: "שרה לוי",
        email: "sarah@urbanbistro.com"
      }
    },
    supplier: {
      whatsapp: "0534444444",
      name: "מטרו תוצרת"
    },
    category: ["vegetables"],
    status: "delivered",
    midweek: true,
    items: [
      { name: "חסה מעורבת", unit: "box", emoji: "🥬", qty: 4 },
      { name: "עגבניות", unit: "kg", emoji: "🍅", qty: 3 }
    ],
    shortages: [],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
    deliveredAt: daysAgo(4),
    invoiceUrl: "https://storage.googleapis.com/invoices/invoice-004.jpg"
  },
  "order-005": {
    id: "order-005",
    restaurant: {
      legalId: "987654321",
      name: "ביסטרו אורבני",
      contact: {
        whatsapp: "0523456789",
        name: "שרה לוי",
        email: "sarah@urbanbistro.com"
      }
    },
    supplier: {
      whatsapp: "0535555555",
      name: "תנובה",
      email: "orders@tnuva.com"
    },
    category: ["dairy"],
    status: "sent",
    midweek: false,
    items: [
      { name: "חלב", unit: "l", emoji: "🥛", qty: 10 },
      { name: "גבינה צהובה", unit: "kg", emoji: "🧀", qty: 2 }
    ],
    shortages: [],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    deliveredAt: daysAgo(0)
  }
};

// ======== CONVERSATIONS COLLECTION WITH NESTED MESSAGES ========

export const exampleConversations: Record<string, Conversation> = {
  // Restaurant owner conversation
  "0501234567": {
    currentState: "IDLE" as BotState,
    context: {
      name: "דוד כהן",
      lastAction: "בדק מלאי",
      lastSupplier: "0541111111",
      restaurantName: "לה בל קוויזין",
      companyName: "לה בל קוויזין בע״מ",
      legalId: "123456789"
    },
    restaurantId: "123456789",
    role: "owner",
    createdAt: daysAgo(120),
    updatedAt: daysAgo(1),
    
    // Nested messages sub-collection
    messages: [
      {
        role: "user",
        body: "היי, אני צריך לבדוק את המלאי של הירקות שלי",
        messageState: "INIT",
        hasTemplate: false,
        createdAt: daysAgo(1, 2)
      },
      {
        role: "assistant",
        body: "בטח, דוד! אני אעזור לך לבדוק את המלאי של הירקות שלך. איזה ספק תרצה לבדוק? אתה עובד עם תוצרת שדות טריים לירקות.",
        messageState: "INVENTORY_SNAPSHOT_START",
        hasTemplate: false,
        createdAt: daysAgo(1, 1.9)
      },
      {
        role: "user",
        body: "תוצרת שדות טריים",
        messageState: "INVENTORY_SNAPSHOT_START",
        hasTemplate: false,
        createdAt: daysAgo(1, 1.8)
      },
      {
        role: "assistant",
        body: "מעולה! בוא נבדוק את המלאי שלך מתוצרת שדות טריים. אנא ספר לי מה המלאי הנוכחי שלך של עגבניות שרי (בק״ג):",
        messageState: "INVENTORY_SNAPSHOT_PRODUCT",
        hasTemplate: false,
        createdAt: daysAgo(1, 1.7)
      },
      {
        role: "user",
        body: "3 ק״ג",
        messageState: "INVENTORY_SNAPSHOT_PRODUCT",
        hasTemplate: false,
        createdAt: daysAgo(1, 1.6)
      },
      {
        role: "assistant",
        body: "תודה! עכשיו, כמה ארוגולה יש לך כרגע (בק״ג)?",
        messageState: "INVENTORY_SNAPSHOT_PRODUCT",
        hasTemplate: false,
        createdAt: daysAgo(1, 1.5)
      },
      {
        role: "user",
        body: "1 ק״ג",
        messageState: "INVENTORY_SNAPSHOT_PRODUCT",
        hasTemplate: false,
        createdAt: daysAgo(1, 1.4)
      },
      {
        role: "assistant",
        body: "הבנתי! לסיום, כמה מלפפונים יש לך (בק״ג)?",
        messageState: "INVENTORY_SNAPSHOT_PRODUCT",
        hasTemplate: false,
        createdAt: daysAgo(1, 1.3)
      },
      {
        role: "user",
        body: "2 ק״ג",
        messageState: "INVENTORY_SNAPSHOT_PRODUCT",
        hasTemplate: false,
        createdAt: daysAgo(1, 1.2)
      },
      {
        role: "assistant",
        hasTemplate: true,
        templateId: "TEMPLATE_CALCULATE_RESULTS",
        body: "תודה רבה! בהתבסס על רמות המלאי שלך והמלאי הנוכחי, הנה מה שאתה צריך להזמין מתוצרת שדות טריים:\n\n🍅 עגבניות שרי: 2 ק״ג (כדי להגיע לרמת מלאי של 5 ק״ג)\n🥬 ארוגולה: 1 ק״ג (כדי להגיע לרמת מלאי של 2 ק״ג)\n🥒 מלפפונים: 2 ק״ג (כדי להגיע לרמת מלאי של 4 ק״ג)\n\nהאם תרצה שאבצע את ההזמנה הזו עכשיו?",
        messageState: "INVENTORY_CALCULATE_SNAPSHOT",
        createdAt: daysAgo(1, 1.1)
      },
      {
        role: "user",
        body: "כן, בבקשה תזמין",
        messageState: "INVENTORY_CALCULATE_SNAPSHOT",
        hasTemplate: false,
        createdAt: daysAgo(1, 1)
      },
      {
        role: "assistant",
        body: "מעולה! ביצעתי את ההזמנה שלך מתוצרת שדות טריים. הם יספקו ביום המשלוח הבא שלהם. האם יש משהו נוסף שאתה צריך עזרה בו?",
        messageState: "ORDER_CONFIRMATION",
        hasTemplate: false,
        createdAt: daysAgo(1, 0.9)
      },
      {
        role: "user",
        body: "לא, זה הכל להיום",
        messageState: "ORDER_CONFIRMATION",
        hasTemplate: false,
        createdAt: daysAgo(1, 0.8)
      },
      {
        role: "assistant",
        body: "מושלם! שיהיה לך יום נהדר, דוד. אני אודיע לך כאשר המשלוח שלך יהיה מוכן לקבלה.",
        messageState: "IDLE",
        hasTemplate: false,
        createdAt: daysAgo(1, 0.7)
      }
    ]
  },
  
  // Active conversation with restaurant manager
  "0523456789": {
    currentState: "INVENTORY_SNAPSHOT_PRODUCT" as BotState,
    context: {
      name: "שרה לוי",
      pendingInventory: true,
      supplierCategory: "vegetables",
      restaurantName: "ביסטרו אורבני",
      companyName: "ביסטרו אורבני בע״מ",
      legalId: "987654321"
    },
    restaurantId: "987654321",
    role: "manager",
    createdAt: daysAgo(90),
    updatedAt: now,
    
    // Nested messages sub-collection
    messages: [
      {
        role: "user",
        body: "אני צריכה לבדוק מלאי",
        messageState: "INIT",
        hasTemplate: false,
        createdAt: daysAgo(0, 0.5)
      },
      {
        role: "assistant",
        hasTemplate: true,
        templateId: "TEMPLATE_SNAPSHOT_START",
        body: "היי שרה! אני אעזור לך לבדוק את המלאי שלך. איזו קטגוריית ספקים תרצי לבדוק? יש לך ספקים עבור: ירקות ומוצרי חלב.",
        messageState: "INVENTORY_SNAPSHOT_START",
        createdAt: daysAgo(0, 0.4)
      },
      {
        role: "user",
        body: "ירקות",
        messageState: "INVENTORY_SNAPSHOT_START",
        hasTemplate: false,
        createdAt: daysAgo(0, 0.3)
      },
      {
        role: "assistant", 
        body: "מעולה! בוא נבדוק את מלאי הירקות שלך עם מטרו תוצרת. אנא ספרי לי מה המלאי הנוכחי שלך של חסה מעורבת (בארגזים):",
        messageState: "INVENTORY_SNAPSHOT_PRODUCT",
        hasTemplate: false,
        createdAt: daysAgo(0, 0.2)
      }
    ],
  },
  
  // New restaurant owner in onboarding process
  "0547890123": {
    currentState: "ONBOARDING_PAYMENT_METHOD" as BotState,
    context: {
      name: "מיכאל בן-דוד",
      businessName: "קפה הבוקר בע״מ",
      legalId: "567890123",
      restaurantName: "קפה הבוקר",
      contactName: "מיכאל בן-דוד",
      contactEmail: "michael@morningcafe.com"
    },
    restaurantId: "567890123",
    role: "owner",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    
    // Nested messages sub-collection
    messages: [
      {
        role: "user",
        body: "שלום",
        messageState: "INIT",
         hasTemplate: false,
        createdAt: daysAgo(5)
      },
      {
        role: "assistant",
        body: "שלום! ברוך הבא ל-P-vot. אני אעזור לך להגדיר את המסעדה שלך. מה שם החברה או העסק שלך?",
        messageState: "ONBOARDING_COMPANY_NAME",
         hasTemplate: false,
        createdAt: daysAgo(5, 23.9)
      },
      {
        role: "user",
        body: "קפה הבוקר בע״מ",
        messageState: "ONBOARDING_COMPANY_NAME",
         hasTemplate: false,
        createdAt: daysAgo(5, 23.8)
      },
      {
        role: "assistant",
        body: "נהדר! עכשיו אני צריך את מספר העסק או מספר המס שלך:",
        messageState: "ONBOARDING_LEGAL_ID",
         hasTemplate: false,
        createdAt: daysAgo(5, 23.7)
      },
      {
        role: "user",
        body: "567890123",
        messageState: "ONBOARDING_LEGAL_ID",
         hasTemplate: false,
        createdAt: daysAgo(5, 23.6)
      },
      {
        role: "assistant",
        body: "תודה! מה השם המסחרי של המסעדה שלך? (השם שהלקוחות מכירים)",
        messageState: "ONBOARDING_RESTAURANT_NAME",
         hasTemplate: false,
        createdAt: daysAgo(5, 23.5)
      },
      {
        role: "user",
        body: "קפה הבוקר",
        messageState: "ONBOARDING_RESTAURANT_NAME",
         hasTemplate: false,
        createdAt: daysAgo(5, 23.4)
      },
      {
        role: "assistant",
        body: "מעולה! מה השם המלא שלך? (איש קשר ראשי)",
        messageState: "ONBOARDING_CONTACT_NAME",
         hasTemplate: false,
        createdAt: daysAgo(5, 23.3)
      },
      {
        role: "user",
        body: "מיכאל בן-דוד",
        messageState: "ONBOARDING_CONTACT_NAME",
         hasTemplate: false,
        createdAt: daysAgo(5, 23.2)
      },
      {
        role: "assistant",
        hasTemplate: true,
        templateId: "contact_email_template",
        body: "📧 מה כתובת האימייל שלך? (אופציונלי - לחץ 'דלג' להמשך)",
        messageState: "ONBOARDING_CONTACT_EMAIL",
        createdAt: daysAgo(5, 23.1)
      },
      {
        role: "user",
        body: "michael@morningcafe.com",
        messageState: "ONBOARDING_CONTACT_EMAIL",
        hasTemplate: false,
        createdAt: daysAgo(5, 23)
      },
      {
        role: "assistant",
        hasTemplate: true,
        templateId: "payment_options_template",
        body: "💳 *בחר שיטת תשלום:*\n\nהמערכת זמינה בתשלום חודשי. בחר את האופציה המועדפת עליך:",
        messageState: "ONBOARDING_PAYMENT_METHOD",
        createdAt: daysAgo(1)
      }
    ]
  },
  
  // Supplier conversation
  "0541111111": {
    currentState: "IDLE" as BotState,
    context: {
      name: "תוצרת שדות טריים",
      lastOrder: "order-001",
      role: "supplier"
    },
    restaurantId: "123456789",
    role: "supplier",
    createdAt: daysAgo(110),
    updatedAt: daysAgo(6),
    
    // Nested messages sub-collection
    messages: [
      {
        role: "assistant",
        body: "הזמנה מס׳ order-001 עבור לה בל קוויזין:\n\n🍅 עגבניות שרי: 6 ק״ג\n🥬 ארוגולה: 3 ק״ג\n🥒 מלפפונים: 5 ק״ג\n\nנא לספק ביום רביעי. תודה!",
        messageState: "ORDER_CONFIRMATION",
        hasTemplate: false,
        createdAt: daysAgo(7)
      },
      {
        role: "user",
        body: "ההזמנה התקבלה, נספק ביום רביעי בבוקר.",
        messageState: "IDLE",
        hasTemplate: false,
        createdAt: daysAgo(7, 0.1)
      },
      {
        role: "user",
        body: "מצטערים, יש לנו רק 2 ק״ג ארוגולה היום. האם זה בסדר?",
        messageState: "IDLE",
        hasTemplate: false,
        createdAt: daysAgo(6, 12)
      },
      {
        role: "assistant",
        body: "הודעתי ללה בל קוויזין על המחסור בארוגולה. אנא המשך עם המסירה עם 2 ק״ג הזמינים. תודה!",
        messageState: "IDLE",
        hasTemplate: false,
        createdAt: daysAgo(6, 11)
      }
    ]
  }
};

// Complete example database with hierarchical structure matching Firestore
export const exampleDatabase = {
  restaurants: exampleRestaurants, // Contains suppliers and products in hierarchy
  orders: exampleOrders,
  conversations: exampleConversations // Contains messages in hierarchy
};

export default exampleDatabase;
