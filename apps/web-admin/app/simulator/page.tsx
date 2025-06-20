'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, collection, query, orderBy, getDocs, deleteDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Bot,
  User,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Icon } from '@iconify/react/dist/iconify.js';
import { BotState, Conversation, Message, StateObject } from '@/schema/types';
import { STATE_MESSAGES } from '@/schema/states';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { DebugButton, debugFunction } from '@/components/debug';
import { PivotAvatar, Textarea } from '@/components/ui';

// Types
interface SimulatorSession extends Omit<Conversation, 'messages'> {
  phoneNumber: string;
  isConnected: boolean;
  isLoading: boolean;
  messages: (Message & { status?: string })[];
}

// Configuration
const FUNCTION_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5001/pivot-chatbot-fdfe0/us-central1/whatsappWebhook'
  : 'https://us-central1-pivot-chatbot-fdfe0.cloudfunctions.net/whatsappWebhook';

const SIMULATOR_API_KEY = process.env.NEXT_PUBLIC_SIMULATOR_API_KEY;

export default function SimulatorPage() {
  const [session, setSession] = useState<SimulatorSession>({
    phoneNumber: '0523456789',
    messages: [],
    isConnected: false,
    isLoading: false,
    role: 'owner',
    context: {},
    currentState: 'INIT',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [newMessage, setNewMessage] = useState('');
  const [templateSelect, setTemplateSelect] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [availableConversations, setAvailableConversations] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { toast } = useToast();
  const [isDark, setIsDark] = useState(false);
  const { textareaRef, resizeTextarea } = useAutoResizeTextarea();


useEffect(() => {
  setIsDark(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
}, [theme]);
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  // Focus input when connected
  useEffect(() => {
    if (session.isConnected && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [session.isConnected, session.messages, textareaRef]);

  // Load available conversations on mount
  useEffect(() => {
    const fetchAvailableConversations = async () => {
      try {
        const conversationsRef = collection(db, 'conversations_simulator');
        const conversationsSnapshot = await getDocs(conversationsRef);
        const conversations: string[] = [];
        
        conversationsSnapshot.forEach(doc => {
          conversations.push(doc.id);
        });
        
        setAvailableConversations(conversations);
      } catch (error) {
        console.error('Error loading available conversations:', error);
      }
    };

    fetchAvailableConversations();
  }, []);

  // Validate phone number
  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s|-/g, '');
    return /^05\d{8}$/.test(cleanPhone) || /^\+972\d{9}$/.test(cleanPhone);
  };

  // Start new session
  const startSession = async () => {
    if (!session.phoneNumber.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הזן מספר טלפון",
      });
      return;
    }

    if (!validatePhoneNumber(session.phoneNumber)) {
      toast({
        title: "מספר טלפון לא תקין",
        description: "אנא הזן מספר טלפון ישראלי תקין (05xxxxxxxxx)",
      });
      return;
    }

    const loadedSession : SimulatorSession = (await loadSession(session.phoneNumber)) as SimulatorSession;
    console.log('Loaded session:', loadedSession);
    // Convert messages to the correct format

    setSession(prev => ({
      ...prev,
      messages: loadedSession?.messages || [],
      currentState: loadedSession?.currentState || 'INIT',
      context: loadedSession?.context || {},
      isConnected: true,
      isLoading: false,
    }));

    toast({
      title: loadedSession ? "שיחה נטענה בהצלחה" : "התחברת בהצלחה",
      description: `מתחיל שיחה עם ${session.phoneNumber}${loadedSession ? ' (נטען היסטוריה)' : ''}`,
    });
    
    // Remove the auto-init message code that was here
    // Now the user must send the first message manually
  };

  // Send message to bot
  const sendMessage = async (messageContent: string, isUserMessage = true, isTemplate = false) => {
    if (!session.isConnected || !messageContent.trim()) return;

    // Create message object that matches the MessageSchema
    const userMessage: Message & { status?: string } = {
      role: 'user',
      body: messageContent.trim(),
      messageState: session.currentState,
      createdAt: new Date(),
      status: 'sending',
    };

    // Add user message to UI if it's a user message
    if (isUserMessage && !isTemplate) {
      setSession((prev: SimulatorSession) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true
      }));
    }

    try {
      const response = await axios.post(FUNCTION_URL, {
        phone: session.phoneNumber.replace(/\s|-/g, ''),
        message: messageContent,
        mediaUrl: undefined
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-simulator-api-key': SIMULATOR_API_KEY || 'simulator-dev-key'
        },
        timeout: 40000,
        withCredentials: false
      });
      
      // Update user message status
      if (isUserMessage && !isTemplate) {
        setSession(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.body === userMessage.body && msg.createdAt === userMessage.createdAt ? 
              { ...msg, status: 'delivered' } : msg
          ),
        }));
      }

      // Process bot responses
      if (response.data.success && response.data.responses) {
        const botMessages: (Message & { status?: string })[] = response.data.responses.map((content: Record<string, any>, index: number) => {
          // Check if the response contains a template or regular message
          const hasTemplate = !!content.template;
          let message: Message & { status?: string };
          
          if (hasTemplate) {
            message = {
              role: 'assistant',
              body: content.template.body,
              templateId: content.template.id,
              hasTemplate: true,
              messageState: response.data.newState?.currentState || session.currentState,
              createdAt: new Date(Date.now() + index * 100),
              status: 'delivered'
            };
          } else {
            message = {
              role: 'assistant',
              body: content.body,
              hasTemplate: false,
              messageState: response.data.newState?.currentState || session.currentState,
              createdAt: new Date(Date.now() + index * 100),
              status: 'delivered'
            };
          }
          
          return message;
        });

        // Add bot messages with animation delay
        for (let i = 0; i < botMessages.length; i++) {
          setTimeout(() => {
            setSession(prev => ({
              ...prev,
              messages: [...prev.messages, botMessages[i]],
              currentState: response.data.newState?.currentState || prev.currentState,
              context: response.data.newState?.context || prev.context,
              isLoading: i === botMessages.length - 1 ? false : prev.isLoading
            }));
          }, i * 500);
        }
      } else {
        throw new Error(response.data.error || 'תגובה לא צפויה מהשרת');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update user message status to failed
      if (isUserMessage && !isTemplate) {
        setSession(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.body === userMessage.body && msg.createdAt === userMessage.createdAt ? 
              { ...msg, status: 'failed' } : msg
          ),
          isLoading: false
        }));
      }

      let errorMessage = 'שגיאה לא ידועה';
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          errorMessage = 'לא ניתן להתחבר לשרת הפיתוח. ודא שהפונקציות פועלות (firebase emulators:start)';
        } else if (error.response?.status === 404) {
          errorMessage = 'הפונקציה לא נמצאה. ודא שה-URL נכון';
        } else if (error.response?.status === 403) {
          errorMessage = 'אין הרשאה לגשת לפונקציה';
        } else {
          errorMessage = error.response?.data?.error || error.message;
        }
      }

      toast({
        title: "שגיאה בשליחת הודעה",
        description: errorMessage,
      });
    }
  };

  // Handle form submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || session.isLoading) return;

    const message = newMessage;
    setNewMessage('');
    await sendMessage(message);
  };

  // Handle template selection
  const handleTemplateSelect = (selectedId: string) => {
    setTemplateSelect(selectedId);
    sendMessage(selectedId, true, true);
  };

  // Clear conversation
  const clearConversation = async (phoneNumber: string) => {
    setLoading(true);
    const isConfirmed = window.confirm('האם אתה בטוח שברצונך למחוק את השיחה? פעולה זו אינה ניתנת לביטול.');
    if (!isConfirmed) {
      setLoading(false);
      return; // User canceled the operation
    }
    await clearSession(phoneNumber);
    setSession(prev => ({
      ...prev,
      messages: [],
      isConnected: false,
      isLoading: false,
      currentState: 'INIT',
      context: {}
    }));
    setAvailableConversations(availableConversations.filter(conv => conv !== phoneNumber));
    setLoading(false);
    setNewMessage('');
    toast({
      title: "השיחה נוקתה",
      description: "כל ההודעות נמחקו",
    });
  };

  // Disconnect session
  const disconnectSession = () => {
    setSession({
      phoneNumber: '0523456789',
      messages: [],
      isConnected: false,
      isLoading: false,
      role: 'owner',
      context: {},
      currentState: 'INIT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setNewMessage('');
    
    toast({
      title: "התנתקת",
      description: "הסימולטור נותק בהצלחה",
    });
  };

  // Get status icon for message
  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <CheckCircle2 className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCircle2 className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Get state badge color
  const getStateBadgeColor = (state: string) => {
    if (state.includes('ONBOARDING')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (state.includes('INVENTORY')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (state.includes('ORDER')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    if (state.includes('DELIVERY')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    if (state === 'IDLE') return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };

  const debugFunctionLocal = async () => {
    console.log('Session:', session);
  };

  return (
    <div suppressHydrationWarning className="p-6 max-sm:p-0 pt-0 max-h-full space-y-6">
      <DebugButton debugFunction={debugFunctionLocal} />
      {/* Header */}
      <div className="flex* hidden items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Icon icon="logos:whatsapp-icon" width="1.3em" height="1.3em" />
            סימולטור WhatsApp
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[86vh]">
        {/* Control Panel */}
        <div className="lg:col-span-1 flex flex-col justify-between space-y-4">
          {/* Connection */}
          <Card>
            <CardHeader className='py-1'>
              <CardTitle className="text-lg">התחברות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!session.isConnected ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">מספר טלפון</Label>
                    <Input
                      id="phone"
                      dir='ltr'
                      placeholder="0501234567"
                      value={session.phoneNumber}
                      onChange={(e) => setSession(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && startSession()}
                    />
                  </div>
                   {availableConversations.length > 0 && availableConversations.map((conv) => (
                    <Badge onClick={() =>{setSession(prev => ({ ...prev, phoneNumber: conv }))}} key={conv} variant={session.phoneNumber === conv ? "default" : "outline"} className="mr-2 cursor-pointer">
                      {conv}
                    </Badge>
                  ))}
                  <Button disabled={!session.phoneNumber || !validatePhoneNumber(session.phoneNumber)} onClick={startSession} className="w-full text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-300">
                    התחבר
                    <Icon icon="mdi:whatsapp" width="1.2em" height="1.2em" className="ml-2" />
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">מחובר:</span>
                    <span className="text-sm">{session.phoneNumber}</span>
                  </div>
                  <Button onClick={disconnectSession} variant="outline" className="w-full">
                    התנתק
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Conversation State */}
          {session.currentState && (
            <Card className='max-h-[62vh] h-[fill-available] justify-start gap-2  overflow-y-hidden'>
              <CardHeader className='py-1'>
                <CardTitle className="text-lg">נתוני השיחה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 overflow-y-auto">
                {Object.keys(session.context).length > 0 && (
                  <div className='overflow-hidden'>
                    <div className="mt-1 self-end space-y-1">
                      {Object.entries(session.context).map(([key, value]) => (
                        <div dir='ltr' key={key} className="text-xs text-wrap bg-muted p-2 overflow-auto rounded-xl">
                          <span className="text-wrap font-semibold text-zinc-800 dark:text-zinc-200">{key}:</span> {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-3 overflow-hidden">
          <Card className="h-full  overflow-hidden flex flex-col">
            {/* Chat Header */}
            <CardHeader className="py-2 flex justify-between absolute bg-card/50 backdrop-blur-lg w-full z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="max-sm:hidden rounded-full flex items-center justify-center">
                    <PivotAvatar />
                  </div>
                  <div className="flex gap-2">
                    {/* <CardTitle className="text-sm max-sm:hidden">P-vot</CardTitle> */}
                    <div className="text-sm text-muted-foreground">
                      {session.isConnected && `${session.phoneNumber} • `}
                      {session.currentState && session.isConnected && 
                        <Badge
                          className={cn("mt-1 mx-1 font-mono text-xs", getStateBadgeColor(session.currentState))}
                        >
                        {session.currentState}
                      </Badge>}
                    </div>
                  </div>
                </div>
    
                 <div className="flex flex-row-reverse items-center gap-2">
                   {session.isConnected && <div className="flex w-fit items-center">
                      <Button title='מחיקת שיחה' size="sm" onClick={() => clearConversation(session.phoneNumber)} variant="ghost" className="w-full bg-transparent border-none hover:bg-red-500/50">
                        {loading ? <Loader2 style={{animationDuration:'1s'}} className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>}
                      {session.isConnected ? (
                        <Badge variant="default" className="bg-green-500 max-sm:hidden">
                          <Wifi className="w-3 h-3 ml-1" />
                          מחובר
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <WifiOff className="w-3 h-3 ml-1" />
                          לא מחובר
                        </Badge>
                      )}
                  </div>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className={`flex-1 
            chat-whatsApp
            ${isDark ? 'dark-chat': 'light-chat'}
              overflow-y-auto flex flex-col p-0`}>
              <ScrollArea className="flex-1 p-4 max-sm:p-2 pt-0">
                <div dir='rtl' className="space-y-4 my-20">
                  <AnimatePresence>
                    {session.messages?.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={cn(
                          "flex items-end flex-row-reverse gap-3",
                          message.role === 'assistant' ? "justify-start" : "justify-end ml-auto"
                        )}
                      >
                        {message.role === 'assistant' && (
                          <PivotAvatar float rotate/>
                        )}
                        
                       {!message.hasTemplate ? (
                        <div className={cn(
                          "rounded-[10px] min-w-[30%]* shadow-md px-4 py-2 max-w-full break-words",
                          message.role === 'assistant' 
                            ? "bg-white dark:bg-zinc-800 rounded-bl-none" 
                            : "text-start bg-[#DCF8C6] rounded-br-none backdrop-blur-md text-black dark:bg-[#005C4B] dark:text-[#E9EDEF]"
                        )}>
                          <p className="text-sm whitespace-pre-wrap">
                           {
                            (message.body || '').split(/(\*[^*]+\*)/g).map((part, index) => {
                              if (part.startsWith('*') && part.endsWith('*')) {
                                return <strong key={index}>{part.slice(1, -1)}</strong>;
                              }
                              return part;
                            })
                          }
                          </p>
                          <div className={cn(
                            "flex items-center gap-2 mt-1",
                            message.role === 'assistant' ? "justify-end" : "justify-start"
                          )}>
                            <span className={cn(
                              "text-xs",
                              message.role === 'assistant' ? "text-muted-foreground" : "text-gray-800/80 dark:text-gray-400"
                            )}>
                              {message.createdAt.toLocaleTimeString('he-IL', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {message.status === 'failed' && getMessageStatusIcon(message.status)}
                          </div>
                        </div>
                       ) : (
                        <div className='border shadow-md rounded-lg p-1 w-full overflow-hidden max-w-lg bg-white dark:bg-zinc-800'>
                          <WhatsAppTemplateRenderer 
                            onSelect={handleTemplateSelect} 
                            message={message} 
                            context={session.context} 
                          />
                        </div>
                       )}

                        {message.role === 'user' && (
                          <div className="w-8 h-8 bg-blue-500 max-sm:hidden rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing Indicator */}
                  {session.isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-row-reverse justify-start gap-3"
                    >
                      <div className=" rounded-full flex items-center justify-center">
                        <PivotAvatar />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-2">
                        <div className="flex relative -bottom-1 gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Empty State */}
                  {session.messages?.length === 0 && !session.isLoading && (
                    <div className="text-center py-8 bg-card/90 w-fit m-auto p-8 rounded-xl backdrop-blur-lg">
                      <Icon icon="mdi:message-text" width="2em" height="2em" className="text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-lg font-medium mb-2">
                        {session.isConnected ? 'התחל שיחה' : 'התחבר כדי להתחיל'}
                      </h3>
                      <p className="text-muted-foreground">
                        {session.isConnected 
                          ? 'שלח הודעה כדי להתחיל לבדוק את הבוט'
                          : 'הזן מספר טלפון והתחבר כדי להתחיל סימולציה'
                        }
                      </p>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Input Area */}
              {session.isConnected && (
                <div className=" z-10 p-4 absolute bottom-0 left-0 right-0 ">
                  <form  onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <Textarea
                        ref={textareaRef}
                        placeholder="הקלד הודעה... (Ctrl+Enter לשורה חדשה)"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          setTimeout(resizeTextarea, 0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                          if (e.key === 'Enter' && e.ctrlKey) {
                            setNewMessage(prev => prev + '\n');
                          }
                        }}
                        disabled={session.isLoading}
                        className="flex-1 min-h-[40px] h-auto* max-h-[120px] rounded-2xl shadow-md bg-white dark:bg-zinc-800 ring-1 ring-zinc-300/40 focus-visible:ring-zinc-500/40 resize-none overflow-hidden"
                        maxLength={4000}
                        rows={1}
                      />
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() || session.isLoading}
                      size="icon"
                    >
                      <Icon icon="mdi:send" rotate={90} width="1.2em" height="1.2em" />
                    </Button>
                  </form>
                
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


// Add this hook at the top of your component or in a separate file
const useAutoResizeTextarea = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 120);
      textarea.style.height = newHeight + 'px';
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea]);

  return { textareaRef, resizeTextarea };
};

// Helper functions

const loadSession = async (phoneNumber: string): Promise<SimulatorSession | null> => {
  try {
    // Clean phone number format
    const cleanPhone = phoneNumber.replace(/\s|-/g, '');
    
    // Reference to the conversation document
    const conversationRef = doc(db, 'conversations_simulator', cleanPhone);
    const conversationDoc = await getDoc(conversationRef);
    
    // If no conversation exists yet, return null
    if (!conversationDoc.exists()) {
      return null;
    }
    
    // Get conversation data
    const conversationData = conversationDoc.data() as Conversation;
    
    // Try to validate with ConversationSchema (excluding messages)
    const conversation: Omit<SimulatorSession, 'messages' | 'isConnected' | 'isLoading'> = {
      phoneNumber: cleanPhone,
      currentState: conversationData.currentState || 'INIT',
      context: conversationData.context || {},
      role: conversationData.role || 'owner',
      restaurantId: conversationData.restaurantId,
      createdAt: conversationData.createdAt?.toDate() || new Date(),
      updatedAt: conversationData.updatedAt?.toDate() || new Date(),
    };
    
    // Extract messages from the conversation document instead of querying a subcollection
    const messages: (Message & { status?: string })[] = [];
    
    if (conversationData.messages && Array.isArray(conversationData.messages)) {
      conversationData.messages.forEach((messageData: any) => {
      try {
        const message: Message & { status?: string } = {
        role: messageData.role || 'user',
        body: messageData.body || '',
        hasTemplate: messageData.hasTemplate || false,
        templateId: messageData.templateId,
        messageState: messageData.messageState || 'IDLE',
        createdAt: messageData.createdAt?.toDate() || new Date(),
        status: 'delivered'
        };
        
        messages.push(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
      });
    }
  
    
    // messages.forEach((messageData) => {
      
    //   // Validate message with MessageSchema and add status
    //   try {
    //     const message: Message & { status?: string } = {
    //       role: messageData.role || 'user',
    //       body: messageData.body || '',
    //       hasTemplate: messageData.hasTemplate || false,
    //       templateId: messageData.templateId,
    //       messageState: messageData.messageState || 'IDLE',
    //       createdAt: messageData.createdAt?.toDate() || new Date(),
    //       status: 'delivered'
    //     };
        
    //     messages.push(message);
    //   } catch (error) {
    //     console.error('Error parsing message:', error);
    //   }
    // });
    
    // Return the session data
    return {
      ...conversation,
      messages,
      isConnected: true,
      isLoading: false
    };
  } catch (error) {
    console.error('Error loading conversation:', error);
    return null;
  }
};

const clearSession = async (phoneNumber: string): Promise<void> => {
  try {
    if (!phoneNumber) {
      throw new Error('Phone number is required to clear session');
    } 
    
    const cleanPhone = phoneNumber.replace(/\s|-/g, '');
    const conversationRef = doc(db, 'conversations_simulator', cleanPhone);
    const conversationDoc = await getDoc(conversationRef);
    
    if (conversationDoc.exists()) {
      // First delete all messages in the subcollection
      const messagesCollectionRef = collection(conversationRef, 'messages');
      const messagesSnapshot = await getDocs(messagesCollectionRef);
      
      // Delete each message document
      const messageDeletionPromises = messagesSnapshot.docs.map(messageDoc => 
        deleteDoc(doc(messagesCollectionRef, messageDoc.id))
      );
      
      await Promise.all(messageDeletionPromises);
      console.log(`Deleted ${messagesSnapshot.size} message documents`);
      
      // Then delete the conversation document
      await deleteDoc(conversationRef);
      console.log(`Deleted conversation document for: ${cleanPhone}`);
      
      // Check and delete reference in restaurants_simulator collection if exists
      const restaurantsRef = collection(db, 'restaurants_simulator');
      const restaurantQuery = query(
        restaurantsRef, 
        where('primaryContact.whatsapp', '==', cleanPhone)
      );
      
      const restaurantSnapshot = await getDocs(restaurantQuery);
      
      if (!restaurantSnapshot.empty) {
        const restaurantDocs = restaurantSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(restaurantDocs);
        console.log(`Deleted ${restaurantSnapshot.size} restaurant references`);
      }
    } else {
      console.log(`No session found for phone number: ${cleanPhone}`);
    }
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

interface WhatsAppTemplateProps {
  message: Message;
  context: Record<string, any>;
  onSelect: (template: string) => void;
}

const WhatsAppTemplateRenderer = ({ message, context, onSelect }: WhatsAppTemplateProps): JSX.Element | null => {
  const [hasClientRendered, setHasClientRendered] = useState(false);
  
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
          { name: 'אישור', id: 'aiValid' },
        ]
      }   
  }
  else if (currentState && STATE_MESSAGES[currentState as BotState]) {
    template = STATE_MESSAGES[currentState as BotState].whatsappTemplate;
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
    container: "rounded-[10px] px-4 mb-2 min-h-full rounded-bl-none overflow-hidden max-w-lg min-w-[300px] max-sm:!min-w-[260px] w-full",
    header: "p-3 bg-green-500 text-white",
    mediaHeader: "w-full h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden",
    body: "p-2 text-sm",
    footer: "border-gray-200 dark:border-gray-700",
    buttonContainer: "grid",
    // buttonSingle: "p-3 text-center text-green-600 dark:text-green-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer",
    // buttonMultiple: "p-3 text-center text-green-600 dark:text-green-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border-b last:border-b-0 border-gray-200 dark:border-gray-700",
    listContainer: "border-gray-200 dark:border-gray-700 min-h-full overflow-y-auto",
    listItem: "p-3 flex items-center text-sm justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors cursor-pointer border-b last:border-b-0 my-0 flex justify-center border-gray-400 overflow-y-auto",
    buttonMultiple: "p-3 flex text-center items-center text-sm justify-center gap-2 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors cursor-pointer border rounded-lg my-0.5 flex justify-center border-gray-400 overflow-y-auto",
    buttonSingle: "p-3 flex text-center font-bold items-center text-white justify-center gap-2 bg-gradient-to-r from-green-700 to-green-500  hover:bg-gradient-to-l dark:from-green-400 dark:to-green-600 border-purple-500 border-2 shadow-md hover:shadow-purple-400 transform transition-all ease-in-out duration-200 cursor-pointer border-none rounded-lg my-1 flex justify-center gap-2 overflow-y-auto",
    cardContainer: "p-3 space-y-2",
    cardItem: "bg-gray-100 border text-center dark:bg-gray-800 rounded-md p-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer",
  };

  // Process body text with context variables
  let bodyText = template.body;
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
          <Image
            src={template.header.mediaUrl || 'https://via.placeholder.com/600x400'} 
            alt="Header media" 
            className="w-full h-full object-cover"
            width={600}
            height={400}
          />
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

