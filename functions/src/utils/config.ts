import * as functions from "firebase-functions/v1";

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production' && process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config();
}

/**
 * Get configuration values from either Firebase config or environment variables
 */
export function getConfig() {
  // Try Firebase Functions config first (production)
  try {
    const firebaseConfig = functions.config();
    
    if (firebaseConfig.openai?.apikey) {
      return {
        openai: {
          apiKey: firebaseConfig.openai.apikey
        },
        twilio: {
          accountSid: firebaseConfig.twilio.accountsid,
          authToken: firebaseConfig.twilio.authtoken,
          whatsappNumber: firebaseConfig.twilio.whatsappnumber
        },
        admin: {
          simulatorApiKey: firebaseConfig.admin.simulatorapikey
        }
      };
    }
  } catch (error) {
    console.log("Firebase config not available, using environment variables");
  }
  
  // Fall back to environment variables (local development)
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
    },
    admin: {
      simulatorApiKey: process.env.ADMIN_SIMULATOR_API_KEY
    }
  };
}