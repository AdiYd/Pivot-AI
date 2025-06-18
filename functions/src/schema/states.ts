import { z } from 'zod';
import { emailSchema, nameSchema, ProductSchema, restaurantLegalIdSchema, restaurantLegalNameSchema, restaurantNameSchema, supplierCategorySchema, SupplierSchema } from './schemas';
import { BotConfig, BotState, Product, StateObject, SupplierCategory } from './types';



// Supplier categories with emoji representation
export const CATEGORIES_DICT: Record<string, Partial<Product>> = {
  vegetables: { name: "ירקות", emoji: "🥬" },
  fruits: { name: "פירות", emoji: "🍎" },
  meats: { name: "בשרים", emoji: "🥩" },
  fish: { name: "דגים", emoji: "🐟" },
  dairy: { name: "מוצרי חלב", emoji: "🥛" },
  alcohol: { name: "אלכוהול", emoji: "🍷" },
  eggs: { name: "ביצים אורגניות", emoji: "🥚" },
  oliveOil: { name: "שמן זית", emoji: "🫒" },
  disposables: { name: "חד פעמי", emoji: "🥤" },
  desserts: { name: "קינוחים", emoji: "🍰" },
  juices: { name: "מיצים טבעיים", emoji: "🧃" },
};

// Product templates organized by category for faster setup
export const CATEGORY_PRODUCTS: Record<string, Array<Partial<Product>>> = {
  vegetables: [
    { name: "עגבניות", emoji: "🍅", unit: "kg" },
    { name: "מלפפונים", emoji: "🥒", unit: "kg" },
    { name: "חסה", emoji: "🥬", unit: "pcs" },
    { name: "בצל", emoji: "🧅", unit: "kg" },
    { name: "תפוחי אדמה", emoji: "🥔", unit: "kg" },
    { name: "גזר", emoji: "🥕", unit: "kg" },
    { name: "קוביות ירוקות", emoji: "🥒", unit: "kg" },
    { name: "פלפל אדום", emoji: "🌶️", unit: "kg" }
  ],
  fruits: [
    { name: "תפוחים", emoji: "🍎", unit: "kg" },
    { name: "בננות", emoji: "🍌", unit: "kg" },
    { name: "תפוזים", emoji: "🍊", unit: "kg" },
    { name: "לימונים", emoji: "🍋", unit: "kg" },
    { name: "אבוקדו", emoji: "🥑", unit: "pcs" }
  ],
  meats: [
    { name: "חזה עוף", emoji: "🍗", unit: "kg" },
    { name: "כנפיים עוף", emoji: "🍗", unit: "kg" },
    { name: "בשר בקר", emoji: "🥩", unit: "kg" },
    { name: "כבש", emoji: "🐑", unit: "kg" },
    { name: "נקניקיות", emoji: "🌭", unit: "kg" }
  ],
  fish: [
    { name: "סלמון", emoji: "🍣", unit: "kg" },
    { name: "דניס", emoji: "🐟", unit: "kg" },
    { name: "לברק", emoji: "🐟", unit: "kg" },
    { name: "טונה", emoji: "🍣", unit: "kg" }
  ],
  dairy: [
    { name: "חלב", emoji: "🥛", unit: "l" },
    { name: "גבינה לבנה", emoji: "🧀", unit: "kg" },
    { name: "גבינה צהובה", emoji: "🧀", unit: "kg" },
    { name: "יוגורט", emoji: "🥛", unit: "pcs" },
    { name: "שמנת", emoji: "🥛", unit: "l" },
    { name: "חמאה", emoji: "🧈", unit: "kg" }
  ],
  alcohol: [
    { name: "יין אדום", emoji: "🍷", unit: "bottle" },
    { name: "יין לבן", emoji: "🥂", unit: "bottle" },
    { name: "בירה", emoji: "🍺", unit: "bottle" },
    { name: "וודקה", emoji: "🍸", unit: "bottle" },
    { name: "וויסקי", emoji: "🥃", unit: "bottle" }
  ],
  eggs: [
    { name: "ביצים גדולות", emoji: "🥚", unit: "pcs" },
    { name: "ביצים קטנות", emoji: "🥚", unit: "pcs" },
    { name: "ביצי חופש", emoji: "🥚", unit: "pcs" }
  ],
  oliveOil: [
    { name: "שמן זית", emoji: "🫒", unit: "l" },
    { name: "שמן זית כתית", emoji: "🫒", unit: "l" },
    { name: "שמן חמניות", emoji: "🌻", unit: "l" }
  ],
  disposables: [
    { name: "כוסות פלסטיק", emoji: "🥤", unit: "pack" },
    { name: "צלחות חד פעמי", emoji: "🍽️", unit: "pack" },
    { name: "מפיות", emoji: "🧻", unit: "pack" },
    { name: "שקיות", emoji: "🛍️", unit: "pack" }
  ],
  desserts: [
    { name: "עוגת שוקולד", emoji: "🍰", unit: "pcs" },
    { name: "גלידה", emoji: "🍦", unit: "l" },
    { name: "פירות קצופים", emoji: "🍓", unit: "pcs" },
    { name: "עוגיות", emoji: "🍪", unit: "pcs" }
  ],
  juices: [
    { name: "מיץ תפוזים", emoji: "🧃", unit: "l" },
    { name: "מיץ תפוחים", emoji: "🧃", unit: "l" },
    { name: "מיץ ענבים", emoji: "🧃", unit: "l" },
    { name: "לימונדה", emoji: "🍋", unit: "l" }
  ]
};

