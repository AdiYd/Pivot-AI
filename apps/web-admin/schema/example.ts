import { Timestamp } from 'firebase/firestore';
import {
  Restaurant,
  Supplier,
  Product,
  Order,
  InventorySnapshot,
  ConversationDoc,
  MessageDoc,
  BotState
} from './types';

/**
 * Example Data
 * This file provides a comprehensive example of all data structures in the system.
 * It serves as a reference for development and testing.
 * 
 * Firestore hierarchy:
 * - /restaurants/{legalId}/...
 *   - /suppliers/{supplierWhatsapp}/...
 *     - /products/{productId}
 *   - /orders/{orderId}
 *   - /inventorySnapshots/{snapshotId}
 * - /conversations/{phone}/...
 *   - /messages/{messageId}
 */

// Helper for creating timestamps (now and relative dates)
const now = Timestamp.now();
const daysAgo = (days: number, hoursOffset = false) => {
  const date = new Date(now.toDate().getTime() - days * 86400000);
  if (hoursOffset) date.setHours(date.getHours() - 2); // For slight time differences
  return Timestamp.fromDate(date);
};

// RESTAURANTS COLLECTION (top level)
export const exampleRestaurants: {
    [legalId: string]: {
        // Restaurant document data
        legalId: string; // This is the restaurant's legal ID
        businessName: string;
        name: string;
        primaryContact: {
            whatsapp: string; // This is also the document ID in Firestore
            name: string;
            role: "Owner" | "Manager" | "Shift" | "Other" | "Supplier";
            email?: string;
        };
        yearsActive: number;
        payment: {
            provider: "Stripe" | "Paylink";
            customerId: string;
            status: boolean;
        };
        isActivated: boolean;
        settings: {
            timezone: string;
            locale: string;
        };
        createdAt: Timestamp;
        // Sub-collections
        suppliers: {
            [supplierWhatsapp: string]: {
                // Supplier document data
                whatsapp: string;
                name: string;
                role: string;
                category: string[];
                deliveryDays: number[];
                cutoffHour: number;
                rating: number;
                createdAt: Timestamp;
                // Sub-collections
                products: Product[]; // Array of products
            }
        },
        orders: {
            [orderId: string]: Order
        },
        inventorySnapshots: {
            [snapshotId: string]: InventorySnapshot
        }
    }
} = {
    // Restaurant 1: Fine dining restaurant
      "123456789": {
                legalId: "123456789",
                businessName: "לה בל קוויזין בע״מ",
                name: "לה בל קוויזין",
                primaryContact: {
                        whatsapp: "+972501234567",
                        name: "דוד כהן",
                        role: "Owner",
                        email: "david@labellecuisine.com"
                },
                yearsActive: 7,
                payment: {
                        provider: "Stripe",
                        customerId: "cus_KJH238jkKLJH23",
                        status: true
                },
                isActivated: true,
                settings: {
                        timezone: "Asia/Jerusalem",
                        locale: "he-IL"
                },
                createdAt: daysAgo(120),
                suppliers: {
                "+972541111111": {
                                whatsapp: "+972541111111",
                                name: "תוצרת שדות טריים",
                                role: "Supplier",
                                category: ["vegetables", "fruits"],
                                deliveryDays: [1, 3, 5], // Monday, Wednesday, Friday
                                cutoffHour: 18, // 6 PM
                                rating: 5,
                                createdAt: daysAgo(110),
                                products: [{
                                        id: "prod-001",
                                        supplierId: "+972541111111",
                                        category: "vegetables",
                                        name: "עגבניות שרי",
                                        emoji: "🍅",
                                        unit: "kg",
                                        parMidweek: 5,
                                        parWeekend: 8,
                                        createdAt: daysAgo(110)
                                },
                                {
                                        id: "prod-002",
                                        supplierId: "+972541111111",
                                        category: "vegetables",
                                        name: "ארוגולה",
                                        emoji: "🥬",
                                        unit: "kg",
                                        parMidweek: 2,
                                        parWeekend: 3,
                                        createdAt: daysAgo(110)
                                },
                                {
                                        id: "prod-003",
                                        supplierId: "+972541111111",
                                        category: "vegetables",
                                        name: "מלפפונים פרסיים",
                                        emoji: "🥒",
                                        unit: "kg",
                                        parMidweek: 4,
                                        parWeekend: 7,
                                        createdAt: daysAgo(110)
                                }
                                ]
                },
                "+972542222222": {
                        whatsapp: "+972542222222",
                        name: "פירות ים תיכוניים",
                        role: "Supplier",
                        category: ["fish"],
                        deliveryDays: [2, 5], // Tuesday, Friday
                        cutoffHour: 16, // 4 PM
                        rating: 4,
                        createdAt: daysAgo(108),
                        products: [{
                                id: "prod-004",
                                supplierId: "+972542222222",
                                category: "fish",
                                name: "סלמון טרי",
                                emoji: "🐟",
                                unit: "kg",
                                parMidweek: 6,
                                parWeekend: 12,
                                createdAt: daysAgo(108)
                        },
                       {
                                id: "prod-005",
                                supplierId: "+972542222222",
                                category: "fish",
                                name: "פילה דג בס",
                                emoji: "🐟",
                                unit: "kg",
                                parMidweek: 3,
                                parWeekend: 8,
                                createdAt: daysAgo(108)
                        }
                        ]
                },
                "+972543333333": {
                        whatsapp: "+972543333333",
                        name: "בשרים מובחרים",
                        role: "Supplier",
                        category: ["meat"],
                        deliveryDays: [1, 4], // Monday, Thursday
                        cutoffHour: 15, // 3 PM
                        rating: 5,
                        createdAt: daysAgo(105),
                        products: [
                        {
                                id: "prod-006",
                                supplierId: "+972543333333",
                                category: "meat",
                                name: "אנטריקוט אנגוס",
                                emoji: "🥩",
                                unit: "kg",
                                parMidweek: 5,
                                parWeekend: 10,
                                createdAt: daysAgo(105)
                        },
                       {
                                id: "prod-007",
                                supplierId: "+972543333333",
                                category: "meat",
                                name: "צלעות טלה",
                                emoji: "🍖",
                                unit: "kg",
                                parMidweek: 3,
                                parWeekend: 6,
                                createdAt: daysAgo(105)
                        }
                    ]
                }
                },
                orders: {
                "order-001": {
                        id: "order-001",
                        supplierId: "+972541111111", // Fresh Fields Produce
                        status: "delivered",
                        items: [
                        { productId: "prod-001", qty: 6 }, // Cherry Tomatoes
                        { productId: "prod-002", qty: 3 }, // Arugula
                        { productId: "prod-003", qty: 5 }  // Persian Cucumbers
                        ],
                        shortages: [
                        { productId: "prod-002", qty: 3, received: 2 } // Arugula shortage
                        ],
                        midweek: true,
                        createdAt: daysAgo(7),
                        sentAt: daysAgo(7),
                        receivedAt: daysAgo(6),
                        invoiceUrl: "https://storage.googleapis.com/invoices/invoice-001.jpg"
                },
                "order-002": {
                        id: "order-002",
                        supplierId: "+972542222222", // Mediterranean Seafood
                        status: "sent",
                        items: [
                        { productId: "prod-004", qty: 8 }, // Fresh Salmon
                        { productId: "prod-005", qty: 4 }  // Sea Bass Fillets
                        ],
                        shortages: [],
                        midweek: false,
                        createdAt: daysAgo(1),
                        sentAt: daysAgo(1)
                },
                "order-003": {
                        id: "order-003",
                        supplierId: "+972543333333", // Premium Meats
                        status: "pending",
                        items: [
                        { productId: "prod-006", qty: 7 }, // Angus Ribeye
                        { productId: "prod-007", qty: 4 }  // Lamb Chops
                        ],
                        shortages: [],
                        midweek: true,
                        createdAt: Timestamp.now()
                }
                },
                inventorySnapshots: {
                "snapshot-001": {
                        id: "snapshot-001",
                        supplierId: "+972541111111", // Fresh Fields Produce
                        lines: [
                        { productId: "prod-001", currentQty: 3 }, // Cherry Tomatoes
                        { productId: "prod-002", currentQty: 1 }, // Arugula
                        { productId: "prod-003", currentQty: 2 }  // Persian Cucumbers
                        ],
                        createdAt: daysAgo(8) // Before the order
                },
                "snapshot-002": {
                        id: "snapshot-002",
                        supplierId: "+972541111111", // Fresh Fields Produce
                        lines: [
                        { productId: "prod-001", currentQty: 5 }, // Cherry Tomatoes (after delivery)
                        { productId: "prod-002", currentQty: 2 }, // Arugula (after delivery with shortage)
                        { productId: "prod-003", currentQty: 5 }  // Persian Cucumbers (after delivery)
                        ],
                        createdAt: daysAgo(5) // After the order/delivery
                },
                "snapshot-003": {
                        id: "snapshot-003",
                        supplierId: "+972542222222", // Mediterranean Seafood
                        lines: [
                        { productId: "prod-004", currentQty: 2 }, // Fresh Salmon
                        { productId: "prod-005", currentQty: 1 }  // Sea Bass Fillets
                        ],
                        createdAt: daysAgo(2) // Current inventory before weekend
                }
                }
        },
        // Restaurant 2: Urban bistro
        "987654321": {
                legalId: "987654321",
                businessName: "ביסטרו אורבני בע״מ",
                name: "ביסטרו אורבני",
                primaryContact: {
                        whatsapp: "+972523456789",
                        name: "שרה לוי",
                        role: "Manager",
                        email: "sarah@urbanbistro.com"
                },
                yearsActive: 3,
                payment: {
                        provider: "Paylink",
                        customerId: "pl_XYZ789abc",
                        status: true
                },
                isActivated: true,
                settings: {
                        timezone: "Asia/Jerusalem",
                        locale: "he-IL"
                },
                createdAt: daysAgo(90),
                suppliers: {
                        "+972534444444": {
                                whatsapp: "+972534444444",
                                name: "מטרו תוצרת",
                                role: "Supplier",
                                category: ["vegetables"],
                                deliveryDays: [2, 4, 6], // Tuesday, Thursday, Saturday
                                cutoffHour: 17, // 5 PM
                                rating: 4,
                                createdAt: daysAgo(85),
                                products: [
                                         {
                                                id: "prod-010",
                                                supplierId: "+972534444444",
                                                category: "vegetables",
                                                name: "חסה מעורבת",
                                                emoji: "🥬",
                                                unit: "box",
                                                parMidweek: 4,
                                                parWeekend: 6,
                                                createdAt: daysAgo(85)
                                        },
                                        {
                                                id: "prod-011",
                                                supplierId: "+972534444444",
                                                category: "vegetables",
                                                name: "עגבניות",
                                                emoji: "🍅",
                                                unit: "kg",
                                                parMidweek: 3,
                                                parWeekend: 5,
                                                createdAt: daysAgo(85)
                                        }
                                    ]
                        },
                        "+972535555555": {
                                whatsapp: "+972535555555",
                                name: "תנובה",
                                role: "Supplier",
                                category: ["dairy"],
                                deliveryDays: [1, 3, 5], // Monday, Wednesday, Friday
                                cutoffHour: 14, // 2 PM
                                rating: 5,
                                createdAt: daysAgo(80),
                                products: [
                                        {
                                                id: "prod-012",
                                                supplierId: "+972535555555",
                                                category: "dairy",
                                                name: "חלב",
                                                emoji: "🥛",
                                                unit: "liter",
                                                parMidweek: 10,
                                                parWeekend: 15,
                                                createdAt: daysAgo(80)
                                        },
                                       {
                                                id: "prod-013",
                                                supplierId: "+972535555555",
                                                category: "dairy",
                                                name: "גבינה צהובה",
                                                emoji: "🧀",
                                                unit: "kg",
                                                parMidweek: 2,
                                                parWeekend: 4,
                                                createdAt: daysAgo(80)
                                        }
                                    ]
                        }
                },
                orders: {
                        "order-004": {
                                id: "order-004",
                                supplierId: "+972534444444", // Metro Produce
                                status: "delivered",
                                items: [
                                        { productId: "prod-010", qty: 4 }, // Mixed Lettuce
                                        { productId: "prod-011", qty: 3 }  // Tomatoes
                                ],
                                shortages: [],
                                midweek: true,
                                createdAt: daysAgo(5),
                                sentAt: daysAgo(5),
                                receivedAt: daysAgo(4),
                                invoiceUrl: "https://storage.googleapis.com/invoices/invoice-004.jpg"
                        },
                        "order-005": {
                                id: "order-005",
                                supplierId: "+972535555555", // Tnuva
                                status: "sent",
                                items: [
                                        { productId: "prod-012", qty: 10 }, // Milk
                                        { productId: "prod-013", qty: 2 }  // Yellow Cheese
                                ],
                                shortages: [],
                                midweek: false,
                                createdAt: daysAgo(2),
                                sentAt: daysAgo(2)
                        }
                },
                inventorySnapshots: {
                        "snapshot-004": {
                                id: "snapshot-004",
                                supplierId: "+972534444444", // Metro Produce
                                lines: [
                                        { productId: "prod-010", currentQty: 2 }, // Mixed Lettuce
                                        { productId: "prod-011", currentQty: 1 }  // Tomatoes
                                ],
                                createdAt: daysAgo(6) // Before the order
                        },
                        "snapshot-005": {
                                id: "snapshot-005",
                                supplierId: "+972535555555", // Tnuva
                                lines: [
                                        { productId: "prod-012", currentQty: 5 }, // Milk
                                        { productId: "prod-013", currentQty: 1 }  // Yellow Cheese
                                ],
                                createdAt: daysAgo(3) // Before the order
                        }
                }
        },
        // Restaurant 3: Cafe
        "567890123": {
                legalId: "567890123",
                businessName: "קפה הבוקר בע״מ",
                name: "קפה הבוקר",
                primaryContact: {
                        whatsapp: "+972547890123",
                        name: "מיכאל בן-דוד",
                        role: "Owner",
                        email: "michael@morningglory.com"
                },
                yearsActive: 1,
                payment: {
                        provider: "Stripe",
                        customerId: "cus_ABC456def",
                        status: false // Not yet activated
                },
                isActivated: false,
                settings: {
                        timezone: "Asia/Jerusalem",
                        locale: "he-IL"
                },
                createdAt: daysAgo(30),
                suppliers: {
                        "+972556666666": {
                                whatsapp: "+972556666666",
                                name: "מאפיית הלחם",
                                role: "Supplier",
                                category: ["bread"],
                                deliveryDays: [0, 2, 4], // Sunday, Tuesday, Thursday
                                cutoffHour: 10, // 10 AM
                                rating: 4,
                                createdAt: daysAgo(25),
                                products: [ {
                                                id: "prod-014",
                                                supplierId: "+972556666666",
                                                category: "bread",
                                                name: "לחם מחמצת",
                                                emoji: "🍞",
                                                unit: "pcs",
                                                parMidweek: 12,
                                                parWeekend: 18,
                                                createdAt: daysAgo(25)
                                        },
                                         {
                                                id: "prod-015",
                                                supplierId: "+972556666666",
                                                category: "bread",
                                                name: "לחמניות",
                                                emoji: " rolls",
                                                unit: "pcs",
                                                parMidweek: 20,
                                                parWeekend: 30,
                                                createdAt: daysAgo(25)
                                        }
                                ]
                        },
                        "+972557777777": {
                                whatsapp: "+972557777777",
                                name: "קפה ג׳ו",
                                role: "Supplier",
                                category: ["coffee"],
                                deliveryDays: [1, 3, 5], // Monday, Wednesday, Friday
                                cutoffHour: 9, // 9 AM
                                rating: 5,
                                createdAt: daysAgo(20),
                                products: [
                                         {
                                                id: "prod-016",
                                                supplierId: "+972557777777",
                                                category: "coffee",
                                                name: "פולי קפה",
                                                emoji: "☕",
                                                unit: "kg",
                                                parMidweek: 3,
                                                parWeekend: 5,
                                                createdAt: daysAgo(20)
                                        }
                                    ]
                        }
                },
                orders: {},
                inventorySnapshots: {}
        }
    }

