import { ConversationState, IncomingMessage, StateTransition, BotAction, Product } from '../schema/types';
import { 
  STATE_MESSAGES, 
  SYSTEM_MESSAGES, 
  VALIDATION_ERRORS,
  BOT_CATEGORIES,
  BOT_CONFIG,
} from '../schema/messages';

/**
 * Main conversation state machine reducer
 * Processes incoming messages and determines next state + actions
 * Uses the structured message system from messages.ts
 * 
 * @param currentState Current conversation state
 * @param message Incoming WhatsApp message
 * @returns State transition with new state and actions to execute
 */
export function conversationStateReducer(
  currentState: ConversationState,
  message: IncomingMessage
): StateTransition {
  // Extract simulator flag from context if present
  const isSimulator = !!currentState.context?.isSimulator;
  
  console.log(`[BotEngine] Processing message in state: ${currentState.currentState} ${isSimulator ? '(simulator)' : ''}`, {
    from: message.from,
    bodyLength: message.body?.length || 0,
    currentContextKeys: Object.keys(currentState.context || {})
  });

  const actions: BotAction[] = [];
  // Create new state preserving existing context
  let newState = { 
    ...currentState,
    context: { ...currentState.context } // Ensure context is preserved including isSimulator flag
  };

  try {
    // Get the current state message definition
    const stateMessage = STATE_MESSAGES[currentState.currentState];
    
    if (!stateMessage) {
      console.error(`[BotEngine] No message definition found for state: ${currentState.currentState}`);
      throw new Error(`Missing state definition for ${currentState.currentState}`);
    }

    // First, validate incoming message if the current state has a validator
    if (stateMessage.validator && !validateInput(message.body || "", stateMessage.validator, newState.context)) {
      // Validation failed, send validation error message
      actions.push({
        type: "SEND_MESSAGE",
        payload: {
          to: message.from,
          body: stateMessage.validationMessage || VALIDATION_ERRORS[stateMessage.validator]|| SYSTEM_MESSAGES.error
        }
      });
      
      // Stay in the same state
      return { newState, actions };
    }
    
    // Process state-specific logic based on the current state
    switch (currentState.currentState) {
      // ===== INITIAL STATE =====
      case "INIT":
        // Send welcome message using the template or regular message
        if (message.body?.trim().toLowerCase() === "new_restaurant") {
          // Start onboarding flow
          newState.currentState = "ONBOARDING_COMPANY_NAME";
          sendStateMessage(actions, message.from, STATE_MESSAGES["ONBOARDING_COMPANY_NAME"], newState.context);
          newState.currentState = "ONBOARDING_COMPANY_NAME";
        } else {
          sendStateMessage(actions, message.from, stateMessage, newState.context);
        }
        break;

      // ===== ONBOARDING FLOW =====
      case "ONBOARDING_COMPANY_NAME":
        // Store company name in context
        newState.context.companyName = message.body?.trim();
        console.log(`[BotEngine] Stored company name: ${newState.context.companyName}`);
        
        // Move to next state and send its message
        newState.currentState = "ONBOARDING_LEGAL_ID";
        sendStateMessage(actions, message.from, STATE_MESSAGES["ONBOARDING_LEGAL_ID"], newState.context);
        break;

      case "ONBOARDING_LEGAL_ID":
        // Store legal ID in context
        newState.context.legalId = message.body?.trim();
        console.log(`[BotEngine] Stored legal ID: ${newState.context.legalId}`);
        
        // Move to next state and send its message
        newState.currentState = "ONBOARDING_RESTAURANT_NAME";
        sendStateMessage(actions, message.from, STATE_MESSAGES["ONBOARDING_RESTAURANT_NAME"], newState.context);
        break;

      case "ONBOARDING_RESTAURANT_NAME":
        // Store restaurant name in context
        newState.context.restaurantName = message.body?.trim();
        console.log(`[BotEngine] Stored restaurant name: ${newState.context.restaurantName}`);
        
        // Move to next state and send its message
        newState.currentState = "ONBOARDING_YEARS_ACTIVE";
        sendStateMessage(actions, message.from, STATE_MESSAGES["ONBOARDING_YEARS_ACTIVE"], newState.context);
        break;

      case "ONBOARDING_YEARS_ACTIVE":
        // Store years active in context
        newState.context.yearsActive = parseInt(message.body?.trim() || "0");
        console.log(`[BotEngine] Stored years active: ${newState.context.yearsActive}`);
        
        // Move to next state and send its message
        newState.currentState = "ONBOARDING_CONTACT_NAME";
        sendStateMessage(actions, message.from, STATE_MESSAGES["ONBOARDING_CONTACT_NAME"], newState.context);
        break;

      case "ONBOARDING_CONTACT_NAME":
        // Store contact name in context
        newState.context.contactName = message.body?.trim();
        console.log(`[BotEngine] Stored contact name: ${newState.context.contactName}`);
        
        // Set default role to Owner
        newState.context.contactRole = "Owner";
        
        // Move to next state and send its message
        newState.currentState = "ONBOARDING_CONTACT_EMAIL";
        sendStateMessage(actions, message.from, STATE_MESSAGES["ONBOARDING_CONTACT_EMAIL"], newState.context);
        break;

      case "ONBOARDING_CONTACT_EMAIL":
        // Store contact email in context (or empty string if "דלג" was sent)
        const email = message.body?.trim() || "";
        newState.context.contactEmail = email === "דלג" ? "" : email;
        console.log(`[BotEngine] Stored contact email: ${newState.context.contactEmail}`);
        
        // Move to next state and send its message
        newState.currentState = "ONBOARDING_PAYMENT_METHOD";
        sendStateMessage(actions, message.from, STATE_MESSAGES["ONBOARDING_PAYMENT_METHOD"], newState.context);
        break;

      case "ONBOARDING_PAYMENT_METHOD":
        const skipPayments = message.body?.trim().toLowerCase() === BOT_CONFIG.skipPaymentCoupon.toLowerCase();
        if (skipPayments) {
          console.log("[BotEngine] Skipping payment with trial code");
          newState.context.paymentMethod = "Trial";
          newState.currentState = "SETUP_SUPPLIERS_START";
          sendStateMessage(actions, message.from, STATE_MESSAGES["SETUP_SUPPLIERS_START"], newState.context);
          break;
        }
        // Handle payment method selection
        if (message.body?.trim() === "credit_card") {
          newState.context.paymentMethod = "Stripe";
        } else if (message.body?.trim() === "paypal") {
          newState.context.paymentMethod = "Paylink";
        } else if (message.body?.trim() === "trial") {
          newState.context.paymentMethod = "Trial";
        } else {
          // Default fallback if the selection doesn't match expected values
          newState.context.paymentMethod = "Stripe";
        }
        
        console.log(`[BotEngine] Stored payment method: ${newState.context.paymentMethod}`);
        
        // Create restaurant with collected data
        actions.push({
          type: "CREATE_RESTAURANT",
          payload: {
            restaurantId: newState.context.legalId,
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
        
        // Move to waiting for payment state
        newState.currentState = "WAITING_FOR_PAYMENT";
        sendStateMessage(actions, message.from, STATE_MESSAGES["WAITING_FOR_PAYMENT"], newState.context);
        break;

      case "WAITING_FOR_PAYMENT":
        // Check if they used a trial coupon code
        const skipPayment = message.body?.trim().toLowerCase() === BOT_CONFIG.skipPaymentCoupon.toLowerCase();
        
        if (skipPayment) {
          console.log("[BotEngine] Payment skipped with trial code");
          newState.currentState = "SETUP_SUPPLIERS_START";
          sendStateMessage(actions, message.from, STATE_MESSAGES["SETUP_SUPPLIERS_START"], newState.context);
        } else {
          // Stay in waiting state and remind about payment
          sendStateMessage(actions, message.from, STATE_MESSAGES["WAITING_FOR_PAYMENT"], {...newState.context, paymentLink: BOT_CONFIG.paymentLink});
        }
        break;

      // ===== SUPPLIER SETUP FLOW =====
      case "SETUP_SUPPLIERS_START":
        // Handle response to start supplier setup
        if (message.body?.trim() === "start_setup") {
          // Initialize supplier setup
          newState.context.currentCategoryIndex = 0;
          newState.currentState = "SUPPLIER_CATEGORY";
          sendStateMessage(actions, message.from, STATE_MESSAGES["SUPPLIER_CATEGORY"], newState.context);
        } else {
          // User postponed, stay in IDLE state
          newState.currentState = "IDLE";
          sendStateMessage(actions, message.from, STATE_MESSAGES["IDLE"], newState.context);
        }
        break;
      
      case "SUPPLIER_CATEGORY":
        // Handle supplier category selection
        const selectedCategoryId = message.body?.trim();
        
        if (selectedCategoryId && BOT_CATEGORIES[selectedCategoryId]) {
          // Store the selected category
          if (!newState.context.currentSupplier) {
            newState.context.currentSupplier = {};
          }
          
          newState.context.currentSupplier.category = [selectedCategoryId];
          console.log(`[BotEngine] Selected category: ${selectedCategoryId}`);
          
          // Move to supplier name collection
          newState.currentState = "SUPPLIER_NAME";
          sendStateMessage(actions, message.from, STATE_MESSAGES["SUPPLIER_NAME"], newState.context);
        } else {
          // Invalid category, send error and stay in same state
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: VALIDATION_ERRORS.selection
            }
          });
        }
        break;

      case "SUPPLIER_NAME":
        // Process and store supplier name
        if (!newState.context.currentSupplier) {
          newState.context.currentSupplier = {};
        }
        
        // Handle skip command
        if (message.body?.trim().toLowerCase() === "דלג") {
          return moveToNextCategory(newState, actions, message.from);
        }
        
        newState.context.currentSupplier.name = message.body?.trim();
        console.log(`[BotEngine] Stored supplier name: ${newState.context.currentSupplier.name}`);
        
        // Move to WhatsApp collection
        newState.currentState = "SUPPLIER_WHATSAPP";
        sendStateMessage(actions, message.from, STATE_MESSAGES["SUPPLIER_WHATSAPP"], newState.context);
        break;

      case "SUPPLIER_WHATSAPP":
        // Store supplier WhatsApp number
        if (!newState.context.currentSupplier) {
          newState.context.currentSupplier = {};
        }
        
        newState.context.currentSupplier.whatsapp = message.body?.trim();
        console.log(`[BotEngine] Stored supplier WhatsApp: ${newState.context.currentSupplier.whatsapp}`);
        
        // Move to delivery days collection
        newState.currentState = "SUPPLIER_DELIVERY_DAYS";
        sendStateMessage(actions, message.from, STATE_MESSAGES["SUPPLIER_DELIVERY_DAYS"], newState.context);
        break;

      case "SUPPLIER_DELIVERY_DAYS":
        // Handle delivery days selection
        if (message.body?.trim().toLowerCase() === "done") {
          // User finished selecting days
          if (!newState.context.selectedDays || newState.context.selectedDays.length === 0) {
            // No days selected, send error
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: VALIDATION_ERRORS.days
              }
            });
            break;
          }
          
          // Store selected days and move to cutoff time
          if (!newState.context.currentSupplier) {
            newState.context.currentSupplier = {};
          }
          
          newState.context.currentSupplier.deliveryDays = newState.context.selectedDays;
          newState.context.selectedDays = undefined; // Clear temporary selection
          
          newState.currentState = "SUPPLIER_CUTOFF_TIME";
          sendStateMessage(actions, message.from, STATE_MESSAGES["SUPPLIER_CUTOFF_TIME"], newState.context);
          break;
        }
        
        // Handle day selection (accumulate days)
        const selectedDay = parseInt(message.body?.trim() || "");
        if (!isNaN(selectedDay) && selectedDay >= 0 && selectedDay <= 6) {
          if (!newState.context.selectedDays) {
            newState.context.selectedDays = [];
          }
          
          // Add day if not already selected
          if (!newState.context.selectedDays.includes(selectedDay)) {
            newState.context.selectedDays.push(selectedDay);
          }
          
          // Send confirmation message
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: `✅ נוסף יום ${getDayName(selectedDay)}. בחר ימים נוספים או שלח 'סיום' כשתסיים.`
            }
          });
        } else {
          // Invalid day, send error
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: VALIDATION_ERRORS.days
            }
          });
        }
        break;

      case "SUPPLIER_CUTOFF_TIME":
        // Store cutoff hour
        if (!newState.context.currentSupplier) {
          newState.context.currentSupplier = {};
        }
        
        newState.context.currentSupplier.cutoffHour = parseInt(message.body?.trim() || "");
        console.log(`[BotEngine] Stored supplier cutoff hour: ${newState.context.currentSupplier.cutoffHour}`);
        
        // Move to product collection
        newState.currentState = "PRODUCT_NAME";
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(STATE_MESSAGES["PRODUCT_NAME"].message || "", 
                                     { supplierName: newState.context.currentSupplier.name })
          }
        });
        break;

      case "PRODUCT_NAME":
        // Process product list
        const productLines = message.body?.split('\n').filter(line => line.trim()) || [];
        
        if (productLines.length === 0) {
          // No products entered
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: VALIDATION_ERRORS.invalidProductList
            }
          });
          break;
        }
        
        // Parse products
        newState.context.currentSupplier.products = productLines.map((line, index) => {
          const emojiMatch = line.match(/^([^\w\s]*)/);
          const emoji = emojiMatch && emojiMatch[0] ? emojiMatch[0] : "📦";
          const name = line.replace(/^[^\w\s]*/, '').trim();
          
          return {
            id: `product_${index}`,
            name: name,
            emoji: emoji
          };
        });
        
        // Start product details collection with first product
        newState.context.currentProductIndex = 0;
        const firstProduct = newState.context.currentSupplier.products[0];
        
        newState.currentState = "PRODUCT_UNIT";
        sendStateMessage(actions, message.from, STATE_MESSAGES["PRODUCT_UNIT"], 
                        { productName: firstProduct.name });
        break;

      case "PRODUCT_UNIT":
        // Process product unit
        const productIndex = newState.context.currentProductIndex || 0;
        const product = newState.context.currentSupplier.products[productIndex];
        
        // Handle unit selection from list or custom input
        let unit = message.body?.trim() || "";
        
        // Map option IDs to actual units
        if (unit === "kg") unit = "ק\"ג";
        else if (unit === "pcs") unit = "יחידות";
        else if (unit === "l") unit = "ליטר";
        else if (unit === "bottle") unit = "בקבוק";
        else if (unit === "box") unit = "קרטון";
        else if (unit === "pack") unit = "חבילה";
        
        // Store unit
        product.unit = unit;
        
        // Move to quantity collection
        newState.currentState = "PRODUCT_QTY";
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(
            STATE_MESSAGES["PRODUCT_QTY"].message || "", 
            { 
              productName: product.name,
              emoji: product.emoji,
              unit: product.unit
            })
          }
        });
        break;

      case "PRODUCT_QTY":
        // Process base quantity
        const qtyIndex = newState.context.currentProductIndex || 0;
        const qtyProduct = newState.context.currentSupplier.products[qtyIndex];
        
        // Parse quantity
        qtyProduct.baseQty = parseFloat(message.body?.trim() || "");
        
        // Move to midweek par level
        newState.currentState = "PRODUCT_PAR_MIDWEEK";
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(STATE_MESSAGES["PRODUCT_PAR_MIDWEEK"].message || "", 
                                     { 
                                       productName: qtyProduct.name,
                                       emoji: qtyProduct.emoji,
                                       unit: qtyProduct.unit
                                     })
          }
        });
        break;

      case "PRODUCT_PAR_MIDWEEK":
        // Process midweek par level
        const midweekIndex = newState.context.currentProductIndex || 0;
        const midweekProduct = newState.context.currentSupplier.products[midweekIndex];
        
        // Parse par level
        midweekProduct.parMidweek = parseFloat(message.body?.trim() || "");
        
        // Move to weekend par level
        newState.currentState = "PRODUCT_PAR_WEEKEND";
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(STATE_MESSAGES["PRODUCT_PAR_WEEKEND"].message || "", 
                                     { 
                                       productName: midweekProduct.name,
                                       emoji: midweekProduct.emoji,
                                       unit: midweekProduct.unit
                                     })
          }
        });
        break;
      
      case "PRODUCT_PAR_WEEKEND":
        // Process weekend par level
        const weekendIndex = newState.context.currentProductIndex || 0;
        const weekendProduct = newState.context.currentSupplier.products[weekendIndex];
        
        // Parse par level
        weekendProduct.parWeekend = parseFloat(message.body?.trim() || "");
        
        // Move to next product or finish supplier setup
        const nextProductIndex = weekendIndex + 1;
        
        if (nextProductIndex < newState.context.currentSupplier.products.length) {
          // More products to process
          newState.context.currentProductIndex = nextProductIndex;
          const nextProduct = newState.context.currentSupplier.products[nextProductIndex];
          
          // Loop back to PRODUCT_UNIT for the next product
          newState.currentState = "PRODUCT_UNIT";
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(STATE_MESSAGES["PRODUCT_UNIT"].message || "", 
                                       { 
                                         productName: nextProduct.name,
                                         emoji: nextProduct.emoji
                                       })
            }
          });
        } else {
          // All products processed, first save supplier
          actions.push({
            type: "UPDATE_SUPPLIER",
            payload: {
              restaurantId: newState.context.legalId,
              name: newState.context.currentSupplier.name,
              whatsapp: newState.context.currentSupplier.whatsapp,
              deliveryDays: newState.context.currentSupplier.deliveryDays || [],
              cutoffHour: newState.context.currentSupplier.cutoffHour || 12,
              category: newState.context.currentSupplier.category || ["general"],
              role: "Supplier"
            }
          });
          
          // Now create/update each product
          if (newState.context.currentSupplier.products?.length > 0) {
            newState.context.currentSupplier.products.forEach((product: Product) => {
              actions.push({
                type: "UPDATE_PRODUCT",
                payload: {
                  restaurantId: newState.context.legalId,
                  supplierId: newState.context.currentSupplier.whatsapp,
                  name: product.name,
                  emoji: product.emoji || "📦",
                  unit: product.unit || "יחידות",
                  category: newState.context.currentSupplier.category?.[0] || "general",
                  parMidweek: product.parMidweek || 0,
                  parWeekend: product.parWeekend || 0
                }
              });
            });
          }
          
          // Send completion message and move to next category
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(`✅ *ספק ${newState.context.currentSupplier.name} הוגדר בהצלחה!*\n\n📦 סה\"כ ${newState.context.currentSupplier.products.length} מוצרים\n⏰ אספקה: ${formatDeliveryDays(newState.context.currentSupplier.deliveryDays || [])}\n🕒 הזמנה עד: ${newState.context.currentSupplier.cutoffHour || 12}:00\n\n➡️ עובר לקטגוריה הבאה...`, {})
            }
          });
          
          // Move to next category
          return moveToNextCategory(newState, actions, message.from);
        }
        break;

      // ===== INVENTORY SNAPSHOT FLOW =====
      case "INVENTORY_SNAPSHOT_START":
        // Handle inventory snapshot initiation
        if (message.body?.trim() === "start") {
          newState.currentState = "INVENTORY_SNAPSHOT_CATEGORY";
          sendStateMessage(actions, message.from, STATE_MESSAGES["INVENTORY_SNAPSHOT_CATEGORY"], newState.context);
        } else {
          // User postponed, move to IDLE
          newState.currentState = "IDLE";
          sendStateMessage(actions, message.from, STATE_MESSAGES["IDLE"], newState.context);
        }
        break;

      case "INVENTORY_SNAPSHOT_CATEGORY":
        // Process inventory category selection
        if (message.body?.trim() === "סיום") {
          // User finished inventory update
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: SYSTEM_MESSAGES.snapshotComplete
            }
          });
          newState.currentState = "IDLE";
          break;
        }
        
        const categoryId = message.body?.trim();
        if (categoryId && BOT_CATEGORIES[categoryId]) {
          // Valid category selected
          newState.context.currentCategory = categoryId;
          
          // Get products for this category (mock implementation)
          newState.context.currentCategoryProducts = getMockProductsForCategory(categoryId);
          
          if (newState.context.currentCategoryProducts.length > 0) {
            // Start inventory for first product
            newState.context.currentProductIndex = 0;
            // const firstInventoryProduct = newState.context.currentCategoryProducts[0];
            
            newState.currentState = "INVENTORY_SNAPSHOT_PRODUCT";
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: interpolateMessage(STATE_MESSAGES["INVENTORY_SNAPSHOT_PRODUCT"].message || "",
                                       {
                                         categoryName: BOT_CATEGORIES[categoryId].name,
                                         productList: formatProductList(newState.context.currentCategoryProducts)
                                       })
              }
            });
          } else {
            // No products for this category
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: STATE_MESSAGES["INVENTORY_SNAPSHOT_CATEGORY"].message
              }
            });
          }
        } else {
          // Invalid category
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: VALIDATION_ERRORS.invalidCategory
            }
          });
        }
        break;

      // Handle the remaining states in the same pattern...
      // I'll implement a few more key states and then suggest using the same pattern for the others

      case "INVENTORY_SNAPSHOT_PRODUCT":
        // Handle product selection or ending
        if (message.body?.trim().toLowerCase() === "סיום") {
          newState.currentState = "INVENTORY_SNAPSHOT_QTY";
          sendStateMessage(actions, message.from, STATE_MESSAGES["INVENTORY_SNAPSHOT_QTY"], newState.context);
          break;
        }
        
        const selectedProductId = parseInt(message.body?.trim() || "");
        if (!isNaN(selectedProductId) && selectedProductId > 0 && 
            selectedProductId <= newState.context.currentCategoryProducts.length) {
          // Valid product selected
          newState.context.currentProductIndex = selectedProductId - 1;
          const selectedProduct = newState.context.currentCategoryProducts[newState.context.currentProductIndex];
          
          newState.currentState = "INVENTORY_SNAPSHOT_QTY";
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(STATE_MESSAGES["INVENTORY_SNAPSHOT_QTY"].message || "",
                                     {
                                       productName: selectedProduct.name,
                                       emoji: selectedProduct.emoji || "📦",
                                       unit: selectedProduct.unit
                                     })
            }
          });
        } else {
          // Invalid product selection
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: VALIDATION_ERRORS.selection
            }
          });
        }
        break;

      // === IDLE STATE ===
      case "IDLE":
        // Handle commands from idle state
        handleIdleCommands(message.body || "", message.from, newState, actions);
        break;

      // Default case for unhandled states
      default:
        console.warn(`[BotEngine] Unhandled state: ${currentState.currentState}`);
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: SYSTEM_MESSAGES.error
          }
        });
        newState.currentState = "IDLE";
        break;
    }
  } catch (error) {
    console.error("[BotEngine] Error in state machine:", error);
    
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: message.from,
        body: SYSTEM_MESSAGES.error
      }
    });
    
    newState.currentState = "IDLE";
    // Keep basic context but clear temporary data
    newState.context = {
      restaurantName: newState.context.restaurantName,
      contactName: newState.context.contactName,
      isSimulator: newState.context.isSimulator
    };
  }

  console.log(`[BotEngine] State transition: ${currentState.currentState} -> ${newState.currentState} ${isSimulator ? '(simulator)' : ''}`, {
    actionsCount: actions.length,
    contextKeys: Object.keys(newState.context),
  });

  return { newState, actions };
}

