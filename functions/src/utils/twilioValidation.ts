import * as crypto from 'crypto';
import { Request } from 'firebase-functions/v2/https';

/**
 * Validates that the incoming webhook request is coming from Twilio
 * @param {Request} request The HTTP request object
 * @return {boolean} True if the request is valid, false otherwise
 */
export function validateTwilioWebhook(request: Request): boolean {
  // In a production environment, you would validate the Twilio signature
  // by calculating an HMAC signature using your Twilio auth token
  const twilioSignature = request.headers['x-twilio-signature'];
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
  const url = request.originalUrl;
  const params = request.body;
  
  // Skip validation in development mode for easier testing
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  if (!twilioSignature) {
    return false;
  }
  
  // Build the string to sign
  const data = url + Object.keys(params)
    .sort()
    .reduce((str, key) => {
      return str + key + params[key];
    }, '');
  
  // Create the HMAC signature
  const hmac = crypto.createHmac('sha1', twilioAuthToken);
  const calculatedSignature = Buffer.from(hmac.update(data).digest('base64')).toString();
  
  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(twilioSignature as string)
  );
}
