import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { conversationStateReducer, processActions } from "src/botEngine";
import { ConversationState, IncomingMessage, MessageData } from "src/schema/types";
import { validateTwilioWebhook } from "./utils/twilio";
import { getCollectionName } from "./utils/firestore";

// Initialize Firebase Admin only if not already initialized
if (!admin.apps?.length) {
  admin.initializeApp();
}

const simulatorDoc = 'conversations_simulator'; //'conversations_simulator'; // Collection for simulator conversations
const restaurantDoc = 'restaurants_simulator'; // Collection for real restaurant conversations
const firestore = admin.firestore();


// API Key for admin simulator authentication
const ADMIN_API_KEY = process.env.ADMIN_SIMULATOR_API_KEY || 'simulator-lz123';

// Process incoming WhatsApp messages from Twilio
/**
 * Main WhatsApp webhook handler
 * Processes incoming messages from Twilio and manages conversation flow
 * Also handles simulator requests from admin app
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Set CORS headers for all requests
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-simulator-api-key');

    // Only process POST requests for actual webhook handling
    
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
    const body = isSimulator ? 
      req.body.message : // Admin app format
      req.body.Body || ''; // Twilio format
    const mediaUrl = isSimulator ?
      req.body.mediaUrl : // Admin app format
      req.body.MediaUrl0; // Twilio format
    
    if (!from) {
      console.error('Missing From/phone field in request body');
      res.status(400).send('Bad Request: Missing sender phone number');
      return;
    }

    console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] Received message from ${from}: "${body}"`);

    // Extract phone number without whatsapp: prefix for document ID
    // For simulator, the phone number should already be in clean format
    const phoneNumber = isSimulator ? from : from.replace("whatsapp:", "");
    // Log incoming message for audit trail
    await firestore.collection(getCollectionName('conversations', isSimulator))
      ?.doc(phoneNumber)
      ?.collection('messages')
      ?.add({
        body,
        role: 'user',
        createdAt: FieldValue.serverTimestamp()
      } as MessageData);

    // Create the incoming message object
    const message: IncomingMessage = {
      from: isSimulator ? `whatsapp:${from}` : from, // Ensure from has whatsapp: prefix for state machine
      body,
      mediaUrl
    };

    /**
     * Lookup existing conversation state by phone number
     * Phone number is now the document ID for conversations
     */
    let conversationState: ConversationState;
    let restaurantId = "";

    // Get existing conversation state by phone number
    const conversationsCollection = isSimulator ? simulatorDoc : 'conversations';
    const conversationRef = firestore.collection(conversationsCollection).doc(phoneNumber);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] No existing conversation found for phone: ${phoneNumber}`);
      // New conversation - check if restaurant already exists for this phone
      const restaurantsCollection = isSimulator ? restaurantDoc : 'restaurants';
      const restaurantRef = await firestore
        .collection(restaurantsCollection)
        .where("primaryContact.whatsapp", "==", phoneNumber)
        .limit(1)
        .get();

      if (restaurantRef.empty) {
        // Completely new user - start onboarding
        conversationState = {
          currentState: "INIT",
          context: {
            contactNumber: phoneNumber,
            ...(isSimulator && { isSimulator })
          },
          lastMessageTimestamp: Timestamp.now(),
        };
        console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] New user starting onboarding - phone: ${phoneNumber}, restaurantId: ${restaurantId}`);
      } else {
        // Existing restaurant, new conversation
        const restaurantDoc = restaurantRef.docs[0];
        restaurantId = restaurantDoc.id;
        const restaurantData = restaurantDoc.data();
        
        conversationState = {
          currentState: "IDLE",
          context: {
            legalId: restaurantId,
            restaurantName: restaurantData.name,
            contactName: restaurantData.primaryContact.name,
            ...(isSimulator && { isSimulator })
          },
          lastMessageTimestamp: Timestamp.now(),
        };
        console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] Existing restaurant, new conversation - phone: ${phoneNumber}, restaurantId: ${restaurantId}`);
      }
    } else {
      // Existing conversation - load state
      const data = conversationDoc.data();
      conversationState = {
        currentState: data?.currentState || "IDLE",
        context: {
          ...data?.context || {},
          ...(isSimulator && { isSimulator })
        },
        lastMessageTimestamp: Timestamp.now(),
      };
    }

    /**
     * Process the message through our state machine
     * This determines the next state and actions to take
     */
    const { newState, actions } = conversationStateReducer(
      conversationState,
      message
    );

    console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] State machine result:`, {
      phone: phoneNumber,
      oldState: conversationState.currentState,
      newState: newState.currentState,
      actionsCount: actions.length,
      newContextKeys: Object.keys(newState.context)
    });

    /**
     * Save the updated conversation state to Firestore
     * Using phone number as document ID
     */
    const firestoreState = {
      currentState: newState.currentState,
      context: newState.context,
      lastMessageTimestamp: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await conversationRef.set(firestoreState);
    console.log(`[${isSimulator ? 'Simulator' : 'WhatsApp'}] ✅ Conversation state saved for phone: ${phoneNumber}`);

    /**
     * Execute all actions generated by the state machine
     * For simulator mode, collect responses instead of sending via Twilio
     */
    const responses = await processActions(actions, message.from, isSimulator);

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
//         const restaurantData = restaurant.data();
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
//             console.log(`Sending reminder for ${restaurantData.name} about ${supplierData.name}`);
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
