import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';

import { conversationStateReducer, processActions } from "./botEngine";
import { Conversation, IncomingMessage, Message, Order, Restaurant } from "./schema/types";
import { validateTwilioWebhook, sendWhatsAppMessage, fetchContactFromVCard, normalizePhoneNumber } from "./utils/twilio";
import { getCollectionName, getRestaurant } from "./utils/firestore";
import { ConversationSchema } from "./schema/schemas";

// Initialize Firebase Admin only if not already initialized
if (!admin.apps?.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();


// API Key for admin simulator authentication
const ADMIN_API_KEY = process.env.ADMIN_SIMULATOR_API_KEY || 'simulator-lz123';

// Process incoming WhatsApp messages from Twilio
/**
 * Main WhatsApp webhook handler
 * Processes incoming messages from Twilio and manages conversation flow
 * Also handles simulator requests from admin app
 */
exports.whatsappWebhook = functions.region('europe-central2').https.onRequest(async (req, res) => {
  try {
    // Set CORS headers for all requests
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-simulator-api-key');
    // Only process POST requests for actual webhook handling
    
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Check if this is a simulator request from admin app
    const isSimulator = req.headers['x-simulator-api-key'] === ADMIN_API_KEY;
    // For regular Twilio requests, validate the webhook signature
    // Skip validation for simulator requests with valid API key
    if (!isSimulator && !validateTwilioWebhook(req)) {
      console.error("Invalid Twilio signature");
      res.status(403).send("Forbidden");
      return;
    }

    // Extract message details from request body
    // If simulator, use different field names than Twilio's
    const from = isSimulator ? 
      req.body.phone : // Admin app format
      req.body.From;  // Twilio format
        // Handle template button/list responses 
    let body = '';
    if (isSimulator) {
      body = req.body.message;
    } else {
      // Check for template button responses
      console.log(`[WhatsApp] Processing Twilio message:`, req.body);
      if (req.body.ButtonText) {
        // This is a button click - use the button ID as the message body
        // Twilio passes button ID in ButtonPayload field
        body = req.body.ButtonPayload || req.body.ButtonText;
        console.log(`[WhatsApp] Button response received - Text: "${req.body.ButtonText}", Payload: "${body}"`);
      } else if (req.body.ListTitle) {
        // This is a list selection - use the list item ID
        // Twilio passes list item ID in ListId field
        body = req.body.ListId || req.body.ListTitle;
        console.log(`[WhatsApp] List selection received - Title: "${req.body.ListTitle}", Payload: "${body}"`);
      } else if (req.body.MessageType === 'contacts' && req.body.MediaUrl0) {
         try {
          console.log(`[WhatsApp] Contact vCard received: ${req.body.MediaUrl0}`);
          
          // Fetch and parse the contact data using our utility function
          const contactData = await fetchContactFromVCard(req.body.MediaUrl0);
          
          // Store structured contact data in the message body
          body = JSON.stringify(contactData);
          
          console.log(`[WhatsApp] Contact data processed: Name=${contactData.name}, Phone=${contactData.phone}`);
        } catch (error) {
          console.error(`[WhatsApp] Error handling contact attachment:`, error);
          body = 'CONTACT_ATTACHMENT_ERROR';
        }
    } else if (req.body.SmsMessageSid) {
        // Regular Twilio WhatsApp message
        body = req.body.Body || '';
      } else {
        // Fallback case (shouldn't normally happen)
        console.warn(`[WhatsApp] Unexpected message format:`, req.body);
        body = req.body.Body || req.body.text || '';
      }
    }
    const mediaUrl = isSimulator ?
      req.body.mediaUrl : // Admin app format
      req.body.MediaUrl0; // Twilio format
    
    if (!from) {
      console.error('Missing From/phone field in request body');
      res.status(400).send('Bad Request: Missing sender phone number');
      return;
    }
    

    // Extract phone number without whatsapp: prefix for document ID
    // For simulator, the phone number should already be in clean format
    const phoneNumber = isSimulator ? from : normalizePhoneNumber(from);
    const conversationsCollection = getCollectionName('conversations', isSimulator);
    const conversationRef = firestore.collection(conversationsCollection).doc(phoneNumber);
    const conversationDoc = await conversationRef.get();
    const restaurantsCollection = getCollectionName('restaurants', isSimulator);
    
    // Lookup restaurant by phone number in contacts array (contacts: [{ whatsapp: string , name: string, role: string }])
    const restaurantRef = await firestore
      .collection(restaurantsCollection)
      .where(`contacts.${phoneNumber}`, '!=', null) // Check if phoneNumber exists in contacts map
      .limit(1)
      .get();
    
    log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] Received message from ${from}: "${body}"`);

    // Create the incoming message object
    const message: IncomingMessage = {
      from: phoneNumber,
      body,
      mediaUrl
    };

    /**
     * Lookup existing conversation state by phone number
     * Phone number is now the document ID for conversations
     */
    let conversation: Conversation;
    let restaurantId = restaurantRef.empty ? null : restaurantRef.docs[0].id;

    // Get existing conversation state by phone number
    if (!conversationDoc.exists) {
      console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] No existing conversation found for phone: ${phoneNumber}`);
      // New conversation - check if restaurant already exists for this phone
      console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] This phone number is associated with ${restaurantRef.size} restaurant(s)`);
      if (restaurantRef.empty) {
        // Completely new user - start onboarding
        conversation = ConversationSchema.parse({
          currentState: "INIT",
          role: "בעלים",
          context: {
            contactNumber: phoneNumber,
            contactRole: "בעלים",
            isManager: true,
            ...(isSimulator && { isSimulator })
          },
        });
      

        console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] New user starting onboarding - phone: ${phoneNumber}, restaurantId: ${restaurantId}`);
      
      } else {
        // Existing restaurant, new conversation
        const restaurantDoc = restaurantRef.docs[0];
        const restaurant = restaurantDoc.data() as Restaurant;
        const contactName = restaurant.contacts[phoneNumber]?.name || "";
        const contactRole = restaurant.contacts[phoneNumber]?.role || "";

        conversation = ConversationSchema.parse({
          currentState: "IDLE",
          role: contactRole || "כללי",
          restaurantId,
          context: {
            legalId: restaurant.legalId,
            restaurantName: restaurant.name,
            contactNumber: phoneNumber,
            isManager: (contactRole === "מנהל" || contactRole === "בעלים"),
            contactRole,
            contactName,
            ...(isSimulator && { isSimulator })
          },
        });


        console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] Existing restaurant, new conversation - phone: ${phoneNumber}, restaurantId: ${restaurantId}`);
      }
      // Create the conversation document and first message with initial state
      const {messages, ...conversationData} = conversation;

      await conversationRef.set(conversationData, { merge: true });
      await conversationRef.collection('messages').add({
        body,
        role: 'user',
        createdAt: FieldValue.serverTimestamp(),
        messageState: 'INIT'
      } as Message);

    } else {
      // Existing conversation - load
      const data = conversationDoc.data() as Conversation;
      await conversationRef.collection('messages').add({
        body,
        role: 'user',
        createdAt: FieldValue.serverTimestamp(),
        messageState: data.currentState || 'INIT', // Use current state or default to INIT
        ...(mediaUrl && { mediaUrl }) // Include mediaUrl if it exists
      });
    
      conversation = ConversationSchema.parse({
        currentState: data.currentState,
        role: data.role || "כללי",
        context: {
          ...data.context,
          contactNumber: phoneNumber,
          ...(isSimulator && { isSimulator })
        }
      });
      const messagesSnapshot = await conversationRef.collection('messages').orderBy('createdAt', 'asc').get();
      const userMessages = messagesSnapshot.docs.map(doc => {
        const messageData = doc.data();
        return {
          body: messageData.body,
          role: messageData.role,
          createdAt: messageData.createdAt?.toDate() || new Date(),
          messageState: messageData.messageState,
          ...(messageData.mediaUrl && { mediaUrl: messageData.mediaUrl }),
          ...(messageData.hasTemplate && { hasTemplate: messageData.hasTemplate, templateId: messageData.templateId })
        };
      }).filter(m => m.messageState === data.currentState);
      conversation.messages = userMessages;
     
      
      // Update the conversation's timestamp
      await conversationRef.update({
        updatedAt: FieldValue.serverTimestamp()
      });
    
    }

    if (restaurantRef.docs.length > 0) {
      // Check the value of 'restaurant.isActivated' - if false, send a message to the user
      const restaurantDoc = restaurantRef.docs[0];
      const restaurant = restaurantDoc.data() as Restaurant;
      if (!restaurant.isActivated) {
        console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] ❗ Restaurant is not activated: ${restaurant.name} (${restaurant.legalId})`);
        const messageBody = `📌 המסעדה: ${restaurant.name} לא פעילה במערכת.

על מנת לאתחל את השירות יש לפנות:
*במייל*: support@pivott.digital

צוות Pivot 😊`;
        const currentState = conversationDoc.data()?.currentState || 'INIT';
        await conversationRef.collection('messages').add({
            body: messageBody,
            role: 'assistant',
            createdAt: FieldValue.serverTimestamp(),
            messageState: currentState,
          });
        if (isSimulator) {
          res.status(200).json({
            success: true,
            responses: {
              to: phoneNumber,
              body: messageBody
            }, // This will contain the messages that would be sent via WhatsApp
            newState: {
              currentState: 'IDLE',
              context:  {}
            }
          });
        } else {
          await sendWhatsAppMessage(phoneNumber, messageBody);
          // For regular Twilio webhook, just send an OK response
          res.status(200).send("OK");
        }
        return;
      }
    }
    /**
     * Process the message through our state machine
     * This determines the next state and actions to take
     */
    const { newState, actions } = await conversationStateReducer(
      conversation,
      message
    );

    console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] State machine result:`, {
      phone: phoneNumber,
      oldState: conversation.currentState,
      newState: newState.currentState,
    });

    /**
     * Save the updated conversation state to Firestore
     * Using phone number as document ID
     */
    restaurantId = restaurantId || newState.context?.restaurantId || newState.context?.legalId || null;
    const firestoreState = {
      currentState: newState.currentState,
      ...(restaurantId ? { restaurantId } : {}),
      updatedAt: FieldValue.serverTimestamp()
    };

    await conversationRef.set(firestoreState, { merge: true })
    .then(() => {
      console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] ✅ Updating context for phone: ${phoneNumber}`);
      conversationRef.update({context: newState.context});
    });
    console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] ✅ Conversation state saved for phone: ${phoneNumber}`);

    /**
     * Execute all actions generated by the state machine
     * For simulator mode, collect responses instead of sending via Twilio
     */
    const responses = await processActions(message.from, actions, isSimulator);

    // If this is a simulator request, return the bot responses directly
    if (isSimulator) {
      res.status(200).json({
        success: true,
        responses: responses, // This will contain the messages that would be sent via WhatsApp
        newState: {
          currentState: newState.currentState,
          context: newState.context || {}
        }
      });
    } else {
      // For regular Twilio webhook, just send an OK response
      res.status(200).send("OK");
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error"
    });
  }
});



/**
 * Send order request notifications to supplier and restaurant
 */
async function sendOrderRequestNotifications(order: Order, restaurant: Restaurant, orderUrl: string) {
  try {
    // 1. Send notification to restaurant owner
    const ownerContact = Object.values(restaurant.contacts)
      .find((contact: any) => contact.role === 'בעלים');
    
    if (ownerContact) {
      const ownerMessage = `שלום ${ownerContact.name},
