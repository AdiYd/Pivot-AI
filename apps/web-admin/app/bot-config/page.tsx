'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Clock, 
  MessageSquare, 
  Bell, 
  Users, 
  ShoppingCart,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Mock bot config data matching backend types
const mockBotConfig = {
  // Timing configurations
  timing: {
    inventoryReminderOffset: 60, // minutes before cutoff
    orderTimeout: 1440, // minutes to wait for order confirmation
    deliveryFollowupDelay: 30, // minutes after delivery to ask for confirmation
    maxRetries: 3,
    retryDelay: 15, // minutes between retries
  },
  
  // Message configurations
  messages: {
    maxMessageLength: 1600, // WhatsApp limit
    useEmojis: true,
    includeOrderSummaryTable: true,
    sendReceiptPhotos: true,
  },
  
  // Business logic
  business: {
    allowOrderModifications: true,
    requireDeliveryConfirmation: true,
    autoCalculateShortages: true,
    enableInventoryPredictions: false,
    defaultParLevelBuffer: 0.2, // 20% buffer
  },
  
  // Notifications
  notifications: {
    notifyOnNewOrders: true,
    notifyOnDeliveries: true,
    notifyOnShortages: true,
    notifyOnPaymentIssues: true,
    quietHoursStart: 22, // 10 PM
    quietHoursEnd: 7, // 7 AM
  },
  
  // AI/GPT settings
  ai: {
    enabled: true,
    model: 'gpt-4o',
    maxTokens: 500,
    temperature: 0.3,
    enableInventoryParser: true,
    enableOrderSummarizer: true,
  },
  
  // System settings
  system: {
    debugMode: false,
    logLevel: 'info' as const,
    enableMetrics: true,
    rateLimitPerMinute: 60,
    webhookTimeout: 30000, // ms
  }
};

type BotConfig = typeof mockBotConfig;

