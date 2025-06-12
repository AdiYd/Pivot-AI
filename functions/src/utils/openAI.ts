import axios from 'axios';
import { z } from 'zod';

/**
 * OpenAI API Message Schema
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI API Response Schema
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Zod schema for validating OpenAI response
 */
const OpenAIResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
      finish_reason: z.string(),
    })
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

/**
 * Options for OpenAI API call
 */
export interface OpenAIOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  stream?: boolean;
  notify?: boolean;  // Whether to log API call
}

/**
 * Default options for OpenAI API
 */
const DEFAULT_OPTIONS: OpenAIOptions = {
  temperature: 0.7,
  max_tokens: 500,
  model: 'gpt-4o',
  stream: false,
  notify: true,
};

/**
 * Call OpenAI API with messages
 * @param messages Array of messages to send to OpenAI
 * @param options Options for the API call
 * @returns Generated message from OpenAI
 */
export async function callOpenAI(
  messages: ChatMessage[],
  options: OpenAIOptions = {}
): Promise<ChatMessage> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    const errorMessage = 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.';
    console.error(`[OpenAI] ❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // Merge options with defaults
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { temperature, max_tokens, model, notify } = mergedOptions;

  try {
    if (notify) {
      console.log(`[OpenAI] 🧠 Sending request to model: ${model}`, {
        messagesCount: messages.length,
        temperature,
        max_tokens
      });
    }
    
    const response = await axios.post<OpenAIResponse>(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        temperature,
        max_tokens,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const validatedResponse = OpenAIResponseSchema.parse(response.data);
    
    if (
      !validatedResponse.choices ||
      validatedResponse.choices.length === 0 ||
      !validatedResponse.choices[0].message
    ) {
      throw new Error('Invalid response from OpenAI API');
    }

    const generatedMessage = validatedResponse.choices[0].message;
    
    if (notify) {
      console.log(`[OpenAI] ✅ Received response`, {
        tokens: validatedResponse.usage.total_tokens,
        contentLength: generatedMessage.content.length
      });
    }

    return generatedMessage;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[OpenAI] ❌ API call failed:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return a fallback message
    return {
      role: 'assistant',
      content: 'אני מתנצל, ישנה בעיה בתקשורת עם המערכת. אנא נסה שוב מאוחר יותר.'
    };
  }
}

/**
 * Create a system prompt for understanding restaurant inventory context
 * @returns System prompt message
 */
export function createInventorySystemPrompt(): ChatMessage {
  return {
    role: 'system',
    content: `אתה עוזר חכם למערכת ניהול מלאי והזמנות למסעדות.
תפקידך לעזור להבין ולחלץ מידע מהודעות המשתמשים, במיוחד כאשר המשתמש עונה בצורה לא מובנית.

כאשר המשתמש שולח הודעה שאינה תואמת את הפורמט הצפוי, עליך:
1. להבין את הכוונה העיקרית
2. לחלץ נתונים רלוונטיים (כמויות, מזהי מוצרים, תאריכים)
3. להחזיר תשובה מובנית שהמערכת תוכל לעבד

התשובה שלך צריכה להיות תמציתית ומדוייקת בפורמט שהמערכת יכולה לעבד, עם נקודות מפתח בלבד.
אל תוסיף ברכות או טקסט מיותר. התמקד בחילוץ המידע הרלוונטי.

התשובה שלך תשמש לעיבוד אוטומטי ולא תוצג למשתמש כפי שהיא.`
  };
}

/**
 * Process user message with OpenAI to extract structured data
 * @param userMessage Original user message
 * @param expectedFormat What format we expect (e.g. 'quantity', 'confirmation')
 * @returns Processed and structured response
 */
export async function processUserMessage(
  userMessage: string,
  expectedFormat: string
): Promise<string> {
  const systemPrompt = createInventorySystemPrompt();
  
  const formattingPrompt: ChatMessage = {
    role: 'user',
    content: `משתמש שלח את ההודעה הבאה:
"${userMessage}"

אני מצפה לתשובה בפורמט: ${expectedFormat}

חלץ את המידע הרלוונטי בלבד.`
  };

  const response = await callOpenAI(
    [systemPrompt, formattingPrompt],
    { temperature: 0.3, max_tokens: 150 }
  );

  return response.content;
}

/**
 * Simulate a mock conversation for testing purposes
 * @param conversationType Type of conversation to mock
 * @returns Array of mock messages
 */
export function getMockConversation(
  conversationType: 'inventory' | 'order' | 'supplier' | 'delivery' = 'inventory'
): ChatMessage[] {
  return MOCK_CONVERSATIONS[conversationType] || [];
}

/**
 * Mock data for simulating conversations
 */
export const MOCK_CONVERSATIONS: Record<string, ChatMessage[]> = {
  // Inventory check conversation
  inventory: [
    {
      role: 'system',
      content: createInventorySystemPrompt().content
    },
    {
      role: 'user',
      content: 'כמה עגבניות יש במלאי כרגע?'
    },
    {
      role: 'assistant',
      content: '3 ק"ג'
    },
    {
      role: 'user',
      content: 'יש לי בערך 5 ארגזים של מלפפונים, כל ארגז בערך 2 ק"ג'
    },
    {
      role: 'assistant',
      content: '10 ק"ג'
    },
    {
      role: 'user',
      content: 'אה וגם נשאר חצי קרטון של חסה'
    },
    {
      role: 'assistant',
      content: '6 יחידות'
    }
  ],
  
  // Order placement conversation
  order: [
    {
      role: 'system',
      content: createInventorySystemPrompt().content
    },
    {
      role: 'user',
      content: 'תזמין לי 10 ק"ג עגבניות, 8 ק"ג מלפפונים, ו-5 חבילות חסה'
    },
    {
      role: 'assistant',
      content: 'מוצרים להזמנה:\n- עגבניות: 10 ק"ג\n- מלפפונים: 8 ק"ג\n- חסה: 5 יחידות'
    },
    {
      role: 'user',
      content: 'רגע, תעשה 15 ק"ג עגבניות במקום 10'
    },
    {
      role: 'assistant',
      content: 'עדכון עגבניות: 15 ק"ג'
    },
    {
      role: 'user',
      content: 'אישור הזמנה בבקשה'
    },
    {
      role: 'assistant',
      content: 'אישור=כן'
    }
  ],
  
  // Supplier setup conversation
  supplier: [
    {
      role: 'system',
      content: createInventorySystemPrompt().content
    },
    {
      role: 'user',
      content: 'ספק חדש: ירקות טריים בע"מ, 050-1234567, אספקה בימים א,ג,ה בשעה 10:00'
    },
    {
      role: 'assistant',
      content: 'ספק:\n- שם: ירקות טריים בע"מ\n- טלפון: 0501234567\n- ימי אספקה: 0,2,4\n- שעת אספקה: 10'
    },
    {
      role: 'user',
      content: 'תוסיף גם את יום שישי להספקה'
    },
    {
      role: 'assistant',
      content: 'ימי אספקה מעודכנים: 0,2,4,5'
    }
  ],
  
  // Delivery check conversation
  delivery: [
    {
      role: 'system',
      content: createInventorySystemPrompt().content
    },
    {
      role: 'user',
      content: 'קיבלתי את המשלוח של הירקות. הגיעו כל העגבניות (10 ק"ג) אבל רק 6 ק"ג מלפפונים במקום 8, והחסה לא הגיעה בכלל.'
    },
    {
      role: 'assistant',
      content: 'קבלה:\n- עגבניות: מלא (10/10 ק"ג)\n- מלפפונים: חלקי (6/8 ק"ג)\n- חסה: חסר (0/5 יחידות)'
    },
    {
      role: 'user',
      content: 'החשבונית אומרת 315 שקלים. הסחורה נראית טרייה היום.'
    },
    {
      role: 'assistant',
      content: 'סכום חשבונית: 315 ש"ח\nהערה: סחורה טרייה'
    }
  ]
};
