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
import { ConversationState, BotState } from '@/lib/types';
import { 
  Search, 
  MessageCircle, 
  Calendar,
  Clock,
  User,
  Bot,
  Eye,
  Edit,
  Trash2,
  Filter,
  ArrowUpDown,
  Phone,
  AlertCircle,
  CheckCircle,
  Pause,
  Play
} from 'lucide-react';

// Mock data for development
const mockConversations: (ConversationState & { 
  restaurantName: string; 
  contactName: string;
  lastActivity: Date;
  messageCount: number;
  phoneNumber: string;
  stateData: any; // Adjust based on actual state data structure
})[] = [
  {
    id: 'conv-1',
    restaurantId: 'rest-1',
    restaurantName: 'בית קפה הדרך',
    contactName: 'יוסי כהן',
    phoneNumber: '+972-50-1234567',
    currentState: 'INVENTORY_COLLECTING',
    stateData: {
      currentSupplierId: 'sup-1',
      pendingProducts: ['prod-1', 'prod-2'],
      inventoryData: [
        { productId: 'prod-1', currentQty: 5 },
        { productId: 'prod-2', currentQty: 2 }
      ]
    },
    conversationHistory: [
      {
        timestamp: new Date('2024-01-17T10:30:00'),
        role: 'bot',
        message: 'בוקר טוב! זמן לבדוק את המלאי של ירקות השדה 🥬'
      },
      {
        timestamp: new Date('2024-01-17T10:35:00'),
        role: 'user',
        message: 'בוקר טוב, אני מוכן'
      },
      {
        timestamp: new Date('2024-01-17T10:36:00'),
        role: 'bot',
        message: 'מעולה! כמה עגבניות יש לכם במלאי? 🍅'
      },
      {
        timestamp: new Date('2024-01-17T10:40:00'),
        role: 'user',
        message: '5 קילו'
      }
    ],
    createdAt: new Date('2024-01-17T10:30:00'),
    lastActivity: new Date('2024-01-17T10:40:00'),
    messageCount: 4
  },
  {
    id: 'conv-2',
    restaurantId: 'rest-2',
    restaurantName: 'פיצה רומא',
    contactName: 'מרקו רוסי',
    phoneNumber: '+972-52-9876543',
    currentState: 'ORDER_REVIEW',
    stateData: {
      currentSupplierId: 'sup-2',
      orderSummary: [
        { productId: 'prod-4', qty: 10 },
        { productId: 'prod-5', qty: 5 }
      ]
    },
    conversationHistory: [
      {
        timestamp: new Date('2024-01-17T14:15:00'),
        role: 'bot',
        message: 'הזמנה מהמחלבה מוכנה לאישור 🧀'
      },
      {
        timestamp: new Date('2024-01-17T14:20:00'),
        role: 'user',
        message: 'אשמח לראות'
      },
      {
        timestamp: new Date('2024-01-17T14:21:00'),
        role: 'bot',
        message: 'גבינה צהובה: 10 קילו\nחלב: 5 ליטר\n\nלאשר?'
      }
    ],
    createdAt: new Date('2024-01-17T14:15:00'),
    lastActivity: new Date('2024-01-17T14:21:00'),
    messageCount: 3
  },
  {
    id: 'conv-3',
    restaurantId: 'rest-1',
    restaurantName: 'בית קפה הדרך',
    contactName: 'יוסי כהן',
    phoneNumber: '+972-50-1234567',
    currentState: 'SETUP_SUPPLIER',
    stateData: {
      tempSupplier: {
        name: 'דברי טבע',
        whatsapp: '+972-54-7777777',
        category: 'organic'
      }
    },
    conversationHistory: [
      {
        timestamp: new Date('2024-01-16T16:45:00'),
        role: 'bot',
        message: 'בואו נוסיף ספק חדש 🚚'
      },
      {
        timestamp: new Date('2024-01-16T16:50:00'),
        role: 'user',
        message: 'בסדר, ספק של מוצרים אורגניים'
      },
      {
        timestamp: new Date('2024-01-16T16:51:00'),
        role: 'bot',
        message: 'מה שם הספק?'
      },
      {
        timestamp: new Date('2024-01-16T16:55:00'),
        role: 'user',
        message: 'דברי טבע'
      }
    ],
    createdAt: new Date('2024-01-16T16:45:00'),
    lastActivity: new Date('2024-01-16T16:55:00'),
    messageCount: 4
  },
  {
    id: 'conv-4',
    restaurantId: 'rest-3',
    restaurantName: 'סושי יאמה',
    contactName: 'טקאשי סאטו',
    phoneNumber: '+972-54-5555555',
    currentState: 'ONBOARDING_PAYMENT',
    stateData: {
      paymentLink: 'https://pay.example.com/yama-sushi'
    },
    conversationHistory: [
      {
        timestamp: new Date('2024-01-15T11:30:00'),
        role: 'bot',
        message: 'ברוכים הבאים לשירות ההזמנות! 🍱'
      },
      {
        timestamp: new Date('2024-01-15T11:35:00'),
        role: 'user',
        message: 'תודה, איך מתחילים?'
      },
      {
        timestamp: new Date('2024-01-15T11:36:00'),
        role: 'bot',
        message: 'קודם כל נצטרך לסגור על התשלום. הנה הקישור:'
      }
    ],
    createdAt: new Date('2024-01-15T11:30:00'),
    lastActivity: new Date('2024-01-15T11:36:00'),
    messageCount: 3
  }
];

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

