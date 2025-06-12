import { emailSchema, ProductSchema, restaurantLegalIdSchema, restaurantLegalNameSchema, supplierCutoffHourSchema, supplierDeliveryDaysSchema, SupplierSchema, textSchema } from './schemas';
import { BotConfig, BotState, StateMessage } from './types';



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

// Product templates organized by category for faster setup
export const CATEGORY_PRODUCTS: Record<string, Array<{ name: string; emoji: string; unit: string }>> = {
  vegetables: [
    { name: "עגבניות", emoji: "🍅", unit: "ק\"ג" },
    { name: "מלפפונים", emoji: "🥒", unit: "ק\"ג" },
    { name: "חסה", emoji: "🥬", unit: "יחידות" },
    { name: "בצל", emoji: "🧅", unit: "ק\"ג" },
    { name: "תפוחי אדמה", emoji: "🥔", unit: "ק\"ג" },
    { name: "גזר", emoji: "🥕", unit: "ק\"ג" },
    { name: "קוביות ירוקות", emoji: "🥒", unit: "ק\"ג" },
    { name: "פלפל אדום", emoji: "🌶️", unit: "ק\"ג" }
  ],
  fruits: [
    { name: "תפוחים", emoji: "🍎", unit: "ק\"ג" },
    { name: "בננות", emoji: "🍌", unit: "ק\"ג" },
    { name: "תפוזים", emoji: "🍊", unit: "ק\"ג" },
    { name: "לימונים", emoji: "🍋", unit: "ק\"ג" },
    { name: "אבוקדו", emoji: "🥑", unit: "יחידות" }
  ],
  meat: [
    { name: "חזה עוף", emoji: "🍗", unit: "ק\"ג" },
    { name: "כנפיים עוף", emoji: "🍗", unit: "ק\"ג" },
    { name: "בשר בקר", emoji: "🥩", unit: "ק\"ג" },
    { name: "כבש", emoji: "🐑", unit: "ק\"ג" },
    { name: "נקניקיות", emoji: "🌭", unit: "ק\"ג" }
  ],
  fish: [
    { name: "סלמון", emoji: "🍣", unit: "ק\"ג" },
    { name: "דניס", emoji: "🐟", unit: "ק\"ג" },
    { name: "לברק", emoji: "🐟", unit: "ק\"ג" },
    { name: "טונה", emoji: "🍣", unit: "ק\"ג" }
  ],
  dairy: [
    { name: "חלב", emoji: "🥛", unit: "ליטר" },
    { name: "גבינה לבנה", emoji: "🧀", unit: "ק\"ג" },
    { name: "גבינה צהובה", emoji: "🧀", unit: "ק\"ג" },
    { name: "יוגורט", emoji: "🥛", unit: "יחידות" },
    { name: "שמנת", emoji: "🥛", unit: "ליטר" },
    { name: "חמאה", emoji: "🧈", unit: "ק\"ג" }
  ],
  alcohol: [
    { name: "יין אדום", emoji: "🍷", unit: "בקבוק" },
    { name: "יין לבן", emoji: "🥂", unit: "בקבוק" },
    { name: "בירה", emoji: "🍺", unit: "בקבוק" },
    { name: "וודקה", emoji: "🍸", unit: "בקבוק" },
    { name: "וויסקי", emoji: "🥃", unit: "בקבוק" }
  ],
  eggs: [
    { name: "ביצים גדולות", emoji: "🥚", unit: "יחידות" },
    { name: "ביצים קטנות", emoji: "🥚", unit: "יחידות" },
    { name: "ביצי חופש", emoji: "🥚", unit: "יחידות" }
  ],
  oliveOil: [
    { name: "שמן זית", emoji: "🫒", unit: "ליטר" },
    { name: "שמן זית כתית", emoji: "🫒", unit: "ליטר" },
    { name: "שמן חמניות", emoji: "🌻", unit: "ליטר" }
  ],
  disposables: [
    { name: "כוסות פלסטיק", emoji: "🥤", unit: "חבילה" },
    { name: "צלחות חד פעמי", emoji: "🍽️", unit: "חבילה" },
    { name: "מפיות", emoji: "🧻", unit: "חבילה" },
    { name: "שקיות", emoji: "🛍️", unit: "חבילה" }
  ],
  dessert: [
    { name: "עוגת שוקולד", emoji: "🍰", unit: "יחידות" },
    { name: "גלידה", emoji: "🍦", unit: "ליטר" },
    { name: "פירות קצופים", emoji: "🍓", unit: "יחידות" },
    { name: "עוגיות", emoji: "🍪", unit: "חבילה" }
  ],
  juices: [
    { name: "מיץ תפוזים", emoji: "🧃", unit: "ליטר" },
    { name: "מיץ תפוחים", emoji: "🧃", unit: "ליטר" },
    { name: "מיץ ענבים", emoji: "🧃", unit: "ליטר" },
    { name: "לימונדה", emoji: "🍋", unit: "ליטר" }
  ]
};

