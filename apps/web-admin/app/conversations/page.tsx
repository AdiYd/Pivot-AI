'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, PivotAvatar } from '@/components/ui';

// Import the example database
import exampleDatabase from '@/schema/example';
import { useTheme } from 'next-themes';
import { BotState, Contact, Conversation, DataBase, Message, Restaurant, StateObject } from '@/schema/types';
import { DebugButton, debugFunction } from '@/components/debug';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/lib/firebaseClient';
import { stateObject } from '@/schema/states';
import Avatar from 'boring-avatars';


// Enhanced conversation type with display-specific properties
interface EnhancedConversation extends Conversation {
  phone: Contact['whatsapp'];
  hasRestaurant: boolean;
  restaurantName?: string;
  contactName?: string;
  messageCount: number;
  stateCategory: 'onboarding' | 'setup' | 'inventory' | 'order' | 'delivery' | 'idle' | 'other';
}

const stateNames: Partial<Record<BotState, string>> = {
  'INIT': 'התחלה',
  'ONBOARDING_COMPANY_NAME': 'שם חברה',
  'ONBOARDING_LEGAL_ID': 'מספר ח.פ',
  'ONBOARDING_RESTAURANT_NAME': 'שם מסעדה',
  'ONBOARDING_CONTACT_NAME': 'שם איש קשר',
  'ONBOARDING_CONTACT_EMAIL': 'אימייל',
  'ONBOARDING_PAYMENT_METHOD': 'אמצעי תשלום',
  'ONBOARDING_SIMULATOR': 'מצב סימולטור',
  'WAITING_FOR_PAYMENT': 'ממתין לתשלום',
  'SETUP_SUPPLIERS_START': 'התחלת הגדרת ספקים',
  'SETUP_SUPPLIERS_ADDITIONAL': 'ספקים נוספים',
  'SUPPLIER_CATEGORY': 'קטגוריית ספק',
  'SUPPLIER_CONTACT': 'פרטי ספק',
  'PRODUCTS_LIST': 'רשימת מוצרים',
  'PRODUCTS_BASE_QTY': 'כמויות בסיס',
  'RESTAURANT_FINISHED': 'סיום הגדרת מסעדה',
  'RESTAURANT_INFO': 'פרטי מסעדה',
  'ORDERS_INFO': 'פרטי הזמנות',
  'IDLE': 'תפריט',
  'HELP': 'עזרה',
  'INTERESTED': 'מעוניין'
};

const getStateCategory = (state: BotState): 'onboarding' | 'setup' | 'inventory' | 'order' | 'delivery' | 'idle' | 'other' => {
  if (state.startsWith('ONBOARDING') || state === 'WAITING_FOR_PAYMENT' || state === 'INIT') return 'onboarding';
  if (state.startsWith('PRODUCTS') || state.includes('SUPPLIER') || state.includes('SUPPLIERS')) return 'setup';
  if (state.startsWith('INVENTORY')) return 'inventory';
  if (state.startsWith('ORDER')) return 'order';
  if (state === 'IDLE' || state ==='RESTAURANT_FINISHED') return 'idle';
  return 'other';
};

const categoryNames: Record<string, string> = {
  onboarding: 'רישום מסעדה',
  setup: 'רישום ספקים',
  // inventory: 'מלאי',
  order: 'הזמנות',
  idle: 'תפריט ראשי',
  other: 'אחר'
};

