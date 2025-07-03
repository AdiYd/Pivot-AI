import { z } from 'zod';
import { 
  BotAction, 
  BotState, 
  Conversation, 
  IncomingMessage,
  ConversationContext,
  StateObject,
  StateReducerResult,
  Message,
} from '../schema/types';
import { CATEGORY_TAGS_DICT, stateObject } from '../schema/states';
import { ProductSchema, restaurantLegalIdSchema, RestaurantSchema, SupplierSchema } from '../schema/schemas';
import { callOpenAIAssistant, callOpenAIDataAnalysis, callOpenAISchema } from '../utils/openAI';
import { firestore, getRestaurant } from '../utils/firestore';
import { FieldValue } from 'firebase-admin/firestore';
/**
 * Interface for the state machine's result
 */

export const escapeDict: Record<string, BotState> = {
 'menu': 'IDLE',
 'תפריט': 'IDLE',
 'תפריט ראשי': 'IDLE',
 'עזרה': 'IDLE',
 'reset_conversation_pivot': 'INIT',
};

export const onBoradingList: BotState[] = ['INIT', 'ONBOARDING_LEGAL_ID', 'ONBOARDING_RESTAURANT_NAME', 'ONBOARDING_CONTACT_NAME', 'ONBOARDING_CONTACT_EMAIL','ONBOARDING_PAYMENT_METHOD'];

/**
 * Validates input data against a schema or using AI
 * 
 * @param input User input to validate
 * @param validator Zod schema for validation
 * @param aiValidation Optional AI validation configuration
 * @param currentState Current bot state for context
 * @returns Validated data or null if validation fails
 */
async function stateValidator(
  input: string,
  validator?: z.ZodTypeAny,
  aiValidation?: StateObject['aiValidation'],
  conversation?: Conversation,
  messagesHistory?: string
): Promise<any | null> {
  try {
    // Trim input to remove leading/trailing whitespace
    const trimmedInput = input.trim();
    
    // Skip validation if no validator provided
    if (!validator && !aiValidation) {
      return { data: trimmedInput, success: true };
    }
    
    // If AI validation is required
    if (aiValidation) {
      // Process with AI first
      
      try {
        //Collect history of messages only from the current state and map them to body only
        const aiResult = await callOpenAISchema(trimmedInput, conversation as Conversation, messagesHistory as string);
        // console.log(`[StateReducer] AI validation result:`, aiResult);
        
        // If AI returns structured data and we have a schema, validate it
        if (aiResult) {
          return aiResult;
        }
      } catch (aiError) {
        console.error("[StateReducer] AI validation error:", aiError);
        // Fall through to standard validation as backup
      }
    }
        // Standard zod schema validation
    if (validator) {
      try {
        // Handle different schema types appropriately
        let validatedData;
        
        if (validator instanceof z.ZodString) {
          validatedData = validator.parse(trimmedInput);
        } 
        else if (validator instanceof z.ZodObject) {
          // Try to parse JSON if the input might be an object
          if (conversation?.currentState === 'SUPPLIER_CATEGORY' || conversation?.currentState === 'SUPPLIER_CATEGORY2') {
            const categories = trimmedInput.split(',').map(item => {
              const cleanedItem = item.replace(/\uFFFD/g, "").trim();
              return CATEGORY_TAGS_DICT[cleanedItem] || cleanedItem;
            });
            validatedData = validator.parse({ category: categories });
          } else {
          try {
            const jsonData = JSON.parse(trimmedInput);
            validatedData = validator.parse(jsonData);
          } catch (jsonError) {
            // If not valid JSON, try direct validation
            validatedData = validator.parse(trimmedInput);
          }
        }
        }
        else if (validator instanceof z.ZodArray) {
          validatedData = validator.parse(trimmedInput.split(',').map(item => item.trim()));
          console.log('validatedData', validatedData);
        }
        return { data: validatedData, success: true };
      } catch (validationError) {
        // Capture and return the specific validation error message
        if (validationError instanceof z.ZodError) {
          const errorMessage = validationError.errors.map(e => e.message).join(', ');
          return { data: null, error: errorMessage, success: false  };
        }
        throw validationError;
      }
    }
    
    // If we get here, return the trimmed input as fallback
    return { data: trimmedInput, success: true };
  } catch (error) {
    console.error('[StateReducer] Validation error:', error);
    
    // Return null to indicate validation failure
    return { data: null, error: String(error), success: false };
  }
}

