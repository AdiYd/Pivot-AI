import { BotConfig, BotState } from './types';

/**
 * StateMessage defines the structure of messages for each state in the bot state machine
 */
export interface StateMessage {
  // If defined, use a WhatsApp template with structured responses
  whatsappTemplate?: {
    id: string;                // Template ID registered with WhatsApp Business API
    type: "text" | "button" | "list" | "card";  // Template type
    body: string;              // Main message body
    options?: Array<{         // Response options
      name: string;           // Human-readable option text
      id: string;             // Machine-readable option identifier
    }>;
    header?: {               // Optional header for templates that support it
      type: string;          // "text" or "media"
      text?: string;         // Header text if type is "text"
      mediaUrl?: string;     // Media URL if type is "media"
    };
  };
  
  // Regular message text (used if whatsappTemplate is undefined)
  message?: string;
  
  // Description of this state for developers
  description: string;
  
  // Message to show if validation fails
  validationMessage?: string;
  
  // Type of validation to perform (if any)
  validator?: "text" | "number" | "email" | "phone" | "yesNo" | "selection" | "days" | "time" | "photo" | "skip";
}

// Supplier categories with emoji representation
export const BOT_CATEGORIES: Record<string, { name: string; emoji: string }> = {
  vegetables: { name: "ירקות", emoji: "🥬" },
  fish: { name: "דגים", emoji: "🐟" },
  alcohol: { name: "אלכוהול", emoji: "🍷" },
  meat: { name: "בשרים", emoji: "🥩" },
  fruits: { name: "פירות", emoji: "🍎" },
  oliveOil: { name: "שמן זית", emoji: "🫒" },
  disposables: { name: "חד פעמי", emoji: "🥤" },
  dessert: { name: "קינוחים", emoji: "🍰" },
  juices: { name: "מיצים טבעיים", emoji: "🧃" },
  eggs: { name: "ביצים אורגניות", emoji: "🥚" },
  dairy: { name: "מוצרי חלב", emoji: "🥛" }
};

// Helper function to format supplier categories as a list with emojis
export const formatCategoryList = (): string => {
  return Object.entries(BOT_CATEGORIES)
    .map(([id, { name, emoji }], index) => `${index + 1}. ${emoji} ${name}`)
    .join('\n');
};

// Helper function to format days of the week
export const formatDaysList = (): string => {
  const days = [
    { id: '0', name: 'ראשון' },
    { id: '1', name: 'שני' },
    { id: '2', name: 'שלישי' },
    { id: '3', name: 'רביעי' },
    { id: '4', name: 'חמישי' },
    { id: '5', name: 'שישי' },
    { id: '6', name: 'שבת' },
  ];
  
  return days.map(day => `${day.id} - ${day.name}`).join('\n');
};

/**
 * Main state machine messages mapping
 * Each key corresponds to a value from BotState enum
 */
