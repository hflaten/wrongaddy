/**
 * WhatsApp Cloud API webhook routes.
 *
 * GET  /webhook/whatsapp  — Meta challenge verification
 * POST /webhook/whatsapp  — Incoming messages
 */
import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { downloadWhatsAppMedia, sendWhatsAppMessage, markAsRead } from '../services/whatsapp.js';
import { extractEnvelopeAddresses } from '../services/vision.js';
import { findInstitutionalSender } from '../services/senderLookup.js';
import { dispatchNotification } from '../services/notifications.js';
import type { WhatsAppWebhookBody, WhatsAppMessage } from '../types/index.js';

export const webhookRouter = Router();

// ─── Webhook verification (GET) ────────────────────────────────────────────

webhookRouter.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env['WHATSAPP_VERIFY_TOKEN']) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ─── Incoming messages (POST) ──────────────────────────────────────────────

webhookRouter.post('/whatsapp', (req: Request, res: Response) => {
  // Respond to Meta immediately (must be within 5 seconds)
  res.sendStatus(200);

  // Process asynchronously
  processWebhook(req.body as WhatsAppWebhookBody).catch((err: unknown) => {
    console.error('Webhook processing error:', err);
  });
});

// ─── Core processing pipeline ──────────────────────────────────────────────

async function processWebhook(body: WhatsAppWebhookBody): Promise<void> {
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value.messages) continue;

      for (const message of value.messages) {
        await processMessage(message.from, message, value.contacts?.[0]?.profile.name);
      }
    }
  }
}

