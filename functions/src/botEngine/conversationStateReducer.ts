import { z } from 'zod';
import { 
  BotAction, 
  BotState, 
  Conversation, 
  IncomingMessage,
  ConversationContext,
  StateObject,
} from '../schema/types';
import { STATE_MESSAGES } from '../schema/states';
import { ProductSchema, RestaurantSchema, SupplierSchema } from '../schema/schemas';

/**
 * Interface for the state machine's result
 */
interface StateReducerResult {
  newState: Conversation;
  actions: BotAction[];
}

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
  currentState?: BotState
): Promise<any | null> {
  try {
    // Trim input to remove leading/trailing whitespace
    const trimmedInput = input.trim();
    
    // Skip validation if no validator provided
    if (!validator && !aiValidation) {
      return trimmedInput;
    }
    
    // If AI validation is required
    if (aiValidation) {
      // TODO: Implement AI validation here
      console.log(`[StateReducer] AI validation would be used for state ${currentState}`);
      
      // For now, just validate with schema if available
      if (validator) {
        return validator.parse(trimmedInput);
      }
      
      // Return trimmed input as fallback
      return trimmedInput;
    }
    
    // Standard zod schema validation
    if (validator) {
      // Handle different schema types appropriately
      if (validator instanceof z.ZodString) {
        return validator.parse(trimmedInput);
      } 
      else if (validator instanceof z.ZodObject) {
        // Try to parse JSON if the input might be an object
        try {
          const jsonData = JSON.parse(trimmedInput);
          return validator.parse(jsonData);
        } catch (jsonError) {
          // If not valid JSON, try direct validation
          return validator.parse(trimmedInput);
        }
      } 
      else if (validator instanceof z.ZodNumber) {
        // Try to convert string to number
        const num = Number(trimmedInput);
        return validator.parse(num);
      } 
      else if (validator instanceof z.ZodEnum) {
        return validator.parse(trimmedInput);
      } 
      else if (validator instanceof z.ZodArray) {
        // Try to parse JSON array if input looks like an array
        try {
          const jsonData = JSON.parse(trimmedInput);
          return validator.parse(jsonData);
        } catch (jsonError) {
          // Try splitting by commas as fallback
          const items = trimmedInput.split(',').map(item => item.trim());
          return validator.parse(items);
        }
      } 
      else {
        // Default case - attempt direct validation
        return validator.parse(trimmedInput);
      }
    }
    
    // If we get here, return the trimmed input as fallback
    return trimmedInput;
  } catch (error) {
    console.error('[StateReducer] Validation error:', error);
    
    // Return null to indicate validation failure
    return null;
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
          legalId: context.legalId || '',
          legalName: context.companyName || '',
          name: context.restaurantName || '',
          contacts: [{
            whatsapp: context.contactNumber || '',
            name: context.contactName || '',
            role: 'owner',
            email: context.contactEmail || undefined
          }],
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
        const supplierData = SupplierSchema.parse({
          restaurantId: context.legalId || '',
          whatsapp: context.supplierWhatsapp || '',
          name: context.supplierName || '',
          role: 'supplier',
          email: context.supplierEmail || undefined,
          category: Array.isArray(context.supplierCategories) ? context.supplierCategories : [],
          reminders: context.supplierReminders || [],
          products: context.supplierProducts || []
        })
      return {
        type: 'CREATE_SUPPLIER',
        payload: supplierData
      };
      
    case 'UPDATE_SUPPLIER':
      const supplierUpdateData =SupplierSchema.parse(
        {
          restaurantId: context.legalId || '',
          whatsapp: context.supplierWhatsapp || '',
          name: context.supplierName || '',
          reminders: context.supplierReminders || [],
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
      
    case 'CREATE_INVENTORY_SNAPSHOT':
      return {
        type: 'CREATE_INVENTORY_SNAPSHOT',
        payload: {
          restaurantId: context.legalId || context.restaurantId || '',
          category: context.currentCategory || '',
          items: context.inventoryItems || []
        }
      };
      
    case 'SEND_ORDER':
      return {
        type: 'SEND_ORDER',
        payload: {
          restaurantId: context.legalId || context.restaurantId || '',
          supplierId: context.supplierWhatsapp || '',
          items: context.orderItems || []
        }
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
  context: ConversationContext
): BotAction {
  // Prepare message template if defined
  if (messageData.whatsappTemplate) {
    const template = messageData.whatsappTemplate;
    
    // Replace placeholders in template body with context values
    let body = template.body;
    
    Object.keys(context).forEach(key => {
      const placeholder = `{${key}}`;
      if (body.includes(placeholder)) {
        body = body.replace(new RegExp(placeholder, 'g'), String(context[key] || ''));
      }
    });
    
    // Set options if dynamic options are required
    let options = template.options;
    
    // Create the action with template
    return {
      type: 'SEND_MESSAGE',
      payload: {
        to,
        template: {
          ...template,
          body,
          options
        }
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
    });
    
    return {
      type: 'SEND_MESSAGE',
      payload: {
        to,
        body
      }
    };
  }
  
  // Fallback if no message is defined
  return {
    type: 'SEND_MESSAGE',
    payload: {
      to,
      body: '⚠️ כרגע אין לי מידע להציג. אנא נסה שוב מאוחר יותר.'
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
    const currentStateDefinition = STATE_MESSAGES[conversation.currentState];
    
    if (!currentStateDefinition) {
      console.error(`[StateReducer] No state definition found for state: ${conversation.currentState}`);
      
      // Reset to IDLE state if definition is not found
      result.newState.currentState = 'IDLE';
      result.actions.push({
        type: 'SEND_MESSAGE',
        payload: {
          to: message.from,
          body: '⚠️ אירעה שגיאה במערכת. מצבך אופס למצב התחלתי.'
        }
      });
      
      return result;
    }
    
    // Handle special button/list responses
    let userInput = message.body;
    let validationResult = null;
    let nextState: BotState | null = null;
    
    // First, try to validate the input
    if (currentStateDefinition.validator) {
      try {
        validationResult = await stateValidator(
          userInput, 
          currentStateDefinition.validator,
          currentStateDefinition.aiValidation,
          conversation.currentState
        );
      } catch (validationError) {
        console.error(`[StateReducer] Validation error:`, validationError);
        
        // Send validation error message if defined
        if (currentStateDefinition.validationMessage) {
          result.actions.push({
            type: 'SEND_MESSAGE',
            payload: {
              to: message.from,
              body: currentStateDefinition.validationMessage
            }
          });
        } else {
          // Default validation error message
          result.actions.push({
            type: 'SEND_MESSAGE',
            payload: {
              to: message.from,
              body: '⚠️ הקלט שהזנת אינו תקין. אנא נסה שוב.'
            }
          });
        }
        
        // Stay in current state
        return result;
      }
    } else {
      // If no validator, just use the trimmed input
      validationResult = userInput.trim();
    }
    
    // If validation failed
    if (validationResult === null) {
      console.log(`[StateReducer] Validation failed for state: ${conversation.currentState}`);
      
      // Send validation error message if defined
      if (currentStateDefinition.validationMessage) {
        result.actions.push({
          type: 'SEND_MESSAGE',
          payload: {
            to: message.from,
            body: currentStateDefinition.validationMessage
          }
        });
      } else {
        // Default validation error message
        result.actions.push({
          type: 'SEND_MESSAGE',
          payload: {
            to: message.from,
            body: '⚠️ הקלט שהזנת אינו תקין. אנא נסה שוב.'
          }
        });
      }
      
      // Stay in current state
      return result;
    }
    
    // Execute callback if defined to update context
    if (currentStateDefinition.callback && typeof currentStateDefinition.callback === 'function') {
      try {
        currentStateDefinition.callback(result.newState.context, validationResult);
      } catch (callbackError) {
        console.error(`[StateReducer] Callback error:`, callbackError);
      }
    }
    
    // Determine next state based on validation result and state definition
    if (currentStateDefinition.nextState) {
      // Handle direct value response
      if (validationResult === 'ok' && currentStateDefinition.nextState.ok) {
        nextState = currentStateDefinition.nextState.ok;
      }
      // Handle skip value
      else if (validationResult === 'skip' && currentStateDefinition.nextState.skip) {
        nextState = currentStateDefinition.nextState.skip;
      }
      // Handle list selection or template button response
      else if (typeof validationResult === 'string' && currentStateDefinition.nextState[validationResult]) {
        nextState = currentStateDefinition.nextState[validationResult];
      }
      // Handle default success case
      else if (validationResult && currentStateDefinition.nextState.ok) {
        nextState = currentStateDefinition.nextState.ok;
      }
      // Default to the first entry if no match
      else {
        const firstNextStateKey = Object.keys(currentStateDefinition.nextState)[0];
        if (firstNextStateKey) {
          nextState = currentStateDefinition.nextState[firstNextStateKey];
        }
      }
    }
    
    // Create action if defined in the state
    if (currentStateDefinition.action) {
      const action = createActionFromState(
        currentStateDefinition.action,
        result.newState.context,
        conversation.currentState
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
      const nextStateDefinition = STATE_MESSAGES[nextState];
      
      if (nextStateDefinition) {
        // Create and add message action for the next state
        const messageAction = createMessageAction(
          nextStateDefinition,
          message.from,
          result.newState.context
        );
        
        result.actions.push(messageAction);
      } else {
        console.error(`[StateReducer] No state definition found for next state: ${nextState}`);
      }
    } else {
      // If no next state defined, create message for current state again
      const repeatMessageAction = createMessageAction(
        currentStateDefinition,
        message.from,
        result.newState.context
      );
      
      result.actions.push(repeatMessageAction);
    }
  } catch (error) {
    console.error(`[StateReducer] Unexpected error:`, error);
    
    // Handle unexpected errors by returning to IDLE state
    result.newState.currentState = 'IDLE';
    result.actions.push({
      type: 'SEND_MESSAGE',
      payload: {
        to: message.from,
        body: '⚠️ אירעה שגיאה בלתי צפויה במערכת. אנא נסה שוב או צור קשר עם התמיכה.'
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
