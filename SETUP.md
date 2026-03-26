# WrongAddy — Setup Guide

## Prerequisites
- Node.js 18+
- A Railway account (railway.app)
- API keys (see below)

---

## Step 1 — Clone and install

```bash
npm install
cp .env.example .env
# Fill in your .env values (see sections below)
```

---

## Step 2 — Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_KEY`
3. Go to **SQL Editor** and run both migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_institutional_senders.sql`
4. Go to **Storage** → create a bucket called `envelope-photos`
   - Set it to **Public** (so photo URLs work)

---

## Step 3 — WhatsApp Cloud API

> ⚠️ Start this on Day 1 — Meta business verification takes 1–5 days.

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
2. Select **Business** → fill in details
3. Add the **WhatsApp** product
4. Under **API Setup**, note:
   - `Temporary access token` → `WHATSAPP_TOKEN` (replace with permanent token later)
   - `Phone Number ID` → `WHATSAPP_PHONE_NUMBER_ID`
5. Deploy to Railway first (Step 5), then come back to register the webhook URL

---

## Step 4 — Anthropic Claude API

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key → `ANTHROPIC_API_KEY`

---

## Step 5 — Resend

1. Go to [resend.com](https://resend.com) and create an account
2. Add and verify your sending domain
3. Create an API key → `RESEND_API_KEY`
4. Set `RESEND_FROM_DOMAIN=notifications@yourdomain.com.au`

---

## Step 6 — Lob.com (physical letters — can skip for initial testing)

1. Go to [lob.com](https://lob.com) and create an account
2. Use the **test key** (`test_...`) for development — no real letters sent
3. API key → `LOB_API_KEY`

---

## Step 7 — Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set env vars in Railway dashboard:
# railway.app → Your Project → Variables
# (Copy all values from your .env)
```

After deployment, Railway gives you a URL like `https://wrongaddy-production.up.railway.app`

---

## Step 8 — Register WhatsApp Webhook

1. Back in the Meta developer console → **WhatsApp → Configuration**
2. Set **Callback URL** to: `https://your-app.railway.app/webhook/whatsapp`
3. Set **Verify token** to match your `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to `messages` field

---

## Step 9 — Test end-to-end

1. Send a photo of any envelope to your WhatsApp test number
2. You should receive a confirmation message back within ~10 seconds
3. Check Supabase → `mail_events` table to see the logged record

---

## Local development

```bash
npm run dev
```

For local webhook testing, use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Use the https ngrok URL as your WhatsApp webhook callback
```

---

## Architecture overview

```
WhatsApp photo → Railway server → Claude Vision → Supabase DB
                                               → Resend (email)
                                               → Lob.com (letter)
                                → WhatsApp confirmation → PM
```

---

## Supabase Storage bucket

The `envelope-photos` bucket stores all original envelope images.
Images are retained indefinitely as audit evidence.
Access is controlled by Supabase Storage policies.
