import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { conversationStateReducer, processActions } from "./botEngine";
import { ConversationState, IncomingMessage } from "./types";
import { validateTwilioWebhook } from "./utils/twilio";

// Initialize Firebase Admin only if not already initialized
if (!admin.apps?.length) {
  admin.initializeApp({ projectId: 'pivot-chatbot-fdfe0' });
}

const firestore = admin.firestore();
console.log("Firebase Admin initialized");

// Process incoming WhatsApp messages from Twilio
/**
 * Main WhatsApp webhook handler
 * Processes incoming messages from Twilio and manages conversation flow
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
  try {

    // Only process POST requests
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Validate that the request is coming from Twilio
    if (!validateTwilioWebhook(req)) {
      console.error("Invalid Twilio signature");
      res.status(403).send("Forbidden");
      return;
    }

    // Extract message details from Twilio request
    const from = req.body.From;
    const body = req.body.Body || '';
    // const mediaUrl = req.body.MediaUrl0;
    
    if (!from) {
      console.error('Missing From field in request body');
      res.status(400).send('Bad Request: Missing From field');
      return;
    }

    console.log(`[WhatsApp] Received message from ${from}: "${body}"`);

    // Extract phone number without whatsapp: prefix for document ID
    const phoneNumber = from.replace("whatsapp:", "");
    
    // Log incoming message for audit trail
    await firestore.collection('conversations').doc(phoneNumber).collection('messages').add({
      body,
      direction: 'incoming',
      createdAt: FieldValue.serverTimestamp()
    });

    // Create the incoming message object
    const message: IncomingMessage = {
      from,
      body,
    };

    /**
     * Lookup existing conversation state by phone number
     * Phone number is now the document ID for conversations
     */
    let conversationState: ConversationState;
    let restaurantId = "";

    // Get existing conversation state by phone number
    const conversationRef = firestore.collection("conversations").doc(phoneNumber);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      // New conversation - check if restaurant already exists for this phone
      const restaurantRef = await firestore
        .collection("restaurants")
        .where("primaryContact.phone", "==", phoneNumber)
        .limit(1)
        .get();

      if (restaurantRef.empty) {
        // Completely new user - start onboarding
        restaurantId = firestore.collection("restaurants").doc().id;
        conversationState = {
          restaurantId,
          currentState: "INIT",
          context: {
            contactNumber: phoneNumber,
          },
          lastMessageTimestamp: Timestamp.now(),
        };
        console.log(`[WhatsApp] New user starting onboarding - phone: ${phoneNumber}, restaurantId: ${restaurantId}`);
      } else {
        // Existing restaurant, new conversation
        const restaurantDoc = restaurantRef.docs[0];
        restaurantId = restaurantDoc.id;
        const restaurantData = restaurantDoc.data();
        
        conversationState = {
          restaurantId,
          currentState: "IDLE",
          context: {
            restaurantName: restaurantData.name,
            contactName: restaurantData.primaryContact.name,
          },
          lastMessageTimestamp: Timestamp.now(),
        };
        console.log(`[WhatsApp] Existing restaurant, new conversation - phone: ${phoneNumber}, restaurantId: ${restaurantId}`);
      }
    } else {
      // Existing conversation - load state
      const data = conversationDoc.data();
      conversationState = {
        restaurantId: data?.restaurantId || "",
        currentState: data?.currentState || "IDLE",
        context: data?.context || {},
        lastMessageTimestamp: Timestamp.now(),
      };
      console.log(`[WhatsApp] Continuing existing conversation`, {
        phone: phoneNumber,
        restaurantId: conversationState.restaurantId,
        currentState: conversationState.currentState,
        contextKeys: Object.keys(conversationState.context)
      });
    }

    /**
     * Process the message through our state machine
     * This determines the next state and actions to take
     */
    const { newState, actions } = conversationStateReducer(
      conversationState,
      message
    );

    console.log(`[WhatsApp] State machine result:`, {
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
      restaurantId: newState.restaurantId,
      currentState: newState.currentState,
      context: newState.context,
      lastMessageTimestamp: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await conversationRef.set(firestoreState);
    console.log(`[WhatsApp] ✅ Conversation state saved for phone: ${phoneNumber}`);

    /**
     * Execute all actions generated by the state machine
     * Pass phone number for message logging
     */
    await processActions(actions, from);

    // Send a successful response back to Twilio
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing whatsapp webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Generate inventory reminders hourly
exports.generateReminders = functions.pubsub.schedule("every 1 hours")
  .onRun(async () => {
    try {
      // Get all active restaurants
      const restaurants = await firestore
        .collection("restaurants")
        .where("isActivated", "==", true)
        .get();

      for (const restaurant of restaurants.docs) {
        const restaurantData = restaurant.data();
        const restaurantId = restaurant.id;

        // Get all suppliers for this restaurant
        const suppliers = await firestore
          .collection("restaurants")
          .doc(restaurantId)
          .collection("suppliers")
          .get();

        for (const supplier of suppliers.docs) {
          const supplierData = supplier.data();
          const now = new Date();
          const currentDay = now.getDay();
          const currentHour = now.getHours();

          // Check if today is a delivery day for this supplier
          if (
            supplierData.deliveryDays.includes(currentDay) &&
            currentHour === supplierData.cutoffHour - 3 // 3 hours before cutoff
          ) {
            // TODO: Send reminder to the restaurant owner
            console.log(`Sending reminder for ${restaurantData.name} about ${supplierData.name}`);
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error generating reminders:", error);
      return null;
    }
  });

// Track order status changes
exports.orderStatusSync = functions.firestore
  .document("/restaurants/{restaurantId}/orders/{orderId}")
  .onUpdate(async (change, context) => {
    const {restaurantId, orderId} = context.params;
    const newValue = change.after.data();
    const previousValue = change.before.data();

    // If status changed to "delivered"
    if (newValue.status === "delivered" && previousValue.status !== "delivered") {
      try {
        // Get restaurant and supplier data
        const restaurantDoc = await firestore
          .collection("restaurants")
          .doc(restaurantId)
          .get();

        const supplierDoc = await firestore
          .collection("restaurants")
          .doc(restaurantId)
          .collection("suppliers")
          .doc(newValue.supplierId)
          .get();

        // TODO: Send delivery summary to restaurant owner
        console.log(`Order ${orderId} from ${supplierDoc.data()?.name} has been delivered to ${restaurantDoc.data()?.name}`);

        return null;
      } catch (error) {
        console.error("Error syncing order status:", error);
        return null;
      }
    }

    return null;
  });

// Export CSV report endpoint (authenticated)
exports.exportCsv = functions.https.onRequest(async (req, res) => {
  try {
    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(403).send("Unauthorized");
      return;
    }

    // TODO: Validate the token

    // Get restaurant ID from query params
    const {restaurantId, reportType} = req.query;

    if (!restaurantId || !reportType) {
      res.status(400).send("Missing required parameters");
      return;
    }

    // Generate the report based on the type
    let csvData = "";

    switch (reportType) {
    case "orders":
      // Generate orders report
      csvData = "Order ID,Supplier,Date,Status,Total Items\n";
      // TODO: Query orders and generate CSV
      break;

    case "inventory":
      // Generate inventory report
      csvData = "Date,Product,Current Qty,Par Level\n";
      // TODO: Query inventory snapshots and generate CSV
      break;

    default:
      res.status(400).send("Invalid report type");
      return;
    }

    // Set headers and return CSV data
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${reportType}_${restaurantId}.csv"`);
    res.status(200).send(csvData);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(500).send("Internal Server Error");
  }
});