/**
 * Helper function to validate user input based on validator type
 * @param input User input to validate
 * @param validator Type of validation to perform
 * @param context Current conversation context
 * @returns True if input is valid, false otherwise
 */
function validateInput(input: string, validator: string, context: Record<string, any>): boolean {
  const trimmedInput = input.trim();
  
  switch (validator) {
    case 'text':
      return trimmedInput.length >= 2;
      
    case 'number':
      const num = parseFloat(trimmedInput);
      return !isNaN(num) && num >= 0;
      
    case 'email':
      // Allow "דלג" as valid input for optional email
      if (trimmedInput === 'דלג' || trimmedInput === '') return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedInput);
      
    case 'phone':
      // Simple phone validation
      const phoneRegex = /^(\+\d{1,3}\s?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
      return phoneRegex.test(trimmedInput);
      
    case 'yesNo':
      return ['כן', 'לא'].includes(trimmedInput.toLowerCase());
      
    case 'selection':
      // Validation would depend on the specific selection options
      // Just checking it's not empty for now
      return trimmedInput.length > 0;
      
    case 'days':
      // Validate day numbers (0-6)
      if (trimmedInput === 'סיום' || trimmedInput === 'done') return true;
      const day = parseInt(trimmedInput);
      return !isNaN(day) && day >= 0 && day <= 6;
      
    case 'time':
      // Validate hour (0-23)
      const hour = parseInt(trimmedInput);
      return !isNaN(hour) && hour >= 0 && hour <= 23;
      
    case 'photo':
      // This would need to check for actual photo content
      // For now, just return true as validation would happen elsewhere
      return true;
      
    case 'skip':
      // Always valid
      return true;
      
    default:
      console.warn(`[BotEngine] Unknown validator type: ${validator}`);
      return false;
  }
}

