import { DocumentReference } from 'firebase-admin/firestore';
import { ConversationState, IncomingMessage, StateTransition, BotAction, BotState } from '../schema/types';
import { 
  BOT_MESSAGES, BOT_CONFIG, formatDaysHebrew, 
  interpolateMessage, formatCategoryName, formatCategoryEmoji 
} from './botMessages';

const defaultPaymentLink = "https://example.com/payment"; // Default payment link if not configured

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

  try {
    // Main state machine switch - all cases must match BotState type
    switch (currentState.currentState as BotState) {
      // ===== INITIAL STATE =====
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

      // ===== ONBOARDING FLOW =====
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
        
        // Setting default role to "Owner" and continuing to email collection
        newState.context.contactRole = "Owner";
        
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
            restaurantRef: currentState.restaurantRef,
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
        
        // Check if payment is required
        if ((BOT_CONFIG.showPaymentLink)) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(BOT_MESSAGES.onboarding.registrationComplete, {
                contactName: newState.context.contactName,
                restaurantName: newState.context.restaurantName,
                paymentLink: BOT_CONFIG.paymentLink || defaultPaymentLink
              })
            }
          });
          newState.currentState = "WAITING_FOR_PAYMENT";
        } else {
          // No payment needed, proceed to supplier setup
          newState.currentState = "SETUP_SUPPLIERS_START";
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.suppliers.startSetup
            }
          });
        }
        break;

      case "WAITING_FOR_PAYMENT":
        const isFreeTrial = message.body?.trim().toLowerCase() === BOT_CONFIG.skipPaymentCoupon;
        const isFree = !BOT_CONFIG.showPaymentLink;
        
        if (isFree || isFreeTrial) {
          // Free trial or no payment required
          console.log(`[BotEngine] Payment skipped: ${isFreeTrial ? 'free trial code used' : 'payment not required'}`);
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.suppliers.startSetup
            }
          });
          newState.currentState = "SETUP_SUPPLIERS_START";
        } else {
          // User is trying to skip payment without valid coupon
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(BOT_MESSAGES.general.waitingForPayment, {
                paymentLink: BOT_CONFIG.paymentLink || defaultPaymentLink
              })
            }
          });
          // Stay in same state
        }
        break;

      // ===== SUPPLIER SETUP FLOW =====
      case "SETUP_SUPPLIERS_START":
        // Initialize supplier setup process
        newState.context.currentCategoryIndex = 0;
        const firstCategory = BOT_CONFIG.supplierCategories[0];
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.suppliers.nextCategory, {
              categoryName: formatCategoryName(firstCategory),
              categoryEmoji: formatCategoryEmoji(firstCategory)
            })
          }
        });
        // Instead of going directly to SUPPLIER_NAME, go to SUPPLIER_CATEGORY first
        newState.currentState = "SUPPLIER_CATEGORY";
        newState.context.currentSupplier = {
          category: firstCategory
        };
        break;
        
      case "SUPPLIER_CATEGORY":
        // Handle supplier category selection
        // Since we already set the category in SETUP_SUPPLIERS_START, we can move directly to supplier name
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.suppliers.askSupplierName
          }
        });
        newState.currentState = "SUPPLIER_NAME";
        break;

      case "SUPPLIER_NAME":
        // Skip this category if requested
        if (message.body?.trim().toLowerCase() === "דלג") {
          const nextCategoryResult = moveToNextCategory(newState, actions, currentState.restaurantRef, message.from);
          return nextCategoryResult;
        }
        
        if (!message.body || message.body.trim().length < 2) {
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
        
        // Store supplier name in context
        if (!newState.context.currentSupplier) {
          newState.context.currentSupplier = {};
        }
        newState.context.currentSupplier.name = message.body.trim();
        console.log(`[BotEngine] Stored supplier name: ${newState.context.currentSupplier.name}`);
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.suppliers.askSupplierWhatsapp
          }
        });
        newState.currentState = "SUPPLIER_WHATSAPP";
        break;
      
      case "SUPPLIER_WHATSAPP":
        // Validate WhatsApp number format
        const whatsapp = message.body?.trim() || "";
        const phoneRegex = /^(\+\d{1,3}\s?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
        
        if (!phoneRegex.test(whatsapp)) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.invalidPhone
            }
          });
          // Stay in same state
          break;
        }
        
        // Store supplier WhatsApp in context
        newState.context.currentSupplier.whatsapp = whatsapp;
        console.log(`[BotEngine] Stored supplier WhatsApp: ${newState.context.currentSupplier.whatsapp}`);
        
        // Ask for delivery days
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
        // Move to PRODUCT_NAME instead of SUPPLIER_PRODUCTS
        newState.currentState = "PRODUCT_NAME";
        break;
        
      case "PRODUCT_NAME":
        // Parse product list and start par level collection
        const productLines = message.body?.split('\n').filter(line => line.trim()) || [];
        
        if (productLines.length === 0) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.invalidProductList
            }
          });
          // Stay in same state
          break;
        }
        
        newState.context.currentSupplier.products = productLines.map((line, index) => {
          const emojiMatch = line.match(/^([^\w\s]*)/);
          const emoji = emojiMatch && emojiMatch[0] ? emojiMatch[0] : "📦";
          const name = line.replace(/^[^\w\s]*/, '').trim();
          
          return {
            id: `product_${index}`,
            name: name,
            emoji: emoji,
            unit: "ק\"ג" // Default unit
          };
        });
        
        newState.context.currentProductIndex = 0;
        
        if (newState.context.currentSupplier.products.length > 0) {
          const firstProduct = newState.context.currentSupplier.products[0];
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(BOT_MESSAGES.suppliers.askProductUnit, {
                emoji: firstProduct.emoji,
                productName: firstProduct.name
              })
            }
          });
          newState.currentState = "PRODUCT_UNIT";
        } else {
          // No products entered, move to next category
          const nextCategoryResult = moveToNextCategory(newState, actions, currentState.restaurantRef, message.from);
          return nextCategoryResult;
        }
        break;
      
      case "PRODUCT_UNIT":
        // Validate and store the product unit
        const unit = message.body?.trim() || "";
        
        if (unit.length === 0) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.invalidUnit
            }
          });
          break;
        }
        
        const currentProductIndex = newState.context.currentProductIndex || 0;
        const currentProduct = newState.context.currentSupplier.products[currentProductIndex];
        
        // Store unit
        currentProduct.unit = unit;
        
        // Add the PRODUCT_QTY state between PRODUCT_UNIT and PRODUCT_PAR_MIDWEEK
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.suppliers.askProductQty, {
              emoji: currentProduct.emoji,
              productName: currentProduct.name,
              unit: currentProduct.unit
            })
          }
        });
        newState.currentState = "PRODUCT_QTY";
        break;
        
      case "PRODUCT_QTY":
        // Process quantity info (this would typically be base quantity)
        const qtyInput = message.body?.trim() || "";
        const qtyMatch = qtyInput.match(/^(\d+(?:\.\d+)?)/);
        
        if (!qtyMatch) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.invalidQuantity
            }
          });
          break;
        }
        
        const qtyProductIndex = newState.context.currentProductIndex || 0;
        const qtyProduct = newState.context.currentSupplier.products[qtyProductIndex];
        
        // Store base quantity (could be used for ordering calculation)
        qtyProduct.baseQty = parseFloat(qtyMatch[1]);
        
        // Now ask for par levels - midweek first
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.suppliers.askParLevelMidweek, {
              emoji: qtyProduct.emoji,
              productName: qtyProduct.name
            })
          }
        });
        newState.currentState = "PRODUCT_PAR_MIDWEEK";
        break;

      case "PRODUCT_PAR_MIDWEEK":
        // Parse quantity 
        const midweekInput = message.body?.trim() || "";
        const midweekMatch = midweekInput.match(/^(\d+(?:\.\d+)?)/);
        
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
        
        const productIdx = newState.context.currentProductIndex || 0;
        const product = newState.context.currentSupplier.products[productIdx];
        
        // Store par level midweek
        product.parMidweek = parseFloat(midweekMatch[1]);
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.suppliers.askParLevelWeekend, {
              emoji: product.emoji,
              productName: product.name
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
        const currentProd = newState.context.currentSupplier.products[currentProductIdx];
        
        // Store par level weekend
        currentProd.parWeekend = parseFloat(weekendMatch[1]);
        
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
              body: interpolateMessage(BOT_MESSAGES.suppliers.askProductUnit, {
                emoji: nextProduct.emoji,
                productName: nextProduct.name
              })
            }
          });
          newState.currentState = "PRODUCT_UNIT";
        } else {
          // Finished all products for this supplier
          // Save supplier to database
          actions.push({
            type: "UPDATE_SUPPLIER",
            payload: {
              restaurantId: currentState.restaurantRef,
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
          const nextCategoryResult = moveToNextCategory(newState, actions, currentState.restaurantRef, message.from);
          return nextCategoryResult;
        }
        break;

      // ===== INVENTORY SNAPSHOT FLOW =====
      case "INVENTORY_SNAPSHOT_START":
        // Initialize inventory snapshot process
        newState.context.currentCategoryIndex = 0;
        newState.context.snapshotSuppliers = [];
        
        // Get suppliers for first category
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.inventory.startSnapshot
          }
        });
        newState.currentState = "INVENTORY_SNAPSHOT_CATEGORY";
        break;

      case "INVENTORY_SNAPSHOT_CATEGORY":
        // Either select a category number or say "סיום" to finish
        if (message.body?.trim().toLowerCase() === "סיום") {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.snapshotComplete
            }
          });
          newState.currentState = "IDLE";
          break;
        }
        
        const categoryIndex = parseInt(message.body?.trim() || "") - 1;
        
        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= BOT_CONFIG.supplierCategories.length) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.invalidCategory
            }
          });
          break;
        }
        
        const selectedCategory = BOT_CONFIG.supplierCategories[categoryIndex];
        newState.context.currentCategory = selectedCategory;
        
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: interpolateMessage(BOT_MESSAGES.inventory.categorySelected, {
              categoryName: formatCategoryName(selectedCategory),
              categoryEmoji: formatCategoryEmoji(selectedCategory)
            })
          }
        });
        newState.currentState = "INVENTORY_SNAPSHOT_PRODUCT";
        
        // Initialize product list for this snapshot
        newState.context.currentProducts = [];
        newState.context.currentProductIndex = 0;
        
        // Assume we have a helper function to get next product
        const firstProduct = getNextProductForInventory(newState);
        
        if (firstProduct) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(BOT_MESSAGES.inventory.askCurrentStock, {
                emoji: firstProduct.emoji,
                productName: firstProduct.name
              })
            }
          });
        } else {
          // No products for this category
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.noCategoryProducts
            }
          });
          newState.currentState = "INVENTORY_SNAPSHOT_CATEGORY";
        }
        break;

      case "INVENTORY_SNAPSHOT_PRODUCT":
        if (message.body?.trim().toLowerCase() === "סיום") {
          // Calculate and show snapshot summary
          newState.currentState = "INVENTORY_SNAPSHOT_QTY";
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.askSnapshotQty
            }
          });
          break;
        }
        
        const stockQty = parseFloat(message.body?.trim() || "");
        
        if (isNaN(stockQty) || stockQty < 0) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.invalidQuantity
            }
          });
          break;
        }
        
        const currentProdId = newState.context.currentProductIndex || 0;
        const currentStockProduct = getCurrentProductForInventory(newState);
        
        if (currentStockProduct) {
          // Add product with quantity to the list
          newState.context.currentProducts.push({
            productId: currentStockProduct.id,
            currentQty: stockQty
          });
          
          // Get next product
          newState.context.currentProductIndex = (currentProdId + 1);
          const nextInventoryProduct = getNextProductForInventory(newState);
          
          if (nextInventoryProduct) {
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: interpolateMessage(BOT_MESSAGES.inventory.askCurrentStock, {
                  emoji: nextInventoryProduct.emoji,
                  productName: nextInventoryProduct.name
                })
              }
            });
          } else {
            // No more products, move to INVENTORY_SNAPSHOT_QTY
            newState.currentState = "INVENTORY_SNAPSHOT_QTY";
            
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: BOT_MESSAGES.inventory.askSnapshotQty
              }
            });
          }
        }
        break;

      case "INVENTORY_SNAPSHOT_QTY":
        // Process final quantity confirmation
        if (message.body?.trim().toLowerCase() === "כן") {
          newState.currentState = "INVENTORY_CALCULATE_SNAPSHOT";
            
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.calculatingSnapshot
            }
          });
          
          // Save snapshot to database
          actions.push({
            type: "CREATE_INVENTORY_SNAPSHOT",
            payload: {
              restaurantRef: currentState.restaurantRef,
              supplierId: newState.context.currentSupplier?.whatsapp || "",
              lines: newState.context.currentProducts
            }
          });
        } else {
          // User wants to revise quantities
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.reviseSnapshot
            }
          });
          newState.currentState = "INVENTORY_SNAPSHOT_CATEGORY";
        }
        break;
        
      case "INVENTORY_CALCULATE_SNAPSHOT":
        // Show snapshot results
        actions.push({
          type: "SEND_MESSAGE",
          payload: {
            to: message.from,
            body: BOT_MESSAGES.inventory.snapshotResults
          }
        });
        
        // Proceed to generate order if needed
        if (shouldGenerateOrder(newState)) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.proceedToOrder
            }
          });
          newState.currentState = "ORDER_START";
        } else {
          // No order needed
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.noOrderNeeded
            }
          });
          newState.currentState = "IDLE";
        }
        break;

      // ===== ORDER FLOW =====
      case "ORDER_START":
        // Generate order from inventory snapshot
        if (message.body?.trim().toLowerCase() === "כן") {
          // User confirmed order generation
          const orderItems = generateOrderFromSnapshot(newState);
          
          newState.context.currentOrder = {
            items: orderItems,
            supplierId: newState.context.currentSupplier?.whatsapp || "",
            status: "pending",
            midweek: isMidweek(new Date())
          };
          
          // Format order items for display
          const orderSummary = formatOrderSummary(orderItems);
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(BOT_MESSAGES.inventory.orderSummary, {
                supplierName: newState.context.currentSupplier?.name || "",
                orderItems: orderSummary
              })
            }
          });
          newState.currentState = "ORDER_CONFIRMATION";
        } else {
          // User rejected order generation
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.orderCancelled
            }
          });
          newState.currentState = "IDLE";
        }
        break;

      case "ORDER_CONFIRMATION":
        if (message.body?.trim().toLowerCase() === "כן") {
          // User confirmed sending the order
          actions.push({
            type: "SEND_ORDER",
            payload: {
              restaurantRef: currentState.restaurantRef,
              supplierId: newState.context.currentOrder.supplierId,
              items: newState.context.currentOrder.items,
              midweek: newState.context.currentOrder.midweek
            }
          });
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(BOT_MESSAGES.inventory.orderSent, {
                supplierName: newState.context.currentSupplier?.name || ""
              })
            }
          });
          newState.currentState = "IDLE";
        } else {
          // User rejected sending the order
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.orderCancelled
            }
          });
          newState.currentState = "IDLE";
        }
        break;

      // ===== DELIVERY FLOW =====
      case "DELIVERY_START":
        if (message.body?.trim().toLowerCase() === "התחל בדיקה") {
          // Start delivery check process
          newState.context.currentItemIndex = 0;
          
          const firstDeliveryItem = getNextDeliveryItem(newState);
          
          if (firstDeliveryItem) {
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: interpolateMessage(BOT_MESSAGES.delivery.checkItem, {
                  expectedAmount: firstDeliveryItem.qty.toString(),
                  emoji: firstDeliveryItem.emoji || "📦",
                  productName: firstDeliveryItem.name
                })
              }
            });
            newState.currentState = "DELIVERY_CHECK_ITEM";
          } else {
            // No items to check
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: BOT_MESSAGES.delivery.noItems
              }
            });
            newState.currentState = "IDLE";
          }
        } else {
          // Invalid response
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.delivery.deliveryNotification
            }
          });
          // Stay in same state
        }
        break;

      case "DELIVERY_CHECK_ITEM":
        const response = message.body?.trim().toLowerCase() || "";
        
        if (response === "כן") {
          // Item received in full
          const currentDeliveryItem = getCurrentDeliveryItem(newState);
          
          if (currentDeliveryItem) {
            // Mark item as received
            if (!newState.context.deliveryResults) {
              newState.context.deliveryResults = [];
            }
            
            newState.context.deliveryResults.push({
              productId: currentDeliveryItem.id,
              expected: currentDeliveryItem.qty,
              received: currentDeliveryItem.qty,
              isShortage: false
            });
            
            // Move to next item
            newState.context.currentItemIndex = (newState.context.currentItemIndex || 0) + 1;
            const nextDeliveryItem = getNextDeliveryItem(newState);
            
            if (nextDeliveryItem) {
              actions.push({
                type: "SEND_MESSAGE",
                payload: {
                  to: message.from,
                  body: interpolateMessage(BOT_MESSAGES.delivery.checkItem, {
                    expectedAmount: nextDeliveryItem.qty.toString(),
                    emoji: nextDeliveryItem.emoji || "📦",
                    productName: nextDeliveryItem.name
                  })
                }
              });
            } else {
              // All items checked
              actions.push({
                type: "SEND_MESSAGE",
                payload: {
                  to: message.from,
                  body: BOT_MESSAGES.delivery.askInvoicePhoto
                }
              });
              newState.currentState = "DELIVERY_INVOICE_PHOTO";
            }
          }
        } else if (response === "לא") {
          // Item has shortage
          const currentDeliveryItem = getCurrentDeliveryItem(newState);
          
          if (currentDeliveryItem) {
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: interpolateMessage(BOT_MESSAGES.delivery.askReceivedAmount, {
                  emoji: currentDeliveryItem.emoji || "📦",
                  productName: currentDeliveryItem.name
                })
              }
            });
            newState.currentState = "DELIVERY_RECEIVED_AMOUNT";
          }
        } else {
          // Invalid response
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.invalidYesNo
            }
          });
          // Stay in same state
        }
        break;

      case "DELIVERY_RECEIVED_AMOUNT":
        const receivedAmount = parseFloat(message.body?.trim() || "");
        
        if (isNaN(receivedAmount) || receivedAmount < 0) {
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.invalidQuantity
            }
          });
          break;
        }
        
        const currentShortageItem = getCurrentDeliveryItem(newState);
        
        if (currentShortageItem) {
          // Record shortage
          if (!newState.context.deliveryResults) {
            newState.context.deliveryResults = [];
          }
          
          newState.context.deliveryResults.push({
            productId: currentShortageItem.id,
            expected: currentShortageItem.qty,
            received: receivedAmount,
            isShortage: receivedAmount < currentShortageItem.qty
          });
          
          // Move to next item
          newState.context.currentItemIndex = (newState.context.currentItemIndex || 0) + 1;
          const nextDeliveryItem = getNextDeliveryItem(newState);
          
          if (nextDeliveryItem) {
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: interpolateMessage(BOT_MESSAGES.delivery.checkItem, {
                  expectedAmount: nextDeliveryItem.qty.toString(),
                  emoji: nextDeliveryItem.emoji || "📦",
                  productName: nextDeliveryItem.name
                })
              }
            });
            newState.currentState = "DELIVERY_CHECK_ITEM";
          } else {
            // All items checked
            actions.push({
              type: "SEND_MESSAGE",
              payload: {
                to: message.from,
                body: BOT_MESSAGES.delivery.askInvoicePhoto
              }
            });
            newState.currentState = "DELIVERY_INVOICE_PHOTO";
          }
        }
        break;

      case "DELIVERY_INVOICE_PHOTO":
        if (message.mediaUrl) {
          // Received invoice photo
          actions.push({
            type: "LOG_DELIVERY",
            payload: {
              restaurantRef: currentState.restaurantRef,
              orderId: newState.context.currentOrder?.id || "",
              shortages: generateShortages(newState.context.deliveryResults),
              invoiceUrl: message.mediaUrl
            }
          });
          
          // Generate delivery summary
          const deliverySummary = formatDeliverySummary(newState.context.deliveryResults);
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: interpolateMessage(BOT_MESSAGES.delivery.deliveryComplete, {
                deliverySummary
              })
            }
          });
          newState.currentState = "IDLE";
        } else {
          // No photo received
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.validation.noPhotoAttached
            }
          });
          // Stay in same state
        }
        break;

      // ===== IDLE STATE =====
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
        } else if (command.includes("מלאי")) {
          // Start inventory snapshot process
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.inventory.startSnapshot
            }
          });
          newState.currentState = "INVENTORY_SNAPSHOT_CATEGORY";
        } else if (command.includes("ספק")) {
          // Add new supplier
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: BOT_MESSAGES.suppliers.addNewSupplier
            }
          });
          
          // Show available categories
          let categoryList = "";
          BOT_CONFIG.supplierCategories.forEach((category, index) => {
            categoryList += `${index + 1}. ${formatCategoryEmoji(category)} ${formatCategoryName(category)}\n`;
          });
          
          actions.push({
            type: "SEND_MESSAGE",
            payload: {
              to: message.from,
              body: categoryList
            }
          });
          newState.currentState = "SUPPLIER_CATEGORY";
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
  } catch (error) {
    console.error("[BotEngine] Error in state machine:", error);
    
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
  }

  console.log(`[BotEngine] State transition: ${currentState.currentState} -> ${newState.currentState}`, {
    actionsCount: actions.length,
    contextKeys: Object.keys(newState.context),
  });

  return { newState, actions };
}

