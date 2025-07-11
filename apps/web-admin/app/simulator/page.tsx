'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, collection, query, orderBy, getDocs, deleteDoc, where } from 'firebase/firestore';
import { db, useFirebase } from '@/lib/firebaseClient';
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
  Loader2,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ArrowDownToLine,
  ArrowUpToLine
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Icon } from '@iconify/react/dist/iconify.js';
import {  Contact, Conversation, Message, StateObject } from '@/schema/types';
import { stateObject } from '@/schema/states';
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
  ? 'http://localhost:5001/pivot-chatbot-fdfe0/europe-central2/whatsappWebhook'
  : 'https://europe-central2-pivot-chatbot-fdfe0.cloudfunctions.net/whatsappWebhook';

const SIMULATOR_API_KEY = process.env.NEXT_PUBLIC_SIMULATOR_API_KEY;

export default function SimulatorPage() {
  const {database, databaseLoading, refreshDatabase, source} = useFirebase();
  const [session, setSession] = useState<SimulatorSession>({
    phoneNumber: '0523456789',
    messages: [],
    isConnected: false,
    isLoading: false,
    role: 'מנהל',
    context: {
      isSimulator: true,
      contactNumber: '0523456789',
    },
    currentState: 'INIT',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [newMessage, setNewMessage] = useState('');
  const [templateSelect, setTemplateSelect] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [availableConversations, setAvailableConversations] = useState<string[]>([]);
  const [convAnchor, setConvAnchor] = useState<'start' | 'end' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { toast } = useToast();
  const [isDark, setIsDark] = useState(false);
  const { textareaRef, resizeTextarea } = useAutoResizeTextarea();

  useEffect(() => {
    const storedPhoneNumber = localStorage.getItem('simulatorPhoneNumber');
    if (storedPhoneNumber) {
      setSession(prev => ({
        ...prev,
        phoneNumber: storedPhoneNumber,
        context: { ...prev.context, contactNumber: storedPhoneNumber }
      }));
    }
  }, []);

  useEffect(() => {
    setIsDark(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, [theme]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setConvAnchor('end');
    }, 100);
  }, [session.messages]);

    // Focus input when connected
  useEffect(() => {
    if (session.isConnected && textareaRef.current) {
      textareaRef.current.focus();
      localStorage.setItem('simulatorPhoneNumber', session.phoneNumber);
    }
  }, [session.isConnected, session.messages, textareaRef, session.phoneNumber]);

  // Load available conversations on mount
  useEffect(() => {
    if (!databaseLoading) {
      setAvailableConversations(Object.keys(database.conversations || {}));
    }
  }, [databaseLoading, database.conversations]);

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
        variant: "destructive"
      });
      return;
    }

    if (!validatePhoneNumber(session.phoneNumber)) {
      toast({
        title: "מספר טלפון לא תקין",
        description: "אנא הזן מספר טלפון ישראלי תקין (05xxxxxxxxx)",
        variant: "destructive"
      });
      return;
    }

    const loadedSession : SimulatorSession = (await loadSession(session.phoneNumber, database.conversations[session.phoneNumber])) as SimulatorSession;
    console.log('Loaded session:', loadedSession);
    // Convert messages to the correct format

    setSession(prev => ({
      ...prev,
      messages: loadedSession?.messages || [],
      currentState: loadedSession?.currentState || 'INIT',
      context: loadedSession?.context || {
        ...prev.context,
      },
      isConnected: true,
      isLoading: false,
    }));
    toast({
      title: loadedSession ? "שיחה נטענה בהצלחה" : "התחברת בהצלחה",
      description: `מתחיל שיחה עם ${session.phoneNumber}${loadedSession ? ' (נטען היסטוריה)' : ''}`,
      variant: "success"
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
          // After the last message, scroll to the bottom
          if (i === botMessages.length - 1) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              setConvAnchor('end');
            }, 100);
          }
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
        variant: "destructive"
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
      context: {
        isSimulator: true,
      }
    }));
    setAvailableConversations(availableConversations.filter(conv => conv !== phoneNumber));
    await refreshDatabase();
    setLoading(false);
    setNewMessage('');
    toast({
      title: "השיחה נוקתה",
      description: "כל ההודעות נמחקו",
      variant: "success"
    });
  };

  // Disconnect session
  const disconnectSession = () => {
    setSession({
      phoneNumber: '0523456789',
      messages: [],
      isConnected: false,
      isLoading: false,
      role: 'מנהל',
      context: {
        isSimulator: true,
        contactNumber: '0523456789',
      },
      currentState: 'INIT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setNewMessage('');
    localStorage.removeItem('simulatorPhoneNumber');
    setConvAnchor(null);

    toast({
      title: "התנתקת",
      description: "הסימולטור נותק בהצלחה",
      variant: "success"
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
    <div suppressHydrationWarning className="p-2 max-sm:p-0 pt-0 max-h-full space-y-4">
      <DebugButton debugFunction={debugFunctionLocal} />
      {/* Header */}
      <div style={{marginTop: '0px'}} className="flex* hidden items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Icon icon="logos:whatsapp-icon" width="1.3em" height="1.3em" />
            סימולטור WhatsApp
          </h1>
        </div>
      </div>

      <div  className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[90vh] max-sm:h-fit ">
        {/* Control Panel */}
        <div className="lg:col-span-1 flex flex-col max-sm:row-start-2 justify-between space-y-4">
          {/* Connection */}
          <Card>
            <CardHeader className='py-1'>
              <CardTitle className="text-lg">התחברות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!session.isConnected ? (
                <>
                  <div className="relative space-y-2">
                    <Label htmlFor="phone">מספר טלפון</Label>
                     <button
                      type="button"
                      title='מספר אקראי'
                      onClick={() => {
                        const randomPhoneNumber = `057${Math.ceil(Math.random() * 10000000)}`;
                        setSession(prev => ({ ...prev, phoneNumber: randomPhoneNumber, context: { ...prev.context, contactNumber: randomPhoneNumber } }));
                      }}
                      className="absolute right-2 top-[45%] flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      <Icon icon="fad:random-1dice" width="1.2rem" height="1.2rem" />
                    </button>
                    <Input
                      id="phone"
                      dir='ltr'
                      placeholder="0501234567"
                      value={session.phoneNumber}
                      onChange={(e) => setSession(prev => ({ ...prev, phoneNumber: e.target.value, context: { ...prev.context, contactNumber: e.target.value } }))}
                      onKeyPress={(e) => e.key === 'Enter' && startSession()}
                    />
                  </div>
                   {availableConversations.length > 0 && availableConversations.map((conv) => (
                    <Badge title={`${database.conversations[conv]?.context?.contactName} - ${database.conversations[conv]?.context?.restaurantName}`} onClick={() =>{setSession(prev => ({ ...prev, phoneNumber: conv }))}} key={conv} variant={session.phoneNumber === conv ? "default" : "outline"} className={`${conv.startsWith('057') ? 'border-red-400/40' : ''} mr-2 cursor-pointer`}>
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
            <Card className='max-h-[62vh] h-[stretch] justify-start gap-2 overflow-y-hidden'>
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
        <div className="lg:col-span-3 max-sm:row-start-1 overflow-hidden">
          <Card className="h-full max-sm:max-h-[95vh]  overflow-hidden flex flex-col">
            {/* Chat Header */}
            <CardHeader className="py-2 flex justify-between absolute bg-card/50 backdrop-blur-lg w-full z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="max-sm:hidden rounded-full flex items-center justify-center">
                    <PivotAvatar />
                  </div>
                  <div className="flex gap-2">
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
                   {session.isConnected && <div className="flex w-fit items-center gap-2">
                      <Button title={convAnchor === 'start' ? 'גלול לסוף השיחה' : 'גלול לתחילת השיחה'} size="sm" onClick={() => {(convAnchor === 'start' ? messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) : messagesStartRef.current?.scrollIntoView({ behavior: 'smooth' })); setConvAnchor(convAnchor === 'start' ? 'end' : 'start')}} variant="ghost" className="w-full bg-transparent border-none hover:bg-blue-500/50">
                        <ArrowDownToLine className={`w-4 h-4 duration-700 transition-transform ${convAnchor === 'start'? '' : 'rotate-180'}`} />
                      </Button>
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
              <ScrollArea className="flex-1 p-4 pb-0 max-sm:p-2 pt-0">
                <div ref={messagesStartRef} />
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
                          <PivotAvatar/>
                        )}
                        
                       {!message.hasTemplate ? (
                        <div className={cn(
                          "rounded-[10px] min-w-[30%]* max-w-3xl max-sm:max-w-[330px] shadow-md px-4 py-2 break-words",
                          message.role === 'assistant' 
                            ? "bg-white dark:bg-zinc-800 rounded-bl-none" 
                            : "text-start bg-[#DCF8C6] rounded-br-none backdrop-blur-md text-black dark:bg-[#005C4B] dark:text-[#E9EDEF]"
                        )}>
                          <p className="text-sm whitespace-pre-wrap">
                          {(() => {
                            // First, replace URLs with placeholders to preserve them during bold processing
                            const urlRegex = /(https?:\/\/[^\s]+)/g;
                            const textWithPlaceholders = (message.body.replace('user_confirmed', '*אישור*') || '').replace(urlRegex, '###URL$1###');
                            
                            // Then process bold formatting
                            const partsWithPlaceholders = textWithPlaceholders.split(/(\*[^*]+\*)/g);
                            
                            // Process each part, restoring URLs and applying formatting
                            return partsWithPlaceholders.map((part, index) => {
                              // First check if this is a bold text part
                              if (part.startsWith('*') && part.endsWith('*')) {
                                // Still need to check for URLs within bold text
                                const boldContent = part.slice(1, -1);
                                const boldWithUrls = boldContent.replace(/###URL(https?:\/\/[^\s]+)###/g, (_, url) => {
                                  return `<a href="${url}" style="color: #00BFFF !important; text-decoration: underline;" target="_blank" rel="noopener noreferrer">${url}</a>`;
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
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              {session.isConnected && source && (
                <div className=" z-10 px-4 py-2 relative bottom-0* left-0* right-0* ">
                  <form  onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                      {session.currentState === 'SUPPLIER_CONTACT'  &&
                      <button
                      type="button"
                      title='מספר אקראי'
                      onClick={() => {
                        const contact = `אבי כהן, 052${Math.ceil(Math.random() * 10000000)}`;
                        setNewMessage(contact);
                        setTimeout(resizeTextarea, 0);
                      }}
                      className="absolute left-14 top-[28%] flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      <Icon icon="fad:random-1dice" width="1.2rem" height="1.2rem" />
                    </button>}
                      
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
                        disabled={session.isLoading || !source}
                        className="flex-1 min-h-[40px] h-auto* max-h-[120px] rounded-2xl shadow-md bg-white dark:bg-zinc-800 ring-1 border-none ring-zinc-300/40 focus-visible:ring-zinc-500/80 resize-none overflow-hidden"
                        maxLength={4000}
                        rows={2}
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

const loadSession = async (phoneNumber: string, conversationData: Conversation): Promise<SimulatorSession | null> => {
  try {
    // Clean phone number format
    const cleanPhone = phoneNumber.replace(/\s|-/g, '');
    
    // Try to validate with ConversationSchema (excluding messages)
    const conversation: Omit<SimulatorSession, 'messages' | 'isConnected' | 'isLoading'> = {
      phoneNumber: cleanPhone,
      currentState: conversationData?.currentState || 'INIT',
      context: conversationData?.context || { isSimulator: true , contactNumber: cleanPhone },
      role: conversationData?.role || 'owner',
      restaurantId: conversationData?.restaurantId,
      createdAt: conversationData?.createdAt?.toDate() || new Date(),
      updatedAt: conversationData?.updatedAt?.toDate() || new Date(),
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
      // Query for restaurants where the contacts object has a key matching the phone number
      const restaurantQuery = query(
        restaurantsRef,
        where(`contacts.${cleanPhone}`, '!=', null)
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
  
  // Try to get the template from stateObject
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
    container: "rounded-[10px] px-4 mb-2 min-h-full rounded-bl-none max-w-lg min-w-[300px] max-sm:!min-w-[260px] w-full",
    header: "p-3 bg-green-500 text-white",
    mediaHeader: "w-full h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden",
    body: "p-2 text-sm",
    footer: "border-gray-200 dark:border-gray-700",
    buttonContainer: "grid",
    listContainer: "border-gray-200 dark:border-gray-700 min-h-full overflow-y-auto",
    listItem: "p-3 flex items-center text-sm justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors cursor-pointer border-b last:border-b-0 my-0 flex justify-center border-gray-400 overflow-y-auto",
    buttonMultiple: "p-3 flex text-center items-center text-sm justify-center gap-2 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors cursor-pointer border rounded-lg my-0.5 flex justify-center border-gray-400 overflow-y-auto",
    buttonSingle: "btn-primary",
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