export default function ConversationsPage() {
  const [conversations, setConversations] = useState(mockConversations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<typeof mockConversations[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'activity' | 'created' | 'messages'>('activity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredConversations = conversations
    .filter(conversation => {
      const matchesSearch = conversation.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           conversation.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           conversation.phoneNumber.includes(searchTerm) ||
                           conversation.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = selectedState === 'all' || conversation.currentState === selectedState;
      
      return matchesSearch && matchesState;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'activity':
          comparison = a.lastActivity.getTime() - b.lastActivity.getTime();
          break;
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'messages':
          comparison = a.messageCount - b.messageCount;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const getStateBadge = (state: BotState) => {
    const colors: Record<string, string> = {
      IDLE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      ONBOARDING_WELCOME: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ONBOARDING_RESTAURANT_DETAILS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ONBOARDING_CONTACT_INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ONBOARDING_PAYMENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      ONBOARDING_COMPLETE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      SETUP_SUPPLIER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      SETUP_PRODUCTS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      INVENTORY_REMINDER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      INVENTORY_COLLECTING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      INVENTORY_SUMMARY: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      ORDER_CALCULATION: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      ORDER_REVIEW: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      ORDER_CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      DELIVERY_NOTIFICATION: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      DELIVERY_CHECKLIST: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      DELIVERY_ISSUES: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      HELP_REQUEST: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      ERROR_HANDLING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    return (
      <Badge className={colors[state] || colors.IDLE}>
        {stateNames[state] || state}
      </Badge>
    );
  };

  const getActivityIcon = (state: BotState) => {
    if (state.includes('ONBOARDING')) return <User className="w-4 h-4" />;
    if (state.includes('INVENTORY')) return <CheckCircle className="w-4 h-4" />;
    if (state.includes('ORDER')) return <MessageCircle className="w-4 h-4" />;
    if (state.includes('DELIVERY')) return <AlertCircle className="w-4 h-4" />;
    if (state === 'IDLE') return <Pause className="w-4 h-4" />;
    return <Play className="w-4 h-4" />;
  };

  const ConversationCard = ({ conversation }: { conversation: typeof mockConversations[0] }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              {getActivityIcon(conversation.currentState as BotState)}
            </div>
            <div>
              <CardTitle className="text-lg">{conversation.restaurantName}</CardTitle>
              <CardDescription>{conversation.contactName}</CardDescription>
            </div>
          </div>
          {getStateBadge(conversation.currentState as BotState)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{conversation.phoneNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>התחיל: {conversation.createdAt.toLocaleDateString('he-IL')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>עדכון אחרון: {conversation.lastActivity.toLocaleDateString('he-IL')} {conversation.lastActivity.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span>{conversation.messageCount} הודעות</span>
          </div>
          {conversation.conversationHistory.length > 0 && (
            <div className="p-2 bg-muted rounded-md">
              <div className="text-xs text-muted-foreground mb-1">הודעה אחרונה:</div>
              <div className="text-sm truncate">
                {conversation.conversationHistory[conversation.conversationHistory.length - 1].message}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedConversation(conversation);
                  setIsDialogOpen(true);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>צפייה בשיחה</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>התערבות ידנית</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>סיום שיחה</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
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
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
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
          <h1 className="text-3xl font-bold">שיחות</h1>
          <p className="text-muted-foreground">נהל את כל השיחות הפעילות עם הבוט</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי מסעדה, איש קשר, טלפון או מזהה שיחה..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select 
            value={selectedState} 
            onChange={(e) => setSelectedState(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="ONBOARDING_WELCOME">רישום</option>
            <option value="SETUP_SUPPLIER">הגדרת ספק</option>
            <option value="INVENTORY_COLLECTING">איסוף מלאי</option>
            <option value="ORDER_REVIEW">בדיקת הזמנה</option>
            <option value="DELIVERY_CHECKLIST">בדיקת משלוח</option>
            <option value="IDLE">ללא פעילות</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <select 
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="p-2 border rounded-md"
          >
            <option value="activity-desc">פעילות (חדש→ישן)</option>
            <option value="activity-asc">פעילות (ישן→חדש)</option>
            <option value="created-desc">יצירה (חדש→ישן)</option>
            <option value="created-asc">יצירה (ישן→חדש)</option>
            <option value="messages-desc">הודעות (רבות→מעטות)</option>
            <option value="messages-asc">הודעות (מעטות→רבות)</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">סה״כ שיחות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">רישום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {conversations.filter(c => c.currentState.includes('ONBOARDING')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">מלאי</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {conversations.filter(c => c.currentState.includes('INVENTORY')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">הזמנות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {conversations.filter(c => c.currentState.includes('ORDER')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ללא פעילות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {conversations.filter(c => c.currentState === 'IDLE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConversations.map((conversation) => (
          <ConversationCard key={conversation.id} conversation={conversation} />
        ))}
      </div>

      {/* Conversation Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedConversation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  שיחה עם {selectedConversation.restaurantName}
                </DialogTitle>
                <DialogDescription>
                  {selectedConversation.contactName} • {selectedConversation.phoneNumber}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="messages" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="messages">הודעות</TabsTrigger>
                  <TabsTrigger value="state">מצב נוכחי</TabsTrigger>
                  <TabsTrigger value="data">נתונים</TabsTrigger>
                </TabsList>
                
                <TabsContent value="messages" className="space-y-4">
                  <div className="max-h-96 overflow-y-auto space-y-3 p-4 border rounded-md">
                    {selectedConversation.conversationHistory.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}>
                          <div className="text-sm">{message.message}</div>
                          <div className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="כתוב הודעה..." className="flex-1" />
                    <Button>שלח</Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="state" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label>מצב נוכחי:</Label>
                      {getStateBadge(selectedConversation.currentState as BotState)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>תאריך יצירה</Label>
                        <Input value={selectedConversation.createdAt.toLocaleString('he-IL')} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>עדכון אחרון</Label>
                        <Input value={selectedConversation.lastActivity.toLocaleString('he-IL')} readOnly />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="data" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>נתוני מצב</Label>
                      <div className="mt-2 p-4 bg-muted rounded-md">
                        <pre className="text-sm overflow-auto">
                          {JSON.stringify(selectedConversation.stateData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
