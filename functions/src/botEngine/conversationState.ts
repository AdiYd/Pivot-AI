import { ConversationState, IncomingMessage, StateTransition, BotAction } from '../types';

export function conversationStateReducer(
  currentState: ConversationState,
  message: IncomingMessage
): StateTransition {
  console.log(`[BotEngine] Processing message in state: ${currentState.currentState}`, {
    from: message.from,
    bodyLength: message.body?.length || 0,
    hasMedia: !!message.mediaUrl
  });

  const actions: BotAction[] = [];
  let newState = { ...currentState };

  switch (currentState.currentState) {
    case "INIT":
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: "🍽️ Welcome to Restaurant Inventory Bot!\n\nLet's get you set up in just a few minutes.\n\nWhat's the name of your restaurant?"
        }
      });
      newState.currentState = "ONBOARDING_NAME";
      newState.context = {}; // Clear any existing context
      break;

    case "ONBOARDING_NAME":
      if (!message.body || message.body.trim().length < 2) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "❌ Please enter a valid restaurant name (at least 2 characters)."
          }
        });
        break;
      }
      
      newState.context.restaurantName = message.body.trim();
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: `Great! "${message.body.trim()}" sounds wonderful.\n\nNow I need your contact details. What's your full name?`
        }
      });
      newState.currentState = "ONBOARDING_CONTACT";
      break;

    case "ONBOARDING_CONTACT":
      if (!message.body || message.body.trim().length < 2) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "❌ Please enter your full name (at least 2 characters)."
          }
        });
        break;
      }

      newState.context.contactName = message.body.trim();
      
      // Create restaurant first
      actions.push({
        type: "CREATE_RESTAURANT",
        payload: {
          restaurantId: currentState.restaurantId,
          name: newState.context.restaurantName,
          contactName: message.body.trim(),
          phone: message.from.replace("whatsapp:", "")
        }
      });
      
      // Then send payment message
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: `Perfect! ${message.body.trim()}, your restaurant "${newState.context.restaurantName}" has been registered.\n\n💳 To activate your account, please complete payment:\nhttps://payment.example.com/restaurant/${currentState.restaurantId}\n\nOnce payment is confirmed, you can start adding suppliers by typing "supplier".`
        }
      });
      newState.currentState = "IDLE"; // Go directly to IDLE after registration
      break;

    case "IDLE":
      const command = message.body?.toLowerCase().trim() || "";
      
      if (command.includes("supplier") || command.includes("add supplier")) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "📋 Let's add a new supplier!\n\nWhat's the supplier's name?"
          }
        });
        newState.currentState = "SUPPLIER_NAME";
        newState.context = {}; // Clear context for new supplier
      } else if (command.includes("help") || command === "?") {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "🤖 Available commands:\n• 'supplier' - Add a new supplier\n• 'inventory' - Update stock levels\n• 'orders' - View recent orders\n• 'help' - Show this menu"
          }
        });
      } else {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "👋 Hi! I can help you manage suppliers and inventory.\n\nType 'supplier' to add a new supplier, or 'help' for more options."
          }
        });
      }
      break;

    case "SUPPLIER_NAME":
      if (!message.body || message.body.trim().length < 2) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "❌ Please enter a valid supplier name (at least 2 characters)."
          }
        });
        break;
      }

      newState.context.supplierName = message.body.trim();
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: `Adding supplier: "${message.body.trim()}"\n\nWhat's their WhatsApp number?\n(Include country code, e.g., +972501234567)`
        }
      });
      newState.currentState = "SUPPLIER_WHATSAPP";
      break;

    case "SUPPLIER_WHATSAPP":
      const whatsappNumber = message.body?.trim() || "";
      
      // Basic WhatsApp number validation
      if (!whatsappNumber || !whatsappNumber.match(/^\+?[1-9]\d{1,14}$/)) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "❌ Please enter a valid WhatsApp number with country code (e.g., +972501234567)"
          }
        });
        break;
      }

      newState.context.supplierWhatsapp = whatsappNumber;
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: "📅 What days of the week do they deliver?\n\nSend day numbers separated by commas:\n0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday\n\nExample: 1,3,5 for Mon/Wed/Fri"
        }
      });
      newState.currentState = "SUPPLIER_DAYS";
      break;

    case "SUPPLIER_DAYS":
      try {
        const dayInput = message.body?.trim() || "";
        const days = dayInput.split(',')
          .map(d => parseInt(d.trim()))
          .filter(d => d >= 0 && d <= 6);
        
        if (days.length === 0) {
          throw new Error("No valid days found");
        }

        newState.context.supplierDays = days;
        
        // Convert day numbers to day names for confirmation
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const selectedDays = days.map(d => dayNames[d]).join(", ");
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: `✅ Delivery days: ${selectedDays}\n\n⏰ What's the order cutoff time?\n(24-hour format, e.g., 15 for 3:00 PM)`
          }
        });
        newState.currentState = "SUPPLIER_CUTOFF";
      } catch (error) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "❌ Invalid format. Please send delivery days as numbers separated by commas.\nExample: 1,3,5 for Monday, Wednesday, Friday"
          }
        });
      }
      break;

    case "SUPPLIER_CUTOFF":
      try {
        const cutoffInput = message.body?.trim() || "";
        const cutoffHour = parseInt(cutoffInput);
        
        if (isNaN(cutoffHour) || cutoffHour < 0 || cutoffHour > 23) {
          throw new Error("Invalid hour");
        }

        // Create the supplier
        actions.push({
          type: "UPDATE_SUPPLIER",
          payload: {
            restaurantId: currentState.restaurantId,
            name: newState.context.supplierName,
            whatsapp: newState.context.supplierWhatsapp,
            deliveryDays: newState.context.supplierDays,
            cutoffHour: cutoffHour,
            category: "general" // Default category
          }
        });
        
        const timeString = cutoffHour === 0 ? "12:00 AM" : 
                          cutoffHour < 12 ? `${cutoffHour}:00 AM` :
                          cutoffHour === 12 ? "12:00 PM" :
                          `${cutoffHour - 12}:00 PM`;
                          
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: `✅ Supplier "${newState.context.supplierName}" added successfully!\n📞 ${newState.context.supplierWhatsapp}\n⏰ Cutoff: ${timeString}\n\nType 'supplier' to add another one, or 'help' for more options.`
          }
        });
        
        newState.currentState = "IDLE";
        newState.context = {}; // Clear context after successful supplier creation
      } catch (error) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "❌ Please enter a valid hour (0-23).\nExample: 15 for 3:00 PM"
          }
        });
      }
      break;

    case "ONBOARDING_PAYMENT":
      // Handle payment confirmation or move to next step
      const paymentCommand = message.body?.toLowerCase().trim() || "";
      
      if (paymentCommand.includes("paid") || paymentCommand.includes("done") || paymentCommand.includes("complete")) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "Great! Once payment is processed, you'll be able to add suppliers.\n\nFor now, type 'supplier' to start adding your first supplier."
          }
        });
        newState.currentState = "IDLE";
      } else {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: "Please complete your payment first, then let me know when it's done.\n\nPayment link: https://payment.example.com/restaurant/" + currentState.restaurantId
          }
        });
      }
      break;

    default:
      console.warn(`[BotEngine] Unhandled state: ${currentState.currentState}`);
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: "🤔 Something went wrong. Let me reset...\n\nType 'supplier' to add a supplier or 'help' for options."
        }
      });
      newState.currentState = "IDLE";
      newState.context = {};
      break;
  }

  console.log(`[BotEngine] State transition: ${currentState.currentState} -> ${newState.currentState}`, {
    actionsCount: actions.length,
    contextKeys: Object.keys(newState.context)
  });

  return { newState, actions };
}