/**
 * Helper function to move to the next supplier category
 */
function moveToNextCategory(
  newState: ConversationState, 
  actions: BotAction[], 
  restaurantRef: DocumentReference, 
  phoneNumber: string
): StateTransition {
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
    const nextCategory = BOT_CONFIG.supplierCategories[nextIndex];
    
    // Reset supplier for next category
    newState.context.currentSupplier = {
      category: nextCategory
    };
    newState.context.currentProductIndex = undefined;
    
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
    newState.currentState = "SUPPLIER_NAME";
  }
  
  return { newState, actions };
}

/**
 * Helper function to get current product for inventory
 */
function getCurrentProductForInventory(state: ConversationState): any {
  const index = state.context.currentProductIndex || 0;
  const products = state.context.currentCategoryProducts || [];
  
  if (index < products.length) {
    return products[index];
  }
  return null;
}

/**
 * Helper function to get next product for inventory
 */
function getNextProductForInventory(state: ConversationState): any {
  const index = state.context.currentProductIndex || 0;
  const products = state.context.currentCategoryProducts || [];
  
  if (index < products.length) {
    return products[index];
  }
  return null;
}

/**
 * Helper function to check if order should be generated
 */
function shouldGenerateOrder(state: ConversationState): boolean {
  // Mock implementation - would normally check inventory levels
  return true; 
}

