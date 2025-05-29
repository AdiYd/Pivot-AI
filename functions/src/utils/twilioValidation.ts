import * as crypto from 'crypto';
import { Request } from 'firebase-functions/v1';

/**
 * Validates that the incoming webhook request is coming from Twilio
 * @param {Request} request The HTTP request object
 * @return {boolean} True if the request is valid, false otherwise
 */
export function validateTwilioWebhook(request: Request): boolean {
  // For development environments, you might want to bypass validation
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  console.log('TWILIO_AUTH_TOKEN', authToken);
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  // The X-Twilio-Signature header
  const signature = request.get('X-Twilio-Signature');
  if (!signature) {
    return false;
  }

  // Construct the validation URL
  const url = `https://${request.hostname}${request.originalUrl}`;
  
  // Convert request.body to a simple key-value object
  const params: {[key: string]: string} = {};
  Object.keys(request.body).forEach(key => {
    params[key] = request.body[key];
  });

  // Sort the POST parameters alphabetically by key
  const sortedParams = Object.keys(params).sort();
  
  // Append key/value pairs to the URL
  let data = url;
  sortedParams.forEach(key => {
    data += key + params[key];
  });
  
  // Generate HMAC-SHA1 hash of the data using the auth token
  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(data);
  const calculatedSignature = Buffer.from(hmac.digest('hex')).toString('base64');
  
  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(signature)
  );
}

/**
 * Validates that the incoming webhook request is coming from Twilio
 * @param {Request} req The HTTP request object
 * @return {boolean} True if the request is valid, false otherwise
 */
export function validateTwilioWebhookLegacy(req: any): boolean {
  try {
    const twilioSignature = req.headers['x-twilio-signature'];
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilioSignature || !authToken) {
      return false;
    }

    // Construct the expected signature
    const url = `https://${req.headers.host}${req.url}`;
    const params = new URLSearchParams(req.body).toString();
    const data = url + params;
    
    const expectedSignature = crypto.createHmac('sha1', authToken)
      .update(data, 'utf8')
      .digest('base64');
    
    return `sha1=${expectedSignature}` === twilioSignature;
  } catch (error) {
    console.error('Error validating Twilio webhook:', error);
    return false;
  }
}