async function processMessage(
  senderPhone: string,
  message: WhatsAppMessage,
  contactName?: string
): Promise<void> {
  // Mark as read
  try { await markAsRead(message.id); } catch { /* non-critical */ }

  // Only handle image messages
  if (message.type !== 'image' || !message.image) {
    await sendWhatsAppMessage(
      senderPhone,
      'Hi! Please send a photo of the envelope and I\'ll take care of it. 📬'
    );
    return;
  }

  // Deduplicate by WhatsApp message ID
  const { data: existing } = await supabase
    .from('mail_events')
    .select('id')
    .eq('whatsapp_message_id', message.id)
    .single();

  if (existing) {
    console.log(`Duplicate message ${message.id} — skipping`);
    return;
  }

  // Resolve or create property manager
  const pm = await resolvePropertyManager(senderPhone, contactName);

  // Download image
  let imageBuffer: Buffer;
  let mimeType: string;
  try {
    const media = await downloadWhatsAppMedia(message.image.id);
    imageBuffer = media.buffer;
    mimeType = media.mimeType;
  } catch (err) {
    console.error('Failed to download image:', err);
    await sendWhatsAppMessage(
      senderPhone,
      'Sorry, I had trouble downloading your photo. Please try again. 🙏'
    );
    return;
  }

  // Store image in Supabase Storage
  const fileName = `${Date.now()}-${message.id}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('envelope-photos')
    .upload(fileName, imageBuffer, { contentType: mimeType, upsert: false });

  let photoUrl: string | null = null;
  if (!uploadError) {
    // Store the file path only — generate signed URLs on demand, not public URLs
    photoUrl = fileName;
  }

  // Run Claude Vision
  const visionResult = await extractEnvelopeAddresses(imageBuffer, mimeType);
  const { extraction, needsManualReview, reviewReason, model } = visionResult;

  const minConf = Math.min(
    extraction.delivery_address.confidence,
    extraction.sender_address.confidence
  );

  // Resolve property from delivery address
  const property = pm ? await resolveProperty(pm.id, extraction.delivery_address) : null;

  // Build delivery address string
  const deliveryAddressFull = [
    extraction.delivery_address.line1,
    extraction.delivery_address.suburb,
    extraction.delivery_address.state,
    extraction.delivery_address.postcode,
    extraction.delivery_address.country,
  ]
    .filter(Boolean)
    .join(', ');

  // Write mail_event
  const { data: mailEvent, error: insertError } = await supabase
    .from('mail_events')
    .insert({
      property_id: property?.id ?? null,
      property_manager_id: pm?.id ?? null,
      recipient_name: extraction.delivery_address.recipient_name,
      delivery_address: deliveryAddressFull,
      sender_name: extraction.sender_address.sender_name,
      sender_address: [
        extraction.sender_address.line1,
        extraction.sender_address.suburb,
        extraction.sender_address.state,
        extraction.sender_address.postcode,
      ].filter(Boolean).join(', '),
      sender_address_line1: extraction.sender_address.line1,
      sender_address_line2: extraction.sender_address.line2,
      sender_suburb: extraction.sender_address.suburb,
      sender_state: extraction.sender_address.state,
      sender_postcode: extraction.sender_address.postcode,
      sender_country: extraction.sender_address.country,
      ai_model: model,
      ai_confidence: minConf,
      ai_raw_response: visionResult.rawResponse,
      needs_manual_review: needsManualReview,
      manual_review_reason: reviewReason,
      photo_url: photoUrl,
      whatsapp_message_id: message.id,
      received_at: new Date(Number(message.timestamp) * 1000).toISOString(),
      processed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !mailEvent) {
    console.error('Failed to insert mail_event:', insertError);
    await sendWhatsAppMessage(senderPhone, 'Something went wrong on our end — please try again.');
    return;
  }

  // If image is too unclear, stop here and notify PM
  if (minConf < 0.6) {
    await sendWhatsAppMessage(
      senderPhone,
      `⚠️ I couldn't read this envelope clearly enough to act on it.\n\nReason: ${reviewReason ?? 'Low image quality'}\n\nPlease retake the photo with better lighting and try again.`
    );
    return;
  }

  // Lookup institutional sender
  const institutionalSender = await findInstitutionalSender(
    extraction.sender_address.sender_name,
    [extraction.sender_address.line1, extraction.sender_address.suburb].filter(Boolean).join(' ')
  );

  // Dispatch notification
  await dispatchNotification({
    mailEventId: mailEvent.id,
    extraction,
    institutionalSender,
  });

  // Send confirmation back to PM
  const recipientName = extraction.delivery_address.recipient_name ?? 'the former resident';
  const senderName = extraction.sender_address.sender_name ?? 'the sender';
  const reviewNote = needsManualReview ? '\n\n⚠️ Note: low confidence — please check the dashboard.' : '';

  let confirmationText: string;
  if (institutionalSender) {
    confirmationText = `✅ Done! I've notified ${senderName} that ${recipientName} no longer lives at this address.${reviewNote}`;
  } else if (extraction.sender_address.line1) {
    confirmationText = `✅ Done! A letter has been sent to ${senderName} advising that ${recipientName} no longer lives here.${reviewNote}`;
  } else {
    confirmationText = `📋 Logged. I couldn't find a return address to notify the sender — this has been flagged for manual review.`;
  }

  await sendWhatsAppMessage(senderPhone, confirmationText);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function resolvePropertyManager(phone: string, name?: string) {
  const { data: existing } = await supabase
    .from('property_managers')
    .select('*')
    .eq('whatsapp_number', phone)
    .single();

  if (existing) return existing;

  // Auto-register on first contact
  const { data: created, error } = await supabase
    .from('property_managers')
    .insert({ whatsapp_number: phone, name: name ?? null })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create property manager:', error);
    return null;
  }

  return created;
}

async function resolveProperty(
  pmId: string,
  deliveryAddress: { line1: string | null; suburb: string | null; state: string | null; postcode: string | null }
) {
  if (!deliveryAddress.line1 || !deliveryAddress.suburb) return null;

  // Try to find existing property matching this address
  const { data: existing } = await supabase
    .from('properties')
    .select('*')
    .eq('property_manager_id', pmId)
    .ilike('street_address', `%${deliveryAddress.line1}%`)
    .single();

  if (existing) return existing;

  // Create new property record
  const { data: created } = await supabase
    .from('properties')
    .insert({
      property_manager_id: pmId,
      street_address: deliveryAddress.line1,
      suburb: deliveryAddress.suburb,
      state: deliveryAddress.state,
      postcode: deliveryAddress.postcode,
    })
    .select('*')
    .single();

  return created ?? null;
}
