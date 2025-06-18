'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Badge } from '@/components/ui';
import {Icon} from '@iconify/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Label } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { 
  Search, 
  MessageCircle, 
  Clock,
  User,
  Bot,
  Filter,
  ArrowUpDown,
  Phone,
  MessageSquare,
  X,
  RefreshCw,
  Table as TableIcon,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

// Import the example database
import exampleDatabase from '@/schema/example';
import { useTheme } from 'next-themes';
import { BotState, Contact, Conversation, Message } from '@/schema/types';
import { DebugButton, debugFunction } from '@/components/debug';

// Enhanced conversation type with display-specific properties
interface EnhancedConversation extends Conversation {
  phone: Contact['whatsapp'];
  hasRestaurant: boolean;
  restaurantName?: string;
  contactName?: string;
  messageCount: number;
  stateCategory: 'onboarding' | 'setup' | 'inventory' | 'order' | 'delivery' | 'idle' | 'other';
}

const stateNames: Record<string, string> = {
  'INIT': 'התחלה',
  'ONBOARDING_COMPANY_NAME': 'שם חברה',
  'ONBOARDING_LEGAL_ID': 'מספר ח.פ',
  'ONBOARDING_RESTAURANT_NAME': 'שם מסעדה',
  'ONBOARDING_YEARS_ACTIVE': 'שנות פעילות',
  'ONBOARDING_CONTACT_NAME': 'שם איש קשר',
  'ONBOARDING_CONTACT_EMAIL': 'אימייל',
  'ONBOARDING_PAYMENT_METHOD': 'אמצעי תשלום',
  'WAITING_FOR_PAYMENT': 'ממתין לתשלום',
  'SETUP_SUPPLIERS_START': 'התחלת הגדרת ספקים',
  'SETUP_SUPPLIERS_ADDITIONAL': 'ספקים נוספים',
  'SUPPLIER_CATEGORY': 'קטגוריית ספק',
  'SUPPLIER_CONTACT': 'פרטי ספק',
  'SUPPLIER_REMINDERS': 'תזכורות ספק',
  'PRODUCTS_LIST': 'רשימת מוצרים',
  'PRODUCTS_BASE_QTY': 'כמויות בסיס',
  'RESTAURANT_FINISHED': 'סיום הגדרת מסעדה',
  'INVENTORY_SNAPSHOT_START': 'התחלת ספירת מלאי',
  'INVENTORY_SNAPSHOT_CATEGORY': 'קטגוריית מלאי',
  'INVENTORY_SNAPSHOT_PRODUCT': 'מוצר במלאי',
  'INVENTORY_SNAPSHOT_QTY': 'כמות במלאי',
  'INVENTORY_CALCULATE_SNAPSHOT': 'חישוב מלאי',
  'ORDER_SETUP_START': 'התחלת הזמנה',
  'ORDER_CONFIRMATION': 'אישור הזמנה',
  'DELIVERY_START': 'התחלת משלוח',
  'DELIVERY_CHECK_ITEM': 'בדיקת פריט',
  'DELIVERY_RECEIVED_AMOUNT': 'כמות שהתקבלה',
  'DELIVERY_INVOICE_PHOTO': 'צילום חשבונית',
  'IDLE': 'רגיל'
};

const getStateCategory = (state: BotState): 'onboarding' | 'setup' | 'inventory' | 'order' | 'delivery' | 'idle' | 'other' => {
  if (state.startsWith('ONBOARDING') || state === 'WAITING_FOR_PAYMENT') return 'onboarding';
  if (state.startsWith('SETUP') || state.startsWith('SUPPLIER') || state.startsWith('PRODUCT')) return 'setup';
  if (state.startsWith('INVENTORY')) return 'inventory';
  if (state.startsWith('ORDER')) return 'order';
  if (state.startsWith('DELIVERY')) return 'delivery';
  if (state === 'IDLE') return 'idle';
  return 'other';
};

const categoryNames: Record<string, string> = {
  onboarding: 'רישום',
  setup: 'הגדרות',
  inventory: 'מלאי',
  order: 'הזמנות',
  delivery: 'משלוחים',
  idle: 'רגיל',
  other: 'אחר'
};

