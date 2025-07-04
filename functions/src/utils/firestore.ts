import { z } from 'zod';
import * as admin from 'firebase-admin';
import {SupplierSchema, ConversationSchema, MessageSchema, RestaurantSchema} from '../schema/schemas';
import { Conversation, Supplier,SupplierCategory, Restaurant, Contact, Message, ContactMap } from '../schema/types';
import { FieldValue, DocumentReference } from 'firebase-admin/firestore';

// CRITICAL: This ensures functions running in emulator connect to production Firestore
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  console.log('🔄 Functions running in emulator but connecting to PRODUCTION Firestore');
  
  // Make sure we DON'T connect to any Firestore emulator
  delete process.env.FIRESTORE_EMULATOR_HOST;
}


if (!admin.apps?.length) {
  admin.initializeApp();
}
export const firestore = admin.firestore();
// Enable ignoreUndefinedProperties to handle undefined fields gracefully
firestore.settings({
  ignoreUndefinedProperties: true
});
console.log(`[Firestore] Initialized Firestore with project ID: ${firestore.databaseId}`);

export type BaseName = 'restaurants' | 'orders' | 'conversations';

type AIModel = {
  model: string;
  temperature: number;
  max_tokens: number;
}


interface AIPrompt {
  name: string;        // Descriptive Hebrew name for client reference
  prompt: string;      // The actual prompt text
  description: string; // Short description summarizing purpose
}

interface AIConfigurationsInterface {
  params: AIModel;     // Model parameters
  prompts: {
    [key: string]: AIPrompt;  // Dictionary of prompts
  }
}


const ai_models: AIModel = {
  model: "gpt-4o",
  temperature: 0.2, // Lower temperature for more predictable, structured output
  max_tokens: 3000,
}