/**
 * Helper function to generate order from snapshot
 */
function generateOrderFromSnapshot(state: ConversationState): any[] {
  // Mock implementation
  return state.context.currentProducts?.map((product: any) => ({
    productId: product.productId,
    qty: 10 // Would calculate based on par levels and current stock
  })) || [];
}

/**
 * Helper function to format order summary
 */
function formatOrderSummary(items: any[]): string {
  // Mock implementation
  return items.map((item, index) => 
    `${index + 1}. ${item.productName || 'מוצר'}: ${item.qty}`
  ).join('\n');
}

/**
 * Helper function to check if it's midweek
 */
function isMidweek(date: Date): boolean {
  // Sunday(0) to Wednesday(3) are considered midweek
  const day = date.getDay();
  return day >= 0 && day <= 3;
}

/**
 * Helper function to get next delivery item
 */
function getNextDeliveryItem(state: ConversationState): any {
  const index = state.context.currentItemIndex || 0;
  const items = state.context.deliveryItems || [];
  
  if (index < items.length) {
    return items[index];
  }
  return null;
}

/**
 * Helper function to get current delivery item
 */
function getCurrentDeliveryItem(state: ConversationState): any {
  const index = state.context.currentItemIndex || 0;
  const items = state.context.deliveryItems || [];
  
  if (index < items.length) {
    return items[index];
  }
  return null;
}

/**
 * Helper function to generate shortages from delivery results
 */
function generateShortages(deliveryResults: any[] = []): any[] {
  return deliveryResults
    .filter(item => item.isShortage)
    .map(item => ({
      productId: item.productId,
      qty: item.expected,
      received: item.received
    }));
}

/**
 * Helper function to format delivery summary
 */
function formatDeliverySummary(deliveryResults: any[] = []): string {
  const shortages = deliveryResults.filter(item => item.isShortage);
  
  if (shortages.length === 0) {
    return "כל הפריטים התקבלו במלואם ✅";
  }
  
  return shortages.map((item, index) => 
    `${index + 1}. ❌ ${item.productName || 'מוצר'}: התקבל ${item.received} מתוך ${item.expected}`
  ).join('\n');
}