export default function ConversationsPage() {
  const [data, setData] = useState(exampleDatabase);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<EnhancedConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'activity' | 'created' | 'messages'>('activity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const {theme} = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Extract and enhance conversation data from the example database
const enhancedConversations = useMemo((): EnhancedConversation[] => {
  try {
    const conversations: EnhancedConversation[] = [];

    Object.entries(data.conversations).forEach(([phone, conversation]) => {
      // Find restaurant info if associated
      const restaurant = conversation.restaurantId ? data.restaurants[conversation.restaurantId] : undefined;
      let contactName = undefined;
      
      // Add this section to include restaurant name
      const restaurantName = restaurant?.name || conversation.context?.restaurantName || 'מסעדה לא רשומה';
      
      if (!!restaurant) {
        contactName = restaurant.contacts?.find(c => c.whatsapp === phone)?.name || 'אורח';
      } else {
        // Try to get name from context
        contactName = conversation.context?.contactName || conversation.context?.name || 'אורח';
      }
      
      // Map messages to the format needed for UI - ensure createdAt is a Date object
      const mappedMessages = (conversation.messages || []).map((message) => ({
        ...message,
        // Ensure createdAt is a Date object
        createdAt: message.createdAt instanceof Date ? message.createdAt : message.createdAt?.toDate?.() || new Date(),
      })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // Determine state category for filtering
      const stateCategory = getStateCategory(conversation.currentState);
      
      // Ensure dates are properly converted
      const createdAt = conversation.createdAt instanceof Date ? conversation.createdAt : conversation.createdAt?.toDate?.() || new Date();
      const updatedAt = conversation.updatedAt instanceof Date ? conversation.updatedAt : conversation.updatedAt?.toDate?.() || new Date();
              
      conversations.push({
        ...conversation,
        phone,
        contactName,
        restaurantName, // Add this line
        hasRestaurant: !!restaurant,
        restaurantId: conversation.restaurantId || undefined,
        messages: mappedMessages,
        messageCount: mappedMessages.length,
        stateCategory,
        createdAt,
        updatedAt
      });
    });

    return conversations;
  } catch (error) {
    console.error('Error processing conversations:', error);
    return [];
  }
}, [data]);

  // Filter conversations based on search and filters
const filteredConversations = useMemo(() => {
  return enhancedConversations
    .filter(conversation => {
      // Search filtering
      const matchesSearch = !searchTerm || 
        conversation.restaurantName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        conversation.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.phone?.includes(searchTerm) ||
        (stateNames[conversation.currentState]?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (conversation.context?.businessName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
      // Category filtering  
      const matchesCategory = selectedCategory === 'all' || conversation.stateCategory === selectedCategory;
      
      // Restaurant filtering - check if the conversation's restaurantId matches the selected restaurant
      const matchesRestaurant = selectedRestaurant === 'all' || conversation.restaurantId === selectedRestaurant;
      
      return matchesSearch && matchesCategory && matchesRestaurant;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'activity':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
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
}, [enhancedConversations, searchTerm, selectedCategory, selectedRestaurant, sortBy, sortOrder]);
  

// Calculate statistics from real data
  const stats = useMemo(() => {
    try {
      const total = enhancedConversations.length;
      const idle = enhancedConversations.filter(c => c.currentState === 'IDLE').length;
      const totalMessages = enhancedConversations.reduce((sum, c) => sum + c.messageCount, 0);
      
      // Category distribution
      const categoryStats = enhancedConversations.reduce((acc, conversation) => {
        acc[conversation.stateCategory] = (acc[conversation.stateCategory] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Restaurant activity
      const restaurantStats = enhancedConversations.reduce((acc, conversation) => {
        if (!conversation.restaurantId) return acc;
        
        if (!acc[conversation.restaurantId]) {
          acc[conversation.restaurantId] = {
            conversationCount: 0,
            messageCount: 0,
            lastActivity: null
          };
        }
        acc[conversation.restaurantId].conversationCount++;
        acc[conversation.restaurantId].messageCount += conversation.messageCount;
        if (!acc[conversation.restaurantId].lastActivity || 
            conversation.updatedAt > acc[conversation.restaurantId].lastActivity) {
          acc[conversation.restaurantId].lastActivity = conversation.updatedAt;
        }
        return acc;
      }, {} as Record<string, any>);

      return {
        total,
        idle,
        totalMessages,
        categoryStats,
        restaurantStats,
        averageMessages: total > 0 ? Math.round(totalMessages / total) : 0,
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        total: 0,
        active: 0,
        idle: 0,
        totalMessages: 0,
        categoryStats: {},
        restaurantStats: {},
        averageMessages: 0,
        activePercentage: 0
      };
    }
  }, [enhancedConversations]);

  const getStateBadge = (state: BotState) => {
    const category = getStateCategory(state);
    const colors: Record<string, string> = {
      onboarding: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      setup: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      inventory: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      order: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      delivery: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      idle: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      other: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    
    return (
      <div className="flex items-center gap-1">
        <Badge className={colors[category]}>
          {stateNames[state] || state}
        </Badge>
      </div>
    );
  };

  const getRelativeTime = (date: Date | any): string => {
    // Convert to Date if it's a Timestamp
    const dateObj = date instanceof Date ? date : date?.toDate?.() || new Date();
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'עכשיו';
    if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  const openConversation = (conversation: EnhancedConversation) => {
    setSelectedConversation(conversation);
    setIsDialogOpen(true);
  };

  const ConversationCard = ({ conversation }: { conversation: EnhancedConversation }) => {
    const lastMessage = conversation.messages.length > 0 ? 
      conversation.messages[conversation.messages.length - 1] : null;
    const {toast} = useToast();
    
    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
        openConversation(conversation);
        toast({ title: `פתיחת שיחה עם ${conversation.phone}`, description: `מספר: ${conversation.phone}`, duration: 2000});
      }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-tr from-green-50 to-green-100 dark:from-green-900 dark:to-green-800`}>
                <Icon icon="ic:outline-whatsapp" className="w-6 h-6 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">{conversation.restaurantName}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {conversation.contactName}
                </CardDescription>
              </div>
            </div>
            {getStateBadge(conversation.currentState)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="font-mono">{conversation.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>{conversation.messageCount} הודעות</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{getRelativeTime(conversation.updatedAt)}</span>
            </div>
            {lastMessage && (
              <div className="p-2 bg-muted rounded-md">
                <div className="text-xs text-muted-foreground mb-1">הודעה אחרונה:</div>
                <div className="text-sm truncate flex items-center gap-1">
                  {lastMessage.role === 'user' ? (
                    <User className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Icon icon="mingcute:ai-fill" width="24" height="24" className='text-green-600 dark:text-green-400' />
                  )}
                  <span className="truncate">{lastMessage.body}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ConversationTable = ({ conversations }: { conversations: EnhancedConversation[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">מספר טלפון</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'activity') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('activity');
                    setSortOrder('desc');
                  }
                }}>
                  עדכון אחרון
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">מסעדה</TableHead>
              <TableHead className="text-right">איש קשר</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'messages') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('messages');
                    setSortOrder('desc');
                  }
                }}>
                  הודעות
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">מצב שיחה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conversation) => (
              <TableRow  onClick={() => openConversation(conversation)} key={conversation.phone} className="hover:bg-gray-50 cursor-pointer dark:hover:bg-gray-900/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon icon="ic:outline-whatsapp" className="w-4 h-4 text-green-500" />
                    <span className="font-mono text-sm">{conversation.phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{getRelativeTime(conversation.updatedAt)}</span>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{conversation.restaurantName || 'לא משויך'}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{conversation.contactName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-start font-medium">
                    {conversation.messageCount}
                  </div>
                </TableCell>
                <TableCell>
                  {getStateBadge(conversation.currentState)}
                </TableCell>
              </TableRow>
            ))}
            
            {conversations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium mb-1">לא נמצאו שיחות</h3>
                    <p className="text-muted-foreground text-sm">נסה לשנות את הסינון או לחפש מחדש</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const ChatBubble = ({ message, isBot, index }: { message: any; isBot: boolean, index: number }) => {
  // Ensure we have a proper date
  const messageDate = message.createdAt instanceof Date ? 
    message.createdAt : 
    message.createdAt?.toDate?.() || new Date();
    
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4 ${index === 0 ? 'mt-16' : ''}`}>
      <div className={`flex my-2 items-end gap-2 max-w-[70%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`p-2 max-sm:hidden rounded-full ${isBot ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
          {isBot ? (
            <Icon icon="mingcute:ai-fill" width="24" height="24" className='text-green-600 dark:text-green-400' />
          ) : (
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div className={`rounded-lg p-3 ${
          isBot 
            ? 'bg-gray-100 rounded-bl-none dark:bg-gray-800 incoming text-gray-900 dark:text-gray-100' 
            : 'bg-teal-500 rounded-br-none text-white'
        }`}>
          <div dir='auto' className="text-sm whitespace-pre-wrap">{message.body}</div>
          <div className={`text-xs mt-1 ${
            isBot ? 'text-gray-500 dark:text-gray-400' : 'text-blue-100'
          }`}>
            {messageDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className="p-6 max-sm:p-2 space-y-6">
      <DebugButton debugFunction={debugFunction} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">שיחות</h1>
          <p className="text-muted-foreground">
            נהל את כל השיחות עם הבוט
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 max-sm:hidden">
            <span className="text-sm opacity-80">תצוגה:</span>
            <div className="flex flex-row-reverse gap-2 items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                title='הצג בכרטיסיות'
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="h-8 w-8 p-0"
              >
                <Icon icon="mdi:id-card" width="1.5em" height="1.5em" />
              </Button>
              <Button
                title='הצג בטבלה'
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 w-8 p-0"
              >
                <TableIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 ml-2" />
            רענן
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-4">
        {`נמצאו ${filteredConversations.length} שיחות מתוך ${enhancedConversations.length} סה"כ`}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {/* View Mode Toggle (mobile) */}
        <div className="flex items-center gap-2 sm:hidden">
          <span className="text-sm opacity-80">תצוגה:</span>
          <div className="flex flex-row-reverse gap-2 items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              title='הצג בכרטיסיות'
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 w-8 p-0"
            >
              <Icon icon="mdi:id-card" width="1.5em" height="1.5em" />
            </Button>
            <Button
              title='הצג בטבלה'
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 w-8 p-0"
            >
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative flex-1 min-w-64 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי מסעדה, איש קשר, טלפון או מצב..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex items-center max-sm:flex-row-reverse gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="כל הקטגוריות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {Object.entries(categoryNames).map(([key, value]) => (
                <SelectItem key={key} value={key}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Improved restaurant filter with proper labeling */}
        <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="כל המסעדות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המסעדות</SelectItem>
            {Object.entries(data.restaurants).map(([id, restaurant]) => (
              <SelectItem key={id} value={id}>{restaurant.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center max-sm:flex-row-reverse gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <Select 
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity-desc">הכי חדשות</SelectItem>
              <SelectItem value="activity-asc">הכי ישנות</SelectItem>
              <SelectItem value="messages-desc">הכי הרבה הודעות</SelectItem>
              <SelectItem value="messages-asc">הכי מעט הודעות</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content: Table or Cards */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <ConversationCard key={conversation.phone} conversation={conversation} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Icon icon='ic:outline-whatsapp' className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">לא נמצאו שיחות</h3>
              <p className="text-muted-foreground">נסה לשנות את מונחי החיפוש או המסנן</p>
            </div>
          )}
        </div>
      ) : (
        <ConversationTable conversations={filteredConversations} />
      )}

      {/* Enhanced Conversation Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] gap-0 overflow-hidden p-0">
          {selectedConversation && (
            <>
              <DialogHeader className="p-4 pb-4 sticky* absolute w-full top-0 bg-background/60 backdrop-blur-md z-10 border-b">
                <div className="flex items-center justify-between">
                  <div className='flex gap-4 items-center max-sm:flex-col max-sm:gap-1'>
                    <DialogTitle className="flex items-center gap-2">
                      <Icon icon="ic:outline-whatsapp" width="24" height="24" />
                      שיחה עם {selectedConversation.restaurantName}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4" />
                      {selectedConversation.contactName} • {selectedConversation.phone}
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 left-4 h-8 w-8 p-0 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-md"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogHeader>

              <div className="flex-1 overflow-hidden relative">
                <Tabs defaultValue="messages" className="h-full relative overflow-y-auto flex flex-col">
                  <div className='absolute -top-4 w-full flex justify-center'>
                    <TabsList className="grid bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-xl w-[90%] grid-cols-3 mx-6 mt-4">
                      <TabsTrigger value="messages">שיחה</TabsTrigger>
                      <TabsTrigger value="state">מצב נוכחי</TabsTrigger>
                      <TabsTrigger value="context">נתונים שנאספו</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="messages" className={`flex-1 whatsapp-chat-container chat-whatsApp ${isDark ? 'dark-chat' : 'light-chat'} h-fit max-h-[100vh] py-6 m-0`}>
                    <div className="h-full overflow-y-auto flex flex-col pb-16">
                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto mb-8 p-6 space-y-1">
                        {selectedConversation.messages.length > 0 ? (
                          selectedConversation.messages.map((message, index) => (
                            <ChatBubble 
                              key={index} 
                              index={index}
                              message={message} 
                              isBot={message.role === 'assistant'} 
                            />
                          ))
                        ) : (
                          <div className="text-center mt-16 text-muted-foreground py-8">
                            <MessageCircle className="w-12 h-12 mx-auto mb-4" />
                            <p>אין הודעות בשיחה זו</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir='rtl' value="state" className="space-y-4 mt-6 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Label>מצב נוכחי:</Label>
                        {getStateBadge(selectedConversation.currentState)}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>תאריך התחלה</Label>
                          <Input value={selectedConversation.createdAt.toLocaleString('he-IL')} readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label>עדכון אחרון</Label>
                          <Input value={selectedConversation.updatedAt.toLocaleString('he-IL')} readOnly />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>סה״כ הודעות</Label>
                          <Input value={selectedConversation.messageCount.toString()} readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label>קטגוריית מצב</Label>
                          <Input value={categoryNames[selectedConversation.stateCategory]} readOnly />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="context" className="space-y-4 mt-6 p-6">
                    <div className="space-y-4">
                      <div>
                        <Label>נתונים שנאספו</Label>
                        <div className="mt-2 p-4 bg-muted rounded-md max-h-96 overflow-auto">
                          <pre className="text-sm whitespace-pre-wrap">
                            {Object.keys(selectedConversation.context).length > 0 
                              ? JSON.stringify(selectedConversation.context, null, 2)
                              : 'אין נתונים זמינים'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

