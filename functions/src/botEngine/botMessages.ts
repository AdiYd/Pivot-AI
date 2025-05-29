/*
 * Centralized bot messages in Hebrew with typography
 * This object can be uploaded to Firestore for dynamic message management
 */
export const BOT_MESSAGES = {
  // 🚀 Onboarding Flow
  onboarding: {
    welcome: "🍽️ *ברוכים הבאים לבוט ניהול המלאי!*\n\n✨ בואו נגדיר את המערכת שלכם תוך כמה דקות בלבד.\n\n📝 איך קוראים למסעדה שלכם?",
    
    askContactName: "🎉 מעולה! *\"{restaurantName}\"* נשמע נהדר.\n\n👤 עכשיו אני צריך את פרטי הקשר שלכם.\n📞 איך קוראים לכם?",
    
    registrationComplete: "✅ *מושלם!* {contactName}, המסעדה *\"{restaurantName}\"* נרשמה בהצלחה.\n\n💳 *להפעלת החשבון*, אנא השלימו את התשלום:\n🔗 {paymentLink}\n\n🎯 לאחר אישור התשלום, תוכלו להתחיל להוסיף ספקים על ידי הקלדת *\"ספק\"*.",
    
    paymentPending: "⏳ אנא השלימו את התשלום תחילה, ואז הודיעו לי שסיימתם.\n\n💳 קישור תשלום:\n{paymentLink}",
    
    paymentConfirmed: "🎉 מעולה! ברגע שהתשלום יעובד, תוכלו להוסיף ספקים.\n\n🚀 בינתיים, הקלידו *\"ספק\"* כדי להתחיל להוסיף את הספק הראשון שלכם."
  },

  // 📋 Supplier Management
  supplier: {
    startAdding: "📋 *בואו נוסיף ספק חדש!*\n\n🏪 איך קוראים לספק?",
    
    askWhatsapp: "✏️ מוסיף ספק: *\"{supplierName}\"*\n\n📱 מה מספר הוואטסאפ שלהם?\n(כולל קידומת מדינה, למשל: +972501234567)",
    
    askDeliveryDays: "📅 *באילו ימים בשבוע הם מבצעים משלוחים?*\n\n🔢 שלחו מספרי ימים מופרדים בפסיקים:\n• 0️⃣ = ראשון\n• 1️⃣ = שני  \n• 2️⃣ = שלישי\n• 3️⃣ = רביעי\n• 4️⃣ = חמישי\n• 5️⃣ = שישי\n• 6️⃣ = שבת\n\n💡 *דוגמה:* 1,3,5 עבור שני/רביעי/שישי",
    
    askCutoffTime: "✅ *ימי משלוח:* {selectedDays}\n\n⏰ *מה השעה הסופית להזמנות?*\n(פורמט 24 שעות, למשל: 15 עבור 15:00)",
    
    addedSuccessfully: "🎉 *הספק \"{supplierName}\" נוסף בהצלחה!*\n\n📞 *טלפון:* {whatsapp}\n⏰ *שעת סגירה:* {timeString}\n\n➕ הקלידו *\"ספק\"* להוספת ספק נוסף\n🆘 או *\"עזרה\"* לאפשרויות נוספות"
  },

  // 🤖 General Commands & Help
  general: {
    helpMenu: "🤖 *פקודות זמינות:*\n\n📋 *\"ספק\"* - הוספת ספק חדש\n📦 *\"מלאי\"* - עדכון רמות מלאי\n📋 *\"הזמנות\"* - צפייה בהזמנות אחרונות\n🆘 *\"עזרה\"* - הצגת תפריט זה",
    
    welcomeBack: "👋 *שלום!* אני יכול לעזור לכם לנהל ספקים ומלאי.\n\n📋 הקלידו *\"ספק\"* להוספת ספק חדש\n🆘 או *\"עזרה\"* לאפשרויות נוספות",
    
    systemError: "🤔 *משהו השתבש.* בואו נתחיל מחדש...\n\n📋 הקלידו *\"ספק\"* להוספת ספק\n🆘 או *\"עזרה\"* לאפשרויות נוספות"
  },

  // ❌ Validation Errors
  validation: {
    invalidRestaurantName: "❌ *אנא הזינו שם מסעדה תקין* (לפחות 2 תווים)",
    
    invalidContactName: "❌ *אנא הזינו שם מלא תקין* (לפחות 2 תווים)",
    
    invalidSupplierName: "❌ *אנא הזינו שם ספק תקין* (לפחות 2 תווים)",
    
    invalidWhatsappNumber: "❌ *אנא הזינו מספר וואטסאפ תקין עם קידומת מדינה*\n💡 דוגמה: +972501234567",
    
    invalidDeliveryDays: "❌ *פורמט לא תקין.* אנא שלחו ימי משלוח כמספרים מופרדים בפסיקים.\n💡 *דוגמה:* 1,3,5 עבור שני, רביעי, שישי",
    
    invalidCutoffHour: "❌ *אנא הזינו שעה תקינה (0-23).*\n💡 *דוגמה:* 15 עבור 15:00"
  },

  // 📅 Day Names for Display
  dayNames: {
    0: "ראשון",
    1: "שני", 
    2: "שלישי",
    3: "רביעי",
    4: "חמישי",
    5: "שישי",
    6: "שבת"
  }
} as const;

/*
 * Helper function to format time display in Hebrew
 */
export function formatTimeHebrew(hour: number): string {
  if (hour === 0) return "00:00";
  if (hour < 10) return `0${hour}:00`;
  return `${hour}:00`;
}

/*
 * Helper function to format selected days in Hebrew
 */
export function formatDaysHebrew(days: number[]): string {
  return days.map(d => BOT_MESSAGES.dayNames[d as keyof typeof BOT_MESSAGES.dayNames]).join(", ");
}

/*
 * Type for dynamic message interpolation
 */
export type MessageContext = {
  restaurantName?: string;
  contactName?: string;
  supplierName?: string;
  whatsapp?: string;
  selectedDays?: string;
  timeString?: string;
  paymentLink?: string;
};

/*
 * Helper function to interpolate variables in messages
 */
export function interpolateMessage(template: string, context: MessageContext): string {
  let result = template;
  
  Object.entries(context).forEach(([key, value]) => {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  });
  
  return result;
}
