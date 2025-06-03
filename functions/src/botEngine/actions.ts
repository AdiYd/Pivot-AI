import { z } from 'zod';
import { BotAction } from '../schema/types';
import { sendWhatsAppMessage } from '../utils/twilio';
import { createRestaurant, updateSupplier, logMessage, updateProduct } from '../utils/firestore';

// Zod schemas for payload validation
const SendMessagePayloadSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1).optional(),
  template: z.object({
    id: z.string(),
    type: z.string(),
    body: z.string(),
    options: z.any(),
    header: z.any().optional(),
  }).optional(),
});

// Updated schema to match the extended restaurant data structure
const CreateRestaurantPayloadSchema = z.object({
  restaurantId: z.string().min(1),
  companyName: z.string().min(2),
  legalId: z.string().regex(/^\d{9}$/),
  name: z.string().min(2),
  yearsActive: z.number().min(0).max(100),
  contactName: z.string().min(2),
  contactRole: z.string(),
  contactEmail: z.string().optional(),
  paymentMethod: z.string(),
  phone: z.string().min(10)
});

// Updated schema to match the Supplier interface
const UpdateSupplierPayloadSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(2),
  whatsapp: z.string().min(10),
  role: z.enum(["Supplier"]).default("Supplier"),
  deliveryDays: z.array(z.number().min(0).max(6)),
  cutoffHour: z.number().min(0).max(23),
  category: z.union([z.array(z.string()), z.string()]).transform(val => 
    Array.isArray(val) ? val : [val]
  ),
  rating: z.number().min(1).max(5).optional(),
});

// Add schema for product updates
const UpdateProductPayloadSchema = z.object({
  restaurantId: z.string().min(1),
  supplierId: z.string().min(10),
  id: z.string().optional(),
  name: z.string().min(2),
  category: z.string().default("general"),
  emoji: z.string().optional().default("📦"),
  unit: z.string(),
  parMidweek: z.number().min(0).default(0),
  parWeekend: z.number().min(0).default(0)
});

/**
 * Process all bot actions sequentially
 * Each action is executed and logged appropriately
 * @param actions Array of bot actions to execute
 * @param phone Phone number for logging context
 * @param isSimulator Whether to use simulator mode (don't send real WhatsApp messages)
 * @returns Array of message responses (only used in simulator mode)
 */
export async function processActions(
  actions: BotAction[],
  phone?: string,
  isSimulator: boolean = false
): Promise<Record<string, any>[]> {
  console.log(`[BotActions] Processing ${actions.length} bot actions for phone: ${phone} ${isSimulator ? '(simulator)' : ''}`);
  
  // For simulator mode, collect responses instead of sending them
  const responses: Record<string, any>[] = [];

  for (const action of actions) {
    try {
      console.log(`[BotActions] Executing action: ${action.type}`, {
        payloadKeys: Object.keys(action.payload || {}),
        phone,
        isSimulator
      });

      switch (action.type) {
        case "SEND_MESSAGE":
          try {
            const validPayload = SendMessagePayloadSchema.parse(action.payload);
            
            // In simulator mode, collect the message but don't send it
            if (isSimulator) {
              responses.push(validPayload);
              console.log(`[BotActions] 📱 Simulator message: ${validPayload.body?.substring(0, 50)}...`);
            } else {
              // Real Twilio messages for production
              await sendWhatsAppMessage(validPayload.to, validPayload.body || '');
            }
            
            // Log outgoing message
            if (phone) {
              const phoneNumber = phone.replace("whatsapp:", "");
              await logMessage(phoneNumber, validPayload.body || '', 'outgoing', undefined, isSimulator);
            }
          } catch (validationError) {
            if (validationError instanceof z.ZodError) {
              throw new Error(`Invalid SEND_MESSAGE payload: ${validationError.errors.map(e => e.message).join(', ')}`);
            }
            throw validationError;
          }
          break;

        case "CREATE_RESTAURANT":
          try {
            const validPayload = CreateRestaurantPayloadSchema.parse(action.payload);
            await createRestaurant(validPayload, isSimulator);
          } catch (validationError) {
            if (validationError instanceof z.ZodError) {
              console.error(`[BotActions] ❌ Invalid CREATE_RESTAURANT payload:`, validationError.errors);
              throw new Error(`Invalid CREATE_RESTAURANT payload: ${validationError.errors.map(e => e.message).join(', ')}`);
            }
            throw validationError;
          }
          break;

        case "UPDATE_SUPPLIER":
          try {
            const validPayload = UpdateSupplierPayloadSchema.parse(action.payload);
            await updateSupplier(validPayload, isSimulator);
          } catch (validationError) {
            if (validationError instanceof z.ZodError) {
              throw new Error(`Invalid UPDATE_SUPPLIER payload: ${validationError.errors.map(e => e.message).join(', ')}`);
            }
            throw validationError;
          }
          break;

        case "UPDATE_PRODUCT":
          try {
            const validPayload = UpdateProductPayloadSchema.parse(action.payload);
            
            // Extract restaurantId and supplierId from the payload
            const { restaurantId, supplierId, ...productData } = validPayload;
            
            // Call the Firestore utility to update/create the product
            await updateProduct(restaurantId, supplierId, productData);
          } catch (validationError) {
            if (validationError instanceof z.ZodError) {
              throw new Error(`Invalid UPDATE_PRODUCT payload: ${validationError.errors.map(e => e.message).join(', ')}`);
            }
            throw validationError;
          }
          break;

        case "SEND_ORDER":
          // TODO: Implement order sending logic with Zod validation and simulator support
          console.log(`[BotActions] SEND_ORDER action ${isSimulator ? '(simulator)' : ''} not yet implemented`, action.payload);
          break;

        case "LOG_DELIVERY":
          // TODO: Implement delivery logging logic with Zod validation and simulator support
          console.log(`[BotActions] LOG_DELIVERY action ${isSimulator ? '(simulator)' : ''} not yet implemented`, action.payload);
          break;

        default:
          console.warn(`[BotActions] Unknown action type: ${(action as any).type}`);
      }

      console.log(`[BotActions] ✅ Action ${action.type} completed successfully`);
    } catch (error) {
      console.error(`[BotActions] ❌ Error executing action ${action.type}:`, {
        error: error instanceof Error ? error.message : error,
        payload: action.payload,
        phone,
        isSimulator
      });
      
      // For critical errors, try to send an error message to the user
      const errorMessage = "⚠️ משהו השתבש בעת עיבוד הבקשה שלך. אנא נסה שוב מאוחר יותר או צור קשר עם התמיכה.";
      
      if (action.type !== "SEND_MESSAGE" && phone) {
        if (isSimulator) {
          // For simulator, add error message to responses
          responses.push({ body: errorMessage , to: phone });
        } else {
          // For real WhatsApp, send the message via Twilio
          try {
            await sendWhatsAppMessage(phone, errorMessage);
          } catch (notificationError) {
            console.error("[BotActions] Failed to send error notification:", notificationError);
          }
        }
      }
      
      // Continue with other actions even if one fails
    }
  }

  console.log(`[BotActions] Finished processing ${actions.length} actions`);
  return responses;
}