export const STATE_MESSAGES: Record<BotState, StateMessage> = {
  // Initial state
  "INIT": {
    whatsappTemplate: {
      id: "TEMPLATE_INIT_OPTIONS",
      type: "list",
      body: "🍽️ *ברוכים הבאים למערכת ניהול המלאי וההזמנות!*\n\nבחר מה ברצונך לעשות:",
      options: [
        { name: "רישום מסעדה חדשה", id: "new_restaurant" },
        { name: "עזרה והסבר", id: "help" }
      ]
    },
    description: "Initial greeting when a new user contacts the bot. Offers basic navigation options."
  },
  
  // === ONBOARDING FLOW STATES === //
  
  "ONBOARDING_COMPANY_NAME": {
    message: "🏢 *תהליך הרשמה למערכת*\n\nמהו השם החוקי של העסק או החברה שלך?",
    description: "Ask for the legal company name as the first step of onboarding.",
    validationMessage: "❌ אנא הזן שם חברה תקין (לפחות 2 תווים).",
    validator: "text"
  },
  
  "ONBOARDING_LEGAL_ID": {
    message: "📝 מצוין! כעת אנא הזן את מספר ח.פ/עוסק מורשה של העסק.",
    description: "Ask for the business registration number (9 digits).",
    validationMessage: "❌ אנא הזן מספר ח.פ תקין (9 ספרות).",
    validator: "number"
  },
  
  "ONBOARDING_RESTAURANT_NAME": {
    message: "🍽️ מהו השם המסחרי של המסעדה? (השם שהלקוחות מכירים)",
    description: "Ask for the restaurant's commercial name (may differ from legal name).",
    validationMessage: "❌ אנא הזן שם מסעדה תקין (לפחות 2 תווים).",
    validator: "text"
  },
  
  "ONBOARDING_YEARS_ACTIVE": {
    message: "⏳ כמה שנים המסעדה פעילה?",
    description: "Ask how many years the restaurant has been in operation.",
    validationMessage: "❌ אנא הזן מספר שנים תקין (מספר בין 0-100).",
    validator: "number"
  },
  
  "ONBOARDING_CONTACT_NAME": {
    message: "👤 מה השם המלא שלך? (איש קשר ראשי)",
    description: "Ask for the primary contact person's full name.",
    validationMessage: "❌ אנא הזן שם מלא תקין (לפחות 2 תווים).",
    validator: "text"
  },
  
  "ONBOARDING_CONTACT_EMAIL": {
    message: "📧 מה כתובת האימייל שלך? (אופציונלי - שלח 'דלג' לדילוג)",
    description: "Ask for contact email (optional, can be skipped with 'דלג').",
    validationMessage: "❌ אנא הזן כתובת אימייל תקינה או 'דלג'.",
    validator: "email"
  },
  
  "ONBOARDING_PAYMENT_METHOD": {
    whatsappTemplate: {
      id: "TEMPLATE_PAYMENT_OPTIONS",
      type: "button",
      body: "💳 *בחר שיטת תשלום:*\n\nהמערכת זמינה בתשלום חודשי. בחר את האופציה המועדפת עליך:",
      options: [
        { name: "כרטיס אשראי", id: "credit_card" },
        { name: "PayPal", id: "paypal" },
        { name: "קופון נסיון", id: "trial" }
      ]
    },
    description: "Prompt user to select a payment method for the subscription.",
    validationMessage: "❌ אנא בחר אמצעי תשלום מהאפשרויות."
  },
  
  "WAITING_FOR_PAYMENT": {
    message: "⏳ *בהמתנה לאישור תשלום*\n\nניתן לשלם בקישור הבא: {paymentLink} \n\nלאחר השלמת התשלום, נמשיך בהגדרת המערכת.",
    description: "Wait for payment confirmation before proceeding with setup."
  },
  
  // === SUPPLIER SETUP STATES === //
  
  "SETUP_SUPPLIERS_START": {
    whatsappTemplate: {
      id: "TEMPLATE_SUPPLIER_SETUP_START",
      type: "button",
      body: "🏪 *הגדרת ספקים ומוצרים*\n\nכעת נגדיר את הספקים שעובדים עם המסעדה שלך. זה יעזור למערכת לנהל את המלאי ולשלוח הזמנות אוטומטיות.\n\nמוכנים להתחיל?",
      options: [
        { name: "כן, בואו נתחיל", id: "start_setup" },
        { name: "לא כרגע", id: "postpone" }
      ]
    },
    description: "Initial prompt to begin supplier setup process.",
    validationMessage: "❌ אנא בחר אפשרות מהרשימה."
  },
  
  "SUPPLIER_CATEGORY": {
    whatsappTemplate: {
      id: "TEMPLATE_SUPPLIER_CATEGORY",
      type: "list",
      body: "🔍 *בחר קטגוריות לספק*\n\nבחר את הקטגוריות המתאימות לספק (ניתן לבחור כמה פעמים):\n\nלסיום הבחירה, שלח 'סיום'",
      options: [
        ...Object.entries(BOT_CATEGORIES).map(([id, { name, emoji }]) => ({ 
          name: `${emoji} ${name}`, 
          id 
        })),
        { name: "סיום בחירה", id: "done" }
      ]
    },
    description: "Prompt to select multiple supplier categories from predefined list.",
    validationMessage: "❌ אנא בחר קטגוריה תקינה מהרשימה או שלח 'סיום'.",
    validator: "selection"
  },
  
  "SUPPLIER_NAME": {
    message: "👤 *מהו שם הספק?*\n\nלדוגמה: ירקות השדה, מאפיית לחם הארץ",
    description: "Ask for the supplier's company name.",
    validationMessage: "❌ אנא הזן שם ספק תקין (לפחות 2 תווים).",
    validator: "text"
  },
  
  "SUPPLIER_WHATSAPP": {
    message: "📱 *מה מספר הוואטסאפ של הספק?*\n\nהזן מספר בפורמט: 050-1234567 או 0501234567",
    description: "Ask for the supplier's WhatsApp number for sending orders.",
    validationMessage: "❌ אנא הזן מספר טלפון תקין (10 ספרות, מתחיל ב-05).",
    validator: "phone"
  },
  
  "SUPPLIER_DELIVERY_DAYS": {
    whatsappTemplate: {
      id: "TEMPLATE_DELIVERY_DAYS",
      type: "list",
      body: "📅 *באילו ימים הספק מבצע משלוחים?*\n\nבחר את כל הימים הרלוונטיים (ניתן לבחור כמה פעמים):\n\n" + "\n\nלסיום הבחירה, שלח 'סיום'",
      options: [
        { name: "ראשון", id: "0" },
        { name: "שני", id: "1" },
        { name: "שלישי", id: "2" },
        { name: "רביעי", id: "3" },
        { name: "חמישי", id: "4" },
        { name: "שישי", id: "5" },
        { name: "שבת", id: "6" },
        { name: "סיום בחירה", id: "done" }
      ]
    },
    description: "Select which days of the week this supplier delivers goods.",
    validationMessage: "❌ בחירה לא תקינה. אנא בחר מספרים בין 0-6, מופרדים בפסיקים או 'סיום'.",
    validator: "days"
  },
  
  "SUPPLIER_CUTOFF_TIME": {
    message: "⏰ *מהי שעת הקאט-אוף להזמנות?*\n\nהזן את השעה האחרונה ביום שבו ניתן להעביר הזמנה לספק (פורמט 24 שעות, למשל: 14 עבור 14:00)",
    description: "Set the cutoff hour for placing orders with this supplier.",
    validationMessage: "❌ אנא הזן שעה תקינה (מספר בין 0-23).",
    validator: "time"
  },
  
  "PRODUCT_NAME": {
    message: "🏷️ *הזן שם מוצר מהספק {supplierName}*\n\nלדוגמה: עגבניות שרי, חזה עוף, יין אדום",
    description: "Ask for the name of a product from this supplier.",
    validationMessage: "❌ אנא הזן שם מוצר תקין (לפחות 2 תווים).",
    validator: "text"
  },
  
  "PRODUCT_UNIT": {
    whatsappTemplate: {
      id: "TEMPLATE_PRODUCT_UNIT",
      type: "list",
      body: "📏 *מה יחידת המידה של המוצר {productName}?*",
      options: [
        { name: "ק\"ג", id: "kg" },
        { name: "יחידות", id: "pcs" },
        { name: "ליטר", id: "l" },
        { name: "בקבוק", id: "bottle" },
        { name: "קרטון", id: "box" },
        { name: "חבילה", id: "pack" },
        { name: "אחר (הקלד)", id: "other" }
      ]
    },
    description: "Select the unit of measurement for this product.",
    validationMessage: "❌ אנא בחר יחידת מידה מהרשימה או הקלד יחידת מידה מותאמת אישית.",
    validator: "selection"
  },
  
  "PRODUCT_QTY": {
    message: "🔢 *מה כמות הבסיס של {productName} ביחידות {unit} לשבוע?*",
    description: "Ask for the base quantity of this product in the specified units for the week.",
    validationMessage: "❌ אנא הזן מספר תקין גדול מ-0.",
    validator: "number"
  },
  
  "PRODUCT_PAR_MIDWEEK": {
    message: "📊 *כמה {productName} דרושים באמצע השבוע (ראשון-רביעי)?*\n\nהזן כמות ביחידות {unit}:",
    description: "Set the par level for this product during regular weekdays.",
    validationMessage: "❌ אנא הזן מספר תקין גדול מ-0.",
    validator: "number"
  },
  
  "PRODUCT_PAR_WEEKEND": {
    message: "📈 *כמה {productName} דרושים בסוף השבוע (חמישי-שבת)?*\n\nהזן כמות ביחידות {unit}:",
    description: "Set the par level for this product during weekend days.",
    validationMessage: "❌ אנא הזן מספר תקין גדול מ-0.",
    validator: "number"
  },
  
  // === INVENTORY SNAPSHOT STATES === //
  
  "INVENTORY_SNAPSHOT_START": {
    whatsappTemplate: {
      id: "TEMPLATE_SNAPSHOT_START",
      type: "button",
      body: "📦 *עדכון מלאי*\n\nהגיע הזמן לעדכן את מצב המלאי במסעדה. נעבור על הפריטים לפי קטגוריות.\n\nמוכנים להתחיל?",
      options: [
        { name: "התחל עדכון מלאי", id: "start" },
        { name: "דחה לזמן אחר", id: "postpone" }
      ]
    },
    description: "Prompt to begin inventory snapshot process.",
    validationMessage: "❌ אנא בחר אחת מהאפשרויות."
  },
  
  "INVENTORY_SNAPSHOT_CATEGORY": {
    whatsappTemplate: {
      id: "TEMPLATE_SNAPSHOT_CATEGORY",
      type: "list",
      body: "🔍 *בחר קטגוריה לעדכון מלאי*\n\nבחר את הקטגוריה שברצונך לעדכן:",
      options: Object.entries(BOT_CATEGORIES).map(([id, { name, emoji }]) => ({ 
        name: `${emoji} ${name}`, 
        id 
      }))
    },
    description: "Select which category of products to update inventory for.",
    validationMessage: "❌ אנא בחר קטגוריה תקינה מהרשימה."
  },
  
  "INVENTORY_SNAPSHOT_PRODUCT": {
    message: "📋 *עדכון מלאי - {categoryName}*\n\nהמוצרים בקטגוריה זו:\n{productList}\n\nבחר מספר מוצר או הקלד 'הבא' למוצר הבא:",
    description: "Show products in selected category and prompt user to choose one to update.",
    validationMessage: "❌ אנא בחר מספר מוצר תקין מהרשימה או הקלד 'הבא'.",
    validator: "selection"
  },
  
  "INVENTORY_SNAPSHOT_QTY": {
    message: "📊 *כמה {productName} יש במלאי כרגע?*\n\nהזן כמות ביחידות {unit}:",
    description: "Ask for current stock quantity of the selected product.",
    validationMessage: "❌ אנא הזן מספר תקין גדול או שווה ל-0.",
    validator: "number"
  },
  
  "INVENTORY_CALCULATE_SNAPSHOT": {
    whatsappTemplate: {
      id: "TEMPLATE_CALCULATE_RESULTS",
      type: "card",
      header: {
        type: "text",
        text: "📊 סיכום מלאי והזמנה מומלצת"
      },
      body: "✅ *עדכון המלאי הושלם!*\n\nהמערכת חישבה את ההזמנה המומלצת עבורך לפי פערי המלאי:\n\n{shortagesSummary}\n\nהאם ברצונך ליצור הזמנה לפי המלצה זו?",
      options: [
        { name: "כן, צור הזמנה", id: "create_order" },
        { name: "לא תודה", id: "skip_order" }
      ]
    },
    description: "Show inventory calculation results and prompt whether to create order.",
    validationMessage: "❌ אנא בחר אחת מהאפשרויות."
  },
  
  // === ORDER MANAGEMENT STATES === //
  
  "ORDER_SETUP_START": {
    whatsappTemplate: {
      id: "TEMPLATE_ORDER_SETUP",
      type: "list",
      body: "🛒 *יצירת הזמנה חדשה*\n\nבחר את הספק להזמנה:",
      options: [
        // These will be dynamically populated with suppliers from the restaurant
        { name: "רשימת ספקים תיווצר דינמית", id: "dynamic" }
      ]
    },
    description: "Prompt to choose a supplier to create a new order.",
    validationMessage: "❌ אנא בחר ספק מהרשימה."
  },
  
  "ORDER_CONFIRMATION": {
    whatsappTemplate: {
      id: "TEMPLATE_ORDER_CONFIRM",
      type: "button",
      body: "📋 *אישור הזמנה*\n\nלהלן פרטי ההזמנה לספק {supplierName}:\n\n{orderDetails}\n\nסה\"כ פריטים: {itemCount}\n\nהאם לשלוח את ההזמנה לספק?",
      options: [
        { name: "שלח הזמנה", id: "send" },
        { name: "ערוך הזמנה", id: "edit" },
        { name: "בטל הזמנה", id: "cancel" }
      ]
    },
    description: "Display order summary and ask for confirmation before sending.",
    validationMessage: "❌ אנא בחר אחת מהאפשרויות."
  },
  
  "DELIVERY_START": {
    whatsappTemplate: {
      id: "TEMPLATE_DELIVERY_START",
      type: "button",
      body: "🚚 *קבלת משלוח מספק {supplierName}*\n\nהגיע הזמן לבדוק את המשלוח שהגיע. נעבור על הפריטים שהוזמנו ונוודא שהכל התקבל כראוי.\n\nמוכנים להתחיל?",
      options: [
        { name: "התחל בדיקת משלוח", id: "start" },
        { name: "דחה לזמן אחר", id: "postpone" }
      ]
    },
    description: "Prompt to begin delivery check process for an incoming order.",
    validationMessage: "❌ אנא בחר אחת מהאפשרויות."
  },
  
  "DELIVERY_CHECK_ITEM": {
    whatsappTemplate: {
      id: "TEMPLATE_CHECK_ITEM",
      type: "button",
      body: "📦 *בדיקת פריט: {productName}*\n\nכמות שהוזמנה: {orderedQty} {unit}\n\nהאם התקבלה הכמות המלאה?",
      options: [
        { name: "✅ כן, התקבל במלואו", id: "full" },
        { name: "⚠️ התקבל חלקית", id: "partial" },
        { name: "❌ לא התקבל כלל", id: "none" }
      ]
    },
    description: "Check if ordered item was received in full, partially or not at all.",
    validationMessage: "❌ אנא בחר אחת מהאפשרויות."
  },
  
  "DELIVERY_RECEIVED_AMOUNT": {
    message: "🔢 *כמה {productName} התקבלו בפועל?*\n\nהזן את הכמות שהתקבלה ביחידות {unit}:",
    description: "Ask for the actual received quantity of a partially received item.",
    validationMessage: "❌ אנא הזן מספר תקין גדול או שווה ל-0 וקטן מהכמות שהוזמנה.",
    validator: "number"
  },
  
  "DELIVERY_INVOICE_PHOTO": {
    message: "📸 *צילום חשבונית*\n\nאנא צלם את החשבונית שקיבלת מהספק ושלח את התמונה כאן.\n\nהתמונה תישמר במערכת לצורך מעקב והתחשבנות.",
    description: "Request a photo of the invoice for record-keeping.",
    validationMessage: "❌ לא התקבלה תמונה תקינה. אנא שלח תמונה של החשבונית.",
    validator: "photo"
  },
  
  // === IDLE STATE === //
  
  "IDLE": {
    whatsappTemplate: {
      id: "TEMPLATE_IDLE_MENU",
      type: "list",
      body: "👋 *שלום {contactName}!*\n\nמה תרצה לעשות היום?\n\nבחר אחת מהאפשרויות:",
      options: [
        { name: "📦 עדכון מלאי", id: "update_inventory" },
        { name: "🛒 יצירת הזמנה", id: "create_order" },
        { name: "🏪 הוספת ספק חדש", id: "add_supplier" },
        { name: "🏷️ הוספת מוצר חדש", id: "add_product" },
        { name: "📊 דוחות והזמנות", id: "reports" },
        { name: "⚙️ הגדרות", id: "settings" },
        { name: "❓ עזרה", id: "help" }
      ]
    },
    description: "Main menu shown when the user is not in any active flow."
  }
};

