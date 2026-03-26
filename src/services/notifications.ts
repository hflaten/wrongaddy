/**
 * Notification dispatcher — email (Resend) and physical letter (Lob).
 * Decides which channel to use and records the outcome in the DB.
 */
import { Resend } from 'resend';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';
import { findSenderEmail } from './emailFinder.js';
import type { InstitutionalSender, NotificationMethod } from '../types/index.js';
import type { EnvelopeExtraction } from '../types/index.js';

// ─── Email ─────────────────────────────────────────────────────────────────

function buildEmailHtml(
  recipientName: string,
  deliveryAddress: string,
  senderName: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; font-size: 15px; color: #222; max-width: 600px; margin: 40px auto; }
  .header { font-size: 18px; font-weight: bold; margin-bottom: 24px; }
  .footer { margin-top: 32px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
</style></head>
<body>
  <p class="header">Important — Mail Delivery Notice</p>
  <p>Dear ${senderName},</p>
  <p>
    We are writing to advise that a piece of mail addressed to <strong>${recipientName}</strong>
    was recently received at <strong>${deliveryAddress}</strong>.
  </p>
  <p>
    The person you are attempting to contact <strong>no longer resides at this address</strong>.
    Please update your records accordingly.
  </p>
  <p>
    If you require assistance locating a current address, we recommend contacting the individual
    directly through other means.
  </p>
  <p>Regards,<br>WrongAddy Notification Service<br><em>Acting on behalf of the property manager</em></p>
  <div class="footer">
    This notice was generated automatically by WrongAddy. To report an error or opt out of future
    notices, reply to this email with the subject line "Unsubscribe".
  </div>
</body>
</html>`;
}

async function sendEmail(params: {
  to: string;
  senderName: string;
  recipientName: string;
  deliveryAddress: string;
}): Promise<{ providerId: string }> {
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const fromDomain = process.env['RESEND_FROM_DOMAIN'] ?? 'notifications@wrongaddy.com.au';

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `WrongAddy <${fromDomain}>`,
    to: params.to,
    subject: 'Important — Mail Delivery Notice',
    html: buildEmailHtml(params.recipientName, params.deliveryAddress, params.senderName),
  });

  if (error || !data) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  return { providerId: data.id };
}

// ─── Physical Letter via PostGrid ──────────────────────────────────────────

async function sendLetter(params: {
  toName: string;
  toLine1: string;
  toLine2: string | null;
  toCity: string;
  toState: string;
  toPostcode: string;
  toCountry: string;
  recipientName: string;
  deliveryAddress: string;
}): Promise<{ providerId: string; costAud: number }> {
  const isLive = process.env['NODE_ENV'] === 'production';
  const apiKey = isLive
    ? process.env['POSTGRID_LIVE_API_KEY']
    : process.env['POSTGRID_TEST_API_KEY'];
  if (!apiKey) throw new Error('Missing POSTGRID API KEY');

  const letterHtml = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;font-size:12pt;margin:60px 80px;">
<p><strong>Important — Mail Delivery Notice</strong></p>
<p>Dear ${params.toName},</p>
<p>We are writing to advise that a piece of mail addressed to <strong>${params.recipientName}</strong>
was recently received at <strong>${params.deliveryAddress}</strong>.</p>
<p>The person you are attempting to contact <strong>no longer resides at this address</strong>.
Please update your records accordingly.</p>
<p>Regards,<br>WrongAddy Notification Service</p>
</body></html>`;

  const payload = {
    to: {
      name: params.toName,
      address_line1: params.toLine1,
      ...(params.toLine2 ? { address_line2: params.toLine2 } : {}),
      city: params.toCity,
      province_or_state: params.toState,
      postal_or_zip: params.toPostcode,
      country_code: 'AU',
    },
    from: {
      name: 'WrongAddy Notifications',
      address_line1: 'GPO Box 9977',
      city: 'Sydney',
      province_or_state: 'NSW',
      postal_or_zip: '2001',
      country_code: 'AU',
    },
    html: letterHtml,
    size: 'us_letter',
    description: `Undeliverable mail notice for ${params.recipientName}`,
  };

  const response = await axios.post<{ id: string; price?: number }>(
    'https://api.postgrid.com/print-mail/v1/letters',
    payload,
    {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  return { providerId: response.data.id, costAud: response.data.price ?? 3.50 };
}

// ─── Decision logic ────────────────────────────────────────────────────────

export async function dispatchNotification(params: {
  mailEventId: string;
  extraction: EnvelopeExtraction;
  institutionalSender: InstitutionalSender | null;
}): Promise<void> {
  const { mailEventId, extraction, institutionalSender } = params;
  const { delivery_address, sender_address } = extraction;

  const recipientName = delivery_address.recipient_name ?? 'The Former Resident';
  const deliveryAddressFull = [
    delivery_address.line1,
    delivery_address.suburb,
    delivery_address.state,
    delivery_address.postcode,
  ]
    .filter(Boolean)
    .join(', ');

  const senderName = sender_address.sender_name ?? 'Sender';

  let method: NotificationMethod = 'manual';
  let status: string = 'pending';
  let recipientEmail: string | null = null;
  let recipientAddressStr: string | null = null;
  let provider: string | null = null;
  let providerId: string | null = null;
  let costAud: number | null = null;
  let responseData: object | null = null;
  let errorMessage: string | null = null;

  try {
    // Priority 1: institutional sender with known email
    if (institutionalSender?.contact_method === 'email' && institutionalSender.undeliverable_email) {
      method = 'email';
      recipientEmail = institutionalSender.undeliverable_email;
      provider = 'resend';

      const result = await sendEmail({
        to: recipientEmail,
        senderName,
        recipientName,
        deliveryAddress: deliveryAddressFull,
      });

      providerId = result.providerId;
      status = 'sent';

    // Priority 2: institutional sender with letter-only contact
    // → run email finder agent first to avoid physical letter
    } else if (institutionalSender?.contact_method === 'letter' && hasSenderAddress(sender_address)) {
      const found = await findSenderEmail(sender_address.sender_name, sender_address.line1);

      if (found.email && found.confidence === 'high') {
        method = 'email';
        recipientEmail = found.email;
        provider = 'resend';
        const result = await sendEmail({ to: found.email, senderName, recipientName, deliveryAddress: deliveryAddressFull });
        providerId = result.providerId;
        status = 'sent';
      } else {
        method = 'letter';
        provider = 'postgrid';
        const result = await sendLetter({
          toName: senderName,
          toLine1: sender_address.line1 ?? '',
          toLine2: sender_address.line2,
          toCity: sender_address.suburb ?? '',
          toState: sender_address.state ?? '',
          toPostcode: sender_address.postcode ?? '',
          toCountry: sender_address.country ?? 'AU',
          recipientName,
          deliveryAddress: deliveryAddressFull,
        });
        providerId = result.providerId;
        costAud = result.costAud;
        status = 'sent';
      }

    // Priority 3: unknown sender → run email finder agent, only letter as last resort
    } else if (hasSenderAddress(sender_address)) {
      const found = await findSenderEmail(sender_address.sender_name, sender_address.line1);

      if (found.email && found.confidence === 'high') {
        method = 'email';
        recipientEmail = found.email;
        provider = 'resend';
        const result = await sendEmail({ to: found.email, senderName, recipientName, deliveryAddress: deliveryAddressFull });
        providerId = result.providerId;
        status = 'sent';
      } else {
        method = 'letter';
        provider = 'postgrid';
        const result = await sendLetter({
          toName: senderName,
          toLine1: sender_address.line1 ?? '',
          toLine2: sender_address.line2,
          toCity: sender_address.suburb ?? '',
          toState: sender_address.state ?? '',
          toPostcode: sender_address.postcode ?? '',
          toCountry: sender_address.country ?? 'AU',
          recipientName,
          deliveryAddress: deliveryAddressFull,
        });
        providerId = result.providerId;
        costAud = result.costAud;
        status = 'sent';
      }

    } else {
      // No actionable contact info
      method = 'manual';
      status = 'skipped';
      errorMessage = 'No sender contact info available — flagged for manual handling';
    }
  } catch (err: unknown) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  recipientAddressStr = [
    sender_address.line1,
    sender_address.suburb,
    sender_address.state,
    sender_address.postcode,
    sender_address.country,
  ]
    .filter(Boolean)
    .join(', ') || null;

  await supabase.from('notifications').insert({
    mail_event_id: mailEventId,
    method,
    status,
    recipient_email: recipientEmail,
    recipient_address: recipientAddressStr,
    provider,
    provider_id: providerId,
    cost_aud: costAud,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    response_data: responseData,
    error_message: errorMessage,
  });
}

function hasSenderAddress(
  addr: EnvelopeExtraction['sender_address']
): boolean {
  return Boolean(addr.line1 && addr.suburb && addr.postcode);
}