/**
 * Creates actions based on the current state's defined action type
 * 
 * @param actionType The action type to create
 * @param context Current conversation context
 * @param currentState Current bot state
 * @returns BotAction object or null if no action defined
 */
function createActionFromState(
  actionType: BotAction['type'] | undefined,
  context: ConversationContext,
  currentState: BotState
): BotAction | null {
  if (!actionType) return null;
  
  switch (actionType) {
    case 'CREATE_RESTAURANT':
        const restaurantData = RestaurantSchema.parse(
        {
          legalId: context.legalId || context.restaurantId,
          legalName: context.companyName || '',
          name: context.restaurantName || '',
          contacts: {
            [context.contactNumber]: {
              whatsapp: context.contactNumber || '',
              name: context.contactName || '',
              role: 'owner',
              ...(context.contactEmail && { email: context.contactEmail })
            }
          },
          payment: {
            provider: context.paymentMethod || 'trial',
            status: false
          }
        }
        )
      return {
        type: 'CREATE_RESTAURANT',
        payload: restaurantData
      };
    
    case 'CREATE_SUPPLIER':
        const supplierData = SupplierSchema.extend({
              restaurantId: restaurantLegalIdSchema,
            }).parse({
          restaurantId: context.legalId || '',
          whatsapp: context.supplierWhatsapp || '',
          name: context.supplierName || '',
          role: 'supplier',
          ...(context.supplierEmail && { email: context.supplierEmail }),
          category: Array.isArray(context.supplierCategories) ? context.supplierCategories : [],
          cutoff: context.supplierCutoff || [],
          products: context.supplierProducts || []
        })
      return {
        type: 'CREATE_SUPPLIER',
        payload: supplierData
      };
      
    case 'UPDATE_SUPPLIER':
      const supplierUpdateData =SupplierSchema.extend({
              restaurantId: restaurantLegalIdSchema,
            }).parse(
        {
          restaurantId: context.legalId || '',
          whatsapp: context.supplierWhatsapp || '',
          name: context.supplierName || '',
          cutoff: context.supplierCutoff || [],
          category: Array.isArray(context.supplierCategories) ? context.supplierCategories : []
        }
      );
      return {
        type: 'UPDATE_SUPPLIER',
        payload: supplierUpdateData
      };
      
    case 'UPDATE_PRODUCT':
        const productUpdateData = ProductSchema.parse(
        {
          restaurantId: context.legalId || '',
          supplierId: context.supplierWhatsapp || '',
          products: context.supplierProducts || []
        }
      );
      return {
        type: 'UPDATE_PRODUCT',
        payload: productUpdateData
      };
      
    case 'LOG_DELIVERY':
      return {
        type: 'LOG_DELIVERY',
        payload: {
          orderId: context.orderId || '',
          items: context.deliveredItems || [],
          invoiceUrl: context.invoiceUrl || undefined
        }
      };
      
    default:
      console.warn(`[StateReducer] Unknown action type: ${actionType}`);
      return null;
  }
}

/**
 * Creates a message action to send back to the user
 * 
 * @param messageData Message data from the state definition
 * @param to Recipient phone number
 * @param context Current conversation context
 * @returns SEND_MESSAGE action object
 */
