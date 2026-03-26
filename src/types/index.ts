// ─── WhatsApp Cloud API ────────────────────────────────────────────────────

export interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
}

export interface WhatsAppStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

// ─── Claude Vision ─────────────────────────────────────────────────────────

export interface EnvelopeAddress {
  recipient_name: string | null;
  line1: string | null;
  line2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  confidence: number;
}

export interface SenderAddress {
  sender_name: string | null;
  line1: string | null;
  line2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  confidence: number;
}

export interface EnvelopeFlags {
  multiple_envelopes_detected: boolean;
  image_quality: 'clear' | 'acceptable' | 'poor';
  address_type: 'printed' | 'handwritten' | 'mixed';
  notes: string | null;
}

export interface EnvelopeExtraction {
  delivery_address: EnvelopeAddress;
  sender_address: SenderAddress;
  flags: EnvelopeFlags;
}

// ─── Notification ──────────────────────────────────────────────────────────

export type NotificationMethod = 'email' | 'letter' | 'whatsapp' | 'manual';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped';
export type ContactMethod = 'email' | 'letter' | 'unknown';

export interface InstitutionalSender {
  id: string;
  name: string;
  common_names: string[];
  address_patterns: string[];
  undeliverable_email: string | null;
  contact_method: ContactMethod;
  notes: string | null;
  verified: boolean;
}

// ─── Database rows (matches Supabase schema) ───────────────────────────────

export interface PropertyManagerRow {
  id: string;
  whatsapp_number: string;
  name: string | null;
  agency_name: string | null;
  email: string | null;
  suburb: string | null;
  state: string | null;
  active: boolean;
  created_at: string;
}

export interface PropertyRow {
  id: string;
  property_manager_id: string;
  street_address: string;
  suburb: string;
  state: string | null;
  postcode: string | null;
  country: string;
  created_at: string;
}

export interface MailEventRow {
  id: string;
  property_id: string | null;
  property_manager_id: string | null;
  recipient_name: string | null;
  delivery_address: string | null;
  sender_name: string | null;
  sender_address: string | null;
  sender_address_line1: string | null;
  sender_address_line2: string | null;
  sender_suburb: string | null;
  sender_state: string | null;
  sender_postcode: string | null;
  sender_country: string | null;
  ai_model: string | null;
  ai_confidence: number | null;
  ai_raw_response: object | null;
  needs_manual_review: boolean;
  manual_review_reason: string | null;
  photo_url: string | null;
  whatsapp_message_id: string | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
}
