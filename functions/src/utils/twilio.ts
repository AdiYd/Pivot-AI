import { Twilio } from 'twilio';

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to,
      body
    });
    console.log(`Message sent to ${to}: ${body}`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

export function validateTwilioWebhook(req: any): boolean {
  // TODO: Implement proper Twilio signature validation
  return true;
}
