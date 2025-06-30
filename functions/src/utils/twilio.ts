import { Twilio } from 'twilio';
import * as crypto from 'crypto';
import { Request } from 'firebase-functions/v1';

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production' && process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config();
}

let client: Twilio | null = null;

/**
 * Get or create Twilio client instance
 */
export function getTwilioClient(): Twilio {
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
 * Type definition for WhatsApp template parameters
 */
// type TemplateParameter = {
//   type: 'text' | 'image' | 'document';
//   text?: string; // For text parameters
//   image?: { link: string }; // For image parameters
//   document?: { link: string }; // For document parameters
// };

/**
 * Fetch contact information from a vCard media URL
 * @param mediaUrl The URL of the vCard file from Twilio
 * @returns Promise resolving to contact data object
 */
 export async function fetchContactFromVCard(mediaUrl: string): Promise<{name: string, phone: string}> {
  try {
    // Get Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured for vCard fetching');
    }
    
    // Extract message SID and media SID from the URL
    // URLs from Twilio look like: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages/{MessageSid}/Media/{MediaSid}
    const urlParts = mediaUrl.split('/');
    const mediaSid = urlParts[urlParts.length - 1];
    const messageSid = urlParts[urlParts.length - 3];
    
    console.log(`[Twilio] Fetching media content for Message: ${messageSid}, Media: ${mediaSid}`);
    
    // Use the mediaUrl directly, but add authentication
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    // Make an HTTP request to get the vCard content with proper authentication
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch vCard: ${response.status} ${response.statusText}`);
    }
    
    const vcardContent = await response.text();
    
    console.log(`[Twilio] vCard content fetched, length: ${vcardContent.length} chars`);
    
    // Parse the vCard content
    // Simple regex parsing for the basic fields we need
    const nameMatch = vcardContent.match(/FN:(.*?)(?:\r?\n|$)/i);
    const phoneMatch = vcardContent.match(/TEL;[^:]*:(.*?)(?:\r?\n|$)/i);
    
    const name = nameMatch ? nameMatch[1].trim() : '';
    let phone = phoneMatch ? phoneMatch[1].trim() : '';
    phone = phone.replace(/[^0-9]/g, ''); // Clean phone number to digits only
    phone = phone.replace('+972', '0'); // Convert +972 to 0 for local format
    phone = phone.replace(' ', '').trim();
    console.log(`[Twilio] Parsed contact: Name=${name}, Phone=${phone}`);
    
    return { name, phone };
  } catch (error) {
    console.error(`[Twilio] Error fetching contact from vCard:`, {
      error: error instanceof Error ? error.message : error,
      mediaUrl
    });
    throw error;
  }
}

/**
 * Sends a WhatsApp message via Twilio
 * @param {string} to The recipient's WhatsApp number (e.g., "whatsapp:+1234567890")
 * @param {string} body The message body to send (for non-template messages)
 * @param {object} template Optional template object
 * @param {object} context Context object with values for template variables
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string,
  template?: { 
    id: string; 
    sid?: string; // Optional SID for tracking in Twilio
    contentVariables?: string; // Optional content variables for templates
    type: string;
    body: string;
    options?: Array<{name: string; id: string}>;
    header?: {
      type: string;
      text?: string;
    };
  },
  context?: Record<string, any>
): Promise<void> {
  try {
    const twilioClient = getTwilioClient();
    const twilioFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    if (to.startsWith('05')){
      to = to.replace(/^05/, '+9725'); // Convert local format to international
    }
    if (!to.startsWith('whatsapp:')) {
      to = `whatsapp:${to}`;
    }
    
    // If we have a template, use the template API
    if (template && template.id && template.sid) {
      console.log(`[Twilio] Sending template message: ${template.id}`);
      
      // Extract values from context and convert to array of components
      const components: any[] = [];
      
      // Process template parameters - convert from {name} format to positional parameters
      if (context) {
        // Create parameters component for variables
        const parameters: { type: string, text: string }[] = [];
        const placeholderRegex = /{([^{}]+)}/g;
        let match;
        
        // Make a copy of the template body for processing
        let templateBodyCopy = template.body;
        
        // First, identify all placeholders and their corresponding values
        while ((match = placeholderRegex.exec(templateBodyCopy)) !== null) {
          const key = match[1];
          
          // Check if this key exists in context
          if (context[key] !== undefined) {
            parameters.push({
              type: "text",
              text: String(context[key])
            });
          }
        }
        
        // If we have parameters, add them to components
        if (parameters.length > 0) {
          components.push({
            type: "body",
            parameters: parameters
          });
        }
        
        // Add header component if applicable
        if (template.header && template.header.text && template.header.type === "text") {
          components.push({
            type: "header",
            parameters: [
              {
                type: "text",
                text: template.header.text
              }
            ]
          });
        }
        
        // Add buttons if applicable for interactive templates
        if (template.options && template.options.length > 0) {
          // Depending on template type, we might need different button formats
          // This is something you'd need to adapt to your specific templates
        }
      }
      
      // Call Twilio API with the template name and parameters
      await twilioClient.messages.create({
        from: twilioFrom,
        to,
        contentSid: template.sid,
        contentVariables: template.contentVariables || '{}', // Optional content variables   
      });
      
      console.log(`[Twilio] ✅ Template message sent successfully:`, {
        to: to,
        templateId: template.id,
        componentCount: components.length
      });
    } else {
      // For regular text messages
      await twilioClient.messages.create({
        from: twilioFrom,
        to,
        body
      });
      
      console.log(`[Twilio] ✅ Regular message sent successfully:`, {
        to: to,
        messageLength: body.length,
      });
    }
  } catch (error) {
    console.error(`[Twilio] ❌ Error sending WhatsApp message:`, {
      to: to,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export function validateTwilioWebhookOld(request: Request): boolean {
  // Check if this is a simulator request with the API key header
  const simulatorApiKey = request.headers['x-simulator-api-key'];
  const adminApiKey = process.env.ADMIN_SIMULATOR_API_KEY || 'simulator-dev-key';
  
  if (simulatorApiKey === adminApiKey) {
    console.log('[Twilio] 🔓 Admin simulator request - bypassing Twilio validation');
    return true;
  }
  
  console.log(`[Twilio] Validating webhook request from ${request.ip}`);
  
  // For development environments, you might want to bypass validation
  if (process.env.NODE_ENV === 'development') {
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
    if (request.hostname.includes('ngrok')){
      return true; // Bypass validation for ngrok requests
    }
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

export function validateTwilioWebhook(request: Request): boolean {
  // Check if this is a simulator request with the API key header
  const simulatorApiKey = request.headers['x-simulator-api-key'];
  const adminApiKey = process.env.ADMIN_SIMULATOR_API_KEY || 'simulator-dev-key';
  
  if (simulatorApiKey === adminApiKey) {
    console.log('[Twilio] 🔓 Admin simulator request - bypassing Twilio validation');
    return true;
  }
  
  console.log(`[Twilio] Validating webhook request from ${request.ip}`);
  
  // For development environments, you might want to bypass validation
  if (process.env.NODE_ENV === 'development') {
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
    if (request.hostname.includes('ngrok')){
      return true; // Bypass validation for ngrok requests
    }
    
    // FIX: Construct the correct validation URL with the complete path
    const url = `https://${request.hostname}${request.originalUrl}whatsappWebhook`;
    console.log(`[Twilio] Validation URL: ${url}`);
    
    // Convert request.body to a simple key-value object
    const params: {[key: string]: string} = {};
    Object.keys(request.body || {}).forEach(key => {
      params[key] = String(request.body[key]);
    });

    console.log(`[Twilio] Request params count: ${Object.keys(params).length}`);

    // Use Twilio's validateRequest function if available (cleaner approach)
    // If you have access to the twilio helper library's validateRequest method
    try {
      const twilioClient = getTwilioClient();
      // @ts-ignore - Using Twilio's built-in validation if available
      if (twilioClient.validateRequest) {
        // @ts-ignore
        const isValid = twilioClient.validateRequest(authToken, signature, url, params);
        console.log(`[Twilio] ${isValid ? '✅' : '❌'} Signature validation ${isValid ? 'passed' : 'failed'} (using Twilio helper)`);
        return isValid;
      }
    } catch (validationError) {
      console.warn('[Twilio] Could not use Twilio helper for validation, falling back to manual validation');
    }

    // Manual validation as fallback
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
    console.error('[Twilio] ❌ Error validating Twilio webhook:', error);
    // In production, fail closed for security
    return process.env.NODE_ENV === 'production' ? false : true;
  }
}