const AI_CONFIGURATIONS_FALLBACK: AIConfigurationsInterface = {
  params: ai_models,
  prompts: {
    productsListValidation: {
      name: "וידוא רשימת מוצרים",
      prompt: `עליך לעזור למשתמש לרשום רשימת מוצרים ויחידות מידה מהספק. השלם פרטים חסרים לפי הסביר ביותר.
אם לא צוונו יחידות מידה, הנח יחידות סטנדרטיות למוצר.
הנחה את המשתמש להעדיף להשתמש ביחידות תקניות, לדוגמה:
ק"ג (ולא קילוגרם), גרם, פחית, בקבוק, חבית, ליטר, יח', חבילה, ארגז, שקית, קופסה וכו'. או "אחר".
יש לאסוף ולהציג נתונים על המוצרים (שם ולידו אימוג'י) ויחידות המידה שלהם בלבד! אם הלקוח שיתף מידע נוסף (למשל כמויות), יש להתעלם ממנו בשלב זה.
את התשובה יש להחזיר בצורה ברורה ותמיד לכלול את שם המוצר, האימוג'י שלו והיחידות שלו.`,
      description: "הנחיות לאיסוף רשימת מוצרים ויחידות מידה מספק"
    },
    menuOptionsPrompt: {
      name: "אפשרויות תפריט",
      prompt: `**** אפשרויות תפריט ****
למערכת יש תפריט ראשי (יש להקליד "תפריט" על מנת להגיע אליו בכל שלב) ובו יכולת לספק מידע באופן הבא בלבד:
1.באפשרות של "יצירת הזמנה" - ניתן לקבל קישור ולבצע ספירת מלאי ולאחר מכן הזמנה
2.באפשרות "הוספת ספק" (האפשרות קיימת לבעלי החשבון בלבד ולא לכל אנשי הקשר השייכים למסעדה) - ניתן להגדיר ספקים חדשים למסעדה
3.באפשרות "נתוני מסעדה" ניתן לצפות ולשאול שאלות על נתוני המסעדה, ספקים, מוצרים, אנשי קשר וכו'
4.באפשרות "נתוני הזמנות" ניתן לצפות ולשאול שאלות על ההזמנות האחרונות של המסעדה
5.באפשרות "שאלות ועזרה" - ניתן לקבל תשובות לשאלות כלליות על המערכת, תהליך ההרשמה, יצירת הזמנות, ניהול מלאי, ספקים ועוד.

בכל שאלה אחרת, בקשות מיוחדות, בקשות שאינן במסגרת התפריט, או רצון לשנות, לערוך או למחוק מידע מעבר לזה הניתן בתפריט - יש להפנות את הלקוח אל בעלי הממשק בהודעה הבאה:
*******************
כאן ניתן לצפות בנתונים ולבצע פעולות מסוימות, על מנת לבצע שינויים בנתוני בסיס ניתן לפנות למנהל הממשק:
*לידור זינו*,  0547513346
או במייל: lidor.zenou@gmail.com
*******************`,
      description: "הסבר על אפשרויות התפריט הראשי ואיך להפנות לקוחות בבקשות מיוחדות"
    },
    ordersDataContext: {
      name: "ניתוח נתוני הזמנות",
      description: "הגדרת הקשר לניתוח נתוני הזמנות",
      prompt: `You're analyzing the restaurant order data including order history, statuses, and performance metrics. 
For each order id in the restaurant orders list - you can re-direct the client to the full document at: https://pivot.webly.digital/orders/\${orderId}`
    },
    restaurantDataContext: {
      name: "ניתוח נתוני מסעדה",
      description: "הגדרת הקשר לניתוח נתוני מסעדה",
      prompt: `You're analyzing the restaurant data including details about the restaurant, its contacts, orders, suppliers, and products.
 For each order id in the restaurant orders list - you can re-direct the client to the full document at: https://pivot.webly.digital/orders/\${orderId}`
    },
    systemCorePrompt: {
      name: "הגדרת מערכת בסיסית",
      description: "הגדרות מערכת ליבה שמגדירות את התנהגות הצ'אטבוט ומטרותיו",
      prompt: `אתה סוכן חכם ויעיל בעל אפליקציה לבעלי מסעדות, תפקידך לנהל מערכת צ'אטבוט לניהול הזמנות ומלאי.
תפקידך הוא לעזור לבעל המסעדה ולעובדיו לנהל את ההזמנות והמלאי בצורה היעילה ביותר.
עליך להבין את ההקשר של השיחה ולספק תשובות מדויקות ומועילות.
עליך להבין, לעבד ולנתח את ההודעה של המשתמש ולספק תשובות מובנות אך ורק על המערכת.
עליך להציג נתונים בצורה ברורה, ויזואלית ומעניינת.
      
שם האפליקציה: P-vot
תיאור האפליקציה: מערכת ניהול הזמנות ומלאי מתקדמת לבעלי מסעדות מבוססת בינה מלאכותית המחברת בין ספקים למסעדות
קהל היעד: בעלי מסעדות ועובדיהם המנהלים את ההזמנות והמלאי.

****   חשוב    ****
כל שאלה שאינה במסגרת המערכת, רישום פרטי המסעדה, הספקים, המוצרים וכו'. או שאינה נוגעת להזמנות או למלאי או לנתוני המסעדה, יש להחזיר תשובה קצרה וסגורה בסגנון
'תפקידי לעזור בכל מה שקשור ל P-vot, האם יש לך שאלות לגבי המערכת?'

אין לענות על שאלות שאינן קשורות למערכת או לשלבי ההרשמה ואינן במסגרת תפקידך
      
תמיד השב בשפה העברית, אלא אם המשתמש ביקש אחרת.
*******************

תכונות עיקריות:
1. ניהול הזמנות: אפשרות ליצור, לעדכן ולנהל הזמנות מספקים.
2. חיבור בין מסעדן לרשת הספקים בצורה אחידה, אוטומטית וחכמה דרך הווצאפ
      
### הוראות למערכת ###
בכל שלב שבו תתבקש, תקבל את הודעות המשתמש יחד עם תיאור השלב ומה נדרש ממך לעשות.
לרוב, תצטרך לעבור על ההודעה של המשתמש, להבין ולעבד אותה ולספק תשובה מובנית או לבצע פעולה במערכת.
עליך לוודא שהתשובה שלך תואמת למבנה הנתונים שניתן לך או ליצור טקסט מובנה אחר בהתאם לדרישות השלב ולהשלים את הנתונים ביחד עם הודעת המשתמש.
עליך תמיד לספק את התשובה הסבירה והקרובה ביותר בהתאם למידע שניתן לך, השתמש בידע מתחום המסעדות כדי להעריך בצורה חכמה את הצרכים והרצונות של המשתמש.
המטרה שלך היא תמיד לייצר בהירות, סדר וקישורים בין הנתונים השונים במערכת ודרישות הלקוח.
יש לענות בטון חברי ומכבד, מקצועי וחביב, עם מעט הומור כאשר זה מתאים ותמיד רצון לעזור ולטפל. בנוסף יש לשמור על שפה פשוטה וברורה, משפטים קצרים ושפה מקצועית בתחום המסעדות והספקים.`
    },
    dataVisualizationInstructions: {
      name: "הנחיות להצגת נתונים",
      description: "הנחיות לאופן הצגת הנתונים באופן ויזואלי וברור בפלטפורמת וואטסאפ",
      prompt: `### הנחיות לניתוח והצגת נתונים ###
אתה אנליסט נתונים מומחה ובעל ידע רחב בתחום המסעדנות. תפקידך לנתח, להסביר ולהציג את הנתונים בצורה ברורה, מדויקת ואסתטית.

1. בכל תשובה, נתח את הנתונים באופן מעמיק ומדויק. חלץ תובנות רלוונטיות מהנתונים הגולמיים.
      
2. הצג את הנתונים בצורה ויזואלית ברורה, באמצעות:
- סימני פיסוק וסמלים (אמוג'י) לחלוקה והדגשה
- רווחים וסידור חזותי נכון
- כותרות וחלוקה לקטגוריות
- טבלאות טקסטואליות ( באמצעות סימני | ,- ,+ )
- רשימות מוגדרות בכוכביות או מספרים
- הדגשות טקסט ( *מודגש* )
- טקסט נטוי ( _נטוי_ )
- קווים תחתונים להפרדה ( ─────────── )
- קטעי קוד טקסטואליים ( \`איזור קוד טקסט\` )
      
3. התאם את הפורמט לפלטפורמת וואטסאפ - הודעות קצרות אך מקיפות, מחולקות לחלקים קריאים.

4. אם השאלה אינה ברורה מספיק, הנחה בעדינות את המשתמש לחדד את שאלתו. הצע אפשרויות ספציפיות.
      
5. תמיד הסק מסקנות ותובנות עסקיות מהנתונים. הדגש מגמות, חריגים, או נקודות מעניינות.
      
6. שמור על שפה מקצועית, חברותית וברורה. הימנע מז'רגון מיותר.

ניתן להשתמש בכלים הבאים לעיצוב ויזואלי ברור ומושך:
• סמלים רלוונטיים 📊 📈 💰 🥩 🍅 🧾 לפי הנושא
• כוכביות וסימני פריטים: *•◦-
• הפרדת מקטעים עם קווים או סמלים: ───────────
• שימוש במרווחים להיררכיה ברורה
• הדגשות בולטות למספרים או נתונים חשובים
      
בסיום הניתוח, שאל אם יש עוד מידע שהמשתמש מעוניין לדעת. סמן את השיחה כמסתיימת רק אם המשתמש ציין במפורש שהוא קיבל את כל המידע הנדרש, או הודה לך והביע רצון לסיים.`
    },
    helpMenu: {
      name: "תפריט עזרה",
      description: "הנחיות ושאלות נפוצות למשתמשים רשומים",
      prompt: `🔹 *תפריט עזרה – מדריך למשתמשי המערכת*

  ברוכים הבאים ל-P-vot – מערכת ניהול מלאי והזמנות חכמה למסעדות, הכל דרך WhatsApp!

  *מה אפשר לעשות כאן?*
  1. *יצירת הזמנה חדשה*: בצעו ספירת מלאי, קבלו המלצה לכמויות, ושלחו הזמנה לספק בלחיצת כפתור.
  2. *הוספת ספק חדש*: הגדירו ספקים, ימי אספקה, שעת חיתוך והוסיפו מוצרים ופרטי קשר.
  3. *צפייה בנתוני מסעדה*: קבלו מידע על אנשי קשר, ספקים, מוצרים, והיסטוריית הזמנות.
  4. *צפייה בנתוני הזמנות*: בדקו סטטוס הזמנות, חוסרים, תיעוד אספקות וקבלות.
  5. *שאלות ותמיכה*: קבלו תשובות לשאלות נפוצות, הסברים על תהליכים, וטיפים לשימוש יעיל.

  *איך זה עובד?*
  - שלחו "תפריט" בכל שלב כדי לחזור לתפריט הראשי.
  - כל פעולה תלווה בהנחיה ברורה – פשוט ענו להודעה או בחרו באופציה.
  - ניתן להעלות תמונות חשבוניות, לדווח על חוסרים, ולבצע שינויים בפרטי ספקים ומוצרים.

  *הערות חשובות:*
  - פעולות ניהול (הוספת ספק/מוצר) זמינות רק לבעלי הרשאות מתאימות.
  - לכל שאלה או בקשה מיוחדת, ניתן לפנות לתמיכה: לידור זינו 054-7513346 | lidor.zenou@gmail.com

  *המשיכו לנהל את המסעדה בקלות וביעילות!* 🍽️
  `
  },
    interestedMenu: {
      name: "תפריט התעניינות",
      description: "הנחיות למשתמשים שעדיין לא רשומים ומעוניינים במידע נוסף",
      prompt: `
    ✨ *הכירו את P-vot – הדרך החכמה לנהל מסעדה ב-WhatsApp!* ✨

    דמיינו שכל ניהול ההזמנות, המלאי והספקים שלכם מתבצע בשיחה פשוטה – בלי אפליקציות מסובכות, בלי טבלאות, הכל מהנייד.

    *מה P-vot עושה בשבילכם?*
    - מאפשר רישום מהיר של המסעדה (3 דקות ואתם בפנים!)
    - מגדיר ספקים, מוצרים וימי אספקה – בהתאמה אישית
    - מזכיר לכם לבצע הזמנות בזמן, מחשב חוסרים ומציע כמויות אופטימליות
    - שולח הזמנות לספקים ומנהל אישורים – הכל אוטומטי
    - מתעד אספקות, חוסרים וחשבוניות – כולל העלאת תמונות
    - מספק דוחות וסטטיסטיקות בלחיצת כפתור

    *למה זה כדאי?*
    - חוסך זמן, טעויות וניירת
    - הכל מרוכז במקום אחד – WhatsApp
    - מתאים לכל גודל מסעדה, ללא צורך בידע טכני
    - תמיכה אישית בעברית

    *רוצים לגלות עוד?*
    שלחו "התחל" או "רישום" – ותנו לנו להראות לכם כמה זה פשוט!

    *P-vot – כי הגיע הזמן לנהל מסעדה כמו שצריך!* 🚀
    `
    },

  productsBaseQtyValidation: {
    name: "וידוא מצבת בסיס",
    prompt: "עליך לבקש מהמשתמש להזין את הכמות הבסיסית הנדרשת ליחידה אחת של כל מוצר ברשימה, עבור כל מוצר יש להזין כמות בסיס לשימוש באמצע השבוע ובסוף השבוע.",
    description: "הנחיות לאיסוף ווידוא של מצבת בסיס"
  }
  }
};