ההזמנה שלך מ${order.supplier.name} נשלחה לספק. 👇 
*סטטוס:* ממתין לאישור הספק
*מספר הזמנה:* ${order.id}
*לצפייה בהזמנה:* ${orderUrl}`;

      await sendWhatsAppMessage(
        ownerContact.whatsapp,
        ownerMessage
      );

      console.log(`[OrderSync] ✅ Sent order confirmation to restaurant owner: ${ownerContact.whatsapp}`);
    }

    // 2. Send notification to supplier (using template)
    const supplierNumber = order.supplier.whatsapp;

    if (supplierNumber) {
      // Build detailed order message for supplier
      let supplierMessage = `שלום ${order.supplier.name},
התקבלה הזמנה חדשה ממסעדת ${restaurant.name}.

*פרטי ההזמנה*: 👇
מספר הזמנה: ${order.id}
מסעדה: ${restaurant.name}
סטטוס: ממתין לאישור שלך
סיכום מוצרים:
`;
      // Add ordered items
      order.items.forEach((item: any) => {
        supplierMessage += `${item.emoji} ${item.name}: ${item.qty} ${item.unit}\n`;
      });

      supplierMessage += `\nהערות: ${order.restaurantNotes || 'אין'}

לצפייה ועדכון סטטוס ההזמנה: 
${orderUrl}