/**
 * System messages that aren't tied to a specific state
 */
export const SYSTEM_MESSAGES = {
  welcome: "👋 *ברוכים הבאים למערכת ניהול המלאי וההזמנות!*\n\nאני הבוט שיעזור לכם לנהל ספקים, מלאי והזמנות בקלות ויעילות.",
  
  error: "⚠️ *קרתה שגיאה*\n\nמצטערים, משהו השתבש. נסה שוב או פנה לתמיכה.",
  
  sessionTimeout: "⏰ *זמן השיחה הסתיים*\n\nהשיחה לא היתה פעילה זמן רב. אנא התחל מחדש עם פקודה כלשהי.",
  
  help: "❓ *מדריך למשתמש*\n\n" +
        "• עדכן מלאי לפני כל קאט-אוף הזמנות\n" +
        "• המערכת תחשב אוטומטית את הצרכים שלך\n" +
        "• בדוק משלוחים בזמן קבלתם לתיעוד מדויק\n" +
        "• צלם חשבוניות לתיעוד אוטומטי\n\n" +
        "לתמיכה נוספת: 050-1234567",
  
  orderSent: "✅ *ההזמנה נשלחה בהצלחה לספק {supplierName}*\n\nמזהה הזמנה: #{orderId}\n\nתישלח התראה כאשר המשלוח יגיע.",
  
  deliveryComplete: "✅ *תיעוד המשלוח הושלם*\n\n" +
                   "סיכום:\n{deliverySummary}\n\n" +
                   "החשבונית נשמרה במערכת.",

  snapshotComplete: "✅ *עדכון המלאי הושלם*\n\n" +
                    "המערכת חישבה את ההזמנה המומלצת עבורך\n\n" +
                    "האם ברצונך ליצור הזמנה לפי המלצה זו?",
  
  reminderInventory: "⏰ *תזכורת: עדכון מלאי*\n\n" +
                     "היום יש לעדכן את המלאי עבור הספקים הבאים:\n" +
                     "{supplierList}\n\n" +
                     "הקלד 'מלאי' כדי להתחיל."
};

