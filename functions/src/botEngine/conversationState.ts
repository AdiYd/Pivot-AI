import { ConversationState, IncomingMessage, StateTransition, BotAction } from '../types';
import { BOT_MESSAGES, formatTimeHebrew, formatDaysHebrew, interpolateMessage } from './botMessages';

/**
 * Main conversation state machine reducer
 * Processes incoming messages and determines next state + actions
 * @param currentState Current conversation state
 * @param message Incoming WhatsApp message
 * @returns State transition with new state and actions to execute
 */
export function conversationStateReducer(
  currentState: ConversationState,
  message: IncomingMessage
): StateTransition {
  console.log(`[BotEngine] Processing message in state: ${currentState.currentState}`, {
    from: message.from,
    bodyLength: message.body?.length || 0,
    hasMedia: !!message.mediaUrl,
    currentContextKeys: Object.keys(currentState.context || {})
  });

  const actions: BotAction[] = [];
  // Create new state preserving existing context
  let newState = { 
    ...currentState,
    context: { ...currentState.context } // Ensure context is preserved
  };

  switch (currentState.currentState) {
    case "INIT":
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.onboarding.welcome
        }
      });
      newState.currentState = "ONBOARDING_NAME";
      newState.context = {}; // Clear any existing context for fresh start
      break;

    case "ONBOARDING_NAME":
      if (!message.body || message.body.trim().length < 2) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidRestaurantName
          }
        });
        // Stay in same state
        break;
      }
      
      // Store restaurant name in context
      newState.context.restaurantName = message.body.trim();
      console.log(`[BotEngine] Stored restaurant name: ${newState.context.restaurantName}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: interpolateMessage(BOT_MESSAGES.onboarding.askContactName, {
            restaurantName: newState.context.restaurantName
          })
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
            body: BOT_MESSAGES.validation.invalidContactName
          }
        });
        // Stay in same state
        break;
      }

      // Store contact name in context
      newState.context.contactName = message.body.trim();
      console.log(`[BotEngine] Stored contact name: ${newState.context.contactName}`);
      
      // Create restaurant with stored context data
      actions.push({
        type: "CREATE_RESTAURANT",
        payload: {
          restaurantId: currentState.restaurantId,
          name: newState.context.restaurantName,
          contactName: newState.context.contactName,
          phone: message.from.replace("whatsapp:", "")
        }
      });
      
      // Send payment message
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: interpolateMessage(BOT_MESSAGES.onboarding.registrationComplete, {
            contactName: newState.context.contactName,
            restaurantName: newState.context.restaurantName,
            paymentLink: `https://payment.example.com/restaurant/${currentState.restaurantId}`
          })
        }
      });
      newState.currentState = "IDLE";
      // Keep context for future reference
      break;

    case "IDLE":
      const command = message.body?.toLowerCase().trim() || "";
      
      if (command.includes("supplier") || command.includes("add supplier") || command.includes("ספק")) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.supplier.startAdding
          }
        });
        newState.currentState = "SUPPLIER_NAME";
        // Clear supplier context but keep restaurant context
        newState.context = {
          ...newState.context,
          supplierName: undefined,
          supplierWhatsapp: undefined,
          supplierDays: undefined
        };
      } else if (command.includes("help") || command === "?" || command.includes("עזרה")) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.general.helpMenu
          }
        });
        // Stay in IDLE state
      } else {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.general.welcomeBack
          }
        });
        // Stay in IDLE state
      }
      break;

    case "SUPPLIER_NAME":
      if (!message.body || message.body.trim().length < 2) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidSupplierName
          }
        });
        // Stay in same state
        break;
      }

      // Store supplier name in context
      newState.context.supplierName = message.body.trim();
      console.log(`[BotEngine] Stored supplier name: ${newState.context.supplierName}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: interpolateMessage(BOT_MESSAGES.supplier.askWhatsapp, {
            supplierName: newState.context.supplierName
          })
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
            body: BOT_MESSAGES.validation.invalidWhatsappNumber
          }
        });
        // Stay in same state
        break;
      }

      // Store WhatsApp number in context
      newState.context.supplierWhatsapp = whatsappNumber;
      console.log(`[BotEngine] Stored supplier WhatsApp: ${newState.context.supplierWhatsapp}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.supplier.askDeliveryDays
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

        // Store delivery days in context
        newState.context.supplierDays = days;
        console.log(`[BotEngine] Stored supplier days: ${newState.context.supplierDays}`);
        
        const selectedDays = formatDaysHebrew(days);
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.supplier.askCutoffTime, { selectedDays })
          }
        });
        newState.currentState = "SUPPLIER_CUTOFF";
      } catch (error) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidDeliveryDays
          }
        });
        // Stay in same state
      }
      break;

    case "SUPPLIER_CUTOFF":
      try {
        const cutoffInput = message.body?.trim() || "";
        const cutoffHour = parseInt(cutoffInput);
        
        if (isNaN(cutoffHour) || cutoffHour < 0 || cutoffHour > 23) {
          throw new Error("Invalid hour");
        }

        console.log(`[BotEngine] Creating supplier with context:`, {
          restaurantId: currentState.restaurantId,
          name: newState.context.supplierName,
          whatsapp: newState.context.supplierWhatsapp,
          days: newState.context.supplierDays,
          cutoffHour
        });

        // Create the supplier with all stored context data
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
        
        const timeString = formatTimeHebrew(cutoffHour);
                          
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.supplier.addedSuccessfully, {
              supplierName: newState.context.supplierName,
              whatsapp: newState.context.supplierWhatsapp,
              timeString
            })
          }
        });
        
        newState.currentState = "IDLE";
        // Clear supplier-specific context but keep restaurant context
        newState.context = {
          restaurantName: newState.context.restaurantName,
          contactName: newState.context.contactName
        };
      } catch (error) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidCutoffHour
          }
        });
        // Stay in same state
      }
      break;

    case "ONBOARDING_PAYMENT":
      // Handle payment confirmation or move to next step
      const paymentCommand = message.body?.toLowerCase().trim() || "";
      
      if (paymentCommand.includes("paid") || paymentCommand.includes("done") || paymentCommand.includes("complete") || paymentCommand.includes("שילמתי") || paymentCommand.includes("סיימתי")) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.onboarding.paymentConfirmed
          }
        });
        newState.currentState = "IDLE";
      } else {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.onboarding.paymentPending, {
              paymentLink: `https://payment.example.com/restaurant/${currentState.restaurantId}`
            })
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
          body: BOT_MESSAGES.general.systemError
        }
      });
      newState.currentState = "IDLE";
      // Keep basic context but clear temporary data
      newState.context = {
        restaurantName: newState.context.restaurantName,
        contactName: newState.context.contactName
      };
      break;
  }

  console.log(`[BotEngine] State transition: ${currentState.currentState} -> ${newState.currentState}`, {
    actionsCount: actions.length,
    contextKeys: Object.keys(newState.context),
    contextValues: newState.context
  });

  return { newState, actions };
}
