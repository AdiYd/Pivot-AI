import { z } from 'zod';
import { emailSchema, nameSchema, ProductSchema, restaurantLegalIdSchema, restaurantLegalNameSchema, restaurantNameSchema, SupplierSchema } from './schemas';
import { BotConfig,  Conversation, Product, StateObject, StateReducerResult, SupplierCategory } from './types';



// Supplier categories with emoji representation
export const CATEGORIES_DICT: Record<string, Pick<Product, 'name' | 'emoji'>> = {
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

// Helper object to get days of the week in Hebrew
export const WEEKDAYS_DICT: Record<string, string> = {
  sun: 'ראשון',
  mon: 'שני',
  tue: 'שלישי',
  wed: 'רביעי',
  thu: 'חמישי',
  fri: 'שישי',
  sat: 'שבת'
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

// Bot categories with emoji representation
export const getCategoryName = (key: string): string => {
  return CATEGORIES_DICT[key] ? `${CATEGORIES_DICT[key].name} ${CATEGORIES_DICT[key].emoji}` : key;
};


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
export const stateObject: (conversation: Conversation, result?: StateReducerResult) => StateObject = (conversation, result) => {
  const { currentState } = conversation;
  let stateObject: StateObject;
  try {
    switch (currentState) {
      // Initial state
      case "INIT": {
        stateObject = {
          whatsappTemplate: {
            id: "init_template",
            type: "button",
            body: `🍽️ *ברוכים הבאים ל ✨ P-vot ✨, מערכת ניהול המלאי וההזמנות!*
            בכמה צעדים פשוטים נרשום את המסעדה שלך ונגדיר את הספקים והזמנות המומלצות עבורך.
            בחר מה ברצונך לעשות:`,
            options: [
              { name: "📋 רישום מסעדה חדשה", id: "new_restaurant" },
            ...(conversation.context.isSimulator && [{ name: "⚡ רישום מסעדה מהיר (סימולטור)", id: "new_restaurant_fast" }]),
              { name: "❓ עזרה והסבר", id: "help" }
            ]
          },
          description: "Initial greeting when a new user contacts the bot. Offers basic navigation options.",
          nextState: {
            new_restaurant: "ONBOARDING_COMPANY_NAME",
            new_restaurant_fast: "ONBOARDING_SIMULATOR",
            help: "IDLE"
          }
        };
        break;
      }
      
      // === ONBOARDING FLOW STATES === //
      
      case "ONBOARDING_COMPANY_NAME": {
        stateObject = {
          message: `📄 *תהליך הרשמה למערכת*
          מהו השם החוקי של העסק או החברה שלך? (השם שיופיע בחשבוניות)`,
          description: "Ask for the legal company name as the first step of onboarding.",
          validator: restaurantLegalNameSchema,
          callback: (context, data) => {
            context.companyName = data;
          },
          nextState: {
            success: "ONBOARDING_LEGAL_ID"
          }
        };
        break;
      }
      
      case "ONBOARDING_LEGAL_ID": {
        stateObject = {
          message: `📝 מצוין! כעת הזן את מספר ח.פ/עוסק מורשה של העסק.`,
          description: "Ask for the business registration number (9 digits).",
          validator: restaurantLegalIdSchema,
          callback: (context, data) => {
            context.legalId = data;
          },
          nextState: {
            success: "ONBOARDING_RESTAURANT_NAME"
          }
        };
        break;
      }
      
      case "ONBOARDING_RESTAURANT_NAME": {
        stateObject = {
          message: "🍽️ מהו השם המסחרי של המסעדה? (השם שהלקוחות מכירים)",
          description: "Ask for the restaurant's commercial name (may differ from legal name).",
          validator: restaurantNameSchema,
          callback: (context, data) => {
            context.restaurantName = data;
          },
          nextState: {
            success: "ONBOARDING_CONTACT_NAME"
          }
        };
        break;
      }
      
      case "ONBOARDING_CONTACT_NAME": {
        stateObject = {
          message: "👤 מה השם המלא שלך? (איש קשר ראשי)",
          description: "Ask for the primary contact person's full name.",
          validator: nameSchema,
          callback: (context, data) => {
            context.contactName = data;
          },
          nextState: {
            success: "ONBOARDING_CONTACT_EMAIL"
          }
        };
        break;
      }
      
      case "ONBOARDING_CONTACT_EMAIL": {
        stateObject = {
          whatsappTemplate: {
            id: "contact_email_template",
            type: "button",
            body: "📧 מה כתובת האימייל שלך? (אופציונלי - לחץ 'דלג' להמשך)",
            options: [
              { name: "דלג", id: "skip" } // Option to skip email input
            ]
          },
          description: "Ask for contact email (optional, can be skipped with 'דלג').",
          validator: emailSchema,
          callback: (context, data) => {
            if (!data || data === "skip") {
              return; // Skip email input
            }
            context.contactEmail = data;
          },
          nextState: {
            success: "ONBOARDING_PAYMENT_METHOD",
            skip: "ONBOARDING_PAYMENT_METHOD"
          }
        };
        break;
      }
      
      case "ONBOARDING_PAYMENT_METHOD": {
        stateObject = {
          whatsappTemplate: {
            id: "payment_options_template",
            type: "list",
            body: `💳 *בחר שיטת תשלום*
            המערכת זמינה בתשלום חודשי. בחר את האופציה המועדפת עליך:`,
            options: [
              ...(conversation.context?.isSimulator !== true ? [{ name: "כרטיס אשראי", id: "credit_card" }] : []),
              { name: "התחל ניסיון", id: "trial" }
            ]
          },
          description: "Prompt user to select a payment method for the subscription.",
          callback: (context, data) => {
            console.log(`[StateReducer] Setting payment method: ${data}`);
            context.paymentMethod = data;
          },
          nextState: {
            credit_card: "WAITING_FOR_PAYMENT",
            trial: "SETUP_SUPPLIERS_START"
          },
          action: 'CREATE_RESTAURANT'
        };
        break;
      }

      case "ONBOARDING_SIMULATOR": {
        const randomNum = Math.floor(Math.random() * 1000); // Generate a random number for simulator
        const randomLegalId = `${Math.floor(Math.random() * 900000000) + 100000000}`; // Generate a random 9-digit legal ID
        const restaurantName = `מסעדה_#${randomNum}`; // Random restaurant name for simulator
        const contactName = `ישראל ישראלי`; // Generic contact name for simulator
        const contactEmail = `demo${randomNum}@example.com`; // Generic email based on restaurant name

        stateObject = {
          whatsappTemplate: {
            id: "simulator_template",
            type: "button",
            body: `⚡ *ברוכים הבאים לסימולטור P-vot!*
            זהו תהליך מהיר לרישום מסעדה חדשה עם הגדרות בסיסיות.
            פרטי המסעדה החדשה הם:
            *שם המסעדה*: ${restaurantName}
            *מספר ח.פ*: ${randomLegalId}
            *איש קשר*: ${contactName}
            *אימייל*: ${contactEmail}

            שים לב, לא ניתן לשנות פרטים אלה.
            האם אתה מוכן להתחיל?`,
            options: [
              { name: "כן", id: "start_simulator" },
              { name: "לא, אני מעדיף רישום רגיל", id: "regular_registration" }
            ]
          },
          callback: (context, data) => {
            context.companyName = restaurantName;
            context.legalId = randomLegalId;
            context.restaurantName = restaurantName;
            context.contactName = contactName;
            context.contactEmail = contactEmail;
          },
          description: "Prompt user to start the simulator for quick restaurant setup.",
          nextState: {
            start_simulator: "ONBOARDING_PAYMENT_METHOD",
            regular_registration: "ONBOARDING_COMPANY_NAME"
          },
          
        };
        break;
      }
      
      case "WAITING_FOR_PAYMENT": {
        stateObject = {
          message: `⏳ *בהמתנה לאישור תשלום*
          ניתן לשלם בקישור הבא:
          {paymentLink} 
          לאחר השלמת התשלום, נמשיך בהגדרת המערכת.`,
          description: "Wait for payment confirmation before proceeding with setup."
        };
        break;
      }
      
      // === SUPPLIER SETUP STATES === //
      
      case "SETUP_SUPPLIERS_START": {
        stateObject = {
          whatsappTemplate: {
            id: "supplier_setup_start_template",
            type: "button",
            body: `🚚 *הגדרת ספקים ומוצרים*
            כעת נגדיר את הספקים שעובדים עם המסעדה שלך. זה יעזור למערכת לנהל את המלאי, לתזכר אותך ולשלוח הזמנות לספק באופן אוטומטי.
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
        };
        break;
      }

      case "SETUP_SUPPLIERS_ADDITIONAL": {
        stateObject = {
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
          callback: (context, data) => {
            context.suppliersList =
            [...(context.suppliersList || []), {
              name: context.supplierName,
              whatsapp: context.supplierWhatsapp,
              categories: context.supplierCategories,
              reminders: context.supplierReminders,
              products: context.supplierProducts
            }]
            delete context.supplierName;
            delete context.supplierWhatsapp;
            delete context.supplierCategories;
            delete context.supplierProducts;
            delete context.supplierReminders;
            delete context.dataToApprove; // Clear any pending approval data
          },
          nextState: {
            add_supplier: "SUPPLIER_CATEGORY",
            finished: "RESTAURANT_FINISHED"
          }
        };
        break;
      }

      case "RESTAURANT_FINISHED": {
        stateObject = {
          whatsappTemplate: {
            id: "restaurant_finished_template",
            type: "text",
            body: `🎉 *הגדרת המסעדה {restaurantName} הושלמה!*
            תודה על שהקדשתם זמן להגדיר את המסעדה שלכם. כעת תוכלו להתחיל להשתמש במערכת לניהול המלאי וההזמנות שלכם.`,
          },
          description: "Final message indicating the restaurant setup is complete.",
          callback: (context, data) => {
            if (context.dataToApprove) {
              delete context.dataToApprove;
            }
          },
        };
        break;
      }

      case "SUPPLIER_CATEGORY": {
        stateObject = {
          whatsappTemplate: {
            id: "supplier_category_template",
            type: "list",
            body: `🚚 *הגדרת ספק חדש למסעדה*
            בחרו קטגוריה לספק זה מתוך האפשרויות , *או* כתבו את שם הקטגוריה.

            💡 במידה והספק אחראי על יותר מקטגוריה אחת, ניתן לכתוב מספר קטגוריות מופרדות בפסיק`,
            options: [
              // Will be dynamically populated with categories options, deducting already selected categories
            ...Object.entries(CATEGORIES_DICT).map(([id, name]) => ({ id, name: `${name.name}  ${name.emoji}` }))
            ]
          },
          description: "list to select one or more supplier categories from available list or write a new category.",
          aiValidation: {
            prompt: "עליך לבקש מהמשתמש לבחור קטגוריה (או כמה קטגוריות) לספק הנוכחי מתוך רשימת הקטגוריות המוצעות או לכתוב קטגוריה חדשה.",
            schema: SupplierSchema.pick({ category: true })
          },
          validator: SupplierSchema.pick({ category: true }),
          callback: (context, data) => {
            context.supplierCategories = data.category || [];
          },
          nextState: {
            user_confirmed: "SUPPLIER_CONTACT"
          }
        };
        break;
      }

      case "SUPPLIER_CONTACT": {
        stateObject = {
          message: `👤 *מה שם ומספר הוואטסאפ של הספק?*
          
          לדוגמה: ירקות השדה, 0501234567`,
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
            user_confirmed: "SUPPLIER_REMINDERS"
          }
        };
        break;
      }
      
      case "SUPPLIER_REMINDERS": {
        stateObject = {
          whatsappTemplate: {
            id: "supplier_reminders_template",
            type: "list",
            body: `📅 *כעת נגדיר את הזמנים בהם תרצה לקבל תזכורות לבצע הזמנה מהספק*
            אפשר לבחור מהזמנים המוצעים ברשימה
            *או* לכתוב ימים ושעה עגולה שבה אתה נוהג לחדש הזמנה מהספק

            לדוגמה: יום שני וחמישי ב14`,
            options: [
              { name: "ראשון וחמישי ב-11:00", id: "ראשון וחמישי ב-11:00" },
              { name: "שני ושישי ב-10:00", id: "שני ושישי ב-10:00" },
              { name: "כל יום ב-12:00", id: "כל יום ב-12:00" },
            ]
          },
          description: "Select which days of the week this supplier delivers goods.",
          validator: SupplierSchema.pick({ reminders: true }),
          aiValidation: {
            prompt: "עליך לבקש מהמשתמש לבחור את הימים והשעות בהם הוא מעוניין לקבל תזכורות לבצע הזמנה מהספק הנוכחי. אם מבקשים שעה לר ברורה, יש להניח שעה עגולה (למשל 10:00). ובנוסף לא ניתן להגדיר יותר מתזכורת אחת בכל יום",
            schema: SupplierSchema.pick({ reminders: true })
          },
          callback: (context, data) => {
            context.supplierReminders = data.reminders;
          },
          nextState: {
            user_confirmed: "PRODUCTS_LIST",
          }
        };
        break;
      }

      case "PRODUCTS_LIST": {
        stateObject = {
          description: "Select products from supplier with their units of measurement.",
          message: `📋 *הגדרת מוצרים מהספק*

          🔹 רשמו את רשימת המוצרים ויחידות המידה שלהם:
          
          📝 *לדוגמה:*
          ק"ג: עגבניות, מלפפון, בצל 
          יח': חסה, כרוב, פלפל
          ארגז: תפוחים, בננות`,
          aiValidation: {
            prompt: `עליך לעזור למשתמש לרשום רשימת מוצרים ויחידות מידה מהספק. השלם פרטים חסרים לפי הסביר ביותר.
            אם לא צוינו יחידות מידה, הנח יחידות סטנדרטיות למוצר.
            הנחה את המשתמש להשתמש רק ביחידות תקניות (ק"ג, גרם, ליטר, יח', ארגז) או "אחר".`,
            schema: z.array(ProductSchema.pick({ name: true, unit: true, emoji: true }))
          },
          validator: z.array(ProductSchema.pick({ name: true, unit: true, emoji: true })),
          callback: (context, data) => {
            context.supplierProducts = context.supplierProducts ? [...context.supplierProducts, ...data] : [...data];
          },
          nextState: {
            user_confirmed: "PRODUCTS_BASE_QTY"
          }
        };
        break;
      }


      case "PRODUCTS_BASE_QTY": {
        stateObject = {
          message:  `📦 *הגדרת מצבת בסיס למוצרים*
            כדי שנוכל ליעל את תהליך ההזמנה, נגדיר כמות בסיס לכל מוצר. כמות זו תעזור לנו לחשב את ההזמנה המומלצת שלך אוטומטית.
            עבור כל מוצר, הזן את הכמות הבסיסית הנדרשת למסעדה לאמצע שבוע, ואת הכמות הנדרשת לסוף שבוע בפורמט:
            *[שם מוצר] - [כמות אמצע שבוע], [כמות סוף שבוע]*
            
            לדוגמה:
            עגבניות - 15, 20
            מלפפון - 10, 15
            חסה - 5, 10`,
          description: "Iterate over the defined products and ask for their base quantity in the specified unit, for midweek and for weekend.",
          aiValidation: {
            prompt: "עליך לבקש מהמשתמש להזין את הכמות הבסיסית הנדרשת ליחידה אחת של כל מוצר ברשימה, עבור כל מוצר יש להזין כמות בסיס לשימוש באמצע השבוע ובסוף השבוע.",
            schema: z.array(ProductSchema)
          },
          validator: z.array(ProductSchema),
          callback: (context, data) => {
            context.supplierProducts = data;
            if (context.dataToApprove) {
              delete context.dataToApprove;
            }
          },
          action: 'CREATE_SUPPLIER',
          nextState: {
            user_confirmed: "SETUP_SUPPLIERS_ADDITIONAL"
          }
        };
        break;
      }
      
      
      // === INVENTORY SNAPSHOT STATES === //
      
      case "INVENTORY_SNAPSHOT_START": {
        stateObject = {
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
        };
        break;
      }
      
      case "INVENTORY_SNAPSHOT_CATEGORY": {
        stateObject = {
          whatsappTemplate: {
            id: "TEMPLATE_SNAPSHOT_CATEGORY",
            type: "list",
            body: "🔍 *בחר קטגוריה לעדכון מלאי*\n\nבחר את הקטגוריה שברצונך לעדכן:",
            options: [] // Will be dynamically populated with actual categories
          },
          description: "Select which category of products to update inventory for.",
          validationMessage: "❌ אנא בחר קטגוריה תקינה מהרשימה."
        };
        break;
      }
      
      case "INVENTORY_SNAPSHOT_PRODUCT": {
        stateObject = {
          message: "📋 *עדכון מלאי - {categoryName}*\n\nהמוצרים בקטגוריה זו:\n{productList}\n\nבחר מספר מוצר או הקלד 'הבא' למוצר הבא:",
          description: "Show products in selected category and prompt user to choose one to update.",
          validationMessage: "❌ אנא בחר מספר מוצר תקין מהרשימה או הקלד 'הבא'.",
          // validator: "selection"
        };
        break;
      }
      
      case "INVENTORY_SNAPSHOT_QTY": {
        stateObject = {
          message: "📊 *כמה {productName} יש במלאי כרגע?*\n\nהזן כמות בpcs {unit}:",
          description: "Ask for current stock quantity of the selected product.",
          validationMessage: "❌ אנא הזן מספר תקין גדול או שווה ל-0.",
          // validator: "number"
        };
        break;
      }
      
      case "INVENTORY_CALCULATE_SNAPSHOT": {
        stateObject = {
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
        };
        break;
      }
      
      // === ORDER MANAGEMENT STATES === //
      
      case "ORDER_SETUP_START": {
        stateObject = {
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
        };
        break;
      }
      
      case "ORDER_CONFIRMATION": {
        stateObject = {
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
        };
        break;
      }
      
      case "DELIVERY_START": {
        stateObject = {
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
        };
        break;
      }
      
      case "DELIVERY_CHECK_ITEM": {
        stateObject = {
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
        };
        break;
      }
      
      case "DELIVERY_RECEIVED_AMOUNT": {
        stateObject = {
          message: "🔢 *כמה {productName} התקבלו בפועל?*\n\nהזן את הכמות שהתקבלה בpcs {unit}:",
          description: "Ask for the actual received quantity of a partially received item.",
          validationMessage: "❌ אנא הזן מספר תקין גדול או שווה ל-0 וקטן מהכמות שהוזמנה.",
          // validator: "number"
        };
        break;
      }
      
      case "DELIVERY_INVOICE_PHOTO": {
        stateObject = {
          message: "📸 *צילום חשבונית*\n\nאנא צלם את החשבונית שקיבלת מהספק ושלח את התמונה כאן.\n\nהתמונה תישמר במערכת לצורך מעקב והתחשבנות.",
          description: "Request a photo of the invoice for record-keeping.",
          validationMessage: "❌ לא התקבלה תמונה תקינה. אנא שלח תמונה של החשבונית.",
          // validator: "photo"
        };
        break;
      }
      
      // === IDLE STATE === //
      
      case "IDLE": {
        stateObject = {
          whatsappTemplate: {
            id: "TEMPLATE_IDLE_MENU",
            type: "list",
            body: "👋 *שלום {contactName}!*\n\nמה תרצה לעשות היום?\n\nבחר אחת מהאפשרויות:",
            options: [
              { name: "🛒 יצירת הזמנה חדשה", id: "create_order" },
              { name: "🏪 נתוני מסעדה", id: "restaurant_data" },
              { name: "📊 נתוני הזמנות", id: "order_data" },
              { name: "🚚 הוספת/עריכת ספק חדש", id: "add_supplier" },
              { name: "❓ שאלות ותמיכה", id: "help" }
            ]
          },
          description: "Main menu shown when the user is not in any active flow.",
          nextState:{
            // create_order: "ORDER_SETUP_START",
            add_supplier: "SUPPLIER_CATEGORY",
            // restaurant_data: "RESTAURANT_FINISHED", // Assuming this shows restaurant data
            // order_data: "ORDER_SETUP_START", // Assuming this shows order data
            help: "IDLE" // Redirect to help state or show help message
          }
        };
        break;
      }
      default: {
        throw new Error(`Unhandled state: ${currentState}`);
      }
    }
  } catch (error) {
    // return default state object for unhandled states
    stateObject = {
      message: `⚠️ *שגיאה במערכת*\n\nנראה שיש בעיה במערכת. אנא נסה שוב מאוחר יותר או פנה לתמיכה.`,
      description: "An error occurred while processing the state.",
      nextState: {
        success: "IDLE" // Redirect to idle state on error
        }
    };
    console.error(`Error in state ${currentState}:`, error);
  }
  return stateObject;
}

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
