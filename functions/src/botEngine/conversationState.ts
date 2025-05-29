import { ConversationState, IncomingMessage, StateTransition, BotAction } from '../types';

export function conversationStateReducer(
  currentState: ConversationState,
  message: IncomingMessage
): StateTransition {
  const actions: BotAction[] = [];
  let newState = { ...currentState };

  switch (currentState.currentState) {
    case "INIT":
      // Welcome new user and start onboarding
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          message: "Welcome! Let's set up your restaurant. What's your restaurant name?"
        }
      });
      newState.currentState = "ONBOARDING_NAME";
      break;

    case "ONBOARDING_NAME":
      // Store restaurant name and ask for contact
      newState.context.restaurantName = message.body;
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          message: `Great! Now, what's your name and role at ${message.body}?`
        }
      });
      newState.currentState = "ONBOARDING_CONTACT";
      break;

    case "ONBOARDING_CONTACT":
      // Store contact info and create restaurant
      newState.context.contactName = message.body;
      actions.push({
        type: "CREATE_RESTAURANT",
        payload: {
          restaurantId: newState.restaurantId,
          name: newState.context.restaurantName,
          contactName: message.body,
          phone: message.from.replace("whatsapp:", "")
        }
      });
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          message: "Perfect! Please complete payment to activate your account: [PAYMENT_LINK]"
        }
      });
      newState.currentState = "ONBOARDING_PAYMENT";
      break;

    case "IDLE":
      // Handle various commands when idle
      const command = message.body.toLowerCase().trim();
      if (command.includes("supplier") || command.includes("add supplier")) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            message: "Let's add a new supplier! What's the supplier's name?"
          }
        });
        newState.currentState = "SUPPLIER_NAME";
      } else if (command.includes("inventory") || command.includes("stock")) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            message: "Let's update your inventory. Which supplier's products do you want to count?"
          }
        });
        newState.currentState = "INVENTORY_COUNT";
      } else {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            message: "I can help you with:\n• Add supplier\n• Update inventory\n• View orders\n\nWhat would you like to do?"
          }
        });
      }
      break;

    case "SUPPLIER_NAME":
      // Store supplier name and ask for WhatsApp
      newState.context.supplierName = message.body;
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          message: `What's ${message.body}'s WhatsApp number?`
        }
      });
      newState.currentState = "SUPPLIER_WHATSAPP";
      break;

    case "SUPPLIER_WHATSAPP":
      // Store WhatsApp and ask for delivery days
      newState.context.supplierWhatsapp = message.body;
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          message: "Which days do they deliver? (e.g., Sunday, Tuesday, Thursday)"
        }
      });
      newState.currentState = "SUPPLIER_DAYS";
      break;

    case "SUPPLIER_DAYS":
      // Store delivery days and ask for cutoff
      newState.context.deliveryDays = parseDays(message.body);
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          message: "What time is the order cutoff? (e.g., 14 for 2 PM)"
        }
      });
      newState.currentState = "SUPPLIER_CUTOFF";
      break;

    case "SUPPLIER_CUTOFF":
      // Store cutoff and create supplier
      newState.context.cutoffHour = parseInt(message.body);
      actions.push({
        type: "UPDATE_SUPPLIER",
        payload: {
          restaurantId: newState.restaurantId,
          name: newState.context.supplierName,
          whatsapp: newState.context.supplierWhatsapp,
          deliveryDays: newState.context.deliveryDays,
          cutoffHour: newState.context.cutoffHour
        }
      });
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          message: `Supplier ${newState.context.supplierName} added! Now let's add their first product. What's the product name?`
        }
      });
      newState.currentState = "PRODUCT_NAME";
      break;

    // Add more cases for other states...
    default:
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          message: "I didn't understand that. Please try again."
        }
      });
      break;
  }

  return { newState, actions };
}

function parseDays(input: string): number[] {
  const dayMap: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };

  const days: number[] = [];
  const words = input.toLowerCase().split(/[,\s]+/);
  
  for (const word of words) {
    if (dayMap[word] !== undefined) {
      days.push(dayMap[word]);
    }
  }
  
  return days;
}
