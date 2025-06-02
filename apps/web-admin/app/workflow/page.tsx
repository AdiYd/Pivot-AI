'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BotState } from '@/schema/types';
import { BOT_MESSAGES, BOT_CONFIG } from '@/schema/botMessages';
import { 
  Search, 
  MessageSquare, 
  Edit,
  Save,
  RotateCcw,
  Copy,
  Eye,
  Play,
  CheckCircle,
  AlertCircle,
  Filter,
  Loader2
} from 'lucide-react';

// Define message types
type MessageType = 'initial' | 'prompt' | 'confirmation' | 'error';

// Organize states by category
const stateCategories = {
  'רישום': [
    'INIT',
    'ONBOARDING_COMPANY_NAME',
    'ONBOARDING_LEGAL_ID',
    'ONBOARDING_RESTAURANT_NAME',
    'ONBOARDING_YEARS_ACTIVE',
    'ONBOARDING_CONTACT_NAME',
    'ONBOARDING_CONTACT_EMAIL',
    'ONBOARDING_PAYMENT_METHOD',
    'WAITING_FOR_PAYMENT',
  ],
  'הגדרת ספקים': [
    'SETUP_SUPPLIERS_START',
    'SUPPLIER_CATEGORY',
    'SUPPLIER_NAME',
    'SUPPLIER_WHATSAPP',
    'SUPPLIER_DELIVERY_DAYS',
    'SUPPLIER_CUTOFF_TIME',
    'PRODUCT_NAME',
    'PRODUCT_UNIT',
    'PRODUCT_QTY',
    'PRODUCT_PAR_MIDWEEK',
    'PRODUCT_PAR_WEEKEND',
  ],
  'מלאי': [
    'INVENTORY_SNAPSHOT_START',
    'INVENTORY_SNAPSHOT_CATEGORY',
    'INVENTORY_SNAPSHOT_PRODUCT',
    'INVENTORY_SNAPSHOT_QTY',
    'INVENTORY_CALCULATE_SNAPSHOT',
  ],
  'הזמנות': [
    'ORDER_START',
    'ORDER_CONFIRMATION',
  ],
  'משלוחים': [
    'DELIVERY_START',
    'DELIVERY_CHECK_ITEM',
    'DELIVERY_RECEIVED_AMOUNT',
    'DELIVERY_INVOICE_PHOTO',
  ],
  'כללי': [
    'IDLE',
  ]
};

// Hebrew names for states
const stateNames: Record<string, string> = {
  'INIT': 'אתחול',
  'ONBOARDING_COMPANY_NAME': 'שם החברה',
  'ONBOARDING_LEGAL_ID': 'מספר ח.פ',
  'ONBOARDING_RESTAURANT_NAME': 'שם המסעדה',
  'ONBOARDING_YEARS_ACTIVE': 'שנות פעילות',
  'ONBOARDING_CONTACT_NAME': 'שם איש קשר',
  'ONBOARDING_CONTACT_EMAIL': 'אימייל איש קשר',
  'ONBOARDING_PAYMENT_METHOD': 'אמצעי תשלום',
  'WAITING_FOR_PAYMENT': 'ממתין לתשלום',
  'SETUP_SUPPLIERS_START': 'התחלת הגדרת ספקים',
  'SUPPLIER_CATEGORY': 'קטגוריית ספק',
  'SUPPLIER_NAME': 'שם הספק',
  'SUPPLIER_WHATSAPP': 'וואטסאפ הספק',
  'SUPPLIER_DELIVERY_DAYS': 'ימי אספקה',
  'SUPPLIER_CUTOFF_TIME': 'שעת סגירת הזמנות',
  'PRODUCT_NAME': 'שם המוצר',
  'PRODUCT_UNIT': 'יחידת מידה',
  'PRODUCT_QTY': 'כמות מוצר',
  'PRODUCT_PAR_MIDWEEK': 'רמת מלאי אמצע שבוע',
  'PRODUCT_PAR_WEEKEND': 'רמת מלאי סוף שבוע',
  'INVENTORY_SNAPSHOT_START': 'התחלת בדיקת מלאי',
  'INVENTORY_SNAPSHOT_CATEGORY': 'קטגוריית מלאי',
  'INVENTORY_SNAPSHOT_PRODUCT': 'מוצר במלאי',
  'INVENTORY_SNAPSHOT_QTY': 'כמות במלאי',
  'INVENTORY_CALCULATE_SNAPSHOT': 'חישוב מלאי',
  'ORDER_START': 'התחלת הזמנה',
  'ORDER_CONFIRMATION': 'אישור הזמנה',
  'DELIVERY_START': 'התחלת משלוח',
  'DELIVERY_CHECK_ITEM': 'בדיקת פריט',
  'DELIVERY_RECEIVED_AMOUNT': 'כמות שהתקבלה',
  'DELIVERY_INVOICE_PHOTO': 'צילום חשבונית',
  'IDLE': 'ללא פעילות'
};

