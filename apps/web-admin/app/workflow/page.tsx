'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BotState, BotMessages } from '@/lib/types';
import { 
  Search, 
  MessageSquare, 
  Edit,
  Save,
  RotateCcw,
  Copy,
  Eye,
  Settings,
  Bot,
  User,
  ArrowRight,
  Play,
  Pause,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Mock data for bot messages based on backend structure
const mockBotMessages: BotMessages = {
  onboarding: {
    welcome: 'שלום! 👋 ברוכים הבאים לשירות ההזמנות החכם!\n\nאני כאן לעזור לכם לנהל את המלאי וההזמנות שלכם בקלות דרך WhatsApp.\n\nבואו נתחיל בהגדרת המסעדה שלכם 🍽️',
    askLegalId: 'מה מספר החברה (ח.פ) של המסעדה?',
    askRestaurantName: 'מה שם המסעדה שלכם?',
    askYearsActive: 'כמה שנים המסעדה פעילה?',
    askContactName: 'מי איש הקשר הראשי?',
    askContactRole: 'מה התפקיד של איש הקשר?',
    askContactEmail: 'מה האימייל של איש הקשר?',
    askPaymentMethod: 'איך תרצו לשלם עבור השירות?',
    paymentLink: 'להשלמת ההרשמה, אנא השלימו את התשלום בקישור הבא:\n{paymentLink}\n\nאחרי התשלום, אתקשר אליכם תוך כמה דקות.',
    paymentConfirmed: 'התשלום התקבל! ברוכים הבאים למשפחה 🥳\n\nעכשיו בואו נתחיל להגדיר את הספקים שלכם.'
  },
  suppliers: {
    allSuppliersCompleted: 'כל הספקים הוגדרו בהצלחה! עכשיו אוכל לעזור לכם לנהל את המלאי וההזמנות.',
    nextCategory: 'נהדר! עכשיו בואו נוסיף ספק נוסף.',
    askName: 'מה שם הספק שברצונכם להוסיף?',
    askDeliveryDays: 'באילו ימים הספק מספק סחורה?',
    askCutoffTime: 'מהי שעת סגירת ההזמנות?',
    productFormat: 'אנא ציינו מוצר בפורמט: "שם המוצר - יחידת מידה - כמות רגילה"',
    productAdded: 'מוצר "{productName}" נוסף! האם יש עוד מוצרים? (כן/לא)'
  },
  general: {
    systemError: 'מצטער, משהו השתבש 😔. אנא נסו שוב או כתבו "עזרה" לקבלת תמיכה.',
    help: 'אני כאן לעזור! במה אוכל לעזור?',
    idle: 'שלום! איך אוכל לעזור היום? 😊',
    inventoryReminder: 'בוקר טוב! ⏰ זמן לבדוק את המלאי',
    orderConfirmation: 'ההזמנה אושרה ונשלחה! ✅',
    deliveryNotification: 'המשלוח אמור להגיע היום! 🚚'
  },
//   IDLE: {
//     initial: 'שלום! איך אוכל לעזור היום? 😊',
//     prompt: 'כתבו "עזרה" לראות מה אני יכול לעשות בשבילכם.',
//     confirmation: 'אני כאן כשאתם צריכים!',
//     error: 'לא הבנתי. כתבו "עזרה" לקבלת הנחיות.'
//   },
  ONBOARDING_WELCOME: {
    initial: 'שלום! 👋 ברוכים הבאים לשירות ההזמנות החכם!\n\nאני כאן לעזור לכם לנהל את המלאי וההזמנות שלכם בקלות דרך WhatsApp.\n\nבואו נתחיל בהגדרת המסעדה שלכם 🍽️',
    prompt: 'אנא ספרו לי על המסעדה שלכם - מה השם ואיזה סוג מזון אתם מגישים?',
    confirmation: 'מעולה! קיבלתי את הפרטים. עכשיו בואו נעבור לשלב הבא.',
    error: 'מצטער, לא הבנתי. אנא נסו שוב או כתבו "עזרה" לקבלת הנחיות.'
  },
  ONBOARDING_RESTAURANT_DETAILS: {
    initial: 'בואו נאסוף כמה פרטים על המסעדה שלכם 📋',
    prompt: 'מה מספר החברה (ח.פ) של המסעדה?',
    confirmation: 'תודה! הפרטים נרשמו בהצלחה.',
    error: 'מספר החברה שהזנתם לא תקין. אנא בדקו ונסו שוב.'
  },
  ONBOARDING_CONTACT_INFO: {
    initial: 'כמעט סיימנו! אני צריך כמה פרטי קשר 📞',
    prompt: 'מי איש הקשר הראשי? אנא ציינו שם ותפקיד.',
    confirmation: 'מצוין! פרטי הקשר נוספו.',
    error: 'אנא ספקו שם ותפקיד בפורמט: "שם - תפקיד"'
  },
  ONBOARDING_PAYMENT: {
    initial: 'הכל מוכן! 🎉 נותר רק לסגור על המנוי.',
    prompt: 'להשלמת ההרשמה, אנא השלימו את התשלום בקישור הבא:\n{paymentLink}\n\nאחרי התשלום, אתקשר אליכם תוך כמה דקות.',
    confirmation: 'התשלום התקבל! ברוכים הבאים למשפחה 🥳\n\nעכשיו בואו נתחיל להגדיר את הספקים שלכם.',
    error: 'נראה שיש בעיה עם התשלום. אנא בדקו את הקישור או צרו איתנו קשר.'
  },
  SETUP_SUPPLIER: {
    initial: 'בואו נוסיף ספק חדש למערכת 🚚',
    prompt: 'מה שם הספק שברצונכם להוסיף?',
    confirmation: 'ספק "{supplierName}" נוסף בהצלחה! עכשיו בואו נגדיר את המוצרים.',
    error: 'שם הספק חייב להכיל לפחות 2 תווים. אנא נסו שוב.'
  },
  SETUP_PRODUCTS: {
    initial: 'עכשיו בואו נגדיר את המוצרים שאתם מזמינים מ-{supplierName} 📦',
    prompt: 'אנא ציינו מוצר בפורמט: "שם המוצר - יחידת מידה - כמות רגילה"\nלדוגמה: "עגבניות - קילו - 5"',
    confirmation: 'מוצר "{productName}" נוסף! האם יש עוד מוצרים? (כן/לא)',
    error: 'פורמט לא נכון. אנא השתמשו בפורמט: "שם - יחידה - כמות"'
  },
  INVENTORY_REMINDER: {
    initial: 'בוקר טוב! ⏰ זמן לבדוק את המלאי של {supplierName}',
    prompt: 'האם אתם מוכנים לבדוק את המלאי? (כן/לא)',
    confirmation: 'מעולה! בואו נתחיל.',
    error: 'אנא השיבו "כן" או "לא"'
  },
  INVENTORY_COLLECTING: {
    initial: 'בואו נבדוק את המלאי הנוכחי 📊',
    prompt: 'כמה {productName} {productEmoji} יש לכם כרגע? (ב{unit})',
    confirmation: 'נרשם: {quantity} {unit} של {productName}',
    error: 'אנא ציינו מספר בלבד (למשל: 5)'
  },
  INVENTORY_SUMMARY: {
    initial: 'סיימנו לאסוף את נתוני המלאי! 📋 הנה הסיכום:',
    prompt: 'האם הפרטים נכונים? (כן/לא)\nאם לא, אנא ציינו איזה מוצר צריך תיקון.',
    confirmation: 'מצוין! עכשיו אחשב את ההזמנה.',
    error: 'אנא השיבו "כן" או ציינו איזה מוצר לתקן'
  },
  ORDER_CALCULATION: {
    initial: 'מחשב את ההזמנה... 🧮',
    prompt: 'בהתבסס על המלאי הנוכחי והרמות הנדרשות, הנה ההזמנה המוצעת:',
    confirmation: 'ההזמנה חושבה בהצלחה!',
    error: 'שגיאה בחישוב ההזמנה. אנא נסו שוב או צרו קשר לתמיכה.'
  },
  ORDER_REVIEW: {
    initial: 'הזמנה מ-{supplierName} מוכנה לבדיקה! 📝',
    prompt: 'האם להגיש את ההזמנה הזו? (כן/לא)\nאו כתבו "שנה" לעריכה.',
    confirmation: 'ההזמנה נשלחה ל-{supplierName}! 📤\nתקבלו הודעה כשהמשלוח יגיע.',
    error: 'אנא השיבו "כן", "לא" או "שנה"'
  },
  ORDER_CONFIRMED: {
    initial: 'ההזמנה אושרה ונשלחה! ✅',
    prompt: 'הזמנה #{orderId} נשלחה ל-{supplierName}.\nתאריך משלוח משוער: {deliveryDate}',
    confirmation: 'תודה! אעדכן אתכם על סטטוס המשלוח.',
    error: ''
  },
  DELIVERY_NOTIFICATION: {
    initial: 'המשלוח מ-{supplierName} אמור להגיע היום! 🚚',
    prompt: 'האם המשלוח הגיע? (כן/לא)',
    confirmation: 'מעולה! בואו נבדוק שהכל הגיע כמו שצריך.',
    error: 'אנא השיבו "כן" או "לא"'
  },
  DELIVERY_CHECKLIST: {
    initial: 'בואו נבדוק את המשלוח שהגיע 📦',
    prompt: 'האם קיבלתם {quantity} {unit} של {productName}? (כן/לא/חלקי)',
    confirmation: 'נרשם! {productName} התקבל במלואו.',
    error: 'אנא השיבו "כן", "לא" או "חלקי"'
  },
  DELIVERY_ISSUES: {
    initial: 'נמצאו בעיות במשלוח ⚠️',
    prompt: 'מה הבעיה? אנא תארו בקצרה.',
    confirmation: 'הבעיה נרשמה ותועבר לטיפול. אנו נעדכן את הספק.',
    error: 'אנא תארו את הבעיה בכמה מילים'
  },
  HELP_REQUEST: {
    initial: 'אני כאן לעזור! 🤝',
    prompt: 'במה אוכל לעזור?\n1. בדיקת מלאי\n2. הגשת הזמנה\n3. ספקים ומוצרים\n4. דיווח על בעיה\n5. צרו קשר עם התמיכה',
    confirmation: 'אשמח לעזור עם זה!',
    error: 'אנא בחרו מספר מ-1 עד 5'
  },
  ERROR_HANDLING: {
    initial: 'מצטער, משהו השתבש 😔',
    prompt: 'אנא נסו שוב או כתבו "עזרה" לקבלת תמיכה.',
    confirmation: 'הבעיה תוקנה! אפשר להמשיך.',
    error: 'בעיה טכנית. אנא צרו קשר עם התמיכה.'
  },
  IDLE: {
    initial: 'שלום! איך אוכל לעזור היום? 😊',
    prompt: 'כתבו "עזרה" לראות מה אני יכול לעשות בשבילכם.',
    confirmation: 'אני כאן כשאתם צריכים!',
    error: 'לא הבנתי. כתבו "עזרה" לקבלת הנחיות.'
  }
};

const stateNames: Record<BotState, string> = {
  IDLE: 'ללא פעילות',
  INIT: 'אתחול',
  ONBOARDING_COMPANY_NAME: 'שם החברה',
  ONBOARDING_LEGAL_ID: 'מספר ח.פ',
  ONBOARDING_RESTAURANT_NAME: 'שם המסעדה',
  ONBOARDING_YEARS_ACTIVE: 'שנות פעילות',
  ONBOARDING_CONTACT_NAME: 'שם איש קשר',
  ONBOARDING_CONTACT_ROLE: 'תפקיד איש קשר',
  ONBOARDING_CONTACT_EMAIL: 'אימייל איש קשר',
  ONBOARDING_PAYMENT_METHOD: 'אמצעי תשלום',
  WAITING_FOR_PAYMENT: 'ממתין לתשלום',
  SETUP_SUPPLIERS_START: 'התחלת הגדרת ספקים',
  SUPPLIER_DETAILS: 'פרטי ספק',
  SUPPLIER_DELIVERY_DAYS: 'ימי משלוח',
  SUPPLIER_CUTOFF_TIME: 'שעת סיום הזמנות',
  SUPPLIER_PRODUCTS: 'מוצרי ספק',
  PRODUCT_PAR_MIDWEEK: 'רמת מלאי אמצע שבוע',
  PRODUCT_PAR_WEEKEND: 'רמת מלאי סוף שבוע',
  INVENTORY_START: 'התחלת ספירת מלאי',
  INVENTORY_COUNT: 'ספירת מלאי',
  INVENTORY_CALCULATE: 'חישוב מלאי',
  ORDER_INCREASE: 'הגדלת הזמנה',
  ORDER_CONFIRMATION: 'אישור הזמנה',
  DELIVERY_START: 'התחלת משלוח',
  DELIVERY_CHECK_ITEM: 'בדיקת פריט',
  DELIVERY_RECEIVED_AMOUNT: 'כמות שהתקבלה',
  DELIVERY_INVOICE_PHOTO: 'צילום חשבונית'
};

const stateCategories = {
  'רישום': [
    'INIT',
    'ONBOARDING_COMPANY_NAME',
    'ONBOARDING_LEGAL_ID',
    'ONBOARDING_RESTAURANT_NAME',
    'ONBOARDING_YEARS_ACTIVE',
    'ONBOARDING_CONTACT_NAME',
    'ONBOARDING_CONTACT_ROLE',
    'ONBOARDING_CONTACT_EMAIL',
    'ONBOARDING_PAYMENT_METHOD',
    'WAITING_FOR_PAYMENT'
  ],
  'הגדרה': [
    'SETUP_SUPPLIERS_START',
    'SUPPLIER_DETAILS',
    'SUPPLIER_DELIVERY_DAYS',
    'SUPPLIER_CUTOFF_TIME',
    'SUPPLIER_PRODUCTS',
    'PRODUCT_PAR_MIDWEEK',
    'PRODUCT_PAR_WEEKEND'
  ],
  'מלאי': [
    'INVENTORY_START',
    'INVENTORY_COUNT',
    'INVENTORY_CALCULATE'
  ],
  'הזמנות': [
    'ORDER_INCREASE',
    'ORDER_CONFIRMATION'
  ],
  'משלוחים': [
    'DELIVERY_START',
    'DELIVERY_CHECK_ITEM',
    'DELIVERY_RECEIVED_AMOUNT',
    'DELIVERY_INVOICE_PHOTO'
  ],
  'כללי': [
    'IDLE'
  ]
};

export default function WorkflowPage() {
  const [messages, setMessages] = useState<BotMessages>(mockBotMessages);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<BotState | null>(null);
  const [editingMessage, setEditingMessage] = useState<{
    state: BotState;
    type: 'initial' | 'prompt' | 'confirmation' | 'error';
    value: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const filteredStates = Object.keys(stateNames).filter((state) => {
    const matchesSearch = stateNames[state as BotState].toLowerCase().includes(searchTerm.toLowerCase()) ||
                         state.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCategory === 'all') return matchesSearch;
    
    const categoryStates = stateCategories[selectedCategory as keyof typeof stateCategories] || [];
    return matchesSearch && categoryStates.includes(state);
  }) as BotState[];

  const handleSaveMessage = () => {
    if (!editingMessage) return;
    
    setMessages(prev => ({
      ...prev,
      [editingMessage.state]: {
        ...prev[editingMessage.state],
        [editingMessage.type]: editingMessage.value
      }
    }));
    
    setEditingMessage(null);
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setHasChanges(false);
    setIsLoading(false);
  };

  const MessageTypeCard = ({ 
    state, 
    type, 
    title, 
    description, 
    icon 
  }: { 
    state: BotState; 
    type: 'initial' | 'prompt' | 'confirmation' | 'error';
    title: string;
    description: string;
    icon: React.ReactNode;
  }) => {
    const message = messages[state]?.[type] || '';
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md min-h-[60px]">
              <div className="text-sm whitespace-pre-wrap">
                {message || 'לא הוגדר...'}
              </div>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMessage({ state, type, value: message })}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>עריכה</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>העתק</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>תצוגה מקדימה</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">עורך תהליכי עבודה</h1>
          <p className="text-muted-foreground">ערוך את ההודעות של הבוט לכל שלב בתהליך</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => setHasChanges(false)}>
              <RotateCcw className="w-4 h-4 ml-2" />
              בטל שינויים
            </Button>
          )}
          <Button onClick={handleSaveAll} disabled={!hasChanges}>
            <Save className="w-4 h-4 ml-2" />
            {hasChanges ? 'שמור שינויים' : 'הכל שמור'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <span className="text-orange-800 dark:text-orange-200">יש לך שינויים שלא נשמרו</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי שם שלב או תיאור..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="p-2 border rounded-md"
        >
          <option value="all">כל הקטגוריות</option>
          {Object.keys(stateCategories).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* States List */}
      <div className="space-y-8">
        {filteredStates.map((state) => (
          <div key={state} className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {stateNames[state]}
              </Badge>
              <span className="text-sm text-muted-foreground">{state}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MessageTypeCard
                state={state}
                type="initial"
                title="הודעת פתיחה"
                description="ההודעה הראשונה בשלב"
                icon={<Play className="w-4 h-4 text-blue-500" />}
              />
              <MessageTypeCard
                state={state}
                type="prompt"
                title="בקשה מהמשתמש"
                description="מה הבוט מבקש מהמשתמש"
                icon={<MessageSquare className="w-4 h-4 text-green-500" />}
              />
              <MessageTypeCard
                state={state}
                type="confirmation"
                title="אישור"
                description="הודעה לאחר פעולה מוצלחת"
                icon={<CheckCircle className="w-4 h-4 text-green-500" />}
              />
              <MessageTypeCard
                state={state}
                type="error"
                title="הודעת שגיאה"
                description="הודעה במקרה של בעיה"
                icon={<AlertCircle className="w-4 h-4 text-red-500" />}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Edit Message Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="max-w-2xl">
          {editingMessage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  עריכת הודעה
                </DialogTitle>
                <DialogDescription>
                  {stateNames[editingMessage.state]} - {
                    editingMessage.type === 'initial' ? 'הודעת פתיחה' :
                    editingMessage.type === 'prompt' ? 'בקשה מהמשתמש' :
                    editingMessage.type === 'confirmation' ? 'אישור' : 'הודעת שגיאה'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message-text">תוכן ההודעה</Label>
                  <textarea
                    id="message-text"
                    className="w-full h-32 p-3 border rounded-md resize-none"
                    value={editingMessage.value}
                    onChange={(e) => setEditingMessage(prev => prev ? { ...prev, value: e.target.value } : null)}
                    placeholder="הזן את תוכן ההודעה..."
                  />
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium mb-2">משתנים זמינים:</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><code>&#123;supplierName&#125;</code> - שם הספק</div>
                    <div><code>&#123;productName&#125;</code> - שם המוצר</div>
                    <div><code>&#123;productEmoji&#125;</code> - אימוג&apos;י המוצר</div>
                    <div><code>&#123;quantity&#125;</code> - כמות</div>
                    <div><code>&#123;unit&#125;</code> - יחידת מידה</div>
                    <div><code>&#123;paymentLink&#125;</code> - קישור תשלום</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMessage(null)}>
                  ביטול
                </Button>
                <Button onClick={handleSaveMessage}>
                  שמור
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