function createMessageAction(
  messageData: StateObject,
  to: string,
  context: ConversationContext,
  currentState: BotState
): BotAction {
  console.log('Creating message action...', { messageData, to, context, currentState });
  // Prepare message template if defined
  if (messageData.whatsappTemplate) {
    const template = messageData.whatsappTemplate;
    
    // Replace placeholders in template body with context values
    let body = template.body;
    if (context.isSimulator){
      Object.keys(context).forEach(key => {
        const placeholder = `{${key}}`;
        if (body.includes(placeholder)) {
          body = body.replace(new RegExp(placeholder, 'g'), String(context[key] || ''));
        }
      });
    } else {

    }
    
    // Set options if dynamic options are required
    let options = template.options;
    
    // Create the action with template
    return {
      type: 'SEND_MESSAGE',
      payload: {
        to,
        template: {
          ...template,
          ...(context.isSimulator ? { body, options } : {}),
        },
       ...(!context.isSimulator ? {context} : {}),
        messageState: currentState
      }
    };
  }
  
  // For regular text messages
  if (messageData.message) {
    let body = messageData.message;
    
    // Replace placeholders with context values
    Object.keys(context).forEach(key => {
      const placeholder = `{${key}}`;
      if (body.includes(placeholder)) {
        body = body.replace(new RegExp(placeholder, 'g'), String(context[key] || ''));
      }
      // Clear all '{<string>}' placeholders that are not replaced
      // body = body.replace(/{\w+}/g, '');
    });
    
    return {
      type: 'SEND_MESSAGE',
      payload: {
        to,
        body,
        messageState: currentState
      }
    };
  }
  
  // Fallback if no message is defined
  return {
    type: 'SEND_MESSAGE',
    payload: {
      to,
      body: '⚠️ כרגע אין לי מידע להציג. אנא נסה שוב מאוחר יותר.',
      messageState: currentState
    }
  };
}

/**
 * Main state machine function that processes incoming messages and updates conversation state
 * 
 * @param conversation Current conversation state
 * @param message Incoming message
 * @returns New conversation state and actions to perform
 */
