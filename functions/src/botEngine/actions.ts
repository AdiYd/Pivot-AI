import { BotAction } from '../types';
import { sendWhatsAppMessage } from '../utils/twilio';
import { createRestaurant, updateSupplier } from '../utils/firestore';

export async function processActions(actions: BotAction[]): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "SEND_MESSAGE":
          await sendWhatsAppMessage(action.payload.to, action.payload.message);
          break;
        
        case "CREATE_RESTAURANT":
          await createRestaurant(action.payload);
          break;
        
        case "UPDATE_SUPPLIER":
          await updateSupplier(action.payload);
          break;
        
        case "UPDATE_PRODUCT":
          // TODO: Implement product updates
          console.log("Update product action:", action.payload);
          break;
        
        default:
          console.warn("Unknown action type:", action.type);
      }
    } catch (error) {
      console.error(`Error processing action ${action.type}:`, error);
    }
  }
}