// שיחות (אוסף ברמה העליונה) - נפרד ממסעדות
export const exampleConversations: {
    [phone: string]: {
        // נתוני מסמך שיחה
        restaurantId: string; // This is the restaurant's legal ID
        currentState: BotState; // Current state of the conversation
        context: Record<string, any>; // Additional context for the conversation, to collect information and user input
        lastMessageTimestamp: Timestamp; // תאריך ושעה של ההודעה האחרונה בשיחה

        // אוסף משנה של הודעות
        messages: {
            [messageId: string]: MessageDoc
        }
    }
} = {
    // שיחת בעל מסעדה
    "+972501234567": { // דוד מלה בל קוויזין
        
        restaurantId: "123456789",
        currentState: "IDLE",
        context: {
            name: "דוד כהן",
            lastAction: "בדק מלאי",
            lastSupplier: "+972541111111"
        },
        lastMessageTimestamp: daysAgo(1),
        messages: {
            "msg-001": {
                body: "היי, אני צריך לבדוק את המלאי של הירקות שלי",
                direction: "incoming",
                currentState: "INIT",
                createdAt: daysAgo(1, true)
            },
            "msg-002": {
                body: "בטח, דוד! אני אעזור לך לבדוק את המלאי של הירקות שלך. איזה ספק תרצה לבדוק? אתה עובד עם תוצרת שדות טריים לירקות.",
                direction: "outgoing",
                currentState: "INVENTORY_SNAPSHOT_START",
                createdAt: daysAgo(1)
            },
            "msg-003": {
                body: "תוצרת שדות טריים",
                direction: "incoming",
                currentState: "INVENTORY_SNAPSHOT_START",
                createdAt: daysAgo(1)
            },
            "msg-004": {
                body: "מעולה! בוא נבדוק את המלאי שלך מתוצרת שדות טריים. אנא ספר לי מה המלאי הנוכחי שלך של עגבניות שרי (בק״ג):",
                direction: "outgoing",
                currentState: "INVENTORY_SNAPSHOT_PRODUCT",
                createdAt: daysAgo(1)
            },
            "msg-005": {
                body: "3 ק״ג",
                direction: "incoming",
                currentState: "INVENTORY_SNAPSHOT_PRODUCT",
                createdAt: daysAgo(1)
            },
            "msg-006": {
                body: "תודה! עכשיו, כמה ארוגולה יש לך כרגע (בק״ג)?",
                direction: "outgoing",
                currentState: "INVENTORY_SNAPSHOT_PRODUCT",
                createdAt: daysAgo(1)
            },
            "msg-007": {
                body: "1 ק״ג",
                direction: "incoming",
                currentState: "INVENTORY_SNAPSHOT_PRODUCT",
                createdAt: daysAgo(1)
            },
            "msg-008": {
                body: "הבנתי! לסיום, כמה מלפפונים פרסיים יש לך (בק״ג)?",
                direction: "outgoing",
                currentState: "INVENTORY_SNAPSHOT_PRODUCT",
                createdAt: daysAgo(1)
            },
            "msg-009": {
                body: "2 ק״ג",
                direction: "incoming",
                currentState: "INVENTORY_SNAPSHOT_PRODUCT",
                createdAt: daysAgo(1)
            },
            "msg-010": {
                body: "תודה רבה! בהתבסס על רמות המלאי שלך והמלאי הנוכחי, הנה מה שאתה צריך להזמין מתוצרת שדות טריים:\n\n🍅 עגבניות שרי: 2 ק״ג (כדי להגיע לרמת מלאי של 5 ק״ג)\n🥬 ארוגולה: 1 ק״ג (כדי להגיע לרמת מלאי של 2 ק״ג)\n🥒 מלפפונים פרסיים: 2 ק״ג (כדי להגיע לרמת מלאי של 4 ק״ג)\n\nהאם תרצה שאבצע את ההזמנה הזו עכשיו?",
                direction: "outgoing",
                currentState: "INVENTORY_CALCULATE_SNAPSHOT",
                createdAt: daysAgo(1)
            },
            "msg-011": {
                body: "כן, בבקשה תזמין",
                direction: "incoming",
                currentState: "INVENTORY_CALCULATE_SNAPSHOT",
                createdAt: daysAgo(1)
            },
            "msg-012": {
                body: "מעולה! ביצעתי את ההזמנה שלך מתוצרת שדות טריים. הם יספקו ביום המשלוח הבא שלהם. האם יש משהו נוסף שאתה צריך עזרה בו?",
                direction: "outgoing",
                currentState: "ORDER_CONFIRMATION",
                createdAt: daysAgo(1)
            },
            "msg-013": {
                body: "לא, זה הכל להיום",
                direction: "incoming",
                currentState: "ORDER_CONFIRMATION",
                createdAt: daysAgo(1)
            },
            "msg-014": {
                body: "מושלם! שיהיה לך יום נהדר, דוד. אני אודיע לך כאשר המשלוח שלך יהיה מוכן לקבלה.",
                direction: "outgoing",
                currentState: "IDLE",
                createdAt: daysAgo(1)
            }
        }
    },
    
    // שיחת מנהל מסעדה - מנהל שיחה פעיל
    "+972523456789": { // שרה מביסטרו אורבני
        restaurantId: "987654321",
        currentState: "INVENTORY_SNAPSHOT_PRODUCT",
        context: {
            name: "שרה לוי",
            pendingInventory: true,
            supplierCategory: "vegetables"
        },
        lastMessageTimestamp: Timestamp.now(),
        messages: {
            "msg-101": {
                body: "אני צריכה לבדוק מלאי",
                direction: "incoming",
                currentState: "INIT",
                createdAt: Timestamp.fromDate(new Date(now.toDate().getTime() - 10 * 60000)) // לפני 10 דקות
            },
            "msg-102": {
                body: "היי שרה! אני אעזור לך לבדוק את המלאי שלך. איזו קטגוריית ספקים תרצי לבדוק? יש לך ספקים עבור: ירקות, חלב וכלים חד פעמיים.",
                direction: "outgoing",
                currentState: "INVENTORY_SNAPSHOT_START",
                createdAt: Timestamp.fromDate(new Date(now.toDate().getTime() - 9 * 60000)) // לפני 9 דקות
            },
            "msg-103": {
                body: "ירקות",
                direction: "incoming",
                currentState: "INVENTORY_SNAPSHOT_START",
                createdAt: Timestamp.fromDate(new Date(now.toDate().getTime() - 8 * 60000)) // לפני 8 דקות
            },
            "msg-104": {
                body: "מעולה! בוא נבדוק את מלאי הירקות שלך עם מטרו תוצרת. אנא ספרי לי מה המלאי הנוכחי שלך של חסה מעורבת (בארגזים):",
                direction: "outgoing",
                currentState: "INVENTORY_SNAPSHOT_PRODUCT",
                createdAt: Timestamp.fromDate(new Date(now.toDate().getTime() - 7 * 60000)) // לפני 7 דקות
            }
            // השיחה נמשכת, מחכה לתגובה של שרה
        }
    },
    
    // בעל מסעדה חדש בתהליך קליטה
    "+972547890123": { // מיכאל מקפה הבוקר
        restaurantId: "567890123",
        currentState: "ONBOARDING_PAYMENT_METHOD",
        context: {
            name: "מיכאל בן-דוד",
            businessName: "קפה הבוקר בע״מ",
            legalId: "567890123"
        },
        lastMessageTimestamp: daysAgo(1),
        messages: {
            "msg-201": {
                body: "שלום",
                direction: "incoming",
                currentState: "INIT",
                createdAt: daysAgo(5)
            },
            "msg-202": {
                body: "שלום! ברוך הבא ל-Pivot. אני אעזור לך להגדיר את המסעדה שלך. מה שם החברה או העסק שלך?",
                direction: "outgoing",
                currentState: "ONBOARDING_COMPANY_NAME",
                createdAt: daysAgo(5)
            },
            "msg-203": {
                body: "קפה הבוקר בע״מ",
                direction: "incoming",
                currentState: "ONBOARDING_COMPANY_NAME",
                createdAt: daysAgo(5)
            },
            "msg-204": {
                body: "נהדר! עכשיו אני צריך את מספר העסק או מספר המס שלך:",
                direction: "outgoing",
                currentState: "ONBOARDING_LEGAL_ID",
                createdAt: daysAgo(5)
            },
            "msg-205": {
                body: "567890123",
                direction: "incoming",
                currentState: "ONBOARDING_LEGAL_ID",
                createdAt: daysAgo(5)
            },
            // דלג קדימה לשיטת תשלום (מספר הודעות באמצע)
            "msg-210": {
                body: "עכשיו, אנחנו צריכים להגדיר את אמצעי התשלום שלך. אנו מציעים את Stripe ו-Paylink. מה תעדיף?",
                direction: "outgoing",
                currentState: "ONBOARDING_PAYMENT_METHOD",
                createdAt: daysAgo(1)
            }
            // עדיין אין תגובה, עדיין מחכים
        }
    },
    
    // שיחת ספק
    "+972541111111": { // תוצרת שדות טריים
        restaurantId: "123456789", // מחובר ללה בל קוויזין
        currentState: "IDLE",
        context: {
            supplierName: "תוצרת שדות טריים",
            lastOrder: "order-001"
        },
        lastMessageTimestamp: daysAgo(6),
        messages: {
            "msg-301": {
                body: "הזמנה מס׳ order-001 עבור לה בל קוויזין:\n\n🍅 עגבניות שרי: 6 ק״ג\n🥬 ארוגולה: 3 ק״ג\n🥒 מלפפונים פרסיים: 5 ק״ג\n\nנא לספק ביום רביעי. תודה!",
                direction: "outgoing",
                currentState: "ORDER_CONFIRMATION",
                createdAt: daysAgo(7)
            },
            "msg-302": {
                body: "ההזמנה התקבלה, נספק ביום רביעי בבוקר.",
                direction: "incoming",
                currentState: "IDLE",
                createdAt: daysAgo(7)
            },
            "msg-303": {
                body: "מצטערים, יש לנו רק 2 ק״ג ארוגולה היום. האם זה בסדר?",
                direction: "incoming",
                currentState: "IDLE",
                createdAt: daysAgo(6, true) // מוקדם בבוקר יום המסירה
            },
            "msg-304": {
                body: "הודעתי ללה בל קוויזין על המחסור בארוגולה. אנא המשך עם המסירה עם 2 ק״ג הזמינים. תודה!",
                direction: "outgoing",
                currentState: "IDLE",
                createdAt: daysAgo(6)
            }
        }
    }
};



// Complete example database - hierarchical structure
export const exampleDatabase = {
  restaurants: exampleRestaurants,
  conversations: exampleConversations
};

export default exampleDatabase;
