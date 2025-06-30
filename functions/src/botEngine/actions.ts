import { z } from 'zod';
import { BotAction, Contact } from '../schema/types';
import { sendWhatsAppMessage } from '../utils/twilio';
import { createRestaurant, updateSupplier, logMessage } from '../utils/firestore';
import { MessageSchema, restaurantLegalIdSchema, RestaurantSchema, SupplierSchema } from '../schema/schemas';

// Zod schemas for payload validation
const SendMessagePayloadSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1).optional(),
  template: z.object({
    id: z.string(),
    sid: z.string().optional(),
    type: z.string(),
    body: z.string(),
    options: z.any(),
    header: z.any().optional(),
  }).optional(),
});


/**
 * Process all bot actions sequentially
 * Each action is executed and logged appropriately
 * @param phone Phone number for logging context
 * @param actions Array of bot actions to execute
 * @param isSimulator Whether to use simulator mode (don't send real WhatsApp messages)
 * @returns Array of message responses (only used in simulator mode)
 */
export async function processActions(
  phone: Contact['whatsapp'],
  actions: BotAction[],
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
              console.log(`[BotActions] 📱 Simulator message: ${validPayload.body?.substring(0, 50) || validPayload.template?.body?.substring(0, 50) || ''}...`);
            } else {
               // Extract context variables from the message for template processing
              const context = action.payload?.context || {};
              
              if (validPayload.template) {
                // For template messages
                await sendWhatsAppMessage(
                  validPayload.to, 
                  '', 
                  validPayload.template,
                  context
                );
              } else {
                // For regular text messages
                await sendWhatsAppMessage(validPayload.to, validPayload.body || '');
              }
            }
            
            // Log outgoing message
            if (phone) {
              const message = MessageSchema.parse({
                role: "assistant",
                body: validPayload.body || validPayload.template?.body || '',
                ...(!!validPayload.template && 
                  {
                    templateId: validPayload.template?.id,
                    hasTemplate: !!validPayload.template
                  }),
                messageState: action.payload?.messageState
              });
              const phoneNumber = phone.replace("whatsapp:", "") as Contact['whatsapp'];
              await logMessage(phoneNumber, message, isSimulator);
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
            const validPayload = RestaurantSchema.parse(action.payload);
            await createRestaurant(validPayload, isSimulator);
          } catch (validationError) {
            if (validationError instanceof z.ZodError) {
              console.error(`[BotActions] ❌ Invalid CREATE_RESTAURANT payload:`, validationError.errors);
              throw new Error(`Invalid CREATE_RESTAURANT payload: ${validationError.errors.map(e => e.message).join(', ')}`);
            }
            throw validationError;
          }
          break;

        case "CREATE_SUPPLIER":
          try {
            const validPayload = SupplierSchema.extend({
              restaurantId: restaurantLegalIdSchema,
            }).parse(action.payload);
            await updateSupplier(validPayload, isSimulator);
          } catch (validationError) {
            if (validationError instanceof z.ZodError) {
              console.error(`[BotActions] ❌ Invalid CREATE_SUPPLIER payload:`, validationError.errors);
              throw new Error(`Invalid CREATE_SUPPLIER payload: ${validationError.errors.map(e => e.message).join(', ')}`);
            }
            throw validationError;
          }
          break;

        case "UPDATE_SUPPLIER":
          try {
            const validPayload = SupplierSchema.extend({
              restaurantId: z.string().min(1, "Restaurant ID is required"),
            }).parse(action.payload);
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
            // const validPayload = ProductSchema.parse(action.payload);
            

            
            // Call the Firestore utility to update/create the product
            // await updateProduct(action.payload.restaurantId, action.payload.supplierId, validPayload);
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
      
      if (phone) {
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
