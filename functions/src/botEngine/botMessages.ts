import { BotConfig } from "./botMessages";

export { BotConfig } from "../schema/types";

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

/*
 * Centralized bot messages in Hebrew with typography
 * This object can be uploaded to Firestore for dynamic message management
 */
export const BOT_MESSAGES = {
  // 🚀 התצרפות - Onboarding Flow
  onboarding: {
    welcome: "🍽️ *ברוכים הבאים לבוט ניהול המלאי והזמנות!*\n\n✨ אני כאן לעזור לכם לנהל ספקים, מלאי והזמנות בצורה חכמה ופשוטה.\n\n📝 בואו נתחיל - איך קוראים לחברה שלכם?",
    
    askLegalId: "👍 מעולה!\n\n🏢 מה מספר ח.פ של החברה?",
    
    askRestaurantName: "✅ רשמתי את החברה.\n\n🍽️ איך קוראים למסעדה?",
    
    askYearsActive: "🎉 נהדר!\n\n📅 כמה שנים המסעדה פעילה?",
    
    askContactName: "👤 עכשיו אני צריך את פרטי איש הקשר הראשי.\n\n📝 איך קוראים לך?",
    
    askContactRole: "👔 מה התפקיד שלך במסעדה?\n\n🔢 שלח מספר:\n1️⃣ בעלים\n2️⃣ מנהל מסעדה\n3️⃣ אחמ\"ש\n4️⃣ מנהל בר\n5️⃣ אחר",
    
    askContactEmail: "📧 מה כתובת האימייל שלך? (אופציונלי - שלח 'דלג' אם אין)",
    
    askPaymentMethod: "💳 *בחר אמצעי תשלום:*\n\n1️⃣ כרטיס אשראי\n2️⃣ Apple Pay\n\nשלח מספר:",
    
    registrationComplete: "✅ *ההרשמה הושלמה בהצלחה!*\n\n👋 שלום {contactName}!\nהמסעדה *\"{restaurantName}\"* נרשמה במערכת.\n\n💳 להשלמת הרישום:\n🔗 {paymentLink}\n\n🎯 לאחר התשלום נתחיל להגדיר את הספקים שלכם."
  },

  // 📋 הגדרת ספקים ומוצרים - Supplier Setup
  suppliers: {
    startSetup: "🏪 *בואו נתחיל להגדיר את הספקים שלכם.*\n\n🥬 מי ספק הירקות שלך?\nשלח את שם הספק ומספר הוואטסאפ שלו.\n\n💡 דוגמה: ירקות השדה, 050-1234567",
    
    askSupplierDetails: "📋 מוסיף ספק: *{supplierName}*\n\n📅 באילו ימים הספק מבצע אספקה?\nשלח מספרי ימים מופרדים בפסיקים:\n\n• 0️⃣ = ראשון • 1️⃣ = שני • 2️⃣ = שלישי\n• 3️⃣ = רביעי • 4️⃣ = חמישי • 5️⃣ = שישי • 6️⃣ = שבת\n\n💡 דוגמה: 0,3 עבור ראשון ורביעי",
    
    askCutoffTime: "⏰ *מה השעה האחרונה להזמנה?*\n(ביום שלפני האספקה)\n\nדוגמה: 14 עבור 14:00",
    
    askProductList: "🛒 *שלח את רשימת המוצרים להזמנה מספק זה:*\n\n💡 לחסוך זמן - ניתן להעתיק מהתכתבות עם הספק\n\nדוגמה:\n🥒 מלפפונים\n🍅 עגבניות\n🥬 חסה",
    
    askParLevelMidweek: "📊 *כמה {emoji} {productName} אתה צריך לאמצע השבוע* (ראשון-רביעי)?\n\nשלח כמות + יחידה:\nדוגמה: 10 ק\"ג",
    
    askParLevelWeekend: "📊 *כמה {emoji} {productName} אתה צריך לסוף השבוע* (חמישי-שבת)?\n\nשלח כמות + יחידה:\nדוגמה: 15 ק\"ג",
    
    supplierCompleted: "✅ *ספק {supplierName} הוגדר בהצלחה!*\n\n📦 סה\"כ {productCount} מוצרים\n⏰ אספקה: {deliveryDays}\n🕒 הזמנה עד: {cutoffTime}\n\n➡️ עובר לקטגוריה הבאה...",
    
    nextCategory: "🔄 *עובר לקטגוריה: {categoryName}*\n\n{categoryEmoji} מי הספק שלך עבור {categoryName}?\nשלח שם הספק ומספר וואטסאפ.\n\n⏭️ או שלח 'דלג' אם אין ספק בקטגוריה זו",
    
    allSuppliersCompleted: "🎉 *כל הספקים הוגדרו בהצלחה!*\n\n📊 המערכת מוכנה לשימוש.\n\n💡 הקלד 'עזרה' לראות את הפקודות הזמינות.",

    // Add these new messages
    askSupplierName: "👤 *שלח את שם הספק*\n\nדוגמה: ירקות השדה",
    askSupplierWhatsapp: "📱 *שלח את מספר הוואטסאפ של הספק*\n\nדוגמה: 050-1234567",
    
    askProductQty: "📊 *מה כמות הבסיס ל{emoji} {productName}?*\n\nשלח כמות בסיס ב{unit}:\nדוגמה: 5",
    
    askProductUnit: "📦 *מה יחידת המידה של {emoji} {productName}?*\n\nשלח יחידת מידה תקנית:\nדוגמה: ק\"ג, יחידות, ליטר",

    addNewSupplier: "🏪 *הוספת ספק חדש*\n\nבחר קטגוריה לספק החדש מהרשימה הבאה:"
  },

  // 📦 תהליך ספירת מלאי והזמנה - Inventory & Orders
  inventory: {
    reminderMessage: "⏰ *הגיע הזמן לעדכן את המלאי של ספק {supplierName}*\n\n📋 בואו נעבור על המוצרים יחד.\n\n🔄 הקלד 'התחל' כדי להתחיל בספירה",
    
    askCurrentStock: "📦 *כמה {emoji} {productName} יש לך כרגע?*\n\nשלח את הכמות הקיימת:\nדוגמה: 3 ק\"ג",
    
    calculateOrder: "🧮 *חישוב הזמנה עבור {emoji} {productName}:*\n\n📊 יש כרגע: {currentStock}\n🎯 צריך: {targetAmount}\n➕ להזמין: {orderAmount}\n\n✅ מאושר?",
    
    askIncrease: "📈 *האם תרצה להגדיל את ההזמנה ב-{percentage}% בעקבות אירוע?*\n\n🔢 ההזמנה תהיה: {increasedAmount} במקום {originalAmount}\n\n✅ כן / ❌ לא",
    
    orderSummary: "📋 *סיכום הזמנה - ספק {supplierName}:*\n\n{orderItems}\n\n📤 האם לשלוח את ההזמנה לספק?",
    
    orderSent: "✅ *ההזמנה נשלחה לספק {supplierName}*\n\n📱 נעדכן אותך כאשר הספק יאשר.\n\n🔔 תקבל התראה כאשר הסחורה תגיע.",

    // Add these new messages
    categorySelected: "✅ *נבחרה קטגוריה: {categoryName} {categoryEmoji}*\n\nכעת נעבור על המוצרים בקטגוריה זו.",
    
    noCategoryProducts: "❌ אין מוצרים בקטגוריה זו.\n\nבחר קטגוריה אחרת או הקלד 'סיום' לסיום:",
    
    askSnapshotQty: "📊 *האם לאשר את כמויות המלאי שהוזנו?*\n\n✅ הקלד 'כן' לאישור\n❌ הקלד 'לא' לעריכה",
    
    reviseSnapshot: "🔄 *עורך מחדש את נתוני המלאי*\n\nבחר קטגוריה:",
    
    calculatingSnapshot: "🧮 *מחשב את המלאי...*",
    
    snapshotResults: "✅ *מלאי נשמר בהצלחה*\n\nהמערכת חישבה את ההזמנה המומלצת.",
    
    snapshotComplete: "🎉 *סיימנו את עדכון המלאי*\n\nהמערכת תשלח תזכורות לפני מועדי הזמנה.",
    
    proceedToOrder: "📦 *האם להכין הזמנה לפי המלאי?*\n\n✅ הקלד 'כן' להכנת הזמנה\n❌ הקלד 'לא' לדחייה",
    
    noOrderNeeded: "✅ *אין צורך בהזמנה כרגע*\n\nהמלאי מספיק עד ההזמנה הבאה.",
    
    orderCancelled: "❌ *הזמנה בוטלה*\n\nתוכל להזמין מאוחר יותר דרך תפריט ההזמנות.",
    
    startSnapshot: "📊 *עדכון מלאי*\n\nבחר קטגוריה לעדכון (שלח מספר):\n" +
                  BOT_CONFIG.supplierCategories.map((category, index) => 
                    `${index + 1}. ${formatCategoryEmoji(category)} ${formatCategoryName(category)}`).join('\n') +
                  "\n\nאו הקלד 'סיום' לסיום"
  },

  // 🚚 תהליך קבלת סחורה - Delivery Process
  delivery: {
    deliveryNotification: "🚚 *סחורה מספק {supplierName} צפויה להגיע*\n\n📋 אנא בדוק את הפריטים לפי הרשימה.\n\n▶️ הקלד 'התחל בדיקה' כדי להתחיל",
    
    checkItem: "📦 *האם התקבלו {expectedAmount} {emoji} {productName}?*\n\n✅ כן - התקבל במלואו\n❌ לא - יש חוסר\n📝 אחר - כמות שונה",
    
    askReceivedAmount: "📊 *כמה {emoji} {productName} התקבלו בפועל?*\n\nשלח את הכמות שהתקבלה:",
    
    askInvoicePhoto: "📸 *אנא צלם את החשבונית שקיבלת מהנהג ושלח אותה כאן.*\n\n📋 החשבונית תישמר במערכת לתיעוד.",
    
    deliveryComplete: "✅ *קבלת הסחורה הושלמה*\n\n📊 *סיכום:*\n{deliverySummary}\n\n📤 דיווח נשלח לבעלי המסעדה ולספק.",

    // Add this new message
    noItems: "❌ *אין פריטים להזמנה זו*\n\nהמערכת מבטלת את תהליך קבלת הסחורה."
  },

  // 🔔 תזכורות - Reminders
  reminders: {
    orderCutoffSoon: "⏰ *תזכורת: שעת ההזמנה עבור ספק {supplierName} מתקרבת*\n\n🕒 נותרו {hoursLeft} שעות עד סגירת הזמנות\n\n📦 אנא ודא שהמלאי מעודכן.",
    
    inventoryUpdate: "📋 *תזכורת: הזמן לעדכן את המלאי עבור ספק {supplierName}*\n\n🔄 הקלד 'מלאי {supplierName}' כדי להתחיל"
  },

  // 🤖 פקודות כלליות - General Commands
  general: {
    helpMenu: "🤖 *פקודות זמינות:*\n\n📋 *'ספק [שם]'* - הוספת/עריכת ספק\n📦 *'מלאי [ספק]'* - עדכון מלאי\n📋 *'הזמנות'* - צפייה בהזמנות\n🚚 *'משלוחים'* - סטטוס משלוחים\n⚙️ *'הגדרות'* - הגדרות מערכת\n🆘 *'עזרה'* - תפריט זה",
    
    waitingForPayment: "⏳ *המסעדה עדיין לא שילמה*\n\n💳 יש להסדיר את התשלום כדי להמשיך.\n\n🔗 {paymentLink}\n\n📅 לאחר התשלום, נתחיל להגדיר את הספקים.",

    welcomeBack: "👋 *שלום {contactName}!*\n\nאני כאן לעזור לכם לנהל את המלאי וההזמנות.\n\n🆘 הקלד 'עזרה' לראות את הפקודות הזמינות",
    
    systemError: "🤔 *משהו השתבש במערכת*\n\nבואו ננסה שוב...\n\n🆘 הקלד 'עזרה' לראות את הפקודות"
  },

  // ❌ שגיאות אימות - Validation Errors
  validation: {
    invalidCompanyName: "❌ *אנא הזן שם חברה תקין* (לפחות 2 תווים)",
    invalidLegalId: "❌ *אנא הזן מספר ח.פ תקין* (9 ספרות)",
    invalidRestaurantName: "❌ *אנא הזן שם מסעדה תקין* (לפחות 2 תווים)",
    invalidYearsActive: "❌ *אנא הזן מספר שנים תקין* (מספר בין 0-100)",
    invalidContactName: "❌ *אנא הזן שם מלא תקין* (לפחות 2 תווים)",
    invalidContactRole: "❌ *אנא בחר תפקיד תקין* (מספר בין 1-5)",
    invalidEmail: "❌ *אנא הזן כתובת אימייל תקינה* או 'דלג'",
    invalidPhone: "❌ *אנא הזן מספר וואטסאפ תקין* (לדוגמה: 050-1234567)",
    invalidPaymentMethod: "❌ *אנא בחר אמצעי תשלום תקין* (1 או 2)",
    invalidSupplierFormat: "❌ *פורמט לא תקין*\nדוגמה: ירקות השדה, 050-1234567",
    invalidDeliveryDays: "❌ *פורמט ימים לא תקין*\nדוגמה: 0,3 עבור ראשון ורביעי",
    invalidCutoffHour: "❌ *שעה לא תקינה*\nהזן מספר בין 0-23",
    invalidQuantity: "❌ *כמות לא תקינה*\nדוגמה: 10 ק\"ג",

    // Add these new messages
    invalidCategory: "❌ *קטגוריה לא תקינה*\n\nאנא בחר מספר מהרשימה",
    
    invalidProductList: "❌ *רשימת מוצרים ריקה*\n\nאנא הזן לפחות מוצר אחד",
    
    invalidUnit: "❌ *יחידת מידה לא תקינה*\n\nאנא הזן יחידת מידה (לדוגמה: ק\"ג, יחידות)",
    
    invalidYesNo: "❌ *תשובה לא תקינה*\n\nאנא הקלד 'כן' או 'לא'",
    
    noPhotoAttached: "❌ *לא צורפה תמונה*\n\nאנא שלח תמונה של החשבונית"
  },

  // 📅 קטגוריות ספקים - Supplier Categories
  categories: {
    vegetables: { name: "ירקות", emoji: "🥬" },
    fish: { name: "דגים", emoji: "🐟" },
    alcohol: { name: "אלכוהול", emoji: "🍷" },
    meat: { name: "בשרים", emoji: "🥩" },
    fruits: { name: "פירות", emoji: "🍎" },
    oliveOil: { name: "שמן זית", emoji: "🫒" },
    disposables: { name: "חד פעמי", emoji: "🥤" },
    dessert: { name: "קינוחים", emoji: "🍰" },
    juices: { name: "מיצים טבעיים", emoji: "🧃" },
    eggs: { name: "ביצים אורגניות", emoji: "🥚" }
  },

  // 📅 שמות ימים - Day Names
  dayNames: {
    0: "ראשון", 1: "שני", 2: "שלישי", 3: "רביעי", 
    4: "חמישי", 5: "שישי", 6: "שבת"
  }
} as const;