// Categories list for validation
export const CATEGORY_LIST = ['vegetables', 'fruits', 'meats', 'fish', 'dairy', 'alcohol', 'eggs', 'oliveOil', 'disposables', 'desserts', 'juices'];

// Helper function to format supplier categories as a list with emojis
export const formatCategoryList = (excludeCategories: string[] = []): string => {
  return CATEGORY_LIST
    .filter(id => !excludeCategories.includes(id))
    .map((id, index) => {
      const { name, emoji } = CATEGORIES_DICT[id];
      return `${index + 1}. ${emoji} ${name}`;
    })
    .join('\n');
};

// Helper function to get available categories excluding already selected ones
export const getAvailableCategories = (excludeCategories: string[] = []): Array<{name: string, id: string}> => {
  return CATEGORY_LIST
    .filter(id => !excludeCategories.includes(id))
    .map(id => {
      const { name, emoji } = CATEGORIES_DICT[id];
      return { name: `${emoji} ${name}`, id };
    });
};

// Helper function to get products for multiple categories
export const getProductsForCategories = (categories: SupplierCategory[]): Array<Partial<Product>> => {
  return categories.flatMap(category => 
    (CATEGORY_PRODUCTS[category] || []).map(product => ({
      name: product.name,
      emoji: product.emoji,
      unit: product.unit,
    }))
  );
};

// Helper function to format products as WhatsApp options, excluding already selected ones
export const formatProductOptions = (categories: SupplierCategory[], excludeProducts: string[] = []): Array<{name: string, id: string}> => {
  const products = getProductsForCategories(categories);
  const filteredProducts = products.filter(product => 
    !excludeProducts.some(excluded => excluded === product.name)
  );
  
  return filteredProducts.map((product, index) => ({
    name: `${product.emoji} ${product.name} (${product.unit})`,
    id: `${product.name}, ${product.unit}`
  }));
};


/**
 * Main state machine messages mapping
 * Each key corresponds to a value from BotState enum
 */