export default function BotConfigPage() {
  const [config, setConfig] = useState<BotConfig>(mockBotConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const updateConfig = (section: keyof BotConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "הגדרות נשמרו",
        description: "הגדרות הבוט עודכנו בהצלחה",
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "שגיאה בשמירה",
        description: "אירעה שגיאה בעדכון ההגדרות",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(mockBotConfig);
    setHasChanges(false);
    toast({
      title: "הגדרות איופסו",
      description: "ההגדרות חזרו לערכי ברירת המחדל",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              הגדרות בוט
            </h1>
            <p className="text-muted-foreground mt-1">
              ניהול הגדרות והתנהגות הבוט במערכת
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                יש שינויים לא שמורים
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              איפוס
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              שמירה
            </Button>
          </div>
        </div>

        {/* Configuration Tabs */}
        <Tabs defaultValue="timing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="timing" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              תזמון
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              הודעות
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              עסקי
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              התראות
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              AI
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              מערכת
            </TabsTrigger>
          </TabsList>

          {/* Timing Settings */}
          <TabsContent value="timing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  הגדרות תזמון
                </CardTitle>
                <CardDescription>
                  ניהול זמני תזכורות, פסקי זמן והתראות
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="inventoryReminderOffset" className="flex items-center gap-2">
                      תזכורת מלאי (דקות לפני חיתוך)
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          כמה דקות לפני שעת החיתוך לשלוח תזכורת מלאי
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="inventoryReminderOffset"
                      type="number"
                      value={config.timing.inventoryReminderOffset}
                      onChange={(e) => updateConfig('timing', 'inventoryReminderOffset', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="orderTimeout" className="flex items-center gap-2">
                      פסק זמן אישור הזמנה (דקות)
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          כמה זמן לחכות לאישור הזמנה לפני ביטול אוטומטי
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="orderTimeout"
                      type="number"
                      value={config.timing.orderTimeout}
                      onChange={(e) => updateConfig('timing', 'orderTimeout', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFollowupDelay">
                      עיכוב מעקב משלוח (דקות)
                    </Label>
                    <Input
                      id="deliveryFollowupDelay"
                      type="number"
                      value={config.timing.deliveryFollowupDelay}
                      onChange={(e) => updateConfig('timing', 'deliveryFollowupDelay', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxRetries">
                      מספר ניסיונות מקסימלי
                    </Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      value={config.timing.maxRetries}
                      onChange={(e) => updateConfig('timing', 'maxRetries', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Settings */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  הגדרות הודעות
                </CardTitle>
                <CardDescription>
                  ניהול פורמט ותוכן ההודעות הנשלחות
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxMessageLength">
                      אורך הודעה מקסימלי (תווים)
                    </Label>
                    <Input
                      id="maxMessageLength"
                      type="number"
                      value={config.messages.maxMessageLength}
                      onChange={(e) => updateConfig('messages', 'maxMessageLength', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>שימוש באמוג׳ים</Label>
                      <p className="text-sm text-muted-foreground">
                        הוספת אמוג׳ים לטקסט ההודעות
                      </p>
                    </div>
                    <Switch
                      checked={config.messages.useEmojis}
                      onCheckedChange={(checked) => updateConfig('messages', 'useEmojis', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>כללת טבלת סיכום הזמנה</Label>
                      <p className="text-sm text-muted-foreground">
                        הצגת טבלה מסודרת עם פרטי ההזמנה
                      </p>
                    </div>
                    <Switch
                      checked={config.messages.includeOrderSummaryTable}
                      onCheckedChange={(checked) => updateConfig('messages', 'includeOrderSummaryTable', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>שליחת תמונות קבלות</Label>
                      <p className="text-sm text-muted-foreground">
                        בקשה לתמונות קבלות בעת קבלת משלוח
                      </p>
                    </div>
                    <Switch
                      checked={config.messages.sendReceiptPhotos}
                      onCheckedChange={(checked) => updateConfig('messages', 'sendReceiptPhotos', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Settings */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  הגדרות עסקיות
                </CardTitle>
                <CardDescription>
                  ניהול חוקי עסקיים והתנהגות המערכת
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>אפשר שינויי הזמנות</Label>
                      <p className="text-sm text-muted-foreground">
                        לקוחות יכולים לשנות הזמנות לפני שליחה לספק
                      </p>
                    </div>
                    <Switch
                      checked={config.business.allowOrderModifications}
                      onCheckedChange={(checked) => updateConfig('business', 'allowOrderModifications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>דרוש אישור משלוח</Label>
                      <p className="text-sm text-muted-foreground">
                        לקוחות חייבים לאשר קבלת משלוח
                      </p>
                    </div>
                    <Switch
                      checked={config.business.requireDeliveryConfirmation}
                      onCheckedChange={(checked) => updateConfig('business', 'requireDeliveryConfirmation', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>חישוב אוטומטי של חסרים</Label>
                      <p className="text-sm text-muted-foreground">
                        המערכת תחשב אוטומטית כמויות חסרות במשלוח
                      </p>
                    </div>
                    <Switch
                      checked={config.business.autoCalculateShortages}
                      onCheckedChange={(checked) => updateConfig('business', 'autoCalculateShortages', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>ניבוי מלאי חכם</Label>
                      <p className="text-sm text-muted-foreground">
                        שימוש ב-AI לניבוי צרכי מלאי עתידיים
                      </p>
                    </div>
                    <Switch
                      checked={config.business.enableInventoryPredictions}
                      onCheckedChange={(checked) => updateConfig('business', 'enableInventoryPredictions', checked)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultParLevelBuffer" className="flex items-center gap-2">
                    באפר ברירת מחדל לרמת פאר (אחוזים)
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        כמה אחוזים להוסיף לרמת הפאר כבאפר בטיחות
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="defaultParLevelBuffer"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={config.business.defaultParLevelBuffer}
                    onChange={(e) => updateConfig('business', 'defaultParLevelBuffer', parseFloat(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  הגדרות התראות
                </CardTitle>
                <CardDescription>
                  ניהול התראות למנהלי המערכת
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>התראה על הזמנות חדשות</Label>
                      <p className="text-sm text-muted-foreground">
                        שליחת התראה בעת יצירת הזמנה חדשה
                      </p>
                    </div>
                    <Switch
                      checked={config.notifications.notifyOnNewOrders}
                      onCheckedChange={(checked) => updateConfig('notifications', 'notifyOnNewOrders', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>התראה על משלוחים</Label>
                      <p className="text-sm text-muted-foreground">
                        שליחת התראה בעת קבלת משלוח
                      </p>
                    </div>
                    <Switch
                      checked={config.notifications.notifyOnDeliveries}
                      onCheckedChange={(checked) => updateConfig('notifications', 'notifyOnDeliveries', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>התראה על חסרים</Label>
                      <p className="text-sm text-muted-foreground">
                        שליחת התראה בעת זיהוי מוצרים חסרים
                      </p>
                    </div>
                    <Switch
                      checked={config.notifications.notifyOnShortages}
                      onCheckedChange={(checked) => updateConfig('notifications', 'notifyOnShortages', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>התראה על בעיות תשלום</Label>
                      <p className="text-sm text-muted-foreground">
                        שליחת התראה בעת כשל בתהליך תשלום
                      </p>
                    </div>
                    <Switch
                      checked={config.notifications.notifyOnPaymentIssues}
                      onCheckedChange={(checked) => updateConfig('notifications', 'notifyOnPaymentIssues', checked)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="quietHoursStart">
                      שעות שקט - התחלה
                    </Label>
                    <Input
                      id="quietHoursStart"
                      type="number"
                      min="0"
                      max="23"
                      value={config.notifications.quietHoursStart}
                      onChange={(e) => updateConfig('notifications', 'quietHoursStart', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quietHoursEnd">
                      שעות שקט - סיום
                    </Label>
                    <Input
                      id="quietHoursEnd"
                      type="number"
                      min="0"
                      max="23"
                      value={config.notifications.quietHoursEnd}
                      onChange={(e) => updateConfig('notifications', 'quietHoursEnd', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  הגדרות AI
                </CardTitle>
                <CardDescription>
                  ניהול יכולות הבינה המלאכותית במערכת
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>הפעלת AI</Label>
                    <p className="text-sm text-muted-foreground">
                      שימוש ביכולות בינה מלאכותית למשימות שונות
                    </p>
                  </div>
                  <Switch
                    checked={config.ai.enabled}
                    onCheckedChange={(checked) => updateConfig('ai', 'enabled', checked)}
                  />
                </div>
                
                {config.ai.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="aiModel">
                          מודל AI
                        </Label>
                        <Input
                          id="aiModel"
                          value={config.ai.model}
                          onChange={(e) => updateConfig('ai', 'model', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="maxTokens">
                          מקסימום טוקנים
                        </Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          value={config.ai.maxTokens}
                          onChange={(e) => updateConfig('ai', 'maxTokens', parseInt(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="temperature">
                          טמפרטורה (יצירתיות)
                        </Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={config.ai.temperature}
                          onChange={(e) => updateConfig('ai', 'temperature', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>מנתח מלאי חכם</Label>
                          <p className="text-sm text-muted-foreground">
                            שימוש ב-AI לפענוח הודעות מלאי טבעיות
                          </p>
                        </div>
                        <Switch
                          checked={config.ai.enableInventoryParser}
                          onCheckedChange={(checked) => updateConfig('ai', 'enableInventoryParser', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>מסכם הזמנות</Label>
                          <p className="text-sm text-muted-foreground">
                            יצירת סיכומי הזמנות אוטומטיים
                          </p>
                        </div>
                        <Switch
                          checked={config.ai.enableOrderSummarizer}
                          onCheckedChange={(checked) => updateConfig('ai', 'enableOrderSummarizer', checked)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  הגדרות מערכת
                </CardTitle>
                <CardDescription>
                  הגדרות טכניות ותפעוליות של המערכת
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>מצב דיבוג</Label>
                      <p className="text-sm text-muted-foreground">
                        הפעלת לוגים מפורטים לצורכי פיתוח
                      </p>
                    </div>
                    <Switch
                      checked={config.system.debugMode}
                      onCheckedChange={(checked) => updateConfig('system', 'debugMode', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>איסוף מטריקות</Label>
                      <p className="text-sm text-muted-foreground">
                        איסוף נתוני ביצועים וסטטיסטיקות שימוש
                      </p>
                    </div>
                    <Switch
                      checked={config.system.enableMetrics}
                      onCheckedChange={(checked) => updateConfig('system', 'enableMetrics', checked)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="logLevel">
                      רמת לוגים
                    </Label>
                    <select
                      id="logLevel"
                      className="w-full p-2 border rounded-md"
                      value={config.system.logLevel}
                      onChange={(e) => updateConfig('system', 'logLevel', e.target.value)}
                    >
                      <option value="error">שגיאות בלבד</option>
                      <option value="warn">אזהרות ומעלה</option>
                      <option value="info">מידע ומעלה</option>
                      <option value="debug">דיבוג (הכל)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rateLimitPerMinute">
                      הגבלת קצב (בקשות לדקה)
                    </Label>
                    <Input
                      id="rateLimitPerMinute"
                      type="number"
                      value={config.system.rateLimitPerMinute}
                      onChange={(e) => updateConfig('system', 'rateLimitPerMinute', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="webhookTimeout">
                      פסק זמן webhook (מילישניות)
                    </Label>
                    <Input
                      id="webhookTimeout"
                      type="number"
                      value={config.system.webhookTimeout}
                      onChange={(e) => updateConfig('system', 'webhookTimeout', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Footer */}
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="flex items-center gap-2 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-800 dark:text-green-200">
              המערכת פועלת תקין - כל ההגדרות פעילות
            </span>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