// Helper functions remain the same with additions for new functionality
export function formatTimeHebrew(hour: number): string {
  if (hour === 0) return "00:00";
  if (hour < 10) return `0${hour}:00`;
  return `${hour}:00`;
}

export function formatDaysHebrew(days: number[]): string {
  return days.map(d => BOT_MESSAGES.dayNames[d as keyof typeof BOT_MESSAGES.dayNames]).join(", ");
}

export function formatCategoryName(category: string): string {
  return BOT_MESSAGES.categories[category as keyof typeof BOT_MESSAGES.categories]?.name || category;
}

export function formatCategoryEmoji(category: string): string {
  return BOT_MESSAGES.categories[category as keyof typeof BOT_MESSAGES.categories]?.emoji || "📦";
}

export type MessageContext = {
  contactName?: string;
  companyName?: string;
  restaurantName?: string;
  supplierName?: string;
  categoryName?: string;
  categoryEmoji?: string;
  productName?: string;
  emoji?: string;
  currentStock?: string;
  targetAmount?: string;
  orderAmount?: string;
  percentage?: string;
  deliveryDays?: string;
  cutoffTime?: string;
  paymentLink?: string;
  orderItems?: string;
  deliverySummary?: string;
  hoursLeft?: string;
  productCount?: string;
  expectedAmount?: string;
  originalAmount?: string;
  increasedAmount?: string;
  selectedDays?: string;
  unit?: string;
};

export function interpolateMessage(template: string, context: MessageContext): string {
  let result = template;
  
  Object.entries(context).forEach(([key, value]) => {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  });
  
  return result;
}
