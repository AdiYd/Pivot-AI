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
 * Type definition for WhatsApp template parameters
 */
// type TemplateParameter = {
//   type: 'text' | 'image' | 'document';
//   text?: string; // For text parameters
//   image?: { link: string }; // For image parameters
//   document?: { link: string }; // For document parameters
// };

/**
 * Map context values to template parameters array for Twilio
 * @param body Template body with {placeholders}
 * @param context Context object with values
 * @returns Array of template parameters and cleaned body with {{N}} placeholders
 */
// function mapContextToTemplateParams(
//   body: string,
//   context: Record<string, any>
// ): { parameters: TemplateParameter[], cleanBody: string } {
//   const parameters: TemplateParameter[] = [];
//   let cleanBody = body;
  
//   // Find all placeholders in the format {key}
//   const placeholderRegex = /{([^{}]+)}/g;
//   let match;
//   let paramIndex = 1;
//   const paramMap: Record<string, number> = {};
  
//   while ((match = placeholderRegex.exec(body)) !== null) {
//     const placeholder = match[0];
//     const key = match[1];
    
//     if (paramMap[key] === undefined) {
//       // New parameter
//       const value = context[key];
//       if (value !== undefined) {
//         parameters.push({ type: 'text', text: String(value) });
//         paramMap[key] = paramIndex++;
//       }
//     }
    
//     // Replace {placeholder} with {{N}} in the template body
//     if (paramMap[key] !== undefined) {
//       cleanBody = cleanBody.replace(placeholder, `{{${paramMap[key]}}}`);
//     }
//   }
  
//   return { parameters, cleanBody };
// }

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
// Rest of the file remains unchanged
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