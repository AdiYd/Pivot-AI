'use client';

import { useState, useRef, useEffect } from 'react';
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
import { ConversationState, StateMessage } from '@/schema/types';
import Image from 'next/image';
import { useTheme } from 'next-themes';

// Types
interface Message {
  id: string;
  content: {
    body?: string;
    template?: StateMessage['whatsappTemplate'];
  };
  timestamp: Date;
  isBot: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
}



interface SimulatorSession {
  phoneNumber: string;
  messages: Message[];
  conversationState?: ConversationState;
  isConnected: boolean;
  isLoading: boolean;
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
    isLoading: false
  });
  const [newMessage, setNewMessage] = useState('');
  const [templateSelect, setTemplateSelect] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [availableConversations, setAvailableConversations] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {theme} = useTheme();
  const isDark = theme === 'dark' || theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  console.log('Current theme:', theme, 'isDark:', isDark);  
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  // Focus input when connected
  useEffect(() => {
    if (session.isConnected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [session.isConnected, session.messages]);

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
    // console.log('Starting session with phone:', session);
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

    const loadedSession = await loadSession(session.phoneNumber);
    console.log('Loaded session:', loadedSession);
    // For old sessions compatibility change all message's content to have a body field
    let updatedMessages: Message[] = loadedSession?.messages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          ...msg,
          content: {
            body: msg.content || '',
          },
        };
      }
      return msg;
    }) || [];

    console.log('Loaded sessionAfter:', loadedSession);
    setSession(prev => ({
      ...prev,
      messages: updatedMessages,
      conversationState: loadedSession?.conversationState || undefined,
      isConnected: true,
      isLoading: false,
    }));

    toast({
    title: loadedSession ? "שיחה נטענה בהצלחה" : "התחברת בהצלחה",
    description: `מתחיל שיחה עם ${session.phoneNumber}${loadedSession ? ' (נטען היסטוריה)' : ''}`,
  });
  };

  // Send message to bot
  const sendMessage = async (messageContent: string, isUserMessage = true, isTemplate = false) => {
    if (!session.isConnected || !messageContent.trim()) return;

    const messageId = Date.now().toString();
    const userMessage: Message = {
      id: messageId,
      content:{body: messageContent.trim() },
      timestamp: new Date(),
      isBot: false,
      status: 'sending'
    };

    // Add user message to UI if it's a user message
    if (isUserMessage && !isTemplate) {
      setSession(prev => ({
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
        // Explicitly handle CORS for development
        withCredentials: false
      });
      console.log('Response from bot:', response.data);
      // Update user message status
      if (isUserMessage && !isTemplate) {
        setSession(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === messageId ? { ...msg, status: 'delivered' } : msg
          ),
        }));
      }

      // Process bot responses
      if (response.data.success && response.data.responses) {
        const botMessages: Message[] = response.data.responses.map((content: Record<string, any>, index: number) => ({
          id: `bot-${Date.now()}-${index}`,
          content,
          timestamp: new Date(Date.now() + index * 100), // Slight delay between multiple responses
          isBot: true,
          status: 'delivered'
        }));
        // Add bot messages with animation delay
        for (let i = 0; i < botMessages.length; i++) {
          setTimeout(() => {
            setSession(prev => ({
              ...prev,
              messages: [...prev.messages, botMessages[i]],
              conversationState: response.data.newState,
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
            msg.id === messageId ? { ...msg, status: 'failed' } : msg
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
      conversationState: undefined
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
      phoneNumber: '',
      messages: [],
      isConnected: false,
      isLoading: false
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

  return (
    <div className="p-6 max-sm:p-2 pt-0 max-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Icon icon="logos:whatsapp-icon" width="1.3em" height="1.3em" />
            סימולטור WhatsApp
          </h1>
          {/* <p className="text-muted-foreground">בדוק את הבוט במצב סימולציה מבלי לשלוח הודעות אמיתיות</p> */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[60vh]">
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
          {session.conversationState && (
            <Card className='max-h-[62vh] h-[fill-available] justify-start gap-2  overflow-y-hidden'>
              <CardHeader className='py-1'>
                <CardTitle className="text-lg">נתוני השיחה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 overflow-y-auto">
                {Object.keys(session.conversationState.context).length > 0 && (
                  <div className='overflow-hidden'>
                    {/* <Label className="text-sm">נתונים שנאספו</Label> */}
                    <div className="mt-1 self-end space-y-1">
                      {Object.entries(session.conversationState.context).map(([key, value]) => (
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
        <div className="lg:col-span-3">
          <Card className="h-[600px] overflow-hidden flex flex-col ">
            {/* Chat Header */}
            <CardHeader className="py-2 flex justify-between absolute bg-card/50 backdrop-blur-lg w-full z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 max-sm:hidden bg-green-500 rounded-full flex items-center justify-center">
                    {/* <Bot className="w-5 h-5 text-white" /> */}
                    <Icon icon="mingcute:ai-fill" width="24" height="24" className='text-white' />
                  </div>
                  <div className="flex gap-2">
                    <CardTitle className="text-base max-sm:hidden">P-vot</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {session.conversationState && `${session.phoneNumber} • `}
                      { session.conversationState?.currentState &&  <Badge 
                    className={cn("mt-1 mx-1 font-mono text-xs", getStateBadgeColor(session.conversationState.currentState))}
                  >
                    {session.conversationState.currentState}
                  </Badge>}
                    </p>
                  </div>
                </div>
    
                 <div className="flex items-center gap-2">
                   {session.isConnected && <div className="flex w-fit items-center">
                      <Button title='מחיקת שיחה' size="sm" onClick={() => clearConversation(session.phoneNumber)} variant="destructive" className="w-full">
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
              <ScrollArea className="flex-1 p-4 pt-0">
                <div dir='rtl' className="space-y-4 my-20">
                  <AnimatePresence>
                    {session.messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={cn(
                          "flex items-end flex-row-reverse gap-3",
                          message.isBot ? "justify-start" : "justify-end ml-auto"
                        )}
                      >
                        {message.isBot && (
                          <div className="w-8 h-8 max-sm:hidden bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            {/* <Bot className="w-4 h-4 text-white" /> */}
                            <Icon icon="mingcute:ai-fill" width="24" height="24" className='text-white' />
                          </div>
                        )}
                        
                       {message.content?.body ?  
                       <div className={cn(
                          "rounded-[10px] min-w-[30%]* px-4 py-2 max-w-full break-words",
                          message.isBot 
                            ? "bg-muted rounded-bl-none" 
                            : "text-start bg-[#DCF8C6] rounded-br-none backdrop-blur-md text-black dark:bg-[#005C4B]  dark:text-[#E9EDEF]"
                        )}>
                          <p className="text-sm whitespace-pre-wrap">
                           {
                            message.content.body.split(/(\*[^*]+\*)/g).map((part, index) => {
                              if (part.startsWith('*') && part.endsWith('*')) {
                                return <strong key={index}>{part.slice(1, -1)}</strong>;
                              }
                              return part;
                            })
                          }
                          </p>
                          <div className={cn(
                            "flex items-center gap-2 mt-1",
                            message.isBot ? "justify-start" : "justify-end"
                          )}>
                            <span className={cn(
                              "text-xs",
                              message.isBot ? "text-muted-foreground" : "text-gray-800/80 dark:text-gray-400"
                            )}>
                              {message.timestamp.toLocaleTimeString('he-IL', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {!message.isBot && getMessageStatusIcon(message.status)}
                          </div>
                        </div> : 
                        <div className='border rounded-lg p-2 overflow-hidden bg-muted'>
                          <WhatsAppTemplateRenderer onSelect={handleTemplateSelect} whatsAppTemplate={message.content.template} />
                        </div>}

                        {!message.isBot && (
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
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        {/* <Bot className="w-4 h-4 text-white" /> */}
                        <Icon icon="mingcute:ai-fill" width="24" height="24" className='text-white' />
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
                  {session.messages.length === 0 && !session.isLoading && (
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
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="הקלד הודעה..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={session.isLoading}
                      className="flex-1 h-10 rounded-lg bg-muted focus-visible:ring-zinc-500/40 "
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
    
    // Get conversation state
    const conversationData = conversationDoc.data();
    const conversationState: ConversationState = {
      currentState: conversationData.currentState || 'INIT',
      context: conversationData.context || {},
      lastMessageTimestamp: conversationData.lastMessageTimestamp?.toDate() || new Date(),
      
    };
    
    // Get previous messages
    const messagesQuery = query(
      collection(conversationRef, 'messages'),
      orderBy('createdAt', 'asc')
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    const messages: Message[] = [];
    
    messagesSnapshot.forEach((messageDoc) => {
      const messageData = messageDoc.data();
      messages.push({
        id: messageDoc.id,
        content: messageData.body || '',
        timestamp: messageData.createdAt?.toDate() || new Date(),
        isBot: messageData.direction === 'outgoing',
        status: 'delivered'
      });
    });
    
    // Return the session data
    return {
      phoneNumber: cleanPhone,
      messages,
      conversationState,
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


const WhatsAppTemplateRenderer = ({whatsAppTemplate, onSelect}: {whatsAppTemplate?: StateMessage['whatsappTemplate'], onSelect: (template: string) => void}): JSX.Element | null => {
  if (!whatsAppTemplate) return null;
  
  // WhatsApp UI style constants
  const styles = {
    container: "rounded-[10px] px-4 min-h-full bg-muted rounded-bl-none overflow-hidden max-w-lg w-full",
    header: "p-3 bg-green-500 text-white",
    mediaHeader: "w-full h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden",
    body: "p-2 text-sm",
    footer: "border-t border-gray-200 dark:border-gray-700",
    buttonContainer: "grid",
    buttonSingle: "p-3 text-center text-green-600 dark:text-green-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer",
    buttonMultiple: "p-3 text-center text-green-600 dark:text-green-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border-b last:border-b-0 border-gray-200 dark:border-gray-700",
    listContainer: "border-gray-200 dark:border-gray-700 min-h-full overflow-y-auto",
    listItem: "p-3 flex items-center text-sm justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors cursor-pointer border rounded-lg my-1 flex justify-center border-gray-400 overflow-y-auto",
    cardContainer: "p-3 space-y-2",
    cardItem: "bg-gray-50 dark:bg-gray-800 rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer",
  };

  // Header component
  const renderHeader = () => {
    if (!whatsAppTemplate.header) return null;
    
    if (whatsAppTemplate.header.type === "media" && whatsAppTemplate.header.mediaUrl) {
      return (
        <div className={styles.mediaHeader}>
          <Image
            src={whatsAppTemplate.header.mediaUrl || 'https://via.placeholder.com/600x400'} 
            alt="Header media" 
            className="w-full h-full object-cover"
          />
        </div>
      );
    } else if (whatsAppTemplate.header.type === "text" && whatsAppTemplate.header.text) {
      return (
        <div className={styles.header}>
          <h3 className="font-medium">{whatsAppTemplate.header.text}</h3>
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
          {whatsAppTemplate.body.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {line.split(/(\*[^*]+\*)/g).map((part, j) => {
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
          {whatsAppTemplate.body.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {line.split(/(\*[^*]+\*)/g).map((part, j) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                return part;
              })}
            </p>
          ))}
        </div>
        {whatsAppTemplate.options && whatsAppTemplate.options.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.buttonContainer}>
              {whatsAppTemplate.options.map((option, index) => (
                <button 
                  key={option.id} 
                  onClick={() => onSelect(option.id)}
                  className={whatsAppTemplate.options?.length === 1 ? styles.buttonSingle : styles.buttonMultiple}
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
          {whatsAppTemplate.body.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {line.split(/(\*[^*]+\*)/g).map((part, j) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                return part;
              })}
            </p>
          ))}
        </div>
        {whatsAppTemplate.options && whatsAppTemplate.options.length > 0 && (
          <div className={styles.listContainer}>
            {whatsAppTemplate.options.map((option) => (
              <div key={option.id} className={styles.listItem} onClick={() => onSelect(option.id)}>
                <span className='mx-auto'>{option.name}</span>
                {/* <Icon icon="lucide:chevron-right" className="text-gray-400" /> */}
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
          {whatsAppTemplate.body.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {line.split(/(\*[^*]+\*)/g).map((part, j) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <strong key={j}>{part.slice(1, -1)}</strong>;
                }
                return part;
              })}
            </p>
          ))}
        </div>
        {whatsAppTemplate.options && whatsAppTemplate.options.length > 0 && (
          <div className={styles.cardContainer}>
            {whatsAppTemplate.options.map((option) => (
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
  switch (whatsAppTemplate.type) {
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