/**
 * Helper function to send the appropriate message based on state definition
 * Handles both regular messages and WhatsApp templates
 * 
 * @param actions Action array to append to
 * @param recipient Recipient phone number
 * @param stateMessage State message definition
 * @param context Current conversation context
 */
function sendStateMessage(
  actions: BotAction[], 
  recipient: string, 
  stateMessage: any, 
  context: Record<string, any>
): void {
  if (!stateMessage) {
    console.error("[BotEngine] Attempted to send undefined state message");
    return;
  }
  
  if (stateMessage.whatsappTemplate) {
    // Use template
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: recipient,
        template: {
          id: stateMessage.whatsappTemplate.id,
          type: stateMessage.whatsappTemplate.type,
          body: interpolateMessage(stateMessage.whatsappTemplate.body, context),
          options: stateMessage.whatsappTemplate.options,
          header: stateMessage.whatsappTemplate.header
        }
      }
    });
  } else if (stateMessage.message) {
    // Use regular message
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: recipient,
        body: interpolateMessage(stateMessage.message, context)
      }
    });
  } else {
    console.warn("[BotEngine] State message has neither template nor message:", stateMessage);
  }
}

/**
 * Helper function to move to the next supplier category
 */
function moveToNextCategory(
  newState: ConversationState, 
  actions: BotAction[], 
  phoneNumber: string
): StateTransition {
  // Get available supplier categories
  const supplierCategories = Object.keys(BOT_CATEGORIES);
  
  const currentIndex = newState.context.currentCategoryIndex || 0;
  const nextIndex = currentIndex + 1;
  
  if (nextIndex >= supplierCategories.length) {
    // All categories completed
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        body: "🎉 *כל הספקים הוגדרו בהצלחה!*\n\n📊 המערכת מוכנה לשימוש.\n\n💡 הקלד 'עזרה' לראות את הפקודות הזמינות."
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
    const nextCategory = supplierCategories[nextIndex];
    
    // Reset supplier for next category
    newState.context.currentSupplier = {
      category: [nextCategory]
    };
    newState.context.currentProductIndex = undefined;
    
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        body: interpolateMessage(
          "🔄 *עובר לקטגוריה: {categoryName}*\n\n{categoryEmoji} מי הספק שלך עבור {categoryName}?\nשלח שם הספק ומספר וואטסאפ.\n\n⏭️ או שלח 'דלג' אם אין ספק בקטגוריה זו", 
          {
            categoryName: BOT_CATEGORIES[nextCategory].name,
            categoryEmoji: BOT_CATEGORIES[nextCategory].emoji
          }
        )
      }
    });
    newState.currentState = "SUPPLIER_NAME";
  }
  
  return { newState, actions };
}