נא לאשר בהקדם, תודה!`;

      await sendWhatsAppMessage(
        supplierNumber, 
        supplierMessage
      );

      await sendWhatsAppMessage(
        '0547513346', 
`****  ככה הספק יקבל את ההודעה 👇   *****
${supplierMessage}`
      );

      console.log(`[OrderSync] ✅ Sent detailed order to supplier: ${supplierNumber}`);
    }
  } catch (error) {
    console.error("[OrderSync] Error sending confirmation notifications:", error);
    throw error;
  }
}

/**
 * Send order confirmation notifications to supplier and restaurant
 */
async function sendOrderConfirmationNotifications(order: Order, restaurant: Restaurant, orderUrl: string) {
  try {
    // 1. Send notification to restaurant owner
    const ownerContact = Object.values(restaurant.contacts)
      .find((contact: any) => contact.role === 'owner');
    
    if (ownerContact) {
      const ownerMessage = `שלום ${ownerContact.name},
ההזמנה שלך מ${order.supplier.name} אושרה. 
סטטוס: אושר
מספר הזמנה: ${order.id}
לצפייה בהזמנה: ${orderUrl}`;

      await sendWhatsAppMessage(
        ownerContact.whatsapp,
        ownerMessage
      );
      
      console.log(`[OrderSync] ✅ Sent order confirmation to restaurant owner: ${ownerContact.whatsapp}`);
    }
    
    // 2. Send notification to supplier (using template)
    const supplierNumber = order.supplier.whatsapp;
    
    if (supplierNumber) {
      // Build detailed order message for supplier
      let supplierMessage = `שלום ${order.supplier.name},