/**
 * Validation error messages that can be reused across multiple states
 */
export const VALIDATION_ERRORS : Record<string, string> = {
  text: "❌ הטקסט שהזנת אינו תקין. נדרשים לפחות 2 תווים.",
  number: "❌ אנא הזן מספר תקין.",
  phone: "❌ אנא הזן מספר טלפון ישראלי תקין (לדוגמה: 0501234567).",
  email: "❌ אנא הזן כתובת אימייל תקינה או 'דלג'.",
  selection: "❌ אנא בחר אפשרות מהרשימה.",
  days: "❌ אנא בחר ימים תקינים (מספרים בין 0-6).",
  time: "❌ אנא הזן שעה תקינה (מספר בין 0-23).",
  yesNo: "❌ אנא ענה 'כן' או 'לא'.",
  photo: "❌ אנא שלח תמונה תקינה."
};

/*
 * Configuration constants for bot behavior
 * These can be uploaded to Firestore for dynamic configuration
 */
export const BOT_CONFIG: BotConfig = {
  // Reminder intervals in hours
  inventoryReminderInterval: 24, // Daily reminders
  orderCutoffReminderHours: 3, // 3 hours before cutoff
  
  // Default supplier categories in order
  supplierCategories:  [
    "vegetables", "fish", "alcohol", "meat", "fruits", 
    "oliveOil", "disposables", "dessert", "juices", "eggs"
  ],

  showPaymentLink: true, // Show payment link after registration

  paymentLink: 'https://payment.example.com/restaurant/',
  skipPaymentCoupon: 'try14', // Coupon to skip payment
  
  // Payment options
  paymentMethods: ["creditCard", "googlePay"],
  
  };