/**
 * Helper function to handle commands in IDLE state
 */
function handleIdleCommands(
  command: string, 
  phoneNumber: string, 
  newState: ConversationState, 
  actions: BotAction[]
): void {
  const lcCommand = command.toLowerCase().trim();
  
  if (lcCommand.includes("עזרה") || lcCommand === "?") {
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        body: SYSTEM_MESSAGES.help
      }
    });
  } else if (lcCommand.includes("מלאי")) {
    // Start inventory snapshot process
    newState.currentState = "INVENTORY_SNAPSHOT_START";
    sendStateMessage(actions, phoneNumber, STATE_MESSAGES["INVENTORY_SNAPSHOT_START"], newState.context);
  } else if (lcCommand.includes("ספק")) {
    // Add new supplier
    newState.currentState = "SUPPLIER_CATEGORY";
    sendStateMessage(actions, phoneNumber, STATE_MESSAGES["SUPPLIER_CATEGORY"], newState.context);
  } else {
    // Default welcome back message
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        body: interpolateMessage(SYSTEM_MESSAGES.welcome, {
          contactName: newState.context.contactName || "משתמש"
        })
      }
    });
  }
}

/**
 * Helper function for message interpolation
 * Replaces placeholders in the format {key} with values from context
 */
function interpolateMessage(template: string, context: Record<string, any>): string {
  let result = template;
  
  // Replace placeholders with context values
  Object.entries(context).forEach(([key, value]) => {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value.toString());
    }
  });
  
  return result;
}