export const STATE_MESSAGES: Record<BotState, StateObject> = {
  // Initial state
  "INIT": {
    whatsappTemplate: {
      id: "init_template",
      type: "list",
      body: `🍽️ *ברוכים הבאים ל P-VOT, מערכת ניהול המלאי וההזמנות!*
      \n\n
      בחר מה ברצונך לעשות:`,
      options: [
        { name: "רישום מסעדה חדשה", id: "new_restaurant" },
        { name: "עזרה והסבר", id: "help" }
      ]
    },
    description: "Initial greeting when a new user contacts the bot. Offers basic navigation options.",
    nextState: {
      new_restaurant: "ONBOARDING_COMPANY_NAME",
      help: "IDLE"
    }
  },
  
  // === ONBOARDING FLOW STATES === //
  
  "ONBOARDING_COMPANY_NAME": {
    message: `📄 *תהליך הרשמה למערכת*
    \n\n
    מהו השם החוקי של העסק או החברה שלך?`,
    description: "Ask for the legal company name as the first step of onboarding.",
    validator: restaurantLegalNameSchema,
    callback: (context, data) => {
      context.companyName = data;
    },
    nextState: {
      ok: "ONBOARDING_LEGAL_ID"
    }
  },
  
  "ONBOARDING_LEGAL_ID": {
    message: `📝 מצוין! כעת הזן את מספר ח.פ/עוסק מורשה של העסק.`,
    description: "Ask for the business registration number (9 digits).",
    validator: restaurantLegalIdSchema,
    callback: (context, data) => {
      context.legalId = data;
    },
    nextState: {
      ok: "ONBOARDING_RESTAURANT_NAME"
    }
  },
  
  "ONBOARDING_RESTAURANT_NAME": {
    message: "🍽️ מהו השם המסחרי של המסעדה? (השם שהלקוחות מכירים)",
    description: "Ask for the restaurant's commercial name (may differ from legal name).",
    validator: restaurantNameSchema,
    callback: (context, data) => {
      context.restaurantName = data;
    },
    nextState: {
      ok: "ONBOARDING_CONTACT_NAME"
    }
  },
  
  "ONBOARDING_CONTACT_NAME": {
    message: "👤 מה השם המלא שלך? (איש קשר ראשי)",
    description: "Ask for the primary contact person's full name.",
    validator: nameSchema,
    callback: (context, data) => {
      context.contactName = data;
    },
    nextState: {
      ok: "ONBOARDING_CONTACT_EMAIL"
    }
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
    validator: emailSchema,
    callback: (context, data) => {
      context.contactEmail = data;
    },
    nextState: {
      ok: "ONBOARDING_PAYMENT_METHOD",
      skip: "ONBOARDING_PAYMENT_METHOD"
    }
  },
  
  "ONBOARDING_PAYMENT_METHOD": {
    whatsappTemplate: {
      id: "payment_options_template",
      type: "button",
      body: `💳 *בחר שיטת תשלום:*
      \n\n
      המערכת זמינה בתשלום חודשי. בחר את האופציה המועדפת עליך:`,
      options: [
        { name: "כרטיס אשראי", id: "credit_card" },
        { name: "התחל ניסיון", id: "trial" }
      ]
    },
    description: "Prompt user to select a payment method for the subscription.",
    nextState: {
      credit_card: "WAITING_FOR_PAYMENT",
      trial: "SETUP_SUPPLIERS_START"
    },
    action: 'CREATE_RESTAURANT'
  },
  
  "WAITING_FOR_PAYMENT": {
    message: `⏳ *בהמתנה לאישור תשלום*
    \n\n
    ניתן לשלם בקישור הבא:
    \n\n
    {paymentLink} 
    \n\n
    לאחר השלמת התשלום, נמשיך בהגדרת המערכת.`,
    description: "Wait for payment confirmation before proceeding with setup."
  },
  
  // === SUPPLIER SETUP STATES === //
  
  "SETUP_SUPPLIERS_START": {
    whatsappTemplate: {
      id: "supplier_setup_start_template",
      type: "button",
      body: `🚚 *הגדרת ספקים ומוצרים*
      \n\n
      כעת נגדיר את הספקים שעובדים עם המסעדה שלך. זה יעזור למערכת לנהל את המלאי, לתזכר אותך ולשלוח הזמנות לספק באופן אוטומטי.
      \n\n
      מוכנים להתחיל?`,
      options: [
        { name: "כן, בואו נתחיל ✨", id: "start_supplier" },
        { name: "לא כרגע", id: "postpone" }
      ]
    },
    description: "Initial prompt to begin supplier setup process.",
    nextState: {
      start_supplier: "SUPPLIER_CATEGORY"
    }
  },

  "SETUP_SUPPLIERS_ADDITIONAL": {
    whatsappTemplate: {
      id: "supplier_setup_additional_template",
      type: "button",
      body: "🏪 *האם יש עוד ספקים שתרצו להגדיר?*",
      options: [
        { name: "הגדרת ספק נוסף", id: "add_supplier" },
        { name: "לא כרגע", id: "finished" }
      ]
    },
    description: "Ask for more suppliers to be added after the initial setup.",
    nextState: {
      add_supplier: "SUPPLIER_CATEGORY",
      finished: "RESTAURANT_FINISHED"
    }
  },

  "RESTAURANT_FINISHED": {
    whatsappTemplate: {
      id: "restaurant_finished_template",
      type: "text",
      body: `🎉 *הגדרת המסעדה {restaurantName} הושלמה!*
      \n\n
      תודה על שהקדשתם זמן להגדיר את המסעדה שלכם. כעת תוכלו להתחיל להשתמש במערכת לניהול המלאי וההזמנות שלכם.`,
    },
    description: "Final message indicating the restaurant setup is complete."
  },

  "SUPPLIER_CATEGORY": {
    whatsappTemplate: {
      id: "supplier_category_template",
      type: "list",
      body: `🚚 *הגדרת ספק חדש למסעדה*
      \n\n
      בחרו את הקטגוריות המתאימות לספק זה, לסיום הגדרת הקטגוריות, לחצו על "סיום הגדרת קטגוריות".
      \n\n
      💡 במידה והספק אחראי על יותר מקטגוריה אחת, ניתן לבחור מספר קטגוריות`,
      options: [
        // Will be dynamically populated with categories options, deducting already selected categories
       { name: "סיום הגדרת קטגוריות ✅", id: "finished" }
      ]
    },
    description: "list to select one or more supplier categories from available list.",
    validator: supplierCategorySchema,
    callback: (context, data) => {
      context.supplierCategories = context.supplierCategories ? [...context.supplierCategories, data] : [data];
    },
    nextState: {
      finished: "SUPPLIER_CONTACT"
    }
  },

  "SUPPLIER_CONTACT": {
    message: `👤 *מה שם ומספר הוואטסאפ של הספק?*
    \n\nלדוגמה: ירקות השדה, 
    0501234567`,
    description: "Ask for the supplier's name and phone number.",
    aiValidation: {
      prompt: "עליך לשאול את המשתמש מה השם ומספר הוואטסאפ של הספק הנוכחי.",
      schema: SupplierSchema.pick({ name: true, whatsapp: true })
    },
    validator: SupplierSchema.pick({ name: true, whatsapp: true }),
    callback: (context, data) => {
      context.supplierName = data.name;
      context.supplierWhatsapp = data.whatsapp;
    },
    nextState: {
      ok: "SUPPLIER_REMINDERS"
    }
  },
  
  "SUPPLIER_REMINDERS": {
    whatsappTemplate: {
      id: "supplier_reminders_template",
      type: "list",
      body: `📅 *כעת נגדיר את הזמנים בהם תרצה לקבל תזכורות לבצע הזמנה מהספק*
      \n\n
      יש לבחור בזמנים מהרשימה *או* לכתוב יום ושעה עגולה שבה אתה נוהג לחדש הזמנה מהספק
      \n\n
      לדוגמה: יום שני וחמישי ב14`,
      options: [
        { name: "ראשון, 12:00", id: "sun, 12:00" },
        { name: "שני, 12:00", id: "mon, 12:00" },
        { name: "שלישי, 12:00", id: "tue, 12:00" },
        { name: "רביעי, 12:00", id: "wed, 12:00" },
        { name: "חמישי, 12:00", id: "thu, 12:00" },
        { name: "שישי, 10:00", id: "fri, 10:00" },
        { name: "שבת, 10:00", id: "sat, 10:00" },
        { name: "סיום בחירה", id: "finished" }
      ]
    },
    description: "Select which days of the week this supplier delivers goods.",
    validator: SupplierSchema.pick({ reminders: true }),
    aiValidation: {
      prompt: "עליך לבקש מהמשתמש לבחור את הימים והשעות בהם הוא מעוניין לקבל תזכורות לבצע הזמנה מהספק הנוכחי.",
      schema: SupplierSchema.pick({ reminders: true })
    },
    callback: (context, data) => {
      context.supplierReminders = data.reminders;
    },
    nextState: {
      finished: "PRODUCTS_LIST",
      ok: "PRODUCTS_LIST"
    }
  },

  "PRODUCTS_LIST": {
    whatsappTemplate: {
      id: "supplier_products_template",
      type: "list",
      body: `🏷️ נגדיר עכשיו את רשימת המוצרים שאתה מזמין מהספק ואת pcs המידה שלהם
      \n\n
      בחרו מתוך הרשימה המוצעת או כיתבו בצורה ברורה את רשימת המוצרים המלאה שאתם מזמינים מהספק ואת pcs המידה שלהם
      \n
      לדוגמה:
      \n
      ק"ג: 🍅 עגבניות שרי, 🥒 מלפפון, 🧅 בצל, 🥕 גזר
      \n
      יח': 🥬 חסה, 🌿 פטרוזיליה`,
      options: [
        // Will be dynamically populated with products references from the supplier's categories, deducting already selected products
        {name: "סיום בחירת מוצרים", id: "finished" }
      ]
        
    },
    description: "Select products from the list or enter a custom product name and units in order to create full products list from the supplier.",
    aiValidation: {
      prompt: "עליך לבקש מהמשתמש לבחור, לרשום בכל דרך שיבחר רשימה של מוצרים וpcs המידה שלהם שאותם ניתן להזמין מהספק, אם נתונים על מוצר מסויים חסרים, השלם אותם לפי הסבירות הגבוהה ביותר.",
      schema: ProductSchema.pick({ name: true, unit: true, emoji: true })
    },
    validator: ProductSchema.pick({ name: true, unit: true, emoji: true }),
    callback: (context, data) => {
      context.supplierProducts = context.supplierProducts ? [...context.supplierProducts, data] : [data];
    },
    nextState: {
      ok: "PRODUCTS_BASE_QTY"
    }
  },


  "PRODUCTS_BASE_QTY": {
    whatsappTemplate: {
      id: "supplieder_products_base_qty_template",
      type: "list",
      body: `📦 *הגדרת מצבת בסיס למוצרים*
      \n\n
      כדי שנוכל ליעל את תהליך ההזמנה, נגדיר כמות בסיס לכל מוצר. כמות זו תעזור לנו לחשב את ההזמנה המומלצת שלך אוטומטית.
      \n\n
      עבור כל מוצר, הזן את הכמות הבסיסית הנדרשת למסעדה לאמצע שבוע, ואת הכמות הנדרשת לסוף שבוע בפורמט: [שם מוצר] - [כמות אמצע שבוע], [כמות סוף שבוע].
      \n\n
      לדוגמה:
      \n
      עגבניות- 15, 20
      \n
      מלפפון- 10, 15
      \n
      חסה- 5, 10`,
      options: [] // Will be dynamically populated with the pre-defined products
    },
    description: "Iterate over the defined products and ask for their base quantity in the specified unit, for midweek and for weekend.",
    aiValidation: {
      prompt: "עליך לבקש מהמשתמש להזין את הכמות הבסיסית הנדרשת ליחידה אחת של כל מוצר ברשימה, עבור כל מוצר יש להזין כמות בסיס לשימוש באמצע השבוע ובסוף השבוע.",
      schema: z.array(ProductSchema)
    },
    validator: z.array(ProductSchema),
    callback: (context, data) => {
      context.supplierProducts = data;
    },
    action: 'CREATE_SUPPLIER',
    nextState: {
      ok: "SETUP_SUPPLIERS_ADDITIONAL"
    }
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
    // validator: "selection"
  },
  
  "INVENTORY_SNAPSHOT_QTY": {
    message: "📊 *כמה {productName} יש במלאי כרגע?*\n\nהזן כמות בpcs {unit}:",
    description: "Ask for current stock quantity of the selected product.",
    validationMessage: "❌ אנא הזן מספר תקין גדול או שווה ל-0.",
    // validator: "number"
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
    message: "🔢 *כמה {productName} התקבלו בפועל?*\n\nהזן את הכמות שהתקבלה בpcs {unit}:",
    description: "Ask for the actual received quantity of a partially received item.",
    validationMessage: "❌ אנא הזן מספר תקין גדול או שווה ל-0 וקטן מהכמות שהוזמנה.",
    // validator: "number"
  },
  
  "DELIVERY_INVOICE_PHOTO": {
    message: "📸 *צילום חשבונית*\n\nאנא צלם את החשבונית שקיבלת מהספק ושלח את התמונה כאן.\n\nהתמונה תישמר במערכת לצורך מעקב והתחשבנות.",
    description: "Request a photo of the invoice for record-keeping.",
    validationMessage: "❌ לא התקבלה תמונה תקינה. אנא שלח תמונה של החשבונית.",
    // validator: "photo"
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
    "vegetables", "fish", "alcohol", "meats", "fruits", 
    "oliveOil", "disposables", "desserts", "juices", "eggs"
  ],

  showPaymentLink: true, // Show payment link after registration

  paymentLink: 'https://payment.example.com/restaurant/',
  skipPaymentCoupon: 'try14', // Coupon to skip payment
  
  // Payment options
  paymentMethods: ["creditCard", "googlePay"],
  
  };
