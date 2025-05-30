import { z } from 'zod';
import { BotAction } from '../schema/types';
import { sendWhatsAppMessage } from '../utils/twilio';
import { createRestaurant, updateSupplier, logMessage } from '../utils/firestore';

// Zod schemas for payload validation
const SendMessagePayloadSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1)
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

const UpdateSupplierPayloadSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(2),
  whatsapp: z.string().min(10),
  deliveryDays: z.array(z.number().min(0).max(6)),
  cutoffHour: z.number().min(0).max(23),
  category: z.string().optional().default("general")
});

/**
 * Process all bot actions sequentially
 * Each action is executed and logged appropriately
 * @param actions Array of bot actions to execute
 * @param phone Phone number for logging context
 */
export async function processActions(actions: BotAction[], phone?: string): Promise<void> {
  console.log(`[BotActions] Processing ${actions.length} bot actions for phone: ${phone}`);

  for (const action of actions) {
    try {
      console.log(`[BotActions] Executing action: ${action.type}`, {
        payloadKeys: Object.keys(action.payload || {}),
        phone
      });

      switch (action.type) {
        case "SEND_MESSAGE":
          try {
            const validPayload = SendMessagePayloadSchema.parse(action.payload);
            await sendWhatsAppMessage(validPayload.to, validPayload.body);
            
            // Log outgoing message
            if (phone) {
              const phoneNumber = phone.replace("whatsapp:", "");
              await logMessage(phoneNumber, validPayload.body, 'outgoing');
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
            await createRestaurant(validPayload);
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
            await updateSupplier(validPayload);
          } catch (validationError) {
            if (validationError instanceof z.ZodError) {
              throw new Error(`Invalid UPDATE_SUPPLIER payload: ${validationError.errors.map(e => e.message).join(', ')}`);
            }
            throw validationError;
          }
          break;

        case "UPDATE_PRODUCT":
          // TODO: Implement product update logic with Zod validation
          console.log("[BotActions] UPDATE_PRODUCT action not yet implemented", action.payload);
          break;

        case "SEND_ORDER":
          // TODO: Implement order sending logic with Zod validation
          console.log("[BotActions] SEND_ORDER action not yet implemented", action.payload);
          break;

        case "LOG_DELIVERY":
          // TODO: Implement delivery logging logic with Zod validation
          console.log("[BotActions] LOG_DELIVERY action not yet implemented", action.payload);
          break;

        default:
          console.warn(`[BotActions] Unknown action type: ${(action as any).type}`);
      }

      console.log(`[BotActions] ✅ Action ${action.type} completed successfully`);
    } catch (error) {
      console.error(`[BotActions] ❌ Error executing action ${action.type}:`, {
        error: error instanceof Error ? error.message : error,
        payload: action.payload,
        phone
      });
      
      // For critical errors, try to send an error message to the user
      if (action.type !== "SEND_MESSAGE" && phone) {
        try {
          await sendWhatsAppMessage(
            phone,
            "⚠️ משהו השתבש בעת עיבוד הבקשה שלך. אנא נסה שוב מאוחר יותר או צור קשר עם התמיכה."
          );
        } catch (notificationError) {
          console.error("[BotActions] Failed to send error notification:", notificationError);
        }
      }
      
      // Continue with other actions even if one fails
    }
  }

  console.log(`[BotActions] Finished processing ${actions.length} actions`);
}