/**
 * Helper function to get Hebrew day name from day number
 */
function getDayName(day: number): string {
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  return days[day] || "";
}

/**
 * Format delivery days as Hebrew text
 */
function formatDeliveryDays(days: number[]): string {
  return days.map(day => getDayName(day)).join(", ");
}

/**
 * Helper to generate a formatted list of products
 */
function formatProductList(products: any[]): string {
  return products.map((product, index) => 
    `${index + 1}. ${product.emoji || "📦"} ${product.name}`
  ).join("\n");
}

/**
 * Mock function to get products for a category
 * In a real implementation, this would fetch from Firestore
 */
function getMockProductsForCategory(categoryId: string): any[] {
  // Mock data - in real implementation, would fetch from Firestore
  const mockProducts = {
    "vegetables": [
      { id: "v1", name: "מלפפונים", emoji: "🥒", unit: "ק\"ג" },
      { id: "v2", name: "עגבניות", emoji: "🍅", unit: "ק\"ג" },
      { id: "v3", name: "חסה", emoji: "🥬", unit: "יחידות" }
    ],
    "fruits": [
      { id: "f1", name: "תפוחים", emoji: "🍎", unit: "ק\"ג" },
      { id: "f2", name: "בננות", emoji: "🍌", unit: "ק\"ג" }
    ],
    "meat": [
      { id: "m1", name: "חזה עוף", emoji: "🍗", unit: "ק\"ג" },
      { id: "m2", name: "סטייק", emoji: "🥩", unit: "ק\"ג" }
    ]
  };
  
  return mockProducts[categoryId as keyof typeof mockProducts] || [];
}