export const getAIConfigurations = async (): Promise<AIConfigurationsInterface> => {
  // Fetch AI configurations from Firestore or return fallback
  const doc = await firestore.collection('ai_config').doc('default').get();
  if (doc.exists) {
    return doc.data() as AIConfigurationsInterface;
  }
  console.log(`[Firestore] No AI configurations found, using fallback`);
  return AI_CONFIGURATIONS_FALLBACK;
};

export const uploadAIConfigurations = async (): Promise<void> => {
  // Upload AI configurations to Firestore
  await firestore.collection('ai_config').doc('default').set(AI_CONFIGURATIONS_FALLBACK);
  console.log(`[Firestore] Uploaded AI configurations:`, AI_CONFIGURATIONS_FALLBACK);
};


// Helper function to get collection name based on simulator mode
export function getCollectionName(baseName: BaseName, isSimulator: boolean = false): string {
  return isSimulator ? `${baseName}_simulator` : baseName;
}


// ==== RESTAURANT OPERATIONS ====

/**
 * Create a new restaurant
 * @param data Restaurant data
 * @param isSimulator Whether to use simulator collections
 * @returns The ID of the created restaurant
 */
export async function createRestaurant(data: Restaurant, isSimulator: boolean = false): Promise<string> {
  console.log(`[Firestore] Creating restaurant${isSimulator ? ' (simulator)' : ''}:`, {
    legalId: data.legalId,
    legalName: data.legalName,
    name: data.name
  });

  try {
    // Create the restaurant document
    let restaurantDoc: Restaurant = {
      legalId: data.legalId,
      legalName: data.legalName,
      name: data.name,
      isActivated: false,
      contacts: data.contacts as ContactMap, // Ensure contacts are typed correctly
      payment:  {
        provider: "trial",
        status: false,
      },
      suppliers: [],
      orders: [],
      createdAt: FieldValue.serverTimestamp(),
    };
    restaurantDoc = RestaurantSchema.parse(restaurantDoc); // Validate with Zod schema
    // Use the correct collection based on simulator mode
    const collectionName = getCollectionName('restaurants', isSimulator);
    
    // Use the legalId as the restaurant document ID
    await firestore.collection(collectionName).doc(data.legalId).set(restaurantDoc);
    
    console.log(`[Firestore] ✅ Restaurant "${data.name}" created successfully with ID ${data.legalId}`);
    return data.legalId;
  } catch (error) {
    console.error(`[Firestore] ❌ Error creating restaurant:`, error);
    throw new Error(`Failed to create restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a restaurant by ID (legalId)
 * @param restaurantId Restaurant ID (legalId)
 * @param isSimulator Whether to use simulator collections
 * @returns Restaurant data or null if not found
 */
export async function getRestaurant(restaurantId: Restaurant['legalId'], isSimulator: boolean = false): Promise<Restaurant | null> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const doc = await firestore.collection(collectionName).doc(restaurantId).get();
    
    if (!doc.exists) {
      console.log(`[Firestore] No restaurant found with ID: ${restaurantId}`);
      return null;
    }
    
    return doc.data() as Restaurant;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting restaurant:`, error);
    throw new Error(`Failed to get restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a restaurant by phone number (of any signed contact)
 * @param phone Phone number
 * @param isSimulator Whether to use simulator collections
 * @returns Restaurant reference and data or null if not found
 */
export async function getRestaurantByPhone(
  phone: Contact['whatsapp'], 
  isSimulator: boolean = false
): Promise<{id: string, data: Restaurant, ref: DocumentReference} | null> {
  try {
    console.log(`[Firestore] Looking up restaurant by phone: ${phone}`);
    
    const collectionName = getCollectionName('restaurants', isSimulator);
    const snapshot = await firestore
      .collection(collectionName)
      .where('contacts', 'array-contains', { whatsapp: phone })
      .limit(1)
      .get();
      
    if (snapshot.empty) {
      console.log(`[Firestore] No restaurant found for phone: ${phone}`);
      return null;
    }
    
    const doc = snapshot.docs[0];
    console.log(`[Firestore] ✅ Found restaurant ${doc.id} for phone: ${phone}`);
    
    return {
      id: doc.id,
      data: doc.data() as Restaurant,
      ref: doc.ref
    };
  } catch (error) {
    console.error(`[Firestore] ❌ Error looking up restaurant by phone:`, error);
    throw error;
  }
}


/**
 * Update restaurant activation status (both isActivated and payment status)
 * @param restaurantId Restaurant ID
 * @param isActivated Activation status
 */
export async function updateRestaurantActivation(restaurantId: Restaurant['legalId'], isActivated: boolean, isSimulator: boolean = false): Promise<void> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    await firestore.collection(collectionName).doc(restaurantId).update({
      isActivated,
      'payment.status': isActivated
    });
    
    console.log(`[Firestore] ✅ Updated restaurant ${restaurantId} activation: ${isActivated}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error updating restaurant activation:`, error);
    throw new Error(`Failed to update restaurant activation: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * Get all restaurants
 * @param isSimulator Whether to use simulator collections
 * @returns Array of restaurants
 */
export async function getAllRestaurants(isSimulator: boolean = false): Promise<Restaurant[]> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const snapshot = await firestore.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`[Firestore] No restaurants found`);
      return [];
    }
    
    return snapshot.docs.map(doc => doc.data() as Restaurant);
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting all restaurants:`, error);
    throw new Error(`Failed to get restaurants: ${error instanceof Error ? error.message : String(error)}`);
  }
}



/**
 * Update restaurant contacts
 * @param restaurantId Restaurant ID
 * @param contacts Array of contact objects
 * @returns Updated restaurant data
 */
export async function updateRestaurantContacts(
  restaurantId: Restaurant['legalId'], 
  contacts: Contact[], 
  isSimulator: boolean = false
): Promise<Restaurant | null> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const restaurantRef = firestore.collection(collectionName).doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`);
    }

    await restaurantRef.update({ contacts });

    console.log(`[Firestore] ✅ Updated contacts for restaurant ${restaurantId}`);
    return  restaurantDoc.data() as Restaurant || null;
  } catch (error) {
    console.error(`[Firestore] ❌ Error updating restaurant contacts:`, error);
    throw new Error(`Failed to update restaurant contacts: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// ==== SUPPLIER OPERATIONS ====

/**
 * Add or update supplier for a restaurant
 * @param data Supplier data
 * @returns The supplier ID (whatsapp number)
 */
export async function updateSupplier(
  data: Supplier & { restaurantId: Restaurant['legalId'] },  
  isSimulator: boolean = false
): Promise<string> {
  console.log(`[Firestore] Adding/updating supplier to restaurant${isSimulator ? ' (simulator)' : ''}:`, {
    restaurantId: data.restaurantId,
    name: data.name,
    whatsapp: data.whatsapp
  });

  try {
    // Use correct collection based on simulator mode
    const restaurantsCollection = getCollectionName('restaurants', isSimulator);
    
    // Check if restaurant exists
    const restaurantRef = firestore.collection(restaurantsCollection).doc(data.restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
      throw new Error(`Restaurant with ID ${data.restaurantId} not found`);
    }

    const restaurantData = restaurantDoc.data() as Restaurant;
    const currentSuppliers = restaurantData.suppliers || [];

    // Validate input data (exclude restaurantId from validation)
    const { restaurantId, ...supplierData } = data;
    const validData = SupplierSchema.parse(supplierData);
    
    // Check if supplier already exists by whatsapp number
    const existingSupplierIndex = currentSuppliers.findIndex(
      supplier => supplier.whatsapp === validData.whatsapp
    );

    let updatedSuppliers: Supplier[];
    const now = new Date(); // Use regular Date instead of FieldValue.serverTimestamp()

    
    if (existingSupplierIndex >= 0) {
      // Update existing supplier by merging data
      console.log(`[Firestore] Updating existing supplier at index ${existingSupplierIndex}`);
      
      updatedSuppliers = [...currentSuppliers];
      updatedSuppliers[existingSupplierIndex] = {
        ...currentSuppliers[existingSupplierIndex],
        ...validData,
        updatedAt: now,
        // Keep original createdAt if it exists
        createdAt: currentSuppliers[existingSupplierIndex].createdAt || now
      };
    } else {
      // Add new supplier to the array
      console.log(`[Firestore] Adding new supplier to suppliers array`);
      
      const newSupplier: Supplier = {
        ...validData,
        createdAt: now,
        updatedAt: now
      };
      
      updatedSuppliers = [...currentSuppliers, newSupplier];
    }

    // Update the restaurant document with the new suppliers array
    await restaurantRef.update({
      suppliers: updatedSuppliers,
      updatedAt: now
    });
    
    console.log(`[Firestore] ✅ Supplier "${validData.name}" ${existingSupplierIndex >= 0 ? 'updated' : 'created'} successfully`);
    return validData.whatsapp;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Firestore] ❌ Invalid supplier data:`, error.errors);
      throw new Error(`Invalid supplier data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    
    console.error(`[Firestore] ❌ Error updating supplier:`, error);
    throw error;
  }
}

/**
 * Get list of suppliers of a restaurant
 * @param restaurantId Restaurant ID
 * @param category Optional category to filter by
 * @returns Array of suppliers
 */
export async function getSuppliersByCategory(restaurantId: Restaurant['legalId'], category?: SupplierCategory, isSimulator: boolean = false): Promise<Supplier[]> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const restaurantDoc = await firestore.collection(collectionName).doc(restaurantId).get();
    
    if (!restaurantDoc.exists) {
      console.log(`[Firestore] Restaurant ${restaurantId} not found`);
      return [];
    }
    
    const restaurantData = restaurantDoc.data() as Restaurant;
    const suppliers = restaurantData.suppliers || [];
    
    // Filter by category if provided
    if (category) {
      return suppliers.filter(supplier => 
        supplier.category && supplier.category.includes(category)
      );
    }
    
    return suppliers;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting suppliers:`, error);
    throw new Error(`Failed to get suppliers: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a specific supplier by ID
 * @param restaurantId Restaurant ID
 * @param supplierId Supplier ID (whatsapp)
 * @returns Supplier data or null if not found
 */
export async function getSupplier(restaurantId: Restaurant['legalId'], supplierId: Contact['whatsapp'], isSimulator: boolean = false): Promise<Supplier | null> {
  try {
    const collectionName = getCollectionName('restaurants', isSimulator);
    const restaurantDoc = await firestore.collection(collectionName).doc(restaurantId).get();
    
    if (!restaurantDoc.exists) {
      console.log(`[Firestore] Restaurant ${restaurantId} not found`);
      return null;
    }
    
    const restaurantData = restaurantDoc.data() as Restaurant;
    const suppliers = restaurantData.suppliers || [];
    
    // Find supplier by whatsapp number
    const supplier = suppliers.find(supplier => supplier.whatsapp === supplierId);
    
    return supplier || null;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting supplier:`, error);
    throw new Error(`Failed to get supplier: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ==== PRODUCT OPERATIONS ====


// ==== ORDER OPERATIONS ====



// ==== INVENTORY SNAPSHOT OPERATIONS ====





// ==== CONVERSATION STATE MANAGEMENT ====

/**
 * Get conversation state by phone number
 * @param phone The phone number (without whatsapp: prefix)
 * @param isSimulator Whether to use simulator collections
 * @returns The conversation state or null if not found
 */
export async function getConversationState(
  phone: Contact['whatsapp'],
  isSimulator: boolean = false
): Promise<Conversation | null> {
  try {
    console.log(`[Firestore] Getting conversation state for phone: ${phone}`);
    
    const collectionName = getCollectionName('conversations', isSimulator);
    const doc = await firestore
      .collection(collectionName)
      .doc(phone)
      .get();
      
    if (!doc.exists) {
      console.log(`[Firestore] No conversation state found for phone: ${phone}`);
      return null;
    }
    
    const state = doc.data() as Conversation;
    const messagesSnapshot = await firestore
      .collection(collectionName)
      .doc(phone)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();
    const messages = messagesSnapshot.docs.map(msgDoc => MessageSchema.parse({
      ...msgDoc.data(),
    }));
    state.messages = messages; // Add messages to the state
    console.log(`[Firestore] ✅ Found conversation state for phone: ${phone}`, {
      currentState: state?.currentState,
      contextKeys: Object.keys(state?.context || {})
    });
    return state;
  } catch (error) {
    console.error(`[Firestore] ❌ Error getting conversation state:`, error);
    throw error;
  }
}

/**
 * Initialize a new conversation state for a phone number
 * @param phone Phone number without whatsapp prefix
 * @param restaurantId Restaurant ID
 * @param initialState Initial bot state
 * @param isSimulator Whether to use simulator collections
 * @returns The created conversation state
 */
export async function initializeConversationState(
  conversation: Conversation,
  phone: Contact['whatsapp'],
  isSimulator: boolean = false
): Promise<Omit<Conversation, 'messages'>> {
  try {
    console.log(`[Firestore] Initializing conversation state for phone: ${phone}`);
    
    // Use correct collections based on simulator mode
    const restaurantDoc = (await getRestaurantByPhone(phone, isSimulator))?.data;
    const restaurantId = restaurantDoc?.legalId || null;

    const conversationsCollection = getCollectionName('conversations', isSimulator);


    const newState = ConversationSchema.omit({ messages: true }).parse({...conversation, ...(restaurantId ? { restaurantId } : {})});
    await firestore
      .collection(conversationsCollection)
      .doc(phone)
      .set(newState, { merge: true });

    console.log(`[Firestore] ✅ Initialized conversation state for phone: ${phone}`);
    return newState;
  } catch (error) {
    console.error(`[Firestore] ❌ Error initializing conversation state:`, error);
    throw error;
  }
}



/**
 * Save conversation state using phone number as document ID
 * @param phone The phone number (without whatsapp: prefix)
 * @param state The conversation state to save
 * @param isSimulator Whether to use simulator collections
 */
export async function saveConversationState(
  phone: string, 
  state: Conversation,
  isSimulator: boolean = false
): Promise<void> {
  try {
    console.log(`[Firestore] Saving conversation state for phone: ${phone}`, {
      currentState: state.currentState,
      contextKeys: Object.keys(state.context || {})
    });
    
    // Use correct collections based on simulator mode
    // const restaurantsCollection = getCollectionName('restaurants', isSimulator);
    const conversationsCollection = getCollectionName('conversations', isSimulator);
    
    // Get restaurant reference if it doesn't exist in the update
    // let restaurantRef;
    // if (state.restaurantId) {
    //   restaurantRef = firestore.collection(restaurantsCollection).doc(state.restaurantId);
    // }
    
    await firestore
      .collection(conversationsCollection)
      .doc(phone)
      .set({
        ...state,
        updatedAt: FieldValue.serverTimestamp(),
      } as Conversation, { merge: true });
      
    console.log(`[Firestore] ✅ Conversation state saved for phone: ${phone}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error saving conversation state:`, error);
    throw error;
  }
}

/**
 * Log a message in the conversation history
 * @param phone The phone number
 * @param message The message content
 * @param direction 'incoming' or 'outgoing'
 * @param currentState The current bot state when message was processed
 * @param isSimulator Whether to use simulator collections
 */
export async function logMessage(
  phone: Contact['whatsapp'],
  message: Message,
  isSimulator: boolean = false
): Promise<void> {
  try {
    console.log(`[Firestore] Logging ${message.role} message for phone: ${phone}`);

    const conversationsCollection = getCollectionName('conversations', isSimulator);
    const finalMessage = MessageSchema.parse(message)
    console.log(`[Firestore] Writing message to ${conversationsCollection}/${phone}/messages...`, {
      message: message,
    });
    // Update the conversation document with the new message in the messages array
    // Add the message to the messages subcollection
    await firestore
      .collection(conversationsCollection)
      .doc(phone)
      .collection('messages')
      .add({
      ...finalMessage,
      createdAt: FieldValue.serverTimestamp(),
      });
    
    // Separately update the timestamp on the parent document
    await firestore
      .collection(conversationsCollection)
      .doc(phone)
      .update({
        updatedAt: FieldValue.serverTimestamp(),
      });

    console.log(`[Firestore] ✅ Message logged for phone: ${phone}`);
  } catch (error) {
    console.error(`[Firestore] ❌ Error logging message:`, error);
    // Don't throw - message logging shouldn't break the flow
  }
}


/**
 * Get comprehensive restaurant data for data analysis
 * @param restaurantId Restaurant ID (legalId)
 * @param isSimulator Whether to use simulator collections
 * @returns Consolidated restaurant data with suppliers
 */
export async function getRestaurantDatafromDb(
  restaurantId: string,
  isSimulator: boolean = false
): Promise<any> {
  try {
    console.log(`[Firestore] Fetching comprehensive restaurant data for ID: ${restaurantId}`);
    
    const collectionName = getCollectionName('restaurants', isSimulator);
    const restaurantDoc = await firestore.collection(collectionName).doc(restaurantId).get();
    
    if (!restaurantDoc.exists) {
      console.log(`[Firestore] No restaurant found with ID: ${restaurantId}`);
      throw new Error(`Restaurant not found: ${restaurantId}`);
    }
    
    const restaurantData = restaurantDoc.data();
    
    // Get all orders associated with this restaurant
    const ordersCollectionName = getCollectionName('orders', isSimulator);
    const ordersSnapshot = await firestore
      .collection(ordersCollectionName)
      .where('restaurant.legalId', '==', restaurantId)
      .orderBy('createdAt', 'desc')
      .limit(20) // Get most recent orders for statistics
      .get();
    
    const recentOrders = ordersSnapshot.docs.map(doc => doc.data());
    
    // Calculate order statistics
    const orderStats = {
      totalOrders: recentOrders.length,
      pendingOrders: recentOrders.filter(order => order.status === 'pending').length,
      confirmedOrders: recentOrders.filter(order => order.status === 'confirmed').length,
      deliveredOrders: recentOrders.filter(order => order.status === 'delivered').length,
      cancelledOrders: recentOrders.filter(order => order.status === 'cancelled').length,
      mostOrderedProducts: calculateMostOrderedProducts(recentOrders),
      recentOrderDate: recentOrders.length > 0 ? recentOrders[0].createdAt : null
    };
    
    // Get supplier counts
    const supplierCount = restaurantData?.suppliers?.length || 0;
    const productCount = restaurantData?.suppliers?.reduce((total: number, supplier: any) => 
      total + (supplier.products?.length || 0), 0) || 0;
    
    // Return comprehensive data object
    return {
      ...restaurantData,
      stats: {
        suppliersCount: supplierCount,
        productsCount: productCount,
        ...orderStats
      },
      recentOrders: recentOrders.slice(0, 5) // Include the 5 most recent orders
    };
  } catch (error) {
    console.error(`[Firestore] ❌ Error fetching restaurant data:`, error);
    return null;
  }
}

/**
 * Helper function to calculate most ordered products
 * @param orders Array of orders
 * @returns Object with product counts
 */
function calculateMostOrderedProducts(orders: any[]): Record<string, number> {
  const productCounts: Record<string, number> = {};
  
  orders.forEach(order => {
    (order.items || []).forEach((item: any) => {
      const key = item.name;
      productCounts[key] = (productCounts[key] || 0) + item.qty;
    });
  });
  
  return productCounts;
}

/**
 * Get orders data for a specific restaurant
 * @param restaurantId Restaurant ID (legalId)
 * @param isSimulator Whether to use simulator collections
 * @returns Orders data and statistics
 */
export async function getOrdersDatafromDb(
  restaurantId: string,
  isSimulator: boolean = false
): Promise<any> {
  try {
    console.log(`[Firestore] Fetching orders data for restaurant ID: ${restaurantId}`);
    
    const ordersCollectionName = getCollectionName('orders', isSimulator);
    const ordersSnapshot = await firestore
      .collection(ordersCollectionName)
      .where('restaurant.legalId', '==', restaurantId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    if (ordersSnapshot.empty) {
      console.log(`[Firestore] No orders found for restaurant ID: ${restaurantId}`);
      return { orders: [], stats: { totalOrders: 0 } };
    }
    
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    
    // Get restaurant details
    const restaurantCollectionName = getCollectionName('restaurants', isSimulator);
    const restaurantDoc = await firestore.collection(restaurantCollectionName).doc(restaurantId).get();
    const restaurantData = restaurantDoc.exists ? restaurantDoc.data() : null;
    
    // Calculate order statistics by supplier, status, and time trends
    const stats = {
      totalOrders: orders.length,
      ordersByStatus: calculateOrdersByStatus(orders),
      ordersBySupplier: calculateOrdersBySupplier(orders),
      ordersByMonth: calculateOrdersByMonth(orders),
      pendingOrders: orders.filter(order => order.status === 'pending').length,
      deliveredOrders: orders.filter(order => order.status === 'delivered').length,
      mostOrderedProducts: calculateProductRanking(orders),
      recentOrderDate: orders.length > 0 ? orders[0].createdAt : null
    };
    
    return {
      restaurant: restaurantData,
      orders,
      stats
    };
  } catch (error) {
    console.error(`[Firestore] ❌ Error fetching orders data:`, error);
    throw new Error(`Failed to fetch orders data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper function to calculate orders by status
 * @param orders Array of orders
 * @returns Object with counts by status
 */
function calculateOrdersByStatus(orders: any[]): Record<string, number> {
  const statusCounts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    sent: 0,
    delivered: 0,
    cancelled: 0
  };
  
  orders.forEach(order => {
    if (statusCounts.hasOwnProperty(order.status)) {
      statusCounts[order.status]++;
    }
  });
  
  return statusCounts;
}

/**
 * Helper function to calculate orders by supplier
 * @param orders Array of orders
 * @returns Object with counts by supplier
 */
function calculateOrdersBySupplier(orders: any[]): Record<string, number> {
  const supplierCounts: Record<string, number> = {};
  
  orders.forEach(order => {
    const supplierName = order.supplier?.name || 'Unknown';
    supplierCounts[supplierName] = (supplierCounts[supplierName] || 0) + 1;
  });
  
  return supplierCounts;
}

/**
 * Helper function to calculate orders by month
 * @param orders Array of orders
 * @returns Object with counts by month
 */
function calculateOrdersByMonth(orders: any[]): Record<string, number> {
  const monthCounts: Record<string, number> = {};
  
  orders.forEach(order => {
    if (order.createdAt) {
      // Convert Firebase timestamp to Date if needed
      const date = order.createdAt instanceof Date ? order.createdAt : 
                  (order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt));
      
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
    }
  });
  
  return monthCounts;
}