// Helper function to format supplier categories as a list with emojis
export const formatCategoryList = (excludeCategories: string[] = []): string => {
  return Object.entries(BOT_CATEGORIES)
    .filter(([id]) => !excludeCategories.includes(id))
    .map(([id, { name, emoji }], index) => `${index + 1}. ${emoji} ${name}`)
    .join('\n');
};

// Helper function to get available categories excluding already selected ones
export const getAvailableCategories = (excludeCategories: string[] = []): Array<{name: string, id: string}> => {
  return Object.entries(BOT_CATEGORIES)
    .filter(([id]) => !excludeCategories.includes(id))
    .map(([id, { name, emoji }]) => ({ 
      name: `${emoji} ${name}`, 
      id 
    }));
};

// Helper function to get products for multiple categories
export const getProductsForCategories = (categories: string[]): Array<{ name: string; emoji: string; unit: string; category: string }> => {
  return categories.flatMap(category => 
    (CATEGORY_PRODUCTS[category] || []).map(product => ({
      ...product,
      category
    }))
  );
};

// Helper function to format products as WhatsApp options, excluding already selected ones
export const formatProductOptions = (categories: string[], excludeProducts: string[] = []): Array<{name: string, id: string}> => {
  const products = getProductsForCategories(categories);
  const filteredProducts = products.filter(product => 
    !excludeProducts.some(excluded => excluded === product.name)
  );
  
  return filteredProducts.map((product, index) => ({
    name: `${product.emoji} ${product.name} (${product.unit})`,
    id: `product_${index}_${product.category}_${product.name}_${product.unit}`
  }));
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
      id: "init_temaplate",
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
    validator: restaurantLegalNameSchema
  },
  
  "ONBOARDING_LEGAL_ID": {
    message: "📝 מצוין! כעת הזן את מספר ח.פ/עוסק מורשה של העסק.",
    description: "Ask for the business registration number (9 digits).",
    validator: restaurantLegalIdSchema
  },
  
  "ONBOARDING_RESTAURANT_NAME": {
    message: "🍽️ מהו השם המסחרי של המסעדה? (השם שהלקוחות מכירים)",
    description: "Ask for the restaurant's commercial name (may differ from legal name).",
    validator: textSchema
  },
  
  "ONBOARDING_CONTACT_NAME": {
    message: "👤 מה השם המלא שלך? (איש קשר ראשי)",
    description: "Ask for the primary contact person's full name.",
    validator: textSchema
  },
  
  "ONBOARDING_CONTACT_EMAIL": {
     whatsappTemplate: {
      id: "contact_email_template",
      type: "card",
      body: "📧 מה כתובת האימייל שלך? (אופציונלי - לחץ 'דלג' להמשך)",
      options: [
        { name: "דלג", id: "skip" } // Option to skip email input
      ]
    },
    description: "Ask for contact email (optional, can be skipped with 'דלג').",
    validator: emailSchema
  },
  
  "ONBOARDING_PAYMENT_METHOD": {
    whatsappTemplate: {
      id: "payment_options_template",
      type: "button",
      body: "💳 *בחר שיטת תשלום:*\n\nהמערכת זמינה בתשלום חודשי. בחר את האופציה המועדפת עליך:",
      options: [
        { name: "כרטיס אשראי", id: "credit_card" },
        { name: "התחל ניסיון", id: "trial" }
      ]
    },
    description: "Prompt user to select a payment method for the subscription.",
  },
  
  "WAITING_FOR_PAYMENT": {
    message: "⏳ *בהמתנה לאישור תשלום*\n\nניתן לשלם בקישור הבא:\n\n {paymentLink} \n\nלאחר השלמת התשלום, נמשיך בהגדרת המערכת.",
    description: "Wait for payment confirmation before proceeding with setup."
  },
  
  // === SUPPLIER SETUP STATES === //
  
  "SETUP_SUPPLIERS_START": {
    whatsappTemplate: {
      id: "supplier_setup_start_template",
      type: "button",
      body: "🏪 *הגדרת ספקים ומוצרים*\n\nכעת נגדיר את הספקים שעובדים עם המסעדה שלך. זה יעזור למערכת לנהל את המלאי ולשלוח הזמנות אוטומטיות.\n\nמוכנים להתחיל?",
      options: [
        { name: "כן, בואו נתחיל", id: "start_setup" },
        { name: "לא כרגע", id: "postpone" }
      ]
    },
    description: "Initial prompt to begin supplier setup process.",
  },

  "SUPPLIER_CATEGORY": {
    whatsappTemplate: {
      id: "supplier_category_template",
      type: "list",
      body: "🔍 *בחר קטגוריות לספק זה*\n\nבחרו או הקלידו את הקטגוריות המתאימות לספק הנוכחי:\n\n💡 ניתן לבחור מספר קטגוריות",
      options: [] // Will be dynamically populated in conversationState.ts
    },
    description: "Prompt to select multiple supplier categories from available list.",
  },

  "SUPPLIER_CATEGORY_ADDITIONAL": {
    whatsappTemplate: {
      id: "supplier_category_additional_template",
      type: "list",
      body: "🔍 *בחר קטגוריות נוספות לספק זה*\n\nבחרו או הקלידו את הקטגוריות הנוספות שברצונכם להוסיף.\n\n אם אין עוד קטגוריות לספק, לחצו 'המשך הגדרת ספק'",
      options: [
        { name: "המשך הגדרת ספק", id: "continue_supplier_setup" }
      ]
    },
    description: "Repeat this prompt to select / enter custom supplier categories until the user approves the supplier category setup process by clicking 'המשך הגדרת ספק'.",
    aiValidation: {
      prompt: "עליך לשאול את המשתמש אם הוא רוצה להוסיף עוד קטגוריות מוצרים לספק הנוכחי ואם כן, לאסוף את הקטגוריות הנוספות ולהוסיף לרשימה. אם לא, לבקש ללחוץ על הכפתור 'המשך הגדרת ספק' כדי לסיים את הגדרת הקטגוריות.",
      schema: SupplierSchema.pick({ category: true })
    },
    validator: SupplierSchema.pick({ category: true })
  },

  "SUPPLIER_NAME_AND_PHONE": {
    message: "👤 *מה שם ומספר הוואטסאפ של הספק?*\n\nלדוגמה: ירקות השדה, 0501234567",
    description: "Ask for the supplier's name and phone number.",
    aiValidation: {
      prompt: "עליך לשאול את המשתמש מה השם ומספר הוואטסאפ של הספק הנוכחי.",
      schema: SupplierSchema.pick({ name: true, whatsapp: true })
    },
    validator: SupplierSchema.pick({ name: true, whatsapp: true })
  },
  
  "SUPPLIER_DELIVERY_DAYS": {
    whatsappTemplate: {
      id: "TEMPLATE_DELIVERY_DAYS",
      type: "list",
      body: "📅 *באילו ימים הספק מבצע משלוחים?*\n\nבחר את כל הימים הרלוונטיים (ניתן לבחור כמה פעמים):\n\n" + "\n\nלסיום הבחירה, שלח 'סיום'",
      options: [
        { name: "ראשון", id: "sun" },
        { name: "שני", id: "mon" },
        { name: "שלישי", id: "tue" },
        { name: "רביעי", id: "wed" },
        { name: "חמישי", id: "thu" },
        { name: "שישי", id: "fri" },
        { name: "שבת", id: "sat" },
        { name: "סיום בחירה", id: "done" }
      ]
    },
    description: "Select which days of the week this supplier delivers goods.",
    validator: SupplierSchema.pick({ deliveryDays: true }),
  },
  
  "SUPPLIER_CUTOFF_TIME": {
    message: "⏰ *כדי שנוכל לתזכר אותך בזמן, נגדיר את השעה האחרונה בה ניתן לשלוח בקשות והזמנות לספק?*\n\nהזן את השעה האחרונה שבה ניתן לשלוח הזמנה *ביום שלפני המשלוח*, (פורמט 24 שעות, למשל: 14 עבור 14:00)",
    description: "Set the cutoff hour for placing orders with this supplier.",
    validator: SupplierSchema.pick({ cutoffHour: true }),
  },

  "PRODUCTS_LIST": {
    whatsappTemplate: {
      id: "TEMPLATE_PRODUCT_SELECTION",
      type: "list", 
          body: "🏷️ נגדיר עכשיו את רשימת המוצרים של הספק ואת יחידות המידה שלהם\n\n כתבו בצורה ברורה או בחרו את רשימת המוצרים המלאה שאתם מזמינים מהספק ואת יחידות המידה שלהם\nלדוגמה: \n\nק\"ג: 🍅 עגבניות שרי, 🥒 מלפפון, 🧅 בצל, 🥕 גזר\nיחידות: 🥬 חסה, 🌿 פטרוזיליה",
          options: [] // Will be dynamically populated in conversationState.ts
    },
    description: "Select one product from the list or enter a custom product name.",
    aiValidation: {
      prompt: "עליך לבקש מהמשתמש לבחור, לרשום בכל דרך שיבחר רשימה של מוצרים ויחידות המידה שלהם שאותם ניתן להזמין מהספק, אם נתונים על מוצר מסויים חסרים, השלם אותם לפי הסבירות הגבוהה ביותר.",
      schema: ProductSchema.pick({ name: true, unit: true, emoji: true })
    },
    validator: ProductSchema.pick({ name: true, unit: true, emoji: true })
  },


  "PRODUCTS_BASE_QTY": {
    whatsappTemplate: {
      id: "TEMPLATE_PRODUCT_BASE_QTY",
      type: "list",
      body: "🔢 *מה כמות הבסיס של המוצרים הבאים ביחידות {unit}?*\n\nבחר את המוצרים שברצונך לעדכן:",
      options: [] // Will be dynamically populated in conversationState.ts
    },
    message: "🔢 ",
    description: "Iterate over products and ask for their base quantity in the specified unit, for midweek and for weekend.",
    validationMessage: "❌ אנא הזן מספר תקין גדול מ-0.",
  
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
      options: [] // Will be dynamically populated with actual categories
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
