import { ConversationState, IncomingMessage, StateTransition, BotAction, StateMessage } from '../schema/types';
import { 
  STATE_MESSAGES, 
  SYSTEM_MESSAGES, 
  VALIDATION_ERRORS,
  BOT_CATEGORIES,
  BOT_CONFIG,
  getAvailableCategories,
  formatProductOptions,
  getProductsForCategories
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
        if (newState.context.paymentMethod === "Trial") {
          console.log("[BotEngine] Skipping payment with trial code");
          newState.currentState = "SETUP_SUPPLIERS_START";
          sendStateMessage(actions, message.from, STATE_MESSAGES["SETUP_SUPPLIERS_START"], newState.context);
          break;
        }
        // Move to waiting for payment state
        newState.currentState = "WAITING_FOR_PAYMENT";
        sendStateMessage(actions, message.from, STATE_MESSAGES["WAITING_FOR_PAYMENT"], {...newState.context, paymentLink: BOT_CONFIG.paymentLink});
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
          // Make sure to include the payment link directly in the context
          const contextWithPaymentLink = {
            ...newState.context,
            paymentLink: BOT_CONFIG.paymentLink
          };
          
          console.log("[BotEngine] Waiting for payment confirmation, with payment link:", contextWithPaymentLink.paymentLink);
          sendStateMessage(actions, message.from, STATE_MESSAGES["WAITING_FOR_PAYMENT"], contextWithPaymentLink);
        }
        break;

      // ===== SUPPLIER SETUP FLOW =====
      case "SETUP_SUPPLIERS_START":
        // Handle response to start supplier setup
        if (message.body?.trim() === "start_setup") {
          // Initialize supplier setup
          newState.context.currentCategoryIndex = 0;
          newState.currentState = "SUPPLIER_CATEGORY";
          
          // Get available categories and send template with proper options
          const availableCategories = getAvailableCategories(newState.context.completedCategories || []);
          const categoryTemplate = {
            ...STATE_MESSAGES["SUPPLIER_CATEGORY"].whatsappTemplate,
            options: [
              ...availableCategories,
              { name: "📝 סיום בחירת קטגוריות", id: "סיום קטגוריות" },
              { name: "🏁 סיום הגדרת ספקים", id: "סיום ספקים" }
            ]
          };
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              template: categoryTemplate
            }
          });
        } else {
          // User postponed, stay in IDLE state
          newState.currentState = "IDLE";
          sendStateMessage(actions, message.from, STATE_MESSAGES["IDLE"], newState.context);
        }
        break;

      case "SUPPLIER_CATEGORY":
        // Handle supplier category selection
        const selectedCategoryId = message.body?.trim();
        
        // Handle control commands - FINISH ALL SUPPLIERS SETUP
        if (selectedCategoryId?.toLowerCase() === "סיום ספקים" || selectedCategoryId?.toLowerCase() === "finish_suppliers") {
          // User wants to completely finish supplier setup and go to IDLE
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: "🎉 *הגדרת הספקים הושלמה בהצלחה!*\n\n📊 המערכת מוכנה לשימוש.\n\n💡 הקלד 'עזרה' לראות את הפקודות הזמינות או 'מלאי' להתחיל עדכון מלאי."
            }
          });
          newState.currentState = "IDLE";
          
          // Clear all supplier setup context
          delete newState.context.currentCategoryIndex;
          delete newState.context.currentSupplier;
          delete newState.context.currentProductIndex;
          delete newState.context.selectedCategories;
          delete newState.context.completedCategories;
          delete newState.context.customProductEntry;
          break;
        }
        
        // Handle control commands - FINISH CATEGORIES FOR CURRENT SUPPLIER
        if (selectedCategoryId?.toLowerCase() === "סיום קטגוריות" || selectedCategoryId?.toLowerCase() === "done_categories") {
          // User finished selecting categories for the current supplier
          if (!newState.context.selectedCategories || newState.context.selectedCategories.length === 0) {
            // No categories selected, send error
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: "❌ יש לבחור לפחות קטגוריה אחת לפני סיום.\n\n💡 בחר קטגוריה מהרשימה למעלה"
              }
            });
            break;
          }
          
          // Store selected categories and move to supplier name collection
          if (!newState.context.currentSupplier) {
            newState.context.currentSupplier = {};
          }
          
          newState.context.currentSupplier.category = [...newState.context.selectedCategories];
          delete newState.context.selectedCategories; // Clear temporary selection
          
          // Move to supplier name collection
          newState.currentState = "SUPPLIER_NAME";
          sendStateMessage(actions, message.from, STATE_MESSAGES["SUPPLIER_NAME"], newState.context);
          break;
        }
        
        // Handle skip command to avoid category selection entirely  
        if (selectedCategoryId?.toLowerCase() === "skip" || selectedCategoryId?.toLowerCase() === "דלג") {
          // Move to next available category or complete setup
          return moveToNextCategory(newState, actions, message.from);
        }
        
        // Handle going back to previous category or exiting
        if (selectedCategoryId?.toLowerCase() === "back" || selectedCategoryId?.toLowerCase() === "חזרה") {
          // Return to category menu showing available categories
          const availableCategories = getAvailableCategories(newState.context.completedCategories || []);
          if (availableCategories.length === 0) {
            // All categories completed
            newState.currentState = "IDLE";
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: "🎉 *כל הספקים הוגדרו בהצלחה!*\n\n📊 המערכת מוכנה לשימוש.\n\n💡 הקלד 'עזרה' לראות את הפקודות הזמינות."
              }
            });
          } else {
            // Show available categories
            const categoryTemplate = {
              ...STATE_MESSAGES["SUPPLIER_CATEGORY"].whatsappTemplate,
              options: [
                ...availableCategories,
                { name: "📝 סיום בחירת קטגוריות", id: "סיום קטגוריות" },
                { name: "🏁 סיום הגדרת ספקים", id: "סיום ספקים" }
              ]
            };
            
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                template: categoryTemplate
              }
            });
          }
          break;
        }
        
        // Handle single category selection (accumulate categories)
        if (selectedCategoryId && BOT_CATEGORIES[selectedCategoryId]) {
          // Initialize selected categories array if it doesn't exist
          if (!newState.context.selectedCategories) {
            newState.context.selectedCategories = [];
          }
          
          // Add category if not already selected
          if (!newState.context.selectedCategories.includes(selectedCategoryId)) {
            newState.context.selectedCategories.push(selectedCategoryId);
            
            // Send confirmation message with current selection and remaining options
            const categoryName = BOT_CATEGORIES[selectedCategoryId].name;
            const categoryEmoji = BOT_CATEGORIES[selectedCategoryId].emoji;
            const selectedSummary = newState.context.selectedCategories
              .map((cat: string) => `${BOT_CATEGORIES[cat].emoji} ${BOT_CATEGORIES[cat].name}`)
              .join(", ");
            
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: `✅ נוספה קטגוריה: ${categoryEmoji} ${categoryName}\n\n📝 *קטגוריות נבחרות:* ${selectedSummary}\n\n💡 בחר קטגוריות נוספות, שלח 'סיום קטגוריות' לסיום בחירת קטגוריות לספק זה, או שלח 'סיום ספקים' לסיום הגדרת כל הספקים.`
              }
            });
          } else {
            // Category already selected
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: `⚠️ הקטגוריה ${BOT_CATEGORIES[selectedCategoryId].emoji} ${BOT_CATEGORIES[selectedCategoryId].name} כבר נבחרה.\n\n💡 בחר קטגוריה אחרת, שלח 'סיום קטגוריות' לסיום בחירת קטגוריות לספק זה, או שלח 'סיום ספקים' לסיום הגדרת כל הספקים.`
              }
            });
          }
        } else {
          // Invalid category, send error and provide help
          const availableCategories = getAvailableCategories(newState.context.completedCategories || []);
          const categoryList = availableCategories.map(cat => cat.name).join('\n');
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: `❌ קטגוריה לא תקינה: "${selectedCategoryId}"\n\n📋 *קטגוריות זמינות:*\n${categoryList}\n\n💡 או שלח 'סיום קטגוריות' לסיום בחירת קטגוריות לספק זה\n🏁 או שלח 'סיום ספקים' לסיום הגדרת כל הספקים`
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
          delete newState.context.selectedDays // Clear temporary selection
          
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
        
        // Initialize products array and move to product collection
        newState.context.currentSupplier.products = [];
        newState.currentState = "PRODUCT_NAME";
        
        // Get products for selected categories, excluding already selected ones
        const selectedCategoriesLocal = newState.context.currentSupplier?.category || [];
        const excludeProductsLocal = newState.context.currentSupplier?.products?.map((p: any) => p.name) || [];
        const productOptionsLocal = formatProductOptions(selectedCategoriesLocal, excludeProductsLocal);

        const productTemplate = {
          ...STATE_MESSAGES["PRODUCT_NAME"].whatsappTemplate,
          options: [
            ...productOptionsLocal.slice(0, 20), // Limit to first 20 products to avoid WhatsApp limits
            { name: "✏️ מוצר מותאם אישית", id: "custom" },
            { name: "📝 סיום הוספת מוצרים", id: "done" }
          ]
        };
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            template: productTemplate
          }
        });
        break;

      case "PRODUCT_NAME":
        // Handle product selection and entry
        const productInput = message.body?.trim();
        
        // Handle control commands
        if (productInput?.toLowerCase() === "done" || productInput?.toLowerCase() === "סיום") {
          // User finished adding products
          if (!newState.context.currentSupplier?.products || newState.context.currentSupplier.products.length === 0) {
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: "❌ יש להוסיף לפחות מוצר אחד לפני סיום.\n\n💡 בחר מוצר מהרשימה או הזן שם מוצר מותאם אישית"
              }
            });
            break;
          }
          
          // Move to supplier saving flow - all products have been collected with their details
          // All products processed, validate and save supplier
          const supplier = newState.context.currentSupplier;
          
          // Validate supplier data before saving
          const validationErrors: string[] = [];
          
          if (!supplier?.name) validationErrors.push("שם הספק");
          if (!supplier?.whatsapp) validationErrors.push("מספר וואטסאפ");
          if (!supplier?.category || supplier.category.length === 0) validationErrors.push("קטגוריה");
          if (!supplier?.deliveryDays || supplier.deliveryDays.length === 0) validationErrors.push("ימי אספקה");
          if (supplier?.cutoffHour === undefined || supplier.cutoffHour < 0 || supplier.cutoffHour > 23) validationErrors.push("שעת קאט-אוף");
          
          if (validationErrors.length > 0) {
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: `❌ *שגיאה בשמירת הספק*\n\nהשדות הבאים חסרים או לא תקינים:\n${validationErrors.map(field => `• ${field}`).join('\n')}\n\n💡 אנא צור קשר עם התמיכה לסיוע.`
              }
            });
            
            // Reset to category selection to try again
            newState.currentState = "SUPPLIER_CATEGORY";
            break;
          }
          
          // Save supplier with validated data
          actions.push({
            type: "UPDATE_SUPPLIER",
            payload: {
              restaurantId: newState.context.legalId || "123456789",
              name: supplier.name,
              whatsapp: supplier.whatsapp,
              deliveryDays: supplier.deliveryDays,
              cutoffHour: supplier.cutoffHour,
              category: supplier.category,
              role: "Supplier" as const
            }
          });
          
          // Save each product with validated data
          if (supplier.products && supplier.products.length > 0) {
            supplier.products.forEach((product: any) => {
              // Validate product data
              if (product.name && product.unit) {
                actions.push({
                  type: "UPDATE_PRODUCT",
                  payload: {
                    restaurantId: newState.context.legalId || "",
                    supplierId: supplier.whatsapp,
                    name: product.name,
                    emoji: product.emoji || "📦",
                    unit: product.unit,
                    category: supplier.category[0] || "general",
                    parMidweek: Number(product.parMidweek) || 0,
                    parWeekend: Number(product.parWeekend) || 0
                  }
                });
              }
            });
          }
          
          // Mark this supplier's categories as completed
          if (!newState.context.completedCategories) {
            newState.context.completedCategories = [];
          }
          supplier.category.forEach((cat: string) => {
            if (!newState.context.completedCategories.includes(cat)) {
              newState.context.completedCategories.push(cat);
            }
          });
          
          // Send completion message
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: `✅ *ספק ${supplier.name} הוגדר בהצלחה!*\n\n📦 סה\"ג ${supplier.products?.length || 0} מוצרים\n📋 קטגוריות: ${supplier.category.map((cat: string) => BOT_CATEGORIES[cat]?.name || cat).join(', ')}\n⏰ ימי אספקה: ${formatDeliveryDays(supplier.deliveryDays)}\n🕒 הזמנה עד: ${supplier.cutoffHour}:00\n\n➡️ בחר קטגוריה נוספת או סיים ההגדרה...`
            }
          });
          
          // Clear current supplier data
          delete newState.context.currentSupplier;
          delete newState.context.currentProductIndex;
          delete newState.context.selectedCategories;
          delete newState.context.customProductEntry;
          
          // Move to next category selection or complete setup
          return moveToNextCategory(newState, actions, message.from);
        }
        
        if (productInput?.toLowerCase() === "custom" || productInput?.toLowerCase() === "מותאם") {
          // Switch to custom product entry mode
          newState.context.customProductEntry = true;
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: STATE_MESSAGES["PRODUCT_NAME"].message || "🏷️ *הזן שם מוצר מותאם אישית*\n\nלדוגמה: עגבניות שרי, חזה עוף, יין אדום\n\n⬅️ או שלח 'חזרה' לחזור לרשימת המוצרים"
            }
          });
          break;
        }
        
        if (productInput?.toLowerCase() === "back" || productInput?.toLowerCase() === "חזרה") {
          // Return to product selection template
          newState.context.customProductEntry = false;
          const selectedCategories = newState.context.currentSupplier?.category || [];
          const excludeProducts = newState.context.currentSupplier?.products?.map((p: any) => p.name) || [];
          const productOptions = formatProductOptions(selectedCategories, excludeProducts);
          
          const productTemplate = {
            ...STATE_MESSAGES["PRODUCT_NAME"].whatsappTemplate,
            options: [
              ...productOptions.slice(0, 20), // Limit to first 20 products to avoid WhatsApp limits
              { name: "✏️ מוצר מותאם אישית", id: "custom" },
              { name: "📝 סיום הוספת מוצרים", id: "done" }
            ]
          };
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              template: productTemplate
            }
          });
          break;
        }
        
        // Handle product selection or custom entry
        if (newState.context.customProductEntry) {
          // Custom product entry mode
          if (!productInput || productInput.length < 2) {
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: "❌ אנא הזן שם מוצר תקין (לפחות 2 תווים).\n\n⬅️ או שלח 'חזרה' לחזור לרשימת המוצרים"
              }
            });
            break;
          }
          
          // Add custom product to temp storage and move to unit selection
          if (!newState.context.currentSupplier) {
            newState.context.currentSupplier = {};
          }
          if (!newState.context.currentSupplier.products) {
            newState.context.currentSupplier.products = [];
          }
          
          // Parse emoji if provided (format: "🍅 עגבניות")
          const emojiMatch = productInput.match(/^(\S{1,2})\s+(.+)/);
          let emoji = "📦"; // Default emoji
          let name = productInput;
          
          if (emojiMatch && emojiMatch[1] && emojiMatch[2]) {
            emoji = emojiMatch[1];
            name = emojiMatch[2];
          }
          
          // Store current product being set up
          newState.context.currentProduct = {
            id: `custom_product_${Date.now()}`,
            name: name,
            emoji: emoji,
            category: newState.context.currentSupplier.category?.[0] || "general"
          };
          
          newState.context.customProductEntry = false;
          
          // Move to unit selection for this custom product
          newState.currentState = "PRODUCT_UNIT";
          sendStateMessage(actions, message.from, STATE_MESSAGES["PRODUCT_UNIT"], 
                          { 
                            productName: newState.context.currentProduct.name,
                            emoji: newState.context.currentProduct.emoji
                          });

        } else {
          // Template-based product selection
          // Parse product selection format: "product_{index}_{category}_{name}_{unit}"
          const productMatch = productInput?.match(/^product_(\d+)_(.+)_(.+)_(.+)$/);
          
          if (productMatch) {
            const [, indexStr, , , ] = productMatch;
            const index = parseInt(indexStr);
            const selectedCategories = newState.context.currentSupplier?.category || [];
            const excludeProducts = newState.context.currentSupplier?.products?.map((p: any) => p.name) || [];
            const availableProducts = getProductsForCategories(selectedCategories).filter(product => 
              !excludeProducts.some((excluded: string) => excluded === product.name)
            );
            
            if (index >= 0 && index < availableProducts.length) {
              const selectedProduct = availableProducts[index];
              
              // Store current product being set up with pre-filled unit
              newState.context.currentProduct = {
                id: `template_product_${Date.now()}`,
                name: selectedProduct.name,
                emoji: selectedProduct.emoji,
                unit: selectedProduct.unit, // Pre-fill unit from template
                category: selectedProduct.category
              };
              
              // Since we have the unit, skip to quantity collection
              newState.currentState = "PRODUCT_QTY";
              actions.push({
                type: "SEND_MESSAGE",
                payload: {
                  to: message.from,
                  body: interpolateMessage(STATE_MESSAGES["PRODUCT_QTY"].message || "", 
                                           { 
                                             productName: selectedProduct.name,
                                             emoji: selectedProduct.emoji,
                                             unit: selectedProduct.unit
                                           })
                }
              });
              
            } else {
              actions.push({
                type: "SEND_MESSAGE",
                payload: {
                  to: message.from,
                  body: "❌ מוצר לא תקין. אנא בחר מוצר מהרשימה."
                }
              });
            }
          } else {
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: "❌ אנא בחר מוצר מהרשימה, הזן מוצר מותאם אישית, או שלח 'סיום' לסיום."
              }
            });
          }
        }
        break;

      case "PRODUCT_UNIT":
        // Process product unit for custom products
        const product = newState.context.currentProduct;
        
        if (!product) {
          console.error("[BotEngine] No current product in context for unit selection");
          newState.currentState = "PRODUCT_NAME";
          break;
        }
        
        // Handle unit selection from list or custom input
        let unit = message.body?.trim() || "";
        
        // Map option IDs to actual units
        if (unit === "kg") unit = "ק\"ג";
        else if (unit === "pcs") unit = "יחידות";
        else if (unit === "l") unit = "ליטר";
        else if (unit === "bottle") unit = "בקבוק";
        else if (unit === "box") unit = "קרטון";
        else if (unit === "pack") unit = "חבילה";
        // If none of the above, use custom input as-is
        
        // Store unit
        product.unit = unit;
        
        // Move to quantity collection
        newState.currentState = "PRODUCT_QTY";
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(STATE_MESSAGES["PRODUCT_QTY"].message || "", 
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
        const qtyProduct = newState.context.currentProduct;
        
        if (!qtyProduct) {
          console.error("[BotEngine] No current product in context for quantity");
          newState.currentState = "PRODUCT_NAME";
          break;
        }
        
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
        const midweekProduct = newState.context.currentProduct;
        
        if (!midweekProduct) {
          console.error("[BotEngine] No current product in context for midweek par");
          newState.currentState = "PRODUCT_NAME";
          break;
        }
        
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
        const weekendProduct = newState.context.currentProduct;
        
        if (!weekendProduct) {
          console.error("[BotEngine] No current product in context for weekend par");
          newState.currentState = "PRODUCT_NAME";
          break;
        }
        
        // Parse par level
        weekendProduct.parWeekend = parseFloat(message.body?.trim() || "");
        
        // Add completed product to supplier's product list
        if (!newState.context.currentSupplier) {
          newState.context.currentSupplier = {};
        }
        if (!newState.context.currentSupplier.products) {
          newState.context.currentSupplier.products = [];
        }
        
        newState.context.currentSupplier.products.push({ ...weekendProduct });
        
        // Clear current product and show confirmation
        delete newState.context.currentProduct;
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: `✅ *מוצר ${weekendProduct.emoji} ${weekendProduct.name} נוסף בהצלחה!*\n\n📏 יחידה: ${weekendProduct.unit}\n📊 אמצע שבוע: ${weekendProduct.parMidweek}\n📈 סוף שבוע: ${weekendProduct.parWeekend}\n\n💡 הוסף מוצר נוסף או שלח 'סיום' לסיום.`
          }
        });
        
        // Return to product selection for next product
        newState.currentState = "PRODUCT_NAME";
        
        // Show updated product options excluding already selected products
        const selectedCategories = newState.context.currentSupplier?.category || [];
        const excludeProducts = newState.context.currentSupplier?.products?.map((p: any) => p.name) || [];
        const productOptions = formatProductOptions(selectedCategories, excludeProducts);
        
        if (productOptions.length > 0) {
          const productTemplate = {
            ...STATE_MESSAGES["PRODUCT_NAME"].whatsappTemplate,
            options: [
              ...productOptions.slice(0, 20),
              { name: "✏️ מוצר מותאם אישית", id: "custom" },
              { name: "📝 סיום הוספת מוצרים", id: "done" }
            ]
          };
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              template: productTemplate
            }
          });
        } else {
          // No more products available, suggest finishing
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: "📝 *כל המוצרים הזמינים נבחרו*\n\n💡 תוכל להוסיף מוצר מותאם אישית או לסיים עם 'סיום'"
            }
          });
        }
        break;

      // ===== INVENTORY SNAPSHOT FLOW =====
      case "INVENTORY_SNAPSHOT_START":
        // Handle inventory snapshot initiation
        if (message.body?.trim() === "start") {
          newState.currentState = "INVENTORY_SNAPSHOT_CATEGORY";
          
          // Send template with actual category options
          const categoryOptions = Object.entries(BOT_CATEGORIES).map(([id, { name, emoji }]) => ({ 
            name: `${emoji} ${name}`, 
            id 
          }));
          
          const snapshotCategoryTemplate = {
            ...STATE_MESSAGES["INVENTORY_SNAPSHOT_CATEGORY"].whatsappTemplate,
            options: [
              ...categoryOptions,
              { name: "📝 סיום", id: "סיום" }
            ]
          };
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              template: snapshotCategoryTemplate
            }
          });
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
  
  switch (validator as StateMessage['validator']) {
    case 'text':
      return trimmedInput.length >= 2;
    case 'legalId':
      // Validate legal ID (Israeli 9-digit number)
      return /^\d{9}$/.test(trimmedInput);

    case 'activeYears':
      // Validate active years (1-99)
      const years = parseInt(trimmedInput);
      return !isNaN(years) && years >= 1 && years <= 99;

    case 'number':
      const num = parseFloat(trimmedInput);
      return !isNaN(num) && num >= 0;
      
    case 'email':
      // Allow "דלג" as valid input for optional email
      if (trimmedInput === 'דלג' || trimmedInput === '') return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedInput);
      
    case 'phone':
      // Validate exactly 10 digits for WhatsApp number
      return /^\d{10}$/.test(trimmedInput);
      
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
 * Helper function to move to next category selection or complete setup
 */
