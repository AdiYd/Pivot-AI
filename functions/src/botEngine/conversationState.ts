import { ConversationState, IncomingMessage, StateTransition, BotAction } from '../types';
import { 
  BOT_MESSAGES, BOT_CONFIG, formatDaysHebrew, 
  interpolateMessage, formatCategoryName, formatCategoryEmoji 
} from './botMessages';

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
      newState.currentState = "ONBOARDING_COMPANY_NAME";
      newState.context = {}; // Clear any existing context for fresh start
      break;

    case "ONBOARDING_COMPANY_NAME":
      if (!message.body || message.body.trim().length < 2) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidCompanyName
          }
        });
        // Stay in same state
        break;
      }
      
      // Store company name in context
      newState.context.companyName = message.body.trim();
      console.log(`[BotEngine] Stored company name: ${newState.context.companyName}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.onboarding.askLegalId
        }
      });
      newState.currentState = "ONBOARDING_LEGAL_ID";
      break;

    case "ONBOARDING_LEGAL_ID":
      const legalId = message.body?.trim() || "";
      if (!legalId.match(/^\d{9}$/)) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidLegalId
          }
        });
        // Stay in same state
        break;
      }
      
      // Store legal ID in context
      newState.context.legalId = legalId;
      console.log(`[BotEngine] Stored legal ID: ${newState.context.legalId}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.onboarding.askRestaurantName
        }
      });
      newState.currentState = "ONBOARDING_RESTAURANT_NAME";
      break;

    case "ONBOARDING_RESTAURANT_NAME":
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
          body: BOT_MESSAGES.onboarding.askYearsActive
        }
      });
      newState.currentState = "ONBOARDING_YEARS_ACTIVE";
      break;

    case "ONBOARDING_YEARS_ACTIVE":
      const years = parseInt(message.body?.trim() || "");
      if (isNaN(years) || years < 0 || years > 100) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidYearsActive
          }
        });
        // Stay in same state
        break;
      }
      
      // Store years active in context
      newState.context.yearsActive = years;
      console.log(`[BotEngine] Stored years active: ${newState.context.yearsActive}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.onboarding.askContactName
        }
      });
      newState.currentState = "ONBOARDING_CONTACT_NAME";
      break;

    case "ONBOARDING_CONTACT_NAME":
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
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.onboarding.askContactRole
        }
      });
      newState.currentState = "ONBOARDING_CONTACT_ROLE";
      break;

    case "ONBOARDING_CONTACT_ROLE":
      const roleIndex = parseInt(message.body?.trim() || "");
      if (isNaN(roleIndex) || roleIndex < 1 || roleIndex > BOT_CONFIG.userRoles.length) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidContactRole
          }
        });
        // Stay in same state
        break;
      }
      
      // Store contact role in context
      newState.context.contactRole = BOT_CONFIG.userRoles[roleIndex - 1];
      console.log(`[BotEngine] Stored contact role: ${newState.context.contactRole}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.onboarding.askContactEmail
        }
      });
      newState.currentState = "ONBOARDING_CONTACT_EMAIL";
      break;

    case "ONBOARDING_CONTACT_EMAIL":
      const email = message.body?.trim() || "";
      if (email !== "דלג" && email !== "" && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidEmail
          }
        });
        // Stay in same state
        break;
      }
      
      // Store contact email in context
      newState.context.contactEmail = email === "דלג" ? "" : email;
      console.log(`[BotEngine] Stored contact email: ${newState.context.contactEmail}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.onboarding.askPaymentMethod
        }
      });
      newState.currentState = "ONBOARDING_PAYMENT_METHOD";
      break;

    case "ONBOARDING_PAYMENT_METHOD":
      const paymentIndex = parseInt(message.body?.trim() || "");
      if (isNaN(paymentIndex) || paymentIndex < 1 || paymentIndex > BOT_CONFIG.paymentMethods.length) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidPaymentMethod
          }
        });
        // Stay in same state
        break;
      }
      
      // Store payment method in context
      newState.context.paymentMethod = BOT_CONFIG.paymentMethods[paymentIndex - 1];
      console.log(`[BotEngine] Stored payment method: ${newState.context.paymentMethod}`);
      
      // Create restaurant with all collected data
      actions.push({
        type: "CREATE_RESTAURANT",
        payload: {
          restaurantId: currentState.restaurantId,
          companyName: newState.context.companyName,
          legalId: newState.context.legalId,
          name: newState.context.restaurantName,
          yearsActive: newState.context.yearsActive,
          contactName: newState.context.contactName,
          contactRole: newState.context.contactRole,
          contactEmail: newState.context.contactEmail,
          paymentMethod: newState.context.paymentMethod,
          phone: message.from.replace("whatsapp:", "")
        }
      });
      
      // Send registration complete message
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
      newState.currentState = "SETUP_SUPPLIERS_START";
      // Keep context for future reference
      break;

    case "SETUP_SUPPLIERS_START":
      // Start supplier setup with first category
      newState.context.currentCategoryIndex = 0;
      const firstCategory = BOT_CONFIG.supplierCategories[0];
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: interpolateMessage(BOT_MESSAGES.suppliers.startSetup, {
            categoryName: formatCategoryName(firstCategory),
            categoryEmoji: formatCategoryEmoji(firstCategory)
          })
        }
      });
      newState.currentState = "SUPPLIER_DETAILS";
      break;

    case "SUPPLIER_DETAILS":
      if (message.body?.trim().toLowerCase() === "דלג") {
        // Skip this category, move to next
        const nextCategoryResult = moveToNextCategory(newState, actions, currentState.restaurantId, message.from);
        return nextCategoryResult;
      }
      
      // Parse "supplier name, phone" format
      const supplierMatch = message.body?.match(/^(.+),\s*(.+)$/);
      if (!supplierMatch) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidSupplierFormat
          }
        });
        // Stay in same state
        break;
      }
      
      // Store current supplier details in context
      newState.context.currentSupplier = {
        name: supplierMatch[1].trim(),
        whatsapp: supplierMatch[2].trim(),
        category: BOT_CONFIG.supplierCategories[newState.context.currentCategoryIndex || 0]
      };
      console.log(`[BotEngine] Stored current supplier:`, newState.context.currentSupplier);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: interpolateMessage(BOT_MESSAGES.suppliers.askSupplierDetails, {
            supplierName: newState.context.currentSupplier.name
          })
        }
      });
      newState.currentState = "SUPPLIER_DELIVERY_DAYS";
      break;

    case "SUPPLIER_DELIVERY_DAYS":
      try {
        const dayInput = message.body?.trim() || "";
        const days = dayInput.split(',')
          .map(d => parseInt(d.trim()))
          .filter(d => d >= 0 && d <= 6);
        
        if (days.length === 0) {
          throw new Error("No valid days found");
        }

        // Store delivery days in context
        newState.context.currentSupplier.deliveryDays = days;
        console.log(`[BotEngine] Stored supplier delivery days: ${newState.context.currentSupplier.deliveryDays}`);
        
        const selectedDays = formatDaysHebrew(days);
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.suppliers.askCutoffTime, { selectedDays })
          }
        });
        newState.currentState = "SUPPLIER_CUTOFF_TIME";
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

    case "SUPPLIER_CUTOFF_TIME":
      const cutoffHour = parseInt(message.body?.trim() || "");
      if (isNaN(cutoffHour) || cutoffHour < 0 || cutoffHour > 23) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidCutoffHour
          }
        });
        // Stay in same state
        break;
      }
      
      // Store cutoff hour in context
      newState.context.currentSupplier.cutoffHour = cutoffHour;
      console.log(`[BotEngine] Stored supplier cutoff hour: ${newState.context.currentSupplier.cutoffHour}`);
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: BOT_MESSAGES.suppliers.askProductList
        }
      });
      newState.currentState = "SUPPLIER_PRODUCTS";
      break;

    case "SUPPLIER_PRODUCTS":
      // Parse product list and start par level collection
      const productLines = message.body?.split('\n').filter(line => line.trim()) || [];
      newState.context.currentSupplier.products = productLines.map((line, index) => ({
        id: `product_${index}`,
        name: line.replace(/^[^\w\s]*/, '').trim(), // Remove emoji prefix
        emoji: line.match(/^[^\w\s]*/)?.[0] || "📦",
        unit: "ק\"ג" // Default unit
      }));
      
      newState.context.currentProductIndex = 0;
      
      if (newState.context.currentSupplier.products.length > 0) {
        const firstProduct = newState.context.currentSupplier.products[0];
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.suppliers.askParLevelMidweek, {
              emoji: firstProduct.emoji,
              productName: firstProduct.name
            })
          }
        });
        newState.currentState = "PRODUCT_PAR_MIDWEEK";
      } else {
        // No products entered, move to next category
        const nextCategoryResult = moveToNextCategory(newState, actions, currentState.restaurantId, message.from);
        return nextCategoryResult;
      }
      break;

    case "PRODUCT_PAR_MIDWEEK":
      // Parse quantity and unit
      const midweekInput = message.body?.trim() || "";
      const midweekMatch = midweekInput.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      
      if (!midweekMatch) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidQuantity
          }
        });
        break;
      }
      
      const currentProductIndex = newState.context.currentProductIndex || 0;
      const currentProduct = newState.context.currentSupplier.products[currentProductIndex];
      
      // Store par level midweek
      currentProduct.parMidweek = parseFloat(midweekMatch[1]);
      currentProduct.unit = midweekMatch[2].trim() || "ק\"ג";
      
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: interpolateMessage(BOT_MESSAGES.suppliers.askParLevelWeekend, {
            emoji: currentProduct.emoji,
            productName: currentProduct.name
          })
        }
      });
      newState.currentState = "PRODUCT_PAR_WEEKEND";
      break;

    case "PRODUCT_PAR_WEEKEND":
      // Parse quantity 
      const weekendInput = message.body?.trim() || "";
      const weekendMatch = weekendInput.match(/^(\d+(?:\.\d+)?)/);
      
      if (!weekendMatch) {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.validation.invalidQuantity
          }
        });
        break;
      }
      
      const currentProductIdx = newState.context.currentProductIndex || 0;
      const product = newState.context.currentSupplier.products[currentProductIdx];
      
      // Store par level weekend
      product.parWeekend = parseFloat(weekendMatch[1]);
      
      // Move to next product or finish supplier
      const nextProductIndex = currentProductIdx + 1;
      
      if (nextProductIndex < newState.context.currentSupplier.products.length) {
        // More products to process
        newState.context.currentProductIndex = nextProductIndex;
        const nextProduct = newState.context.currentSupplier.products[nextProductIndex];
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.suppliers.askParLevelMidweek, {
              emoji: nextProduct.emoji,
              productName: nextProduct.name
            })
          }
        });
        newState.currentState = "PRODUCT_PAR_MIDWEEK";
      } else {
        // Finished all products for this supplier
        // Save supplier to database
        actions.push({
          type: "UPDATE_SUPPLIER",
          payload: {
            restaurantId: currentState.restaurantId,
            name: newState.context.currentSupplier.name,
            whatsapp: newState.context.currentSupplier.whatsapp,
            deliveryDays: newState.context.currentSupplier.deliveryDays,
            cutoffHour: newState.context.currentSupplier.cutoffHour,
            category: newState.context.currentSupplier.category,
            products: newState.context.currentSupplier.products
          }
        });
        
        // Send completion message
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.suppliers.supplierCompleted, {
              supplierName: newState.context.currentSupplier.name,
              productCount: newState.context.currentSupplier.products.length.toString(),
              deliveryDays: formatDaysHebrew(newState.context.currentSupplier.deliveryDays),
              cutoffTime: `${newState.context.currentSupplier.cutoffHour}:00`
            })
          }
        });
        
        // Move to next category
        const nextCategoryResult = moveToNextCategory(newState, actions, currentState.restaurantId, message.from);
        return nextCategoryResult;
      }
      break;

    // Continue with product par level collection and other states...
    case "IDLE":
      const command = message.body?.toLowerCase().trim() || "";
      
      if (command.includes("עזרה") || command === "?") {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.general.helpMenu
          }
        });
      } else {
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.general.welcomeBack, {
              contactName: newState.context.contactName || "משתמש"
            })
          }
        });
      }
      break;

    default:
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

function moveToNextCategory(newState: ConversationState, actions: BotAction[], restaurantId: string, phoneNumber: string): StateTransition {
  const currentIndex = newState.context.currentCategoryIndex || 0;
  const nextIndex = currentIndex + 1;
  
  if (nextIndex >= BOT_CONFIG.supplierCategories.length) {
    // All categories completed
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        body: BOT_MESSAGES.suppliers.allSuppliersCompleted
      }
    });
    newState.currentState = "IDLE";
    // Clear supplier setup context
    newState.context.currentCategoryIndex = undefined;
    newState.context.currentSupplier = undefined;
    newState.context.currentProductIndex = undefined;
  } else {
    // Move to next category
    newState.context.currentCategoryIndex = nextIndex;
    newState.context.currentSupplier = undefined; // Clear previous supplier data
    newState.context.currentProductIndex = undefined;
    
    const nextCategory = BOT_CONFIG.supplierCategories[nextIndex];
    
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        body: interpolateMessage(BOT_MESSAGES.suppliers.nextCategory, {
          categoryName: formatCategoryName(nextCategory),
          categoryEmoji: formatCategoryEmoji(nextCategory)
        })
      }
    });
    newState.currentState = "SUPPLIER_DETAILS";
  }
  
  return { newState, actions };
}