/**
 * Helper function to rank products by order frequency
 * @param orders Array of orders
 * @returns Array of products sorted by order frequency
 */
function calculateProductRanking(orders: any[]): {name: string, count: number, emoji: string}[] {
  const productCounts: Record<string, {count: number, emoji: string}> = {};
  
  orders.forEach(order => {
    (order.items || []).forEach((item: any) => {
      if (!productCounts[item.name]) {
        productCounts[item.name] = {count: 0, emoji: item.emoji || '📦'};
      }
      productCounts[item.name].count += item.qty || 1;
    });
  });
  
  // Convert to array and sort by count descending
  return Object.entries(productCounts)
    .map(([name, {count, emoji}]) => ({name, count, emoji}))
    .sort((a, b) => b.count - a.count);
}


/**
 * Creates a new order collection document and returns its ID
 * This is primarily used for generating snapshot/order links
 * 
 * @param conversation Current conversation with restaurant context
 * @param isSimulator Whether to use simulator collections
 * @returns The generated order collection ID
 */
export async function createOrderCollection(
  conversation: Conversation,
  isSimulator: boolean = false
): Promise<string> {
  try {
    console.log(`[Firestore] Creating new order collection${isSimulator ? ' (simulator)' : ''}`);
    
    // Get the restaurant ID from the conversation
    const restaurantId = conversation.restaurantId || conversation.context.legalId || conversation.context.restaurantId;
    
    if (!restaurantId) {
      throw new Error('Missing restaurant ID in conversation context');
    }
    
    // Get restaurant data to include in the order
    const restaurant = await getRestaurant(restaurantId, conversation.context?.isSimulator);
    if (!restaurant) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`);
    }
    
    // Determine which contact to use (the one from the conversation)
    const contactNumber = conversation.context.contactNumber;
    const contact = restaurant.contacts[contactNumber] || 
      Object.values(restaurant.contacts)[0]; // Fallback to first contact if specific one not found
    
    if (!contact) {
      throw new Error('No contact found for this conversation');
    }
    
    // Use the correct collection based on simulator mode
    const ordersCollection = getCollectionName('orders', isSimulator);
    
    
    // Create minimal order document with just the required fields
    const orderDoc = {
      restaurant: {
        legalId: restaurantId,
        name: restaurant.name,
        contact: {
          whatsapp: contact.whatsapp,
          name: contact.name,
          ...(contact.email && { email: contact.email })
        }
      },
      status: 'pending',
      items: [],
      midweek: true, // Default to midweek, will be updated later
      category: [], // Will be populated later
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    // Create the order document
    const orderRef = await firestore.collection(ordersCollection).add(orderDoc);
    const orderId = orderRef.id;

    // Add the order ID to the restaurant's orders array
    await firestore.collection(getCollectionName('restaurants', isSimulator))
      .doc(restaurantId)
      .update({
        orders: FieldValue.arrayUnion(orderId),
        updatedAt: FieldValue.serverTimestamp()
      });
    
    console.log(`[Firestore] ✅ Created order collection with ID: ${orderId}`);
    return orderId;
  } catch (error) {
    console.error(`[Firestore] ❌ Error creating order collection:`, error);
    throw new Error(`Failed to create order collection: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ==== SYSTEM CONFIGURATION ====
