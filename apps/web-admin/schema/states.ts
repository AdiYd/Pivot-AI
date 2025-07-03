import { z } from 'zod';
import { emailSchema, nameSchema, ProductSchema, restaurantLegalIdSchema, restaurantLegalNameSchema, restaurantNameSchema, SupplierSchema } from './schemas';
import {  Conversation,StateObject } from './types';

// Supplier categories for WhatsApp template (max 24 chars, 1 emoji, concise names)
export const CATEGORIES_DICT: Record<
  string,
  { name: string; example: string }
> = {
  fresh: {
    name: "ירקות ופירות 🥬🍅",
    example: `ק"ג: עגבניות, מלפפון\nיח': חסה, פטרוזיליה`
  },
  meat: {
    name: "בשר ועוף 🥩🍗",
    example: `ק"ג: אנטריקוט, טחון\nיח': קבב, שניצל, כרעיים`
  },
  fish: {
    name: "דגים וים 🐟🍣",
    example: `ק"ג: סלמון, לברק\nיח': פילה דג`
  },
  dairy: {
    name: "מוצרי חלב 🧀, ביצים 🥚",
    example: `ק"ג: גבינה צהובה\nליטר: חלב\nתבנית: ביצים`
  },
  bread: {
    name: "לחם ומאפייה 🍞🥯",
    example: `יח': לחמניות, חלה\nאריזה: פיתות`
  },
  dry_goods: {
    name: "מוצרי מזווה 🧂📦",
    example: `ק"ג: אורז, עדשים\nשקית: פסטה`
  },
  // spices: {
  //   name: "תבלינים 🌶️",
  //   example: `ק"ג: פפריקה, כמון\nשקית: תבלין גרוס`
  // },
  // oil: {
  //   name: "שמן 🌿",
  //   example: `ג'ריקן: שמן זית, שמן קנולה`
  // },
  // canned: {
  //   name: "שימורים 🥫",
  //   example: `קופסה: תירס, טונה\nפחית: רסק עגבניות`
  // },
  frozen: {
    name: "קפואים ❄️, קינוחים 🍰",
    example: `אריזה: פירה, ירקות קפואים`
  },
  alcohol: {
    name: "אלכוהול 🍷, משקאות 🥤",
    example: `בקבוק: יין, וודקה\nבקבוק: מים, קולה\nחבית: בירה`
  },
  disposables: {
    name: 'חד"פ 📦, נקיון 🧼',
    example: `אריזה: צלחות, כוסות, שקיות\nחבילה: סכו"ם, מגבונים לחים`
  },
  // cleaning: {
  //   name: "ניקיון ותחזוקה 🧼",
  //   example: `בקבוק: סבון כלים, מסיר שומנים\nאריזה: נייר סופג`
  // },
  packaging: {
    name: "ציוד 🛠️, תחזוקה ⚙️",
    example: `יחידות: מצקת נירוסטה, מגש הגשה\nיחדות: כוסות וויסקי, שייקר, פותחן`
  }
};

