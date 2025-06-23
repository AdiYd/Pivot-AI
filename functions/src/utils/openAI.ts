import { Conversation } from "../schema/types";
import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getConfig } from "./config";
import { stateObject } from "../schema/states";
// Load environment variables for local development
if (process.env.NODE_ENV !== 'production' && process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config();
}

// Initialize OpenAI client lazily to avoid initialization errors during build
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const config = getConfig();
    const apiKey = config.openai.apiKey;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is missing or empty');
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  
  return openaiClient;
}

/**
 * Call OpenAI to process and structure user input
 * 
 * @param prompt System prompt for AI context
 * @param userInput User's message to process
 * @returns Structured data or enhanced interpretation
 */
export async function callOpenAISchema(userInput: string, conversation: Conversation, messagesHistory: string): Promise<any> {
  try {
    const openai = getOpenAIClient();
    const { currentState } = conversation;
    // Convert to JSON schema
    const currentStateDefinition = stateObject(conversation);
    if (!currentStateDefinition) {
      throw new Error(`State definition not found for current state: ${currentState}`);
    }
    const context = JSON.parse(JSON.stringify(conversation.context || {}));  
    delete context.suppliersList; // Remove suppliersList from context to avoid circular references or confusion
    const schema = currentStateDefinition.aiValidation?.schema || currentStateDefinition.validator || z.object({});
    const jsonSchema = zodToJsonSchema(schema, currentState);
    const functionStyle = {
      name: currentState,
      description: `
      **
      ${currentStateDefinition.aiValidation?.prompt}
      **
      .יש להחזיר תשובה למשתמש בשפה העברית בלבד (למעט שמות משתנים ונתונים הצריכים להיות באנגלית), אלא אם ביקש אחרת
      `,
      parameters: {
        type: "object",
        properties: {
          data: jsonSchema.definitions?.[currentState] || jsonSchema,
          meta: {
            type: "object",
            description: "AI's evaluation of the data's quality and completeness",
            properties: {
              // is_user_data_valid: {
              //   type: "boolean",
              //   description: "True if all required fields were filled with realistic data sourced from the user's message."
              // },
              // is_data_completed_by_ai: {
              //   type: "boolean",
              //   description: "True if some fields were guessed or completed by the assistant due to missing user input."
              // },
              is_data_final_and_confirmed: {
                type: "boolean",
                description: "True only if the assistant is confident that the structured data represents exactly what the user intended."
              },
              approval_message: {
                type: "string",
                description: "If 'is_data_final_and_confirmed' is true, craft a concise and visually appealing summary (in Hebrew, ready for WhatsApp message) of the structured data extracted from the user's message. Focus on clarity and intuitiveness, highlighting key information without adding unnecessary details or questions. The message should not imply confirmation, but rather seek the user's approval. Use new lines, emojis, bold text, bullet points, or numbered lists to enhance readability and engagement. Aim for a maximum of 3-4 lines, assuming it will be incorporated into a template with a header and approval request in the footer.",
              },
              follow_up_message: {
                type: "string",
                description: "If 'is_data_final_and_confirmed' is false, Provide Instruction, question or message (In Hebrew) for the client, to help him improve or clarify the input towards the desired outcome. This message should be clear and actionable, guiding the user to provide the necessary information or corrections. Use new lines, emojis, bold text, bullet points, or numbered lists to enhance readability and engagement. Aim for a maximum of 3-4 lines."
              }
            },
            required: ["is_data_final_and_confirmed", "approval_message", "follow_up_message"]
          },
        },
        required: ["data", "meta"]
      }
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `
        אתה סוכן חכם ויעיל בעל אפליקציה לבעלי מסעדות, תפקידך לנהל מערכת ניהול הזמנות ומלאי.
        תפקידך הוא לעזור לבעל המסעדה לנהל את ההזמנות והמלאי בצורה היעילה ביותר.
        עליך להבין את ההקשר של השיחה ולספק תשובות מדויקות ומועילות.
        עליך לעבד את ההודעה של המשתמש ולספק תשובות מובנות אך ורק על המערכת.
        
        שם האפליקציה: P-vot
        תיאור האפליקציה: מערכת ניהול הזמנות ומלאי מתקדמת לבעלי מסעדות מבוססת בינה מלאכותית המחברת בין ספקים למסעדות


        ****   חשוב    ****
        כל שאלה שאינה במסגרת המערכת, רישום פרטי המסעדה, הספקים, המוצרים וכו'... או שאינה נוגעת להזמנות או למלאי או לנתוני המסעדה, יש להחזיר תשובה קצרה וסגורה בסגנון
        'תפקידי לעזור בכל מה שקשור ל P-vot, האם יש לך שאלות לגבי המערכת?'

        אין לענות על שאלות שאינן קשורות למערכת או לשלבי ההרשמה ואינן במסגרת תפקידך
        
        תמיד השב בשפה העברית, אלא אם המשתמש ביקש אחרת.
        *******************

        תכונות עיקריות:
        1. ניהול הזמנות: אפשרות ליצור, לעדכן ולנהל הזמנות מספקים.
        2. חיבור בין מסעדן לרשת הספקים בצורה אחידה, אוטומטית וחכמה דרך הווצאפ
        
        ### הוראות למערכת ###
        בכל שלב שבו תתבקש, תקבל את הודעות המשתמש יחד עם תיאור השלב ומה נדרש ממך לעשות.
        לרוב, תצטרך לוודא את ההודעה של המשתמש, לעבד אותה ולספק תשובה מובנית או לבצע פעולה במערכת.
        כאשר מצורף \`schema\`, עליך לוודא שהתשובה שלך תואמת למבנה הנתונים שניתן לך.
        תצטרך לבנות אובייקט JSON או טקסט מובנה אחר בהתאם לדרישות השלב ולהשלים את הנתונים ביחד עם הודעת המשתמש.
        עליך תמיד לספק את התשובה הסבירה והקרובה ביותר בהתאם למידע שניתן לך, השתמש בידע מתחום המסעדות כדי להעריך בצורה חכמה את הצרכים והרצונות של המשתמש.
        המטרה שלך היא תמיד לייצר בהירות, סדר וקישורים בין הנתונים השונים במערכת ודרישות הלקוח.
        יש לענות בטון חברי ומכבד, מקצועי וחביב, עם מעט הומור כאשר זה מתאים ותמיד רצון לעזור ולטפל. בנוסף יש לשמור על שפה פשוטה וברורה, משפטים קצרים ושפה מקצועית בתחום המסעדות והספקים.
          ` },
          { role: "system", content: `השלב הנוכחי הוא: ${currentState}` },
          { role: "system", content: `תיאור השלב: ${currentStateDefinition.description}` },
          { role: "system", content: `מה עליך לעשות בשלב זה: ${currentStateDefinition.aiValidation?.prompt || ""}` },
          { role: "system", content: `הוראות שניתנו למשתמש: ${currentStateDefinition.message || currentStateDefinition.whatsappTemplate?.body}` },
          { role: "system", content: `נתונים גולמיים שנאספו בשיחות קודמות: ${JSON.stringify(context, null, 2) || ""}` },
          { role: "system", content: `היסטוריית השיחות הקודמות: ${messagesHistory || "אין היסטוריה"}` },
          { role: "user",   content: userInput }
      ],
      temperature: 0.2, // Lower temperature for more predictable, structured output
      max_tokens: 3000,
      tools: [
        {type: "function", function: functionStyle}
      ],
      tool_choice: { type: "function", function: { name: functionStyle.name } }
    });
    
    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall || !toolCall.function || !toolCall.function.arguments) {
      throw new Error("No function result found in tool_calls");
    }

    // The arguments field is a JSON string
    const result = JSON.parse(toolCall.function.arguments);

    console.log("\n🤖 %c==================== OPENAI RESPONSE ====================\n", 
      result, 
      "\n🤖 %c======================================================\n");

    if (!result) {
      throw new Error("Empty response from OpenAI");
    }
    if (!result.meta.is_data_final_and_confirmed){
      return {
        data: result.data,
        meta: result.meta,
        error: result.meta.follow_up_message,
        success: false,
    };
    }
    return {data: result.data, meta: result.meta, success: true};

  } catch (error) {
    console.error("OpenAI API call failed:", error);
    return {
      error: "שגיאה במהלך עיבוד ההודעה עם AI. אנא נסה שוב מאוחר יותר.",
      success: false,
    };
  }
}