export async function conversationStateReducer(
  conversation: Conversation,
  message: IncomingMessage
): Promise<StateReducerResult> {
  console.log(`[StateReducer] Processing message for state: ${conversation.currentState}`);
  
  // Initialize result with current state and empty actions array
  const result: StateReducerResult = {
    newState: { ...conversation },
    actions: []
  };
  
  try {
    // Get current state definition
    const currentStateObject = await stateObject(result.newState);
    
    if (!currentStateObject) {
      console.error(`[StateReducer] No state definition found for state: ${conversation.currentState}`);
      
      // Reset to IDLE state if definition is not found
   
      result.actions.push({
        type: 'SEND_MESSAGE',
        payload: {
          to: message.from,
          body: '⚠️ אירעה שגיאה במערכת. מעבירים אותך לתפריט הראשי.',
          messageState: result.newState.currentState
        }
      });
      result.newState.currentState = 'IDLE';
      
      return result;
    }
    
    // Handle special button/list responses
    let userInput = message.body.trim();
    let validationResult = null;
    let nextState: BotState | null = null;
    const isSimulator = conversation.context?.isSimulator;

    // Check if the message is one of the special commands (escapeDict)
    if (userInput === 'reset_pivot') {
      console.log(`[StateReducer] User input is a special command: ${userInput}`);
      result.newState.currentState = 'INIT';
      result.newState.context = {};
      const nextStateDefinition = await stateObject(result.newState);
      if (nextStateDefinition) {
        // Create message action for the next state
        const nextStateMessage = createMessageAction(
          nextStateDefinition,
          message.from,
          result.newState.context,
          result.newState.currentState
        );
        result.actions.push(nextStateMessage);
        return result; // Return early with the new state and message
      }
    } 

    // Check if the message is one of the special commands (escapeDict)
    if (escapeDict[userInput.toLocaleLowerCase()] &&  !onBoradingList.includes(conversation.currentState)) {
      console.log(`[StateReducer] User input is a special command: ${userInput}`);
      result.newState.currentState = escapeDict[userInput.toLocaleLowerCase()];
      const nextStateDefinition = await stateObject(result.newState);
      if (nextStateDefinition) {
        // Create message action for the next state
        const nextStateMessage = createMessageAction(
          nextStateDefinition,
          message.from,
          result.newState.context,
          result.newState.currentState
        );
        result.actions.push(nextStateMessage);
        return result; // Return early with the new state and message
      }
    } 

    // Check if user input is "place_order" and if so, create new 'order' collection and send a link
    if (userInput === "create_order") {
      try {
      const restaurantId = conversation.restaurantId|| conversation.context.legalId || conversation.context.restaurantId;
      const restaurant = await getRestaurant(restaurantId, isSimulator);
      const contact = restaurant?.contacts[conversation.context.contactNumber];
      if (!restaurant || !contact) {
        console.error(`[StateReducer] Restaurant or contact not found`);
        throw new Error('Restaurant or contact not found');
      }
      const orderId = `${restaurantId}_${Date.now()}${conversation.context.isSimulator ? 'smltr':''}`; // Generate a unique order ID
      const shortId = crypto.getRandomValues(new Uint32Array(1))[0].toString(8); // Generate a short ID
      // Store the data in Firestore or other storage
      await firestore.collection(`orderLinks`).doc(shortId).set({
        restaurantId,
        contact,
        orderId,
        createdAt: FieldValue.serverTimestamp(),
      });

      // const url = `https://pivot.webly.digital/snapshots/${shortId}`;
      const url = `https://pivot.webly.digital/snapshots/${shortId}`;
      result.actions.push({
        type: 'SEND_MESSAGE',
        payload: {
          to: message.from,
          body: `מוכנים לבצע ספירת מלאי וליצור הזמנה? לחצו כאן 👇
          ${url}`,
          messageState: "ONBOARDING_LEGAL_ID"
        }
      });
      return result;
    } catch (error) {
      console.error(`[StateReducer] Error creating order collection:`, error);
      result.actions.push({
        type: 'SEND_MESSAGE',
        payload: {
          to: message.from,
          body: '⚠️ אירעה שגיאה ביצירת ההזמנה. אנא נסה שוב מאוחר יותר.',
          messageState: conversation.currentState
        }
      });
      return result;
    }
    }

    if (['HELP', 'INTERESTED'].includes(conversation.currentState)) {

        const response = await callOpenAIAssistant(
          userInput,
        conversation,
        conversation.currentState === "HELP" ? 'help' : 'interested',
        conversation.messages.map((msg : Message) => `${msg.role}: ${msg.body || ''}`).slice(-10).join('\n'),
        );
        
        if (response) {
          result.actions.push({
            type: 'SEND_MESSAGE',
            payload: {
              to: message.from,
              body: response.response,
              messageState: result.newState.currentState
            }
          });
          if (response.is_finished){
            if (conversation.currentState === 'INIT'){
              result.newState.currentState = 'INIT';
            } else {
             result.newState.currentState = 'IDLE';
            }
          }
          return result; // Return early with the AI response
        } else {
          console.error(`[StateReducer] AI analysis failed for input: ${userInput}`);
          result.actions.push({
            type: 'SEND_MESSAGE',
            payload: {
              to: message.from,
              body: '⚠️ ניתוח הנתונים נכשל. אנא נסה שוב.',
              messageState: result.newState.currentState
            }
          });
          result.newState.currentState = 'IDLE'; // Reset to IDLE state on failure
          return result; // Stay in current state
        }
    }


    if (['RESTAURANT_INFO', 'ORDERS_INFO'].includes(conversation.currentState)) {

        const response = await callOpenAIDataAnalysis(
          userInput,
        conversation,
        conversation.currentState === "RESTAURANT_INFO" ? 'restaurant' : 'orders',
        conversation.messages.map((msg : Message) => `${msg.role}: ${msg.body || ''}`).slice(-10).join('\n'),
        );
        console.log(`[StateReducer] AI analysis result:`, response);
        
        if (response) {
          result.actions.push({
            type: 'SEND_MESSAGE',
            payload: {
              to: message.from,
              body: response.response,
              messageState: result.newState.currentState
            }
          });
          if (response.is_finished){
            result.newState.currentState = 'IDLE';
          }
          return result; // Return early with the AI response
        } else {
          console.error(`[StateReducer] AI analysis failed for input: ${userInput}`);
          result.actions.push({
            type: 'SEND_MESSAGE',
            payload: {
              to: message.from,
              body: '⚠️ ניתוח הנתונים נכשל. אנא נסה שוב.',
              messageState: result.newState.currentState
            }
          });
          result.newState.currentState = 'IDLE'; // Reset to IDLE state on failure
          return result; // Stay in current state
        }
    }

    // Check if this is a template option selection
    if (currentStateObject.whatsappTemplate?.options && userInput !== 'user_confirmed') {
      const selectedOption = currentStateObject.whatsappTemplate.options.find(
        (option: any) => option.id === userInput
      );
      
      // If user selected a valid option from the template
      if (selectedOption) {
        console.log(`[StateReducer] Template option selected: ${selectedOption.name} (${selectedOption.id})`);
        
        // If the selection directly maps to a next state, use it
        if (currentStateObject.nextState && currentStateObject.nextState[userInput]) {
          nextState = currentStateObject.nextState[userInput];
          
          // If we have a valid next state, skip further validation
          if (nextState) {
            // Update context if needed based on selection
            if (currentStateObject.callback && typeof currentStateObject.callback === 'function') {
              try {
                currentStateObject.callback(result.newState.context, selectedOption.id);
              } catch (callbackError) {
                console.error(`[StateReducer] Callback error for template selection:`, callbackError);
              }
            }
            result.newState.currentState = nextState;

            // Prepare message action for the next state
            if (currentStateObject.action) {
              const action = createActionFromState(
                currentStateObject.action,
                result.newState.context,
                nextState
              );
              
              if (action) {
                result.actions.push(action);
              }
            }
            const nextStateMessage = createMessageAction(
              await stateObject(result.newState), message.from, result.newState.context, nextState
            );
            result.actions.push(nextStateMessage);
              // Create action if defined in the state
            return result;
          }
        }
      }
    }
    
    // First, try to validate the input
    if (currentStateObject.validator && userInput !== 'user_confirmed') {
      try {
        const filteredMessages = conversation.messages.filter(msg => msg.messageState === conversation.currentState)
        .slice(-8)
          .map(msg => {
            // Handle both Date objects and Firestore Timestamps
            let timeString = '';
            if (msg.createdAt) {
              if (msg.createdAt instanceof Date) {
                timeString = msg.createdAt.toISOString();
              } else if (msg.createdAt.toDate && typeof msg.createdAt.toDate === 'function') {
                // Firestore Timestamp
                timeString = msg.createdAt.toDate().toISOString();
              } else if (msg.createdAt.seconds) {
                // Firestore Timestamp as plain object
                timeString = new Date(msg.createdAt.seconds * 1000).toISOString();
              } else {
                timeString = String(msg.createdAt);
              }
            }
            return `${msg.role}: ${msg.body} [${timeString}]`;
      }).join('\n');

        // console.log('******* filteredMessages *******', filteredMessages);
        
        validationResult = await stateValidator(
          userInput, 
          currentStateObject.validator,
          currentStateObject.aiValidation,
          conversation,
          filteredMessages
        );

        if (validationResult.success 
          && validationResult.meta 
          && validationResult.meta?.is_data_final_and_confirmed 
        ) {
          const approvalMessage = validationResult.meta?.approval_message.trim();
          if (approvalMessage) {          
             const approvalMessageWrapper = `
✅ אנא אשר את הפרטים הבאים לפני ההמשך:
-----------------------------------------------------
${approvalMessage}
-----------------------------------------------------

*במידה ויש צורך בתיקונים או תוספות, יש לכתוב הודעה עם ההערות המתאימות.*`  
              // Send the approval Template message for whatsapp card with button to approve
              const approvalAction = createMessageAction(
                {
                  whatsappTemplate: {
                    id: 'approval_template',
                    type: 'button',
                    sid:'HXf76b14e1ab01c256fb48b06072347f08',
                    body: approvalMessageWrapper,
                    contentVariables: JSON.stringify({
                      '1': approvalMessageWrapper || "שגיאה בקבלת נתונים מהסוכן החכם (AI validation)",
                    }),
                    options: [
                      { name: 'אישור', id: 'user_confirmed' },
                    ]
                  },
                  description: 'Approval message for AI validated data, the client must approve it by clicking the confirm button',
                },
                message.from,
                result.newState.context,
                conversation.currentState
              );
              result.actions.push(approvalAction);
              result.newState.context.dataToApprove = validationResult.data; // Store data to approve in context temporarily

              return result; // Wait for user response to approval
          }
        }

      } catch (validationError) {
        console.error(`[StateReducer] Validation error:`, validationError);
        
        // Send validation error message if defined
        if (currentStateObject.validationMessage) {
          result.actions.push({
            type: 'SEND_MESSAGE',
            payload: {
              to: message.from,
              body: currentStateObject.validationMessage,
              messageState: result.newState.currentState
            }
          });
        } else {
          // Default validation error message
           if (result.newState.context.dataToApprove) {
              delete result.newState.context.dataToApprove; // Clear temporary data
            }
          result.actions.push({
            type: 'SEND_MESSAGE',
            payload: {
              to: message.from,
              body: '⚠️ מצטערים, יש שגיאה בהזנה או עיבוד הנתונים כרגע. אנא נסה שוב בזמן אחר.',
              messageState: result.newState.currentState
            }
          });
        }
        
        // Stay in current state
        return result;
      }
    } else {
      // If no validator, just use the trimmed input
      validationResult = { data: result.newState?.context?.dataToApprove || userInput.trim(), user_confirmed: userInput === 'user_confirmed' };
    }
    
    // If validation failed
    if (validationResult === null) {
      console.log(`[StateReducer] Validation failed for state: ${conversation.currentState}`);
      
      // Send validation error message if defined
      if (currentStateObject.validationMessage) {
        result.actions.push({
          type: 'SEND_MESSAGE',
          payload: {
            to: message.from,
            body: currentStateObject.validationMessage,
            messageState: result.newState.currentState
          }
        });
      } else {
        // Default validation error message
         if (result.newState.context.dataToApprove) {
          delete result.newState.context.dataToApprove; // Clear temporary data
        }
        result.actions.push({
          type: 'SEND_MESSAGE',
          payload: {
            to: message.from,
            body: '⚠️ הקלט שהזנת אינו תקין. אנא נסה שוב.',
            messageState: result.newState.currentState
          }
        });
      }
      
      // Stay in current state
      return result;
    }

    if (validationResult.error) {
      console.error(`[StateReducer] Validation error:`, validationResult.error);
      result.actions.push({
          type: 'SEND_MESSAGE',
          payload: {
            to: message.from,
            body: validationResult.error,
            messageState: result.newState.currentState
          }
        });
      // Stay in current state
      return result;
    }

    // Execute callback if defined to update context
    if (currentStateObject.callback && typeof currentStateObject.callback === 'function') {
      try {
        currentStateObject.callback(result.newState.context, validationResult.data);
      } catch (callbackError) {
        console.error(`[StateReducer] Callback error:`, callbackError);
      }
    }
    
    // Determine next state based on validation result and state definition
    if (currentStateObject.nextState) {
      // Handle validation success and user confirmation
      if (validationResult.success && currentStateObject.nextState.success) {
        nextState = currentStateObject.nextState.success;
      }
      if (validationResult.user_confirmed && currentStateObject.nextState.user_confirmed) {
        nextState = currentStateObject.nextState.user_confirmed;
        if (result.newState.context.dataToApprove) {
          delete result.newState.context.dataToApprove; // Clear temporary data
        }

      }
      // Handle list selection or template button response
      else if (typeof validationResult.data === 'string' && currentStateObject.nextState[validationResult.data]) {
        nextState = currentStateObject.nextState[validationResult.data];
      }
    }
    
    // Create action if defined in the state
    if (currentStateObject.action) {
      const action = createActionFromState(
        currentStateObject.action,
        result.newState.context,
        result.newState.currentState
      );
      
      if (action) {
        result.actions.push(action);
      }
    }
    
    // If we have a next state, update the state and send the associated message
    if (nextState) {
      console.log(`[StateReducer] Transitioning from ${conversation.currentState} to ${nextState}`);
      
      // Update the conversation state
      result.newState.currentState = nextState;
      
      // Get the next state definition
      const nextStateDefinition = await stateObject(result.newState);
      
      if (nextStateDefinition) {
        // Create and add message action for the next state
        const messageAction = createMessageAction(
          nextStateDefinition,
          message.from,
          result.newState.context,
          nextState
        );
       
        
        result.actions.push(messageAction);
        if (nextStateDefinition.message2) {
          result.actions.push({
           type: 'SEND_MESSAGE',
           payload: {
             to: message.from,
             body: nextStateDefinition.message2,
             messageState: result.newState.currentState
           }
         });
        }
      } else {
        console.error(`[StateReducer] No state definition found for next state: ${nextState}`);
      }
    } else {
      // If no next state defined, create message for current state again
      const repeatMessageAction = createMessageAction(
        currentStateObject,
        message.from,
        result.newState.context,
        conversation.currentState
      );
      
      result.actions.push(repeatMessageAction);
    }
  } catch (error) {
    console.error(`[StateReducer] Unexpected error:`, error);
    
    // Handle unexpected errors by returning to IDLE state
    result.newState.currentState = 'IDLE';
     if (result.newState.context.dataToApprove) {
          delete result.newState.context.dataToApprove; // Clear temporary data
      }
    result.actions.push({
      type: 'SEND_MESSAGE',
      payload: {
        to: message.from,
        body: '⚠️ אירעה שגיאה בלתי צפויה במערכת. אנא נסה שוב או צור קשר עם התמיכה.',
        messageState: result.newState.currentState
      }
    });
  }
  
  return result;
}

