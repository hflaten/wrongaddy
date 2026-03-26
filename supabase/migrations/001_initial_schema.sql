-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Property managers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_managers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number TEXT UNIQUE NOT NULL,  -- E.164 format: +61412345678
  name            TEXT,
  agency_name     TEXT,
  email           TEXT,
  suburb          TEXT,
  state           VARCHAR(3),            -- NSW, VIC, QLD etc
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Rental properties
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_manager_id UUID REFERENCES property_managers(id) ON DELETE SET NULL,
  street_address      TEXT NOT NULL,
  suburb              TEXT NOT NULL,
  state               VARCHAR(3),
  postcode            VARCHAR(4),
  country             VARCHAR(2) NOT NULL DEFAULT 'AU',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Mail events — the core data asset
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mail_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id          UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_manager_id  UUID REFERENCES property_managers(id) ON DELETE SET NULL,

  -- Extracted by AI (delivery side)
  recipient_name       TEXT,
  delivery_address     TEXT,

  -- Extracted by AI (sender side)
  sender_name          TEXT,
  sender_address       TEXT,              -- full string as read
  sender_address_line1 TEXT,
  sender_address_line2 TEXT,
  sender_suburb        TEXT,
  sender_state         VARCHAR(3),
  sender_postcode      VARCHAR(4),
  sender_country       VARCHAR(2) DEFAULT 'AU',

  -- AI metadata
  ai_model             TEXT,
  ai_confidence        NUMERIC(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_raw_response      JSONB,
  needs_manual_review  BOOLEAN NOT NULL DEFAULT false,
  manual_review_reason TEXT,

  -- Evidence
  photo_url            TEXT,
  whatsapp_message_id  TEXT UNIQUE,       -- prevents duplicate processing

  -- Timing
  received_at          TIMESTAMPTZ NOT NULL,
  processed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_event_id     UUID REFERENCES mail_events(id) ON DELETE CASCADE,
  method            TEXT NOT NULL CHECK (method IN ('email', 'letter', 'whatsapp', 'manual')),
  status            TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'skipped')),
  recipient_email   TEXT,
  recipient_address TEXT,
  provider          TEXT,                 -- 'resend', 'lob', etc
  provider_id       TEXT,                 -- external tracking ID
  cost_aud          NUMERIC(8,4),
  sent_at           TIMESTAMPTZ,
  response_data     JSONB,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Institutional senders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutional_senders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  common_names         TEXT[] NOT NULL DEFAULT '{}',
  address_patterns     TEXT[] NOT NULL DEFAULT '{}',
  undeliverable_email  TEXT,
  contact_method       TEXT NOT NULL CHECK (contact_method IN ('email', 'letter', 'unknown')) DEFAULT 'unknown',
  notes                TEXT,
  verified             BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mail_events_received_at       ON mail_events(received_at);
CREATE INDEX IF NOT EXISTS idx_mail_events_property_id       ON mail_events(property_id);
CREATE INDEX IF NOT EXISTS idx_mail_events_sender_postcode   ON mail_events(sender_postcode);
CREATE INDEX IF NOT EXISTS idx_mail_events_needs_review      ON mail_events(needs_manual_review) WHERE needs_manual_review = true;
CREATE INDEX IF NOT EXISTS idx_notifications_mail_event      ON notifications(mail_event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status          ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_properties_manager            ON properties(property_manager_id);