export default function WorkflowPage() {
  // Convert the BOT_MESSAGES structure to a format compatible with our UI
  const convertToUIFormat = () => {
    const result: Record<string, Record<MessageType, string>> = {};
    
    // Handle top-level objects with nested structures (like onboarding, suppliers)
    Object.entries(BOT_MESSAGES).forEach(([category, messages]) => {
      if (typeof messages === 'object' && messages !== null) {
        Object.entries(messages).forEach(([key, value]) => {
          // Skip non-string values (like helper functions)
          if (typeof value !== 'string') return;
          
          // Try to match with a state
          const stateKey = findMatchingState(category, key);
          if (stateKey) {
            if (!result[stateKey]) {
              result[stateKey] = { initial: '', prompt: '', confirmation: '', error: '' };
            }
            
            // Determine message type based on key
            const messageType = determineMessageType(key);
            if (messageType) {
              result[stateKey][messageType] = value;
            }
          }
        });
      }
    });
    
    // For states that don't have all message types, fill in defaults
    Object.keys(stateNames).forEach(state => {
      if (!result[state]) {
        result[state] = { initial: '', prompt: '', confirmation: '', error: '' };
      }
    });
    
    return result;
  };
  
  const findMatchingState = (category: string, key: string): string | null => {
    // Try to match key with state name
    const stateKeys = Object.keys(stateNames);
    
    // Direct match
    const directMatch = stateKeys.find(s => 
      s.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(s.toLowerCase().replace('_', ''))
    );
    if (directMatch) return directMatch;
    
    // Category-based match
    if (category === 'onboarding') {
      if (key.includes('welcome')) return 'INIT';
      if (key.includes('askLegalId')) return 'ONBOARDING_LEGAL_ID';
      if (key.includes('askRestaurantName')) return 'ONBOARDING_RESTAURANT_NAME';
      if (key.includes('askYearsActive')) return 'ONBOARDING_YEARS_ACTIVE';
      if (key.includes('askContactName')) return 'ONBOARDING_CONTACT_NAME';
      if (key.includes('askContactEmail')) return 'ONBOARDING_CONTACT_EMAIL';
      if (key.includes('askPaymentMethod')) return 'ONBOARDING_PAYMENT_METHOD';
      if (key.includes('paymentConfirmed')) return 'WAITING_FOR_PAYMENT';
    }
    else if (category === 'suppliers') {
      if (key.includes('startSetup')) return 'SETUP_SUPPLIERS_START';
      if (key.includes('askSupplierName')) return 'SUPPLIER_NAME';
      if (key.includes('askSupplierDetails')) return 'SUPPLIER_DELIVERY_DAYS';
      if (key.includes('askCutoffTime')) return 'SUPPLIER_CUTOFF_TIME';
      if (key.includes('askProductList')) return 'PRODUCT_NAME';
      if (key.includes('askParLevelMidweek')) return 'PRODUCT_PAR_MIDWEEK';
      if (key.includes('askParLevelWeekend')) return 'PRODUCT_PAR_WEEKEND';
    }
    else if (category === 'inventory') {
      if (key.includes('reminderMessage')) return 'INVENTORY_SNAPSHOT_START';
      if (key.includes('askCurrentStock')) return 'INVENTORY_SNAPSHOT_QTY';
      if (key.includes('categorySelected')) return 'INVENTORY_SNAPSHOT_CATEGORY';
      if (key.includes('calculateOrder')) return 'ORDER_CONFIRMATION';
    }
    else if (category === 'delivery') {
      if (key.includes('deliveryNotification')) return 'DELIVERY_START';
      if (key.includes('checkItem')) return 'DELIVERY_CHECK_ITEM';
      if (key.includes('askReceivedAmount')) return 'DELIVERY_RECEIVED_AMOUNT';
      if (key.includes('askInvoicePhoto')) return 'DELIVERY_INVOICE_PHOTO';
    }
    
    return null;
  };
  
  const determineMessageType = (key: string): MessageType | null => {
    if (key.includes('initial') || 
        key.includes('welcome') || 
        key.includes('start') || 
        key === 'reminderMessage' ||
        key === 'deliveryNotification') {
      return 'initial';
    }
    if (key.includes('ask') || 
        key.includes('prompt')) {
      return 'prompt';
    }
    if (key.includes('confirmation') || 
        key.includes('completed') || 
        key === 'paymentConfirmed' ||
        key === 'supplierCompleted') {
      return 'confirmation';
    }
    if (key.includes('error') || 
        key.includes('invalid')) {
      return 'error';
    }
    return null;
  };

  const [messages, setMessages] = useState<Record<string, Record<MessageType, string>>>(convertToUIFormat());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingMessage, setEditingMessage] = useState<{
    state: string;
    type: MessageType;
    value: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredStates = Object.keys(stateNames).filter((state) => {
    const matchesSearch = stateNames[state].toLowerCase().includes(searchTerm.toLowerCase()) ||
                         state.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCategory === 'all') return matchesSearch;
    
    const categoryStates = stateCategories[selectedCategory as keyof typeof stateCategories] || [];
    return matchesSearch && categoryStates.includes(state);
  });

  const handleSaveMessage = () => {
    if (!editingMessage) return;
    
    setMessages(prev => {
      const updated = { ...prev };
      if (!updated[editingMessage.state]) {
        updated[editingMessage.state] = { initial: '', prompt: '', confirmation: '', error: '' };
      }
      
      updated[editingMessage.state] = {
        ...updated[editingMessage.state],
        [editingMessage.type]: editingMessage.value
      };
      return updated;
    });
    
    setEditingMessage(null);
    setHasChanges(true);
  };

  const handleCopyMessage = (state: string, type: MessageType) => {
    const text = messages[state]?.[type] || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(`העתקת ${stateNames[state]} - ${getTypeLabel(type)}`);
      setTimeout(() => setCopySuccess(null), 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setHasChanges(false);
    setIsSaving(false);
  };

  const getTypeLabel = (type: MessageType): string => {
    switch (type) {
      case 'initial': return 'הודעת פתיחה';
      case 'prompt': return 'בקשה מהמשתמש';
      case 'confirmation': return 'אישור';
      case 'error': return 'הודעת שגיאה';
    }
  };

  const getTypeIcon = (type: MessageType) => {
    switch (type) {
      case 'initial': return <Play className="w-4 h-4 text-blue-500" />;
      case 'prompt': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'confirmation': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const MessageCard = ({ 
    state, 
    type
  }: { 
    state: string; 
    type: MessageType;
  }) => {
    const message = messages[state]?.[type] || '';
    
    return (
    message? 
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {getTypeIcon(type)}
            <div>
              <CardTitle className="text-base">{getTypeLabel(type)}</CardTitle>
              <CardDescription className="text-xs">{type === 'error' ? 'הודעה במקרה של שגיאה' : ''}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-md min-h-[60px] max-h-[120px] overflow-y-auto">
              <div className="text-sm whitespace-pre-wrap">
                {message || <span className="text-muted-foreground italic">לא הוגדר...</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
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
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopyMessage(state, type)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>העתק</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
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
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card> : null
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
        {[...Array(3)].map((_, categoryIndex) => (
          <div key={categoryIndex} className="space-y-4">
            <Skeleton className="h-6 w-28" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, cardIndex) => (
                <Card key={cardIndex}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">עורך הודעות הבוט</h1>
          <p className="text-muted-foreground">ערוך את ההודעות של הבוט לכל שלב בתהליך העבודה</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => setHasChanges(false)}>
              <RotateCcw className="w-4 h-4 ml-2" />
              בטל שינויים
            </Button>
          )}
          <Button onClick={handleSaveAll} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                {hasChanges ? 'שמור שינויים' : 'הכל שמור'}
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Notification */}
      {copySuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <Alert className="fixed bottom-[5%] z-20 bg-green-50 w-fit border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{copySuccess}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>יש לך שינויים שלא נשמרו</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי שם שלב או תיאור..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue placeholder="כל הקטגוריות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {Object.keys(stateCategories).map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* States List */}
      <div className="space-y-12 grid sm:grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredStates.length > 0 ? (
          filteredStates.map((state, index) => (
            <motion.div 
              key={state} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index % 5) }}
              className="space-y-4 h-auto flex flex-col items-start justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {stateNames[state]}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">{state}</span>
              </div>

              <div className="grid grid-cols-auto items-start w-[fill-available] h-[fill-available] gap-4">
                <MessageCard state={state} type="initial" />
                <MessageCard state={state} type="prompt" />
                <MessageCard state={state} type="confirmation" />
                <MessageCard state={state} type="error" />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">לא נמצאו תוצאות לחיפוש שלך</p>
          </div>
        )}
      </div>

      {/* Edit Message Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={(open) => !open && setEditingMessage(null)}>
        <DialogContent className="max-w-2xl">
          {editingMessage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  עריכת הודעת בוט
                </DialogTitle>
                <DialogDescription>
                  {stateNames[editingMessage.state]} - {getTypeLabel(editingMessage.type)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message-text">תוכן ההודעה</Label>
                  <textarea
                    id="message-text"
                    className="w-full h-40 p-3 border rounded-md resize-none"
                    value={editingMessage.value}
                    onChange={(e) => setEditingMessage(prev => prev ? { ...prev, value: e.target.value } : null)}
                    placeholder="הזן את תוכן ההודעה..."
                  />
                </div>
                
                <div className="p-4 bg-muted rounded-md">
                  <div className="text-sm font-medium mb-2">משתני תבנית זמינים:</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><code>&#123;supplierName&#125;</code> - שם הספק</div>
                    <div><code>&#123;productName&#125;</code> - שם המוצר</div>
                    <div><code>&#123;emoji&#125;</code> - אימוג&apos;י המוצר</div>
                    <div><code>&#123;quantity&#125;</code> - כמות</div>
                    <div><code>&#123;unit&#125;</code> - יחידת מידה</div>
                    <div><code>&#123;contactName&#125;</code> - שם איש הקשר</div>
                    <div><code>&#123;restaurantName&#125;</code> - שם המסעדה</div>
                    <div><code>&#123;paymentLink&#125;</code> - קישור לתשלום</div>
                    <div><code>&#123;deliveryDays&#125;</code> - ימי אספקה</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMessage(null)}>
                  ביטול
                </Button>
                <Button onClick={handleSaveMessage}>
                  <Save className="w-4 h-4 ml-2" />
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
