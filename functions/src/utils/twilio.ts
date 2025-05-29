import { Twilio } from 'twilio';
import * as crypto from 'crypto';
import { Request } from 'firebase-functions/v1';

let client: Twilio | null = null;

/**
 * Get or create Twilio client instance
 */
function getTwilioClient(): Twilio {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
    }
    
    client = new Twilio(accountSid, authToken);
  }
  return client;
}

/**
 * Sends a WhatsApp message via Twilio
 * @param {string} to The recipient's WhatsApp number (e.g., "whatsapp:+1234567890")
 * @param {string} body The message body to send
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  
  try {
    const twilioClient = getTwilioClient();
    // console.log(`[Twilio] Client initialized, creating message...`);
    
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to,
      body
    });
    
    console.log(`[Twilio] ✅ Message sent successfully:`, {
      to: to,
      messageLength: body.length,
    });
  } catch (error) {
    console.error(`[Twilio] ❌ Error sending WhatsApp message:`, {
      to: to,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Validates that the incoming webhook request is coming from Twilio
 * @param {Request} request The HTTP request object
 * @return {boolean} True if the request is valid, false otherwise
 */
export function validateTwilioWebhook(request: Request): boolean {
  console.log(`[Twilio] Validating webhook request from ${request.ip}`);
  
  // For development environments, you might want to bypass validation
  if (process.env.NODE_ENV === 'development') {
    // console.log('[Twilio] 🔓 Development mode: bypassing webhook validation');
    return true;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('[Twilio] ❌ TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  // The X-Twilio-Signature header
  const signature = request.get('X-Twilio-Signature');
  if (!signature) {
    console.error('[Twilio] ❌ Missing X-Twilio-Signature header');
    return false;
  }

  try {
    console.log(`[Twilio] Validating signature...`);
    
    // Construct the validation URL
    const url = `https://${request.hostname}${request.originalUrl}`;
    console.log(`[Twilio] Validation URL: ${url}`);
    
    // Convert request.body to a simple key-value object
    const params: {[key: string]: string} = {};
    Object.keys(request.body || {}).forEach(key => {
      params[key] = String(request.body[key]);
    });

    console.log(`[Twilio] Request params count: ${Object.keys(params).length}`);

    // Sort the POST parameters alphabetically by key
    const sortedParams = Object.keys(params).sort();
    
    // Append key/value pairs to the URL
    let data = url;
    sortedParams.forEach(key => {
      data += key + params[key];
    });
    
    // Generate HMAC-SHA1 hash of the data using the auth token
    const hmac = crypto.createHmac('sha1', authToken);
    hmac.update(data, 'utf8');
    const calculatedSignature = hmac.digest('base64');
    
    console.log(`[Twilio] Calculated signature: ${calculatedSignature.substring(0, 10)}...`);
    console.log(`[Twilio] Received signature: ${signature.substring(0, 10)}...`);
    
    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'base64'),
      Buffer.from(signature, 'base64')
    );
    
    console.log(`[Twilio] ${isValid ? '✅' : '❌'} Signature validation ${isValid ? 'passed' : 'failed'}`);
    return isValid;
  } catch (error) {
    console.error('[Twilio] ❌ Error validating webhook:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}
