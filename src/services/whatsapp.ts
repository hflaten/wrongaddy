/**
 * WhatsApp Cloud API helpers
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v18.0';

function getToken(): string {
  const token = process.env['WHATSAPP_TOKEN'];
  if (!token) throw new Error('Missing WHATSAPP_TOKEN');
  return token;
}

function getPhoneNumberId(): string {
  const id = process.env['WHATSAPP_PHONE_NUMBER_ID'];
  if (!id) throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID');
  return id;
}

/**
 * Download a media file from WhatsApp and return it as a Buffer.
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Step 1: resolve the download URL
  const urlRes = await axios.get<{ url: string; mime_type: string }>(
    `${BASE_URL}/${mediaId}`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );
  const { url, mime_type: mimeType } = urlRes.data;

  // Step 2: download the actual bytes
  const fileRes = await axios.get<ArrayBuffer>(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
    responseType: 'arraybuffer',
  });

  return { buffer: Buffer.from(fileRes.data), mimeType };
}

/**
 * Send a text message to a WhatsApp number.
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  await axios.post(
    `${BASE_URL}/${getPhoneNumberId()}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    { headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }
  );
}

/**
 * Mark an incoming message as read (reduces unread badge on PM's phone).
 */
export async function markAsRead(messageId: string): Promise<void> {
  await axios.post(
    `${BASE_URL}/${getPhoneNumberId()}/messages`,
    {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    },
    { headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } }
  );
}