התקבלה הזמנה חדשה ממסעדת ${restaurant.name}.

פרטי ההזמנה:
מספר הזמנה: ${order.id}
סטטוס: אושר

מוצרים:
`;

      // Add ordered items
      order.items.forEach((item: any) => {
        supplierMessage += `${item.emoji} ${item.name}: ${item.qty} ${item.unit}\n`;
      });
      
      supplierMessage += `\nהערות: ${order.restaurantNotes || 'אין'}

לצפייה ולעדכון ההזמנה: ${orderUrl}

תודה!`;

      await sendWhatsAppMessage(
        supplierNumber, 
        supplierMessage
      );
      
      console.log(`[OrderSync] ✅ Sent detailed order to supplier: ${supplierNumber}`);
    }
  } catch (error) {
    console.error("[OrderSync] Error sending confirmation notifications:", error);
    throw error;
  }
}

/**
 * Send order cancelled notifications
 */
async function sendOrderCancelledNotifications(order: Order, restaurant: Restaurant, orderUrl: string) {
  try {
    const ownerContact = Object.values(restaurant.contacts)
      .find((contact: any) => contact.role === 'owner');
    
    if (ownerContact) {
      const ownerMessage = `שלום ${ownerContact.name},
ההזמנה שלך מ${order.supplier.name} בוטלה.
סטטוס: בוטל
מספר הזמנה: ${order.id}
לצפייה בהזמנה: ${orderUrl}`;

      await sendWhatsAppMessage(
        ownerContact.whatsapp,
        ownerMessage
      );
      
      console.log(`[OrderSync] ✅ Sent cancellation notification to restaurant owner: ${ownerContact.whatsapp}`);
    }
  } catch (error) {
    console.error("[OrderSync] Error sending cancellation notifications:", error);
    throw error;
  }
}

function createOrderHandler(collectionPath: string) {
  return functions.firestore
    .document(`${collectionPath}/{orderId}`)
    .onWrite(async (change, context) => {
      const isSimulator = collectionPath.includes('simulator');
      console.log(`[OrderSync${isSimulator ? '-Simulator' : ''}] Order change detected for ${context.params.orderId}`);
      try {
        const { orderId } = context.params;
        const newValue = change.after.data() as Order;
        const previousValue = change.before?.data();

      console.log(`[OrderSync${isSimulator ? '-Simulator' : ''}] Order ${orderId} changed from status "${previousValue?.status}" to "${newValue.status}"`);

      // Only process specific status changes
      if (newValue.status !== previousValue?.status || !previousValue) {
        // Get restaurant data
        const restaurantId = newValue.restaurant.legalId;
        const restaurantData = await getRestaurant(restaurantId);
        
        if (!restaurantData) {
          console.error(`[OrderSync] Restaurant ${restaurantId} not found for order ${orderId}`);
          return null;
        }

        // Define the order URL (for tracking)
        const orderUrl = `https://pivott.digital/orders/${orderId}`;

        // Different notification based on status change
        switch(newValue.status) {
          case "pending":
            await sendOrderRequestNotifications(
              newValue,
              restaurantData,
              orderUrl
            );
            break;

          case "confirmed":
            await sendOrderConfirmationNotifications(
              newValue, 
              restaurantData, 
              orderUrl
            );
            break;
          
          case "cancelled":
            await sendOrderCancelledNotifications(
              newValue, 
              restaurantData, 
              orderUrl
            );
            break;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error processing order status change:", error);
      return null;
    }
  });
}