/**
 * Helper function for dynamic content replacement in messages
 * 
 * @param template Template string with placeholders
 * @param context Context object with values
 * @returns Processed string with placeholders replaced
 */
export function processTemplate(template: string, context: ConversationContext): string {
  let result = template;
  
  // Replace all placeholders in the format {key} with their values from context
  Object.keys(context).forEach(key => {
    const placeholder = `{${key}}`;
    if (result.includes(placeholder)) {
      const value = context[key];
      result = result.replace(new RegExp(placeholder, 'g'), value !== undefined ? String(value) : '');
    }
  });
  
  return result;
}

/**
 * Helper function to format products list for display
 * 
 * @param products Array of products
 * @returns Formatted string with products list
 */
export function formatProductsList(products: Array<{ name: string, emoji: string, unit: string }>): string {
  if (!products || products.length === 0) {
    return "אין מוצרים להצגה";
  }
  
  return products
    .map((product, index) => `${index + 1}. ${product.emoji} ${product.name} (${product.unit})`)
    .join('\n');
}

/**
 * Helper function to sanitize and prepare input for processing
 * 
 * @param input Raw input string
 * @returns Sanitized input string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove any potentially harmful characters
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove HTML-like brackets
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines
    
  return sanitized;
}

/**
 * Helper function to initialize a new conversation with default values
 * 
 * @param phoneNumber User's phone number
 * @returns New conversation object
 */
export function initializeConversation(phoneNumber: string): Conversation {
  return {
    currentState: 'INIT',
    context: {
      contactNumber: phoneNumber,
    },
    role: 'general',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: []
  };
}