function moveToNextCategory(
  newState: ConversationState, 
  actions: BotAction[], 
  phoneNumber: string
): StateTransition {
  // Get available categories (exclude already completed ones)
  const completedCategories = newState.context.completedCategories || [];
  const availableCategories = getAvailableCategories(completedCategories);
  
  if (availableCategories.length === 0) {
    // All categories completed
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        body: "🎉 *הגדרת הספקים הושלמה בהצלחה!*\n\n📊 המערכת מוכנה לשימוש.\n\n💡 הקלד 'עזרה' לראות את הפקודות הזמינות או 'מלאי' להתחיל עדכון מלאי."
      }
    });
    newState.currentState = "IDLE";
    
    // Clear all supplier setup context
    delete newState.context.currentCategoryIndex;
    delete newState.context.currentSupplier;
    delete newState.context.currentProductIndex;
    delete newState.context.selectedCategories;
    delete newState.context.completedCategories;
    delete newState.context.customProductEntry;
  } else {
    // Show available categories for user to choose from
    newState.currentState = "SUPPLIER_CATEGORY";
    
    const categoryTemplate = {
      ...STATE_MESSAGES["SUPPLIER_CATEGORY"].whatsappTemplate,
      options: [
        ...availableCategories,
        { name: "📝 סיום בחירת קטגוריות", id: "סיום קטגוריות" },
        { name: "🏁 סיום הגדרת ספקים", id: "סיום ספקים" }
      ]
    };
    
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        body: `🏪 *בחר קטגוריה נוספת לספק*`
      }
    });
    
    actions.push({
      type: "SEND_MESSAGE",
      payload: {
        to: phoneNumber,
        template: categoryTemplate
      }
    });
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
 * Helper for message interpolation
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