exports.orderCreated = createOrderHandler('orders');
exports.orderSimulatorCreated = createOrderHandler('orders_simulator');

// Generate inventory reminders hourly
// exports.generateReminders = functions.pubsub.schedule("every 1 hours")
//   .onRun(async () => {
//     try {
//       // Get all active restaurants
//       const restaurants = await firestore
//         .collection("restaurants")
//         .where("isActivated", "==", true)
//         .get();

//       for (const restaurant of restaurants.docs) {
//         const Restaurant = restaurant.data();
//         const restaurantId = restaurant.id;

//         // Get all suppliers for this restaurant
//         const suppliers = await firestore
//           .collection("restaurants")
//           .doc(restaurantId)
//           .collection("suppliers")
//           .get();

//         for (const supplier of suppliers.docs) {
//           const supplierData = supplier.data();
//           const now = new Date();
//           const currentDay = now.getDay();
//           const currentHour = now.getHours();

//           // Check if today is a delivery day for this supplier
//           if (
//             supplierData.deliveryDays.includes(currentDay) &&
//             currentHour === supplierData.cutoffHour - 3 // 3 hours before cutoff
//           ) {
//             // TODO: Send reminder to the restaurant owner
//             console.log(`Sending reminder for ${Restaurant.name} about ${supplierData.name}`);
//           }
//         }
//       }

//       return null;
//     } catch (error) {
//       console.error("Error generating reminders:", error);
//       return null;
//     }
//   });

// // Track order status changes
// exports.orderStatusSync = functions.firestore
//   .document("/restaurants/{restaurantId}/orders/{orderId}")
//   .onUpdate(async (change, context) => {
//     const {restaurantId, orderId} = context.params;
//     const newValue = change.after.data();
//     const previousValue = change.before.data();

//     // If status changed to "delivered"
//     if (newValue.status === "delivered" && previousValue.status !== "delivered") {
//       try {
//         // Get restaurant and supplier data
//         const restaurantDoc = await firestore
//           .collection("restaurants")
//           .doc(restaurantId)
//           .get();

//         const supplierDoc = await firestore
//           .collection("restaurants")
//           .doc(restaurantId)
//           .collection("suppliers")
//           .doc(newValue.supplierId)
//           .get();

//         // TODO: Send delivery summary to restaurant owner
//         console.log(`Order ${orderId} from ${supplierDoc.data()?.name} has been delivered to ${restaurantDoc.data()?.name}`);

//         return null;
//       } catch (error) {
//         console.error("Error syncing order status:", error);
//         return null;
//       }
//     }

//     return null;
//   });

// // Export CSV report endpoint (authenticated)
// exports.exportCsv = functions.https.onRequest(async (req, res) => {
//   try {
//     // Check if user is authenticated
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       res.status(403).send("Unauthorized");
//       return;
//     }

//     // TODO: Validate the token

//     // Get restaurant ID from query params
//     const {restaurantId, reportType} = req.query;

//     if (!restaurantId || !reportType) {
//       res.status(400).send("Missing required parameters");
//       return;
//     }

//     // Generate the report based on the type
//     let csvData = "";

//     switch (reportType) {
//     case "orders":
//       // Generate orders report
//       csvData = "Order ID,Supplier,Date,Status,Total Items\n";
//       // TODO: Query orders and generate CSV
//       break;

//     case "inventory":
//       // Generate inventory report
//       csvData = "Date,Product,Current Qty,Par Level\n";
//       // TODO: Query inventory snapshots and generate CSV
//       break;

//     default:
//       res.status(400).send("Invalid report type");
//       return;
//     }

//     // Set headers and return CSV data
//     res.setHeader("Content-Type", "text/csv");
//     res.setHeader("Content-Disposition", `attachment; filename="${reportType}_${restaurantId}.csv"`);
//     res.status(200).send(csvData);
//   } catch (error) {
//     console.error("Error exporting CSV:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });


const log = ( message: string, data?: any) => {
  console.log('🤖 ====================================================== 🤖');
  console.log(message);
  if (data) {
    console.log(data);
  }
  console.log('🤖 ====================================================== 🤖');
}