export default function ConversationsPage() {
  const {database, databaseLoading, refreshDatabase} = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<EnhancedConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'activity' | 'created' | 'messages'>('activity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const {theme} = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const {toast} = useToast();

  // Change loading state when database is ready
  useEffect(() => {
    if (databaseLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [databaseLoading]);
  
  // Function to scroll to the bottom of the chat container
  const scrollToBottom = useCallback(() => {
    chatContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

// Extract and enhance conversation data from the example database
const enhancedConversations = useMemo((): EnhancedConversation[] => {

  try {
    const conversations: EnhancedConversation[] = [];

    Object.entries(database.conversations).forEach(([phone, conversation]) => {
      // Find restaurant info if associated
      const restaurant: Restaurant | undefined = conversation.restaurantId ? (database.restaurants as Record<string, Restaurant>)[conversation.restaurantId] : undefined;
      let contactName = undefined;
      
      // Add this section to include restaurant name
      const restaurantName = restaurant?.name || conversation.context?.restaurantName || 'מסעדה לא רשומה';
      
      if (!!restaurant) {
        contactName = restaurant.contacts?.[phone]?.name || 'אורח';
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
}, [database]);


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
      const matchesRestaurant = selectedRestaurant === 'all' || (conversation.restaurantId || conversation.context?.legalId) === selectedRestaurant;
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

  const getStateBadge = useCallback((state: BotState) => {
    const category = getStateCategory(state);
    const colors: Record<string, string> = {
      onboarding: 'bg-teal-200 text-black dark:bg-teal-200 dark:text-black',
      setup: 'bg-violet-200 text-black dark:bg-violet-200 dark:text-black',
      inventory: 'bg-amber-200 text-black dark:bg-amber-200 dark:text-black',
      order: 'bg-emerald-200 text-black dark:bg-emerald-200 dark:text-black',
      delivery: 'bg-orange-200 text-black dark:bg-orange-200 dark:text-black',
      idle: 'bg-sky-200 text-black dark:bg-sky-200 dark:text-black',
      other: 'bg-rose-200 text-black dark:bg-rose-200 dark:text-black'
    };
    
    return (
      <div className="flex items-center gap-1">
        <Badge  className={colors[category] + ' text-[0.6rem]'}>
          {stateNames[state] || state}
        </Badge>
      </div>
    );
  }, []);

  const getRelativeTime = useCallback((date: Date | any): string => {
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
  }, []);

  const openConversation = useCallback((conversation: EnhancedConversation) => {
    setSelectedConversation(conversation);
    setIsDialogOpen(true);
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [scrollToBottom]);

  const ConversationCard = useCallback(({ conversation }: { conversation: EnhancedConversation }) => {
    const lastMessage = conversation.messages.length > 0 ?
      conversation.messages[conversation.messages.length - 1] : null;
   
    
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
                  <span className="truncate">{lastMessage.body}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }, [getRelativeTime, getStateBadge, toast, openConversation, ]);

  const ConversationTable = useCallback(({ conversations }: { conversations: EnhancedConversation[] }) => {
    return (
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
                    <span>{conversation.contactName || 'אורח'}</span>
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
  )}, [sortBy, sortOrder, getRelativeTime, getStateBadge, openConversation]);



  const ChatBubble = useCallback(({ message, isBot, index, context }: { message: any; isBot: boolean, index: number, context: Record<string, any> }) => {
  // Ensure we have a proper date
  const messageDate = message.createdAt instanceof Date ? 
    message.createdAt : 
    message.createdAt?.toDate?.() || new Date();
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4 ${index === 0 ? 'mt-16' : ''}`}>
      <div className={`flex my-2 items-end gap-2 max-w-[70%]* ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`p-2 max-sm:hidden rounded-full ${isBot ? '' : 'bg-blue-100 dark:bg-blue-900'}`}>
          {isBot ? (
            <PivotAvatar />
          ) : (
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          )}
        </div>
          <div dir='rtl' className={cn(
            "rounded-[10px] min-w-[30%]* shadow-md px-2 py-2 overflow-visible max-w-3xl max-sm:max-w-[340px] break-words",
            isBot
              ? "bg-white dark:bg-zinc-800 rounded-bl-none" 
              : "text-start bg-[#DCF8C6] rounded-br-none backdrop-blur-md text-black dark:bg-[#005C4B] dark:text-[#E9EDEF]"
          )}>
            {message.hasTemplate ? <WhatsAppTemplateRenderer message={message} context={context} onSelect={()=>{}} /> : 
              <p className="text-sm whitespace-pre-wrap">
                     {(() => {
                            // First, replace URLs with placeholders to preserve them during bold processing
                            const urlRegex = /(https?:\/\/[^\s]+)/g;
                            const textWithPlaceholders = (message.body.replace('user_confirmed', '*אישור*') || '').replace(urlRegex, '###URL$1###');
                            
                            // Then process bold formatting
                            const partsWithPlaceholders = textWithPlaceholders.split(/(\*[^*]+\*)/g);
                            
                            // Process each part, restoring URLs and applying formatting
                            return partsWithPlaceholders.map((part: string, index: number) => {
                              // First check if this is a bold text part
                              if (part.startsWith('*') && part.endsWith('*')) {
                                // Still need to check for URLs within bold text
                                const boldContent = part.slice(1, -1);
                                const boldWithUrls = boldContent.replace(/###URL(https?:\/\/[^\s]+)###/g, (_, url) => {
                                  return `<a href="${url}" target="_blank" style="color: #00BFFF; text-decoration: underline;">${url}</a>`;
                                });
                                
                                // Use dangerouslySetInnerHTML only if there are URLs, otherwise just return the bold text
                                if (boldWithUrls !== boldContent) {
                                  return <strong key={index} dangerouslySetInnerHTML={{ __html: boldWithUrls }} />;
                                }
                                return <strong key={index}>{boldContent}</strong>;
                              } 
                              
                              // Not bold text, check for URLs
                              if (part.includes('###URL')) {
                                // Replace URL placeholders with actual links
                                const textWithLinks = part.replace(/###URL(https?:\/\/[^\s]+)###/g, (_, url) => {
                                  return `<a href="${url}" style="color: #00BFFF !important; text-decoration: underline;" target="_blank" rel="noopener noreferrer">${url}</a>`;
                                });
                                return <span key={index} dangerouslySetInnerHTML={{ __html: textWithLinks }} />;
                              }
                              
                              // Regular text with no special formatting
                              return part;
                            });
                          })()}
              </p>}
          <div className={`text-xs mt-1 ${
            isBot ? "text-muted-foreground text-start" : "text-gray-800/80 dark:text-gray-400 text-end"
          }`}>
            {messageDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
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
    <div className="p-4 max-sm:p-2 space-y-6">
      <DebugButton debugFunction={debugFunction} />
      {/* Header */}
      <div style={{marginTop:'0px'}} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">שיחות</h1>
          <p className="text-muted-foreground">
            נהל את כל השיחות עם הבוט
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
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
          <Button className='max-sm:hidden' onClick={refreshDatabase}>
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
          <Filter className="w-4 max-sm:hidden h-4 text-muted-foreground" />
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
        {/* <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="כל המסעדות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המסעדות</SelectItem>
            {Object.entries(database.restaurants).map(([id, restaurant]) => (
              <SelectItem key={id} value={id}>{restaurant.name}</SelectItem>
            ))}
          </SelectContent>
        </Select> */}
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
        <DialogContent className="max-w-6xl dark:bg-stone-950 flex flex-col max-h-[85vh] min-h-[80vh] overflow-y-auto p-0">
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

                  <TabsContent value="messages" className={`flex-1 whatsapp-chat-container h-[stretch]* chat-whatsApp h-fit max-h-[100vh] py-6 m-0`}>
                    <div className={`h-full min-h-[90vh] overflow-y-auto flex flex-col`}>
                      {/* Chat Messages */}
                      <div className={`flex-1 overflow-y-auto pb-20 p-6 space-y-1 chat-whatsApp ${isDark ? 'dark-chat' : 'light-chat'} min-h-[83vh]`}>
                        {selectedConversation.messages.length > 0 ? (
                          selectedConversation.messages.map((message, index) => (
                            <ChatBubble 
                              key={index} 
                              index={index}
                              context={selectedConversation.context || {}}
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
                        <div className='h-0' ref={chatContainerRef} />
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

interface WhatsAppTemplateProps {
  message: Message;
  context: Record<string, any>;
  onSelect: (template: string) => void;
}

const WhatsAppTemplateRenderer = ({ message, context={}, onSelect }: WhatsAppTemplateProps): JSX.Element | null => {
  const [hasClientRendered, setHasClientRendered] = useState(false);
   const {database} = useFirebase();
  const conversation :Conversation =  {
    currentState: message?.messageState || "INIT",
    context: {
      isSimulator: true,
      ...(database.conversations[context?.contactNumber]?.context || {}),
      ...context,
    },
    messages: [],
    role: 'מנהל',
  }

  useEffect(() => {
    setHasClientRendered(true);
  }, []);
  
  if (!hasClientRendered) {
    // Return a simple placeholder during server rendering
    return <div className="p-3 bg-muted rounded-md">Loading template...</div>;
  }
  if (!message.templateId || !message.hasTemplate) return null;
  
  // Try to get the template from STATE_MESSAGES
  let template : StateObject['whatsappTemplate'];
  const currentState = message.messageState;
  
  if (message.templateId === 'approval_template') {
      const approvalMessageWrapper = `
          ${message.body}
          ` 
          // Send the approval Template message for whatsapp card with button to approve
      template = {
        id: 'approval_template',
        type: 'button',
        body: approvalMessageWrapper,
        options: [
          { name: 'אישור', id: 'user_confirmed' },
        ]
      }   
  }
  else if (currentState && stateObject(conversation)) {
    template = stateObject(conversation).whatsappTemplate;
  }
  
  // If no template found or no state info, try to use the message body directly
  if (!template) {
    try {
      // Try to parse the template from the message body if it's in JSON format
      if (typeof message.body === 'string' && message.body.trim().startsWith('{')) {
        template = JSON.parse(message.body);
      } else {
        return (
          <div className="p-3 rounded-md">
            <p className="text-sm whitespace-pre-line">{message.body}</p>
            <div className="text-xs text-muted-foreground mt-2">
              Template ID: {message.templateId || 'Unknown'}
            </div>
          </div>
        );
      }
    } catch (e) {
      return (
        <div suppressHydrationWarning className="p-3 bg-muted rounded-md">
          <p className="text-sm">{message.body}</p>
          <div className="text-xs text-muted-foreground mt-2">
            Template ID: {message.templateId || 'Unknown'}
          </div>
        </div>
      );
    }
  }
  
  // If still no template, return a basic rendering of the message
  if (!template) {
    return (
      <div className="p-3 bg-muted rounded-md">
        <p className="text-sm">{message.body}</p>
      </div>
    );
  }
  
  // WhatsApp UI style constants
  const styles = {
    container: "rounded-[10px] px-4 mb-2 min-h-full rounded-bl-none overflow-visible max-w-lg min-w-[300px] max-sm:!min-w-[260px] w-full",
    header: "p-3 bg-green-500 text-white",
    mediaHeader: "w-full h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden",
    body: "p-2 text-sm",
    footer: "border-gray-200 dark:border-gray-700",
    buttonContainer: "grid overflow-y-visible",
    listContainer: "border-gray-200 dark:border-gray-700 min-h-full overflow-y-visible",
    listItem: "p-3 flex items-center text-sm justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors cursor-pointer border-b last:border-b-0 my-0 flex justify-center border-gray-400 overflow-y-auto",
    buttonMultiple: "p-3 flex text-center items-center text-sm justify-center gap-2 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors cursor-pointer border rounded-lg my-0.5 flex justify-center border-gray-400 overflow-y-auto",
    buttonSingle: "btn-primary",
    cardContainer: "p-3 space-y-2",
    cardItem: "bg-gray-100 border text-center dark:bg-gray-800 rounded-md p-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer",
  };

  // Process body text with context variables
  let bodyText = message.body || template.body;
  if (context && typeof bodyText === 'string') {
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = new RegExp(`{${key}}`, 'g');
      bodyText = bodyText.replace(placeholder, String(value || ''));
    });
  }
  
  // Header component
  const renderHeader = () => {
    if (!template?.header) return null;
    
    if (template.header.type === "media" && template.header.mediaUrl) {
      return (
        <div className={styles.mediaHeader}>
          
        </div>
      );
    } else if (template.header.type === "text" && template.header.text) {
      return (
        <div className={styles.header}>
          <h3 className="font-medium">{template.header.text}</h3>
        </div>
      );
    }
    
    return null;
  };

  // Text template
  const renderTextTemplate = () => {
    return (
      <div className={styles.container}>
        {renderHeader()}
        <div className={styles.body}>
          {bodyText.split('\n').map((line: any, i: number) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {line.split(/(\*[^*]+\*)/g).map((part: any, j: number) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                return part;
              })}
            </p>
          ))}
        </div>
      </div>
    );
  };

  // Button template
  const renderButtonTemplate = () => {
    return (
      <div className={styles.container}>
        {renderHeader()}
        <div className={styles.body}>
          {bodyText.split('\n').map((line: any, i: number) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {line.split(/(\*[^*]+\*)/g).map((part: any, j: number) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                return part;
              })}
            </p>
          ))}
        </div>
        {template.options && template.options.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.buttonContainer}>
              {template.options.map((option: any, index: number) => (
                <button
                  key={option.id}
                  onClick={() => onSelect(option.id)}
                  className={template.options?.length === 1 ? styles.buttonSingle : styles.buttonMultiple}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // List template
  const renderListTemplate = () => {
    return (
      <div className={styles.container}>
        {renderHeader()}
        <div className={styles.body}>
          {bodyText.split('\n').map((line : any, i: number) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {line.split(/(\*[^*]+\*)/g).map((part : any, j: number) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                return part;
              })}
            </p>
          ))}
        </div>
        {template.options && template.options.length > 0 && (
          <div className={styles.listContainer}>
            {template.options.map((option : any) => (
              <div key={option.id} className={styles.listItem} onClick={() => onSelect(option.id)}>
                <span className='mx-auto'>{option.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Card template
  const renderCardTemplate = () => {
    return (
      <div className={styles.container}>
        {renderHeader()}
        <div className={styles.body}>
          {bodyText.split('\n').map((line: any, i: number) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {line.split(/(\*[^*]+\*)/g).map((part: any, j: number) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                return part;
              })}
            </p>
          ))}
        </div>
        {template.options && template.options.length > 0 && (
          <div className={styles.cardContainer}>
            {template.options.map((option) => (
              <div key={option.id} className={styles.cardItem} onClick={() => onSelect(option.id)}>
                <div className="font-medium">{option.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render the appropriate template based on type
  switch (template.type) {
    case "text":
      return renderTextTemplate();
    case "button":
      return renderButtonTemplate();
    case "list":
      return renderListTemplate();
    case "card":
      return renderCardTemplate();
    default:
      return renderTextTemplate();
  }
};