// Supplier categories with emoji representation
export const CATEGORIES_DICT_OLD: Record<string, { name: string; example: string }> = {
  freshProduce: {
    name: "תוצרת טרייה 🥬🍅",
    example: `ק"ג: עגבניות, מלפפון
יחידות: חסה
אריזה: נענע`
  },
  fishAndSea: {
    name: "דגים וים 🐟🍣",
    example: `ק"ג: פילה לברק, סלמון טרי
אריזות: סיגר דגים`
  },
  meatAndPoultry: {
    name: "בשר🥩, עוף 🍗",
    example: `ק"ג: חזה עוף, אנטריקוט
ארגזים: מינוט סטייק`
  },
  dairyEggsBread: {
    name: "מוצרי חלב 🧀, ביצים 🥚",
    example: `ק"ג: גבינת פרמזן
תבניות: ביצים
אריזות: לחמניות, לחם`
  },
  dryCannedSpices: {
    name: "יבשים 🫘, שימורים",
    example: `יחידות: רסק עגבניות
שקיות: פפריקה
אריזות: חומוס גרגרים`
  },
  frozenSemiReady: {
    name: "🥟 קפואים ❄️, חצי מוכנים",
    example: `ארגזים: פסטה טרייה קפואה
קופסאות: תירס גמדי
שקיות: פירה קפוא`
  },
  drinksAlcohol: {
    name: "משקאות 🥤, אלכוהול 🍷",
    example: `בקבוקים: ג’ק דניאלס
חביות: בירה ויינשטפן
ארגזים: קוקה קולה`
  },
  disposablesPackaging: {
    name: 'חד"פ 🍽️, אריזות 📦',
    example: `אריזות: קופסאות טייק אוויי, סכו\"ם חד פעמי
גלילים: שקיות ניילון`
  },
  cleaningMaintenance: {
    name: "🧼 חומרי ניקוי 🧽, תחזוקה",
    example: `בקבוקים: סבון כלים
ג’ריקנים: אקונומיקה
אריזות: נייר סופג`
  },
  operationalEquipment: {
    name: "🛠️ ציוד תפעולי ⚙️, כלים",
    example: `יחידות: מצקת נירוסטה, מגש הגשה
לפי סוג וגודל: גסטרונומים`
  }
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


// Categories list for validation
export const CATEGORY_LIST = ['vegetables', 'fruits', 'meats', 'fish', 'dairy', 'alcohol', 'eggs', 'oliveOil', 'disposables', 'desserts', 'juices'];

type RandomRestaurant = {
  legalId: string;
  restaurantName: string;
  contactName: string;
  contactEmail: string;
};

const getRandomRestaurant = (): RandomRestaurant => {
  const restaurantList = [
    { legalId : "123456789", restaurantName : "פיצה דליברו", contactName: "ישראל ישראלי", contactEmail: "israel@example.com"},
    { legalId : "987654321", restaurantName : "סושי אקספרס", contactName: "יוסי כהן", contactEmail: "yossi@example.com"},
    { legalId : "456789123", restaurantName : "המבורגר גולד", contactName: "מיכל לוי", contactEmail: "michal@example.com"},
    { legalId : "321654987", restaurantName : "טאפאס ספרדי", contactName: "דודו בן דוד", contactEmail: "dudu@example.com"},
    { legalId : "159753486", restaurantName : "פסטה פרש", contactName: "רונית ישראלי", contactEmail: "ronit@example.com"},
    { legalId : "753159486", restaurantName : "סלטים בריאים", contactName: "אורן כהן", contactEmail: "oren@example.com"},
    { legalId : "951753486", restaurantName : "בשרים על האש", contactName: "רוני לוי", contactEmail: "roni@example.com"},
    { legalId : "852963741", restaurantName : "קינוחים מתוקים", contactName: "טליה ישראלי", contactEmail: "talya@example.com"},
    { legalId : "369258147", restaurantName : "אוכל אסיאתי", contactName: "שי כהן", contactEmail: "shay@example.com"},
    { legalId : "147258369", restaurantName : "דגים ופירות ים", contactName: "אורי לוי", contactEmail: "uri@example.com"},
    { legalId : "258369147", restaurantName : "אוכל טבעוני", contactName: "נועה ישראלי", contactEmail: "noa@example.com"},
    { legalId : "369147258", restaurantName : "אוכל מזרחי", contactName: "מאור כהן", contactEmail: "maor@example.com"},
    { legalId : "741852963", restaurantName : "אוכל איטלקי", contactName: "אלון לוי", contactEmail: "alon@example.com"},
    { legalId : "852741963", restaurantName : "אוכל מקסיקני", contactName: "גלית ישראלי", contactEmail: "galit@example.com"},
    { legalId : "963852741", restaurantName : "אוכל הודית", contactName: "עדי כהן", contactEmail: "adi@example.com"}
  ]
  const randomIndex = Math.floor(Math.random() * restaurantList.length);
  return restaurantList[randomIndex];
}


/**
 * Main state machine messages mapping
 * Each key corresponds to a value from BotState enum
 */
export const stateObject: (conversation: Conversation) => StateObject = (conversation) => {
  const { currentState } = conversation;
  let stateObject: StateObject;
  try {
    switch (currentState) {
      // Initial state
      case "INIT": {
        const { restaurantName, legalId, contactName, contactEmail } = getRandomRestaurant();
        stateObject = {
          whatsappTemplate: {
            id: "init_template",
            sid: 'HX397f201cb42563786ffbba32d3838932',
            type: "button",
            body: `🍽️ *ברוכים הבאים ל ✨ P-vot ✨, מערכת ניהול מלאי והזמנות למסעדות!*
            בכמה צעדים פשוטים נרשום את המסעדה שלך ונגדיר את הספקים והמוצרים שלך (פעם אחת).
            לאחר מכן תוכל להתחיל לנהל את ההזמנות שלך מול הספקים בקלות וביעילות 😊.
            
            בחר מה ברצונך לעשות:`,
            options: [
              { name: "📋 רישום מסעדה חדשה", id: "new_restaurant" },
            ...(conversation.context?.isSimulator ? [{ name: "⚡ רישום מסעדה מהיר (סימולטור)", id: "new_restaurant_fast" }] : []),
              { name: "❓ שאלות והסבר", id: "help" }
            ]
          },
          description: "Initial greeting when a new user contacts the bot. Offers basic navigation options.",
          callback: (context, data) => {
            if (context.isSimulator) {
                context.companyName = restaurantName;
                context.legalId = legalId;
                context.restaurantName = restaurantName;
                context.contactName = contactName;
                context.contactEmail = contactEmail;
            }
          },
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
            sid: 'HX5cb05efffa2a9b02dafd21e0ffd0149e',
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
            sid: 'HX1762d8ffacc9ab97e825137a7a5e4c0c',
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

        stateObject = {
          whatsappTemplate: {
            id: "simulator_template",
            type: "button",
            body: `⚡ *ברוכים הבאים לסימולטור P-vot!*
            זהו תהליך מהיר לרישום מסעדה חדשה עם הגדרות בסיסיות.
            פרטי המסעדה החדשה הם:
            *שם המסעדה*: {restaurantName}
            *מספר ח.פ*: {legalId}
            *איש קשר*: {contactName}
            *אימייל*: {contactEmail}

            שים לב, לא ניתן לשנות פרטים אלה.
            האם אתה מוכן להתחיל?`,
            options: [
              { name: "כן", id: "start_simulator" },
              { name: "לא, אני מעדיף רישום רגיל", id: "regular_registration" }
            ]
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
          https://payment.example.com

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
            sid: 'HX8bd05f7fb3a9691fdcdda3aec675cd46',
            type: "button",
            body: `🚚 *הגדרת ספקים ומוצרים*
            כעת נגדיר את הספקים שעובדים עם המסעדה שלך. זה יעזור למערכת לנהל את המלאי, לתזכר אותך ולשלוח הזמנות לספק באופן אוטומטי.
            מוכנים להתחיל?`,
            options: [
              { name: "כן, בואו נתחיל ✨", id: "start_supplier" },
              // { name: "לא כרגע", id: "postpone" }
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
            sid: 'HX0ba222120174fc1dcea74419b842bdec',
            type: "button",
            body: "🚚 *האם יש עוד ספקים שתרצו להגדיר?*",
            options: [
              { name: "הגדרת ספק נוסף", id: "add_supplier" },
              { name: "סיום הגדרת ספקים", id: "finished" }
            ]
          },
          description: "Ask for more suppliers to be added after the initial setup.",
          callback: (context, data) => {
            context.suppliersList =
            [...(context.suppliersList || []), {
              name: context.supplierName,
              whatsapp: context.supplierWhatsapp,
              categories: context.supplierCategories,
              cutoff: context.supplierCutoff,
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
            sid: "HX86077bc9bc804d0f5dd176e164b41b88",
            type: "button",
            contentVariables:JSON.stringify({
              '1': conversation.context?.restaurantName.slice(0, 24) || 'שלך',
            }),
            options: [
              { name: "לצפייה בתפריט", id: "menu" }
            ],
            body: `🎉 *הגדרת המסעדה {restaurantName} הושלמה!*
            תודה על שהקדשתם זמן להגדיר את המסעדה שלכם. כעת תוכלו להתחיל להשתמש במערכת לניהול המלאי וההזמנות שלכם.
            כתבו "תפריט" כדי לראות את האפשרויות הזמינות`,
          },
          description: "Final message indicating the restaurant setup is complete.",
          callback: (context, data) => {
            if (context.dataToApprove) {
              delete context.dataToApprove;
            }
          },
          nextState: {
            success: "IDLE",
            menu: 'IDLE'
          }
        };
        break;
      }

      case "SUPPLIER_CATEGORY": {
        stateObject = {
          whatsappTemplate: {
            id: "supplier_category_template",
            sid: 'HX0c07d92e700b312744b4684c59fda1d1',
            type: "list",
            contentVariables: JSON.stringify({
              ...Object.entries(CATEGORIES_DICT)
              .slice(0, 10)
              .reduce((acc, [key, cat], idx) => {
                acc[(idx + 1).toString()] = cat.name.slice(0, 24);
                return acc;
              }, {} as Record<string, string>),
              // 10: "קטגוריה אחרת"
            }),
            body: `🚚 *הגדרת ספק חדש למסעדה*
      בחרו קטגוריה לספק זה מתוך האפשרויות

      אם הקטגוריה אינה מופיעה ברשימה - ניתן לכתוב אותה במילים.`,
            options: [
              ...Object.entries(CATEGORIES_DICT).map(([id, cat]) => ({
          id,
          name: cat.name
              })).slice(0, 10),
              {
                name: "קטגוריה אחרת",
                id: "קטגוריה אחרת"
              }
            ]
          },
          description: "list to select one or more supplier categories from available list.",
          validator: SupplierSchema.pick({ category: true }),
          callback: (context, data) => {
            context.supplierCategories = data.category || [];
          },
          nextState: {
            success: "SUPPLIER_CONTACT",
            ["קטגוריה אחרת"]: "SUPPLIER_CATEGORY2"
          }
        };
        break;
      }
      case "SUPPLIER_CATEGORY2": {
        stateObject = {
          whatsappTemplate: {
            id: "supplier_category_template",
            sid: 'HX0c07d92e700b312744b4684c59fda1d1',
            type: "list",
            contentVariables: JSON.stringify({
              ...Object.entries(CATEGORIES_DICT)
              .slice(9, 17)
              .reduce((acc, [key, cat], idx) => {
                acc[(idx + 1).toString()] = cat.name.slice(0, 24);
                return acc;
              }, {} as Record<string, string>),
            }),
            body: `🚚 *הגדרת ספק חדש למסעדה*
בחרו קטגוריה לספק זה מתוך האפשרויות

אם הקטגוריה אינה מופיעה ברשימה - ניתן לכתוב אותה במילים.
אם יש מספר קטגוריות, ניתן לכתוב אותם מופרדות בפסיק - למשל:
מוצרי חלב 🧀, ביצים 🥚, תבלינים 🌶️`,
            options: [
              ...Object.entries(CATEGORIES_DICT).map(([id, cat]) => ({
          id,
          name: cat.name
              })).slice(9,15)
            ]
          },
          description: "list to select one or more supplier categories from available list.",
          validator: SupplierSchema.pick({ category: true }),
          callback: (context, data) => {
            context.supplierCategories = data.category || [];
          },
          nextState: {
            success: "SUPPLIER_CONTACT",
          }
        };
        break;
      }

      case "SUPPLIER_CONTACT": {
        stateObject = {
          message: `👤 *מה שם ומספר הוואטסאפ של הספק?*
ניתן לשתף איש קשר בוואטסאפ או לכתוב את הפרטים כאן

לדוגמה: ירקות השדה, 0501234567`,
          description: "Ask for the supplier's name and phone number. If provided with country code or with dash ('-'), change to unified format 05XXXXXXXXX.",
          aiValidation: {
            prompt: "עליך לשאול את המשתמש מה השם ומספר הוואטסאפ של הספק הנוכחי. אם המספר כולל קידומת מדינה או מקף ('-'), יש לשנות אותו לפורמט אחיד 05XXXXXXXXX.",
            schema: SupplierSchema.pick({ name: true, whatsapp: true })
          },
          validator: SupplierSchema.pick({ name: true, whatsapp: true }),
          callback: (context, data) => {
            context.supplierName = data.name;
            context.supplierWhatsapp = data.whatsapp;
          },
          nextState: {
            user_confirmed: "SUPPLIER_CUTOFF"
          }
        };
        break;
      }
      
      case "SUPPLIER_CUTOFF": {
        stateObject = {
          whatsappTemplate: {
            id: "supplier_reminders_template",
            sid: "HX3b67c67b7191adee20289fd437a27fd4",
            contentVariables: JSON.stringify({
              '1': 'ראשון וחמישי ב 11:00',
              '2': 'שני ושישי ב 10:00',
              '3': 'כל יום ב 12:00'
            }),
            type: "list",
            body: `⏰ *הגדרת זמני סגירת הזמנות (CUT-OFF) של הספק*
            
            חשוב לנו לדעת מתי בדיוק הם זמני הסגירה האחרונים להזמנות אצל ספק זה.
            המערכת תשתמש במידע הזה כדי לתזכר אותך להזמין *לפני* שיהיה מאוחר מדי.
            
            אנא בחר מהאפשרויות או כתוב את ימי וזמני הסגירה המדויקים:
            
            לדוגמה: "יום שני וחמישי עד 14:00" או "ראשון 10:00"`,
            options: [
              { name: "ראשון וחמישי ב-11:00", id: "ראשון וחמישי ב-11:00" },
              { name: "שני ושישי ב-10:00", id: "שני ושישי ב-10:00" },
              { name: "כל יום ב-12:00", id: "כל יום ב-12:00" },
            ]
          },
          description: "Capture the supplier order cutoff times to properly schedule reminders before deadlines. You should collect the days and times when the supplier stops accepting orders. Reminders will be set based on this information.",
          validator: SupplierSchema.pick({ cutoff: true }),
          aiValidation: {
            prompt: "עליך לבקש מהמשתמש לציין את זמני הסגירה המדויקים (cut-off) של הספק - היום והשעה האחרונים שבהם ניתן לשלוח הזמנות. המערכת תשתמש במידע זה לתזכר את המשתמש לפני מועדי הסגירה. אם מציינים 'עד שעה מסוימת', יש להתייחס לזו כשעת הסגירה. לא ניתן להגדיר יותר מזמן סגירה אחד ביום.",
            schema: SupplierSchema.pick({ cutoff: true })
          },
          callback: (context, data) => {
            context.supplierCutoff = data.cutoff;
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
${Object.values(CATEGORIES_DICT).find((cat) => (cat.name.includes(conversation.context?.supplierCategories[0])))?.example.trim() || 
`ק"ג: עגבניות, מלפפון, בצל 
יח': חסה, כרוב, פלפל
ארגז: תפוחים, בננות`}`,
          aiValidation: {
            prompt: `עליך לעזור למשתמש לרשום רשימת מוצרים ויחידות מידה מהספק. השלם פרטים חסרים לפי הסביר ביותר.
            אם לא צוונו יחידות מידה, הנח יחידות סטנדרטיות למוצר.
            הנחה את המשתמש להעדיף להשתמש ביחידות תקניות (לדוגמה: ק"ג (ולא קילוגרם), גרם, פחית, בקבוק, חבית, ליטר, יח', חבילה, ארגז, שקית, קופסה וכו'.) או "אחר".
            יש לאסוף ולהציג נתונים על המוצרים (שם ולידו אימוג'י) ויחידות המידה שלהם בלבד! אם הלקוח שיתף מידע נוסף (למשל כמויות), יש להתעלם ממנו בשלב זה.
            את התשובה יש להחזיר בצורה ברורה ותמיד לכלול את שם המוצר, האימוג'י שלו והיחידות שלו.`,
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
כדי שנוכל ליעל את תהליך ההזמנה, נגדיר כמות בסיס לכל מוצר. כמות זו תעזור לנו לחשב את ההזמנה המומלצת שלך באופן אוטומטי.
עבור כל מוצר, הזן את הכמות הבסיסית הנדרשת למסעדה לאמצע שבוע, ואת הכמות הנדרשת לסוף שבוע

ניתן לפרט בכתב בצורה ברורה או להעתיק את הרשימה ולמלא כמויות בהתאם:`,

          message2: `${conversation.context.supplierProducts.map((product : any, index:number) => `- *${product.name}(${product.unit})*: `).join(`
אמצע שבוע - 
סוף שבוע -
-----------------
`)}
אמצע שבוע - 
סוף שבוע - 
`,
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
      
      
      // === INFO STATE === //

      case "RESTAURANT_INFO": {
        stateObject = {
          message: `🏪 *נתוני המסעדה שלך* 📊\n
📌 נשמח לעזור לך במידע על המסעדה שלך!\n
💬 אפשר לשאול:
▪️ שאלות כלליות על המסעדה
▪️ מידע על ספקים ומוצרים
▪️ נתוני הזמנות והיסטוריה\n
✨ *דוגמאות*:
"מי הספק של הירקות?"
"כמה הזמנות ביצעתי השבוע?"`,
          description: "Engage with the restaurant information (database). Ask anything about the restaurant, request visual or textual information, get reports and ask how to change data.",
        };
        break;
      }

      case "ORDERS_INFO": {
        stateObject = {
          message: `📊 *נתוני ההזמנות שלך* 🛒\n
📌 נשמח לעזור לך במידע על ההזמנות שביצעת!\n
💬 אפשר לשאול:
▪️ היסטוריית הזמנות
▪️ דוחות לפי ספקים
▪️ סיכום הזמנות חודשיות\n
✨ *דוגמאות*:
"כמה הזמנות ביצעתי השבוע?"
"כמה פריטים הזמנתי מהספק <שם הספק>?"
"מהי ההזמנה האחרונה שלי?"`,
          description: "Engage with the orders information (database). Ask anything about the orders, request visual or textual information, get reports and ask how to change data.",
        };
        break;
      }



      // === IDLE STATE === //
      
      case "IDLE": {
        stateObject = {
          whatsappTemplate: {
            id: "template_idle_menu",
            sid: 'HXc0ecb0654f70646086691d2dfc0d6ee3',
            contentVariables: JSON.stringify({
              '1': conversation.context?.contactName.split(" ")[0] || "",
              }),
            type: "list",
            body: "👋 *שלום {contactName}!*\n\nמה תרצה לעשות היום?\n\nבחר אחת מהאפשרויות:",
            options: [
              { name: "🛒 יצירת הזמנה חדשה", id: "create_order" },
              { name: "🚚 הוספת ספק חדש", id: "add_supplier" },
              { name: "🏪 נתוני מסעדה", id: "restaurant_data" },
              { name: "📊 נתוני הזמנות", id: "order_data" },
              { name: "❓ שאלות ותמיכה", id: "help" }
            ]
          },
          description: "Main menu shown when the user is not in any active flow.",
          callback: (context, data) => {
              delete context.supplierName;
              delete context.supplierWhatsapp;
              delete context.supplierCategories;
              delete context.supplierProducts;
              delete context.supplierReminders;
              delete context.dataToApprove; // Clear any pending approval data
          },
          nextState:{
            // create_order: "ORDER_SETUP_START",
            add_supplier: "SUPPLIER_CATEGORY",
            restaurant_data: "RESTAURANT_INFO", // Assuming this shows restaurant data
            order_data: "ORDERS_INFO",         // Assuming this shows order data
            help: "HELP" // Redirect to help state or show help message
          }
        };
        break;
      }

      case "HELP": {
        stateObject = {
          message: `❓ *איך אפשר לעזור לך?*\n\nאנא פרט את השאלה או הבעיה שלך ואנו נשמח לעזור.`,
          description: "User is seeking help or support.",
          nextState: {
            success: "IDLE", // Redirect to idle state on success
            ai_finished: "IDLE" // Redirect to idle state on AI finish
          }
        };
        break;
      }
      case "INTERESTED": {
        stateObject = {
          message: `💡 *נשמע שאתה מעוניין לשמוע עוד!*\n\n מה תרצה לשאול או לדעת?`,
          description: "User is expressing interest in a topic.",
          nextState: {
            success: "INIT", // Redirect to init state on success
            ai_finished: "INIT" // Redirect to init state on AI finish
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
