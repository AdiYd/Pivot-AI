import { STATE_MESSAGES } from "../schema/states";
import { BotState, ConversationContext } from "../schema/types";
import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getConfig } from "./config";
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
export async function callOpenAISchema(userInput: string, currentState: BotState, currentContext: ConversationContext, messagesHistory: string): Promise<any> {
  try {
    const openai = getOpenAIClient();
    // Convert to JSON schema
    const currentStateDefinition = STATE_MESSAGES[currentState];
    const context = currentContext || {};
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
                // description: "If 'is_data_final_and_confirmed' is true, Provide a message (In Hebrew) that summarizes this data of this step in a visually appealing way. Style the message in a simple and intuitive manner, focusing on the data you structured and completed from the user's message. don't include any unnecessary details or questions and don't make it sound as if the data is already confirmed, the message's purpose is to inform the user about the structured data and get his final approval. use new lines to separate different sections of the message, and use emojis to enhance readability and engagement. Use *bold* text to highlight important information, and use bullet points or numbered lists to organize the data clearly. The message should be concise, clear, and visually appealing, making it easy for the user to understand the structured data at a glance. Assume the message will be wrapped in a generic template with header and request to approve the data in the footer, so keep it short and to the point, ideally no more than 3-4 lines of text.",
                description: "If 'is_data_final_and_confirmed' is true, craft a concise and visually appealing summary (in Hebrew, ready for WhatsApp message) of the structured data extracted from the user's message. Focus on clarity and intuitiveness, highlighting key information without adding unnecessary details or questions. The message should not imply confirmation, but rather seek the user's approval. Use new lines, emojis, bold text, bullet points, or numbered lists to enhance readability and engagement. Aim for a maximum of 3-4 lines, assuming it will be incorporated into a template with a header and approval request in the footer.",
              },
              follow_up_message: {
                type: "string",
                description: "If 'is_data_final_and_confirmed' is false, Provide Instruction, question or message (In Hebrew) for the client, to help him improve or clarify the input towards the desired outcome. (otherwise, leave empty). This message should be clear and actionable, guiding the user to provide the necessary information or corrections."
              }
            },
            required: ["is_user_data_valid", "is_data_completed_by_ai", "is_data_final_and_confirmed", "follow_up_message"]
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
          { role: "system", content: `הוראות למשתמש: ${currentStateDefinition.message || currentStateDefinition.whatsappTemplate?.body}` },
          { role: "system", content: `מה עליך לעשות: ${currentStateDefinition.aiValidation?.prompt || ""}` },
          { role: "system", content: `היסטוריית השיחות הקודמות: ${messagesHistory || "אין היסטוריה"}` },
          { role: "user",   content: `נתונים גולמיים משיחות קודמות: ${JSON.stringify(currentContext, null, 2) || ""}` },
          { role: "user",   content: userInput }
      ],
      temperature: 0.4, // Lower temperature for more predictable, structured output
      max_tokens: 2500,
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
      "font-size: 14px; font-weight: bold; color: #00a67d;", 
      result, 
      "\n🤖 %c======================================================\n", 
      "font-size: 14px; font-weight: bold; color: #00a67d;");

    if (!result) {
      throw new Error("Empty response from OpenAI");
    }
    if (!result.meta.is_data_final_and_confirmed){
      return {
        data: result.data,
        error: result.meta.follow_up_message
    };
    }
    return {data: result.data, meta: result.meta, ai: true};

  } catch (error) {
    console.error("OpenAI API call failed:", error);
    throw error;
  }
}