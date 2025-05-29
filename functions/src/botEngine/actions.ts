import { z } from 'zod';
import { BotAction } from '../types';
import { sendWhatsAppMessage } from '../utils/twilio';
import { createRestaurant, updateSupplier } from '../utils/firestore';

// Zod schemas for payload validation
const SendMessagePayloadSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1)
});

const CreateRestaurantPayloadSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(2),
  contactName: z.string().min(2),
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

export async function processActions(actions: BotAction[]): Promise<void> {
  console.log(`[BotActions] Processing ${actions.length} bot actions`);

  for (const action of actions) {
    try {
      console.log(`[BotActions] Executing action: ${action.type}`, {
        payloadKeys: Object.keys(action.payload || {})
      });

      switch (action.type) {
        case "SEND_MESSAGE":
          try {
            const validPayload = SendMessagePayloadSchema.parse(action.payload);
            await sendWhatsAppMessage(validPayload.to, validPayload.body);
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

        default:
          console.warn(`[BotActions] Unknown action type: ${(action as any).type}`);
      }

      console.log(`[BotActions] ✅ Action ${action.type} completed successfully`);
    } catch (error) {
      console.error(`[BotActions] ❌ Error executing action ${action.type}:`, {
        error: error instanceof Error ? error.message : error,
        payload: action.payload
      });
      
      // For critical errors, try to send an error message to the user
      if (action.type !== "SEND_MESSAGE" && action.payload?.to) {
        try {
          await sendWhatsAppMessage(
            action.payload.to,
            "⚠️ Something went wrong. Please try again or contact support."
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
