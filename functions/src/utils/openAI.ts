import { Conversation, Supplier } from "../schema/types";
import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getConfig } from "./config";
import { stateObject } from "../schema/states";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { getAIConfigurations, getOrdersDatafromDb, getRestaurantDatafromDb, getSupplierDataFromDb, setSupplierDataInDb } from "./firestore";
import { SupplierSchema } from "../schema/schemas";
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
    const AI_CONFIGURATIONS = await getAIConfigurations();
    const { currentState } = conversation;
    // Convert to JSON schema
    const currentStateDefinition = await stateObject(conversation);
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
      ...AI_CONFIGURATIONS.params,
      messages: [
        { role: "system", content: `
        ${AI_CONFIGURATIONS.prompts.systemCorePrompt?.prompt}
        ${AI_CONFIGURATIONS.prompts.menuOptionsPrompt?.prompt}
        ### הוראות נוספות למערכת ###
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
    const AI_CONFIGURATIONS = await getAIConfigurations();
    const supplierEditJsonSchema = zodToJsonSchema(SupplierSchema);
    const restaurantId = conversation.restaurantId  || conversation.context.legalId || conversation.context?.restaurantId;
    let mainData = {}; 
      if (analysisType === 'restaurant') {
      mainData = await getRestaurantDatafromDb(restaurantId, conversation.context.isSimulator);
    } else if (analysisType === 'orders') {
      mainData = await getOrdersDatafromDb(restaurantId, conversation.context.isSimulator);
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
          },
          editSupplier: {
            type: "boolean",
            description: "True *only* if the user explicitly requested to edit supplier data (Allowed *only* one supplier edit at a time, and can edit *only* the following supplier fields: name, email (if not provided, ignore), cutoff hours and product list - including adding or removing products, their units or editing the base quantity values, Also known as 'מצבת בסיס' - those are the values for each product representing the reccomended quantity for midweek and for weekend), double check, verify and get the user's explicit approval for the changes before setting this field to true (setting this field to true will change the supplier data)"
          },
          supplierData: {
            ...supplierEditJsonSchema,
            description: "The structured supplier data to be edited, provide an exact, accurate and verified data by the client. Use the existing (accurate) values for items and fields that should not changed. only present if editSupplier is true"
          }
        },
        required: ["response", "is_finished", "editSupplier"]
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
      ? AI_CONFIGURATIONS.prompts.restaurantDataContext.prompt
      : AI_CONFIGURATIONS.prompts.ordersDataContext.prompt;

    const systemMessages = [
      { role: "system", content: AI_CONFIGURATIONS.prompts.systemCorePrompt.prompt },
      { role: "system", content: AI_CONFIGURATIONS.prompts.menuOptionsPrompt.prompt },
      { role: "system", content: contextualInstructions },
      { role: "system", content: AI_CONFIGURATIONS.prompts.dataVisualizationInstructions.prompt },
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
      ...AI_CONFIGURATIONS.params,
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
          if (result?.editSupplier && result?.supplierData && conversation.context?.isManager) {
            try {
              let supplierData = (typeof result.supplierData === "string" ? JSON.parse(result.supplierData)  : result.supplierData) as Supplier;
              console.log(`[Firestore] 📦 Supplier data to be edited:`, supplierData);
              const supplierWhatsApp = supplierData?.whatsapp;
              const dbSupplierData = await getSupplierDataFromDb(supplierWhatsApp, restaurantId, conversation.context.isSimulator || false);
              if (dbSupplierData) {
                // If we found the supplier in the database, we can use it
                supplierData = { ...dbSupplierData, ...supplierData, products: supplierData.products } ;
                if (supplierData.email === null || supplierData.email === undefined) {
                  delete supplierData.email;
                }
                const finalSupplierData = SupplierSchema.parse(supplierData);
                const isUpdated = await setSupplierDataInDb(supplierWhatsApp, restaurantId, finalSupplierData, conversation.context.isSimulator || false);
                if (!isUpdated) {
                  console.error(`[Firestore] ❌ Failed to update supplier data for WhatsApp: ${supplierWhatsApp}`);
                }
              }
            } catch (error) {
              console.error(`[Firestore] ❌ Error processing supplier data:`, error);
            }
           }
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
         ...AI_CONFIGURATIONS.params,
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
        if (finalResult?.editSupplier && finalResult?.supplierData && conversation.context?.isManager) {
          let supplierData = (typeof finalResult.supplierData === "string" ? JSON.parse(finalResult.supplierData)  : finalResult.supplierData) as Supplier;
          const supplierWhatsApp = supplierData?.whatsapp;
          const dbSupplierData = await getSupplierDataFromDb(supplierWhatsApp, restaurantId, conversation.context.isSimulator || false);
          if (dbSupplierData) {
            // If we found the supplier in the database, we can use it
            supplierData = { ...dbSupplierData, ...supplierData, products: supplierData.products };
            if (supplierData.email === null || supplierData.email === undefined) {
                  delete supplierData.email;
            }
            try {
              const finalSupplierData = SupplierSchema.parse(supplierData);
              const isUpdated = await setSupplierDataInDb(supplierWhatsApp, restaurantId, finalSupplierData, conversation.context.isSimulator || false);
              if (!isUpdated) {
                console.error(`[Firestore] ❌ Failed to update supplier data for WhatsApp: ${supplierWhatsApp}`);
              }
            } catch (error) {
              console.error(`[Firestore] ❌ Error parsing supplier data:`, error);
            }
          }
        }
        
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


export type AssistantResponse = {
  response: string; // The AI's response with data visualization and analysis
  is_finished: boolean; // True if the user has indicated they are done with their queries
  success: boolean; // Indicates if the API call was successful
};
/**
 * Call OpenAI to provide data visualization and analysis based on restaurant or order data
 */
export async function callOpenAIAssistant(
  userInput: string, 
  conversation: Conversation, 
  assistType: 'help' | 'interested',
  messagesHistory: string, 
): Promise<AssistantResponse> {
  try {
    const openai = getOpenAIClient();
    const isHelping = (assistType === 'help' && conversation.context?.isManager);
    const AI_CONFIGURATIONS = await getAIConfigurations();
    const supplierEditJsonSchema = zodToJsonSchema(SupplierSchema);
    const restaurantId = conversation.restaurantId  || conversation.context.legalId || conversation.context?.restaurantId;
    let mainData;
    if (restaurantId){
      try{
       mainData = await getRestaurantDatafromDb(restaurantId, conversation.context.isSimulator);
       mainData = JSON.stringify(mainData, null, 2);
      }catch (error) {
        console.error("Error fetching restaurant data:", error);
      }
    }

    // Define tools and function schemas
    const dataAsistanceType = {
      name: "data_asistance_response",
      description: `This function format the output, call it when your data is ready. Analyze and visualize ${assistType} data and respond to user queries`,
      parameters: {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "A visually appealing, well-styled and descriptive response that answers the user's query with data visualization and answers"
          },
          is_finished: {
            type: "boolean",
            description: "True only if the user has explicitly indicated they are done with their queries or have received all the information they needed, or type \"רישום\" or \"סיום\" or \"סיום שיחה\" or \"התחל\""
          },
          ...(isHelping ? {  
          editSupplier: {
            type: "boolean",
            description: "True *only* if the user explicitly requested to edit supplier data (Allowed *only* one supplier edit at a time, and can edit *only* the following supplier fields: name, email, cutoff hours and product list - including adding or removing products, their units or editing the base quantity values, Also known as 'מצבת בסיס' - those are the values for each product representing the reccomended quantity for midweek and for weekend), double check, verify and get the user's explicit approval for the changes before setting this field to true (setting this field to true will change the supplier data)"
          },
          supplierData: {
            ...supplierEditJsonSchema,
            description: "The structured supplier data to be edited, provide an exact, accurate and verified data by the client. Use the existing (accurate) values for items and fields that should not changed. The object must contain *all* supplier's fields to be edited and the exact values of the unchanged fields, do not skip or miss them!. only present if editSupplier is true"
          }}: {})
        },
        required: ["response", "is_finished", ...(isHelping ? ["editSupplier"] : [])]
      }
    };

    const contextualInstructions = assistType === 'help' 
      ? AI_CONFIGURATIONS.prompts.helpMenu.prompt
      : AI_CONFIGURATIONS.prompts.interestedMenu.prompt;

    const systemMessages = [
      { role: "system", content: AI_CONFIGURATIONS.prompts.systemCorePrompt.prompt },
      { role: "system", content: AI_CONFIGURATIONS.prompts.menuOptionsPrompt.prompt },
      { role: "system", content: AI_CONFIGURATIONS.prompts.dataVisualizationInstructions.prompt },
      { role: "system", content: contextualInstructions },
      { role: "system", content: `נתונים רלוונטיים שנאספו בשיחות קודמות: \n\n ${JSON.stringify(conversation.context, null, 2)}` },
      { role: "system", content: `היסטוריית השיחות הקודמות:\n\n ${messagesHistory || "אין היסטוריה"}` },
      { role: 'system', content: `הנתונים ממסד הנתונים (אלו הם הנתונים הרשמיים והמעודכנים): \n\n ${JSON.stringify(mainData, null, 2) || "אין מידע זמין"}` },
    ];
    
    // Initialize conversation messages
    let messages = [
      ...systemMessages,
      { role: "user", content: userInput }
    ] as ChatCompletionMessageParam[];

    // Initial API call to determine if we need additional data
    const initialResponse = await openai.chat.completions.create({
      ...AI_CONFIGURATIONS.params,
      messages,
      tools: [
        { type: "function", function: dataAsistanceType },
      ],
      tool_choice: "required"
    });

      // Get the first response
      const initialChoice = initialResponse.choices[0];
      const toolCall = initialChoice.message.tool_calls?.[0];
      if (toolCall?.function.name === "data_asistance_response") {
        const result = JSON.parse(toolCall.function.arguments);
        if (result?.editSupplier && result?.supplierData && isHelping) {
          try{
            let supplierData = (typeof result.supplierData === "string" ? JSON.parse(result.supplierData)  : result.supplierData) as Supplier;
            console.log(`[Firestore] 📦 Supplier data to be edited:`, supplierData);
            const supplierWhatsApp = supplierData?.whatsapp;
            const dbSupplierData = await getSupplierDataFromDb(supplierWhatsApp, restaurantId, conversation.context.isSimulator || false);
            if (dbSupplierData) {
              // If we found the supplier in the database, we can use it
              supplierData = { ...dbSupplierData, ...supplierData, products: supplierData.products };
              if (supplierData.email === null || supplierData.email === undefined) {
                  delete supplierData.email;
              }
              const finalSupplierData = SupplierSchema.parse(supplierData);
              const isUpdated = await setSupplierDataInDb(supplierWhatsApp, restaurantId, finalSupplierData, conversation.context.isSimulator || false);
              if (!isUpdated) {
                console.error(`[Firestore] ❌ Failed to update supplier data for WhatsApp: ${supplierWhatsApp}`);
              }
            }
          } catch (error) {
            console.error(`[Firestore] ❌ Error processing supplier data:`, error);
          }
        }
        return {
          response: result.response,
          is_finished: result.is_finished,
          success: true
        };
      }
      return {
          response: "נשמח לעמוד לרשותכם בזמן אחר ולענות על כל השאלות.",
          is_finished: true,
          success: false
        };

  } catch (error) {
    console.error("OpenAI Data Analysis API call failed:", error);
    return {
      response: "נשמח לעמוד לרשותכם בזמן אחר ולענות על כל השאלות.",
      is_finished: true,
      success: false
    };
  }
}





