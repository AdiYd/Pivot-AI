import { Conversation } from "../schema/types";
import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getConfig } from "./config";
import { stateObject } from "../schema/states";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { getOrdersDatafromDb, getRestaurantDatafromDb } from "./firestore";
// Load environment variables for local development
if (process.env.NODE_ENV !== 'production' && process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config();
}

type AIModel = {
  model: string;
  temperature: number;
  max_tokens: number;
}

const ai_models: AIModel = {
  model: "gpt-4o",
  temperature: 0.2, // Lower temperature for more predictable, structured output
  max_tokens: 3000,
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
      ...ai_models,
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


export type DataAnalysisResponse = {
  response: string; // The AI's response with data visualization and analysis
  is_finished: boolean; // True if the user has indicated they are done with their queries
  success: boolean; // Indicates if the API call was successful
};
/**
 * Call OpenAI to provide data visualization and analysis based on restaurant or order data
 */
export async function callOpenAIDataAnalysis(
  userInput: string, 
  conversation: Conversation, 
  analysisType: 'restaurant' | 'orders',
  messagesHistory: string, 
): Promise<DataAnalysisResponse> {
  try {
    const openai = getOpenAIClient();
    const restaurantId = conversation.restaurantId  || conversation.context.legalId || conversation.context?.restaurantId;
    let mainData = {}; 
      if (analysisType === 'restaurant') {
      mainData = getRestaurantDatafromDb(restaurantId, conversation.context.isSimulator);
    } else if (analysisType === 'orders') {
      mainData = getOrdersDatafromDb(restaurantId, conversation.context.isSimulator);
    }
    // Define tools and function schemas
    const dataAnalysisFunction = {
      name: "data_analysis_response",
      description: `This function format the output, call it when your data is ready. Analyze and visualize ${analysisType} data and respond to user queries`,
      parameters: {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "A visually appealing, well-formatted response that answers the user's query with data visualization and analysis"
          },
          is_finished: {
            type: "boolean",
            description: "True only if the user has explicitly indicated they are done with their queries or have received all the information they needed"
          }
        },
        required: ["response", "is_finished"]
      }
    };

   const fetchRestaurantFunction = {
      name: "fetchRestaurantDetails",
      description: "Call only if need additional data, this function fetch additional restaurant details when analyzing the restaurant orders data and more restaurant context is needed. Use this when the user asks about restaurant properties, suppliers, or other information not included in the current orders data context. The function will automatically use the restaurantId from the current conversation context. Call this only when absolutely necessary for answering the user's specific question.",
      parameters: {} // Empty object - no parameters required
    };

    const fetchOrdersFunction = {
      name: "fetchOrdersHistory",
      description: "Call only if need additional data, this function fetch orders history when analyzing restaurant details and more order-related information is needed. Use this when the user asks about order trends, delivery performance, or order statistics not included in the current restaurant data context. The function will automatically use the restaurantId from the current conversation context. Call this only when absolutely necessary for answering the user's specific question.",
      parameters: {} // Empty object - no parameters required
    };

    const contextualInstructions = analysisType === 'restaurant' 
      ? "You're analyzing the restaurant data including details about the restaurant, its contacts, orders, suppliers, and products." 
      : "You're analyzing the restaurant order data including order history, statuses, and performance metrics.";

    const systemMessages = [
      { role: "system", content: `
        אתה סוכן חכם ויעיל בעל אפליקציה לבעלי מסעדות, תפקידך לנהל מערכת ניהול הזמנות ומלאי.
        תפקידך הוא לעזור לבעל המסעדה לנהל את ההזמנות והמלאי בצורה היעילה ביותר.
        עליך להבין את ההקשר של השיחה ולספק תשובות מדויקות ומועילות.
        עליך להציג נתונים בצורה ברורה, ויזואלית ומושכת.
        
        שם האפליקציה: P-vot
        תיאור האפליקציה: מערכת ניהול הזמנות ומלאי מתקדמת לבעלי מסעדות מבוססת בינה מלאכותית המחברת בין ספקים למסעדות

        ****   חשוב    ****
        כל שאלה שאינה במסגרת המערכת, רישום פרטי המסעדה, הספקים, המוצרים וכו'... או שאינה נוגעת להזמנות או למלאי או לנתוני המסעדה, יש להחזיר תשובה קצרה וסגורה בסגנון
        'תפקידי לעזור בכל מה שקשור ל P-vot, האם יש לך שאלות לגבי המערכת?'

        אין לענות על שאלות שאינן קשורות למערכת או לשלבי ההרשמה ואינן במסגרת תפקידך
        
        תמיד השב בשפה העברית, אלא אם המשתמש ביקש אחרת.
        *******************
      ` },
      { role: "system", content: `
        ${contextualInstructions}

        ### הנחיות לניתוח והצגת נתונים ###
        אתה אנליסט נתונים מומחה. תפקידך לנתח, להסביר ולהציג את הנתונים בצורה ברורה, מדויקת ואסתטית.

        1. בכל תשובה, נתח את הנתונים באופן מעמיק ומדויק. חלץ תובנות רלוונטיות מהנתונים הגולמיים.
        
        2. הצג את הנתונים בצורה ויזואלית ברורה, באמצעות:
           - סימני פיסוק וסמלים (אמוג'י) לחלוקה והדגשה
           - רווחים וסידור חזותי נכון
           - כותרות וחלוקה לקטגוריות
           - טבלאות טקסטואליות (באמצעות סימני | ו-)
           - רשימות מוגדרות בכוכביות או מספרים
           - הדגשות טקסט (**מודגש** או *נטוי*)
        
        3. התאם את הפורמט לפלטפורמת וואטסאפ - הודעות קצרות אך מקיפות, מחולקות לחלקים קריאים.

        4. אם השאלה אינה ברורה מספיק, הנחה בעדינות את המשתמש לחדד את שאלתו. הצע אפשרויות ספציפיות.
        
        5. תמיד הסק מסקנות ותובנות עסקיות מהנתונים. הדגש מגמות, חריגים, או נקודות מעניינות.
        
        6. שמור על שפה מקצועית, חברותית וברורה. הימנע מז'רגון מיותר.

        ניתן להשתמש בכלים הבאים לעיצוב ויזואלי ברור ומושך:
        • סמלים רלוונטיים 📊 📈 💰 🥩 🍅 🧾 לפי הנושא
        • כוכביות וסימני פריטים: *•◦-
        • הפרדת מקטעים עם קווים או סמלים: ───────────
        • שימוש במרווחים להיררכיה ברורה
        • הדגשות בולטות למספרים או נתונים חשובים
        
        בסיום הניתוח, שאל אם יש עוד מידע שהמשתמש מעוניין לדעת. סמן את השיחה כמסתיימת רק אם המשתמש ציין במפורש שהוא קיבל את כל המידע הנדרש, או הודה לך והביע רצון לסיים.
        ** חשוב **
        בכל שאלה, בקשה או רצון לשנות, לערוך או למחוק מידע - יש לענות תשובה קצרה וברורה
        *******************
        כאן ניתן לצפות בנתונים בלבד, על מנת לבצע שינויים בנתונים ניתן לפנות למנהל הממשק:
         *לידור זינו*,  054-751-3346
         או במייל: lidor.zenou@gmail.com
        *******************
        ` },
      { role: "system", content: `נתונים רלוונטיים שנאספו בשיחות קודמות: \n\n ${JSON.stringify(conversation.context, null, 2)}` },
      { role: "system", content: `היסטוריית השיחות הקודמות:\n\n ${messagesHistory || "אין היסטוריה"}` },
      { role: 'system', content: `השלב הנוכחי הוא:\n\n ${conversation.currentState}` },
      { role: 'system', content: `הנתונים ממסד הנתונים (אלו הם הנתונים הרשמיים, הקובעים ביותר והמעודכנים): \n\n ${JSON.stringify(mainData, null, 2) || "אין מידע זמין"}` },
    ];
    
    // Initialize conversation messages
    let messages = [
      ...systemMessages,
      { role: "user", content: userInput }
    ] as ChatCompletionMessageParam[];

    // Initial API call to determine if we need additional data
    const initialResponse = await openai.chat.completions.create({
      ...ai_models,
      messages,
      tools: [
        { type: "function", function: dataAnalysisFunction },
        (analysisType === 'orders' ? 
          { type: "function", function: fetchRestaurantFunction } 
          : { type: "function", function: fetchOrdersFunction }),
      ],
      tool_choice: "required"
    });

    // Get the first response
    const initialChoice = initialResponse.choices[0];
    
    // Check if a tool was called
    if (initialChoice?.message?.tool_calls && initialChoice?.message?.tool_calls?.length > 0) {
      let additionalData = "";
      
      // Process each tool call
      for (const toolCall of initialChoice.message.tool_calls) {
        // If the model is already providing the final answer
        if (toolCall.function.name === "data_analysis_response") {
          // Parse and return the result
          const result = JSON.parse(toolCall.function.arguments);
          return {
            response: result.response,
            is_finished: result.is_finished,
            success: true
          };
        }
        
        // Handle data fetching tools
       if (toolCall.function.name === "fetchRestaurantDetails" || 
            toolCall.function.name === "fetchOrdersHistory") {
          try {
            // Get restaurantId directly from conversation context            
            if (restaurantId) {
              if (toolCall.function.name === "fetchRestaurantDetails") {
                // Fetch restaurant details using context restaurantId
                const restaurantDetails = await getRestaurantDatafromDb(restaurantId, conversation.context.isSimulator);
                additionalData += `\n\nAdditional Restaurant Details: ${JSON.stringify(restaurantDetails)}`;
              } else {
                // Fetch orders history using context restaurantId
                const ordersHistory = await getOrdersDatafromDb(restaurantId);
                additionalData += `\n\nAdditional Orders History: ${JSON.stringify(ordersHistory)}`;
              }
              
              console.log(`Fetched additional data using: ${toolCall.function.name}`);
            } else {
              console.error("No restaurantId found in conversation context");
            }
          } catch (error) {
            console.error(`Error processing ${toolCall.function.name}:`, error);
            return{
              response: "שגיאה במהלך קריאה מבסיס הנתונים. אנא נסה שוב מאוחר יותר.",
              is_finished: true,
              success: false
            }
          }
        }
      }
      
      // If we've fetched additional data, make a second call with the enriched context
      if (additionalData) {
        // Add the tool response to messages
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: initialChoice.message.tool_calls
        });
          // For each tool call, we need to add a corresponding tool response message
          for (const toolCall of initialChoice.message.tool_calls) {
            if (toolCall.function.name === "fetchRestaurantDetails" || 
                toolCall.function.name === "fetchOrdersHistory") {
              let toolResponse = additionalData;
              // Add the required tool message with the tool_call_id and content
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: toolResponse
              });
            }
          }
        // Make second call with the enriched context
        const secondResponse = await openai.chat.completions.create({
         ...ai_models,
          messages,
          tools: [
            { type: "function", function: dataAnalysisFunction }
          ],
          tool_choice: { type: "function", function: dataAnalysisFunction }
        });
        
        const toolCall = secondResponse.choices[0]?.message?.tool_calls?.[0];
        
        if (!toolCall || !toolCall.function || !toolCall.function.arguments) {
          throw new Error("No function result found in second API call");
        }

        // Parse the final JSON response
        const finalResult = JSON.parse(toolCall.function.arguments);
        
        console.log("\n📊 ==================== FINAL DATA ANALYSIS RESPONSE ====================\n", 
          finalResult, 
          "\n📊 ======================================================\n");

        return {
          response: finalResult.response,
          is_finished: finalResult.is_finished,
          success: true
        };
      }
    }
    
    // If no tools were called or no additional data was fetched
    throw new Error("Expected tool call not found in the response");

  } catch (error) {
    console.error("OpenAI Data Analysis API call failed:", error);
    return {
      response: "שגיאה במהלך ניתוח הנתונים. אנא נסה שוב מאוחר יותר או פנה לתמיכה.",
      is_finished: true,
      success: false
    };
  }
}





