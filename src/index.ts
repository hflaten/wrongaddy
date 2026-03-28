import 'dotenv/config';
import express from 'express';
import { webhookRouter } from './routes/webhook.js';

const app = express();
const PORT = process.env['PORT'] ?? 3000;

// Parse raw body for WhatsApp webhook signature verification
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'returnagent', ts: new Date().toISOString() });
});

app.get('/privacy', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Privacy Policy — ReturnAgent</title>
<style>body{font-family:sans-serif;max-width:760px;margin:60px auto;padding:0 24px;line-height:1.7;color:#222}h1{font-size:1.8rem}h2{font-size:1.2rem;margin-top:2rem}</style>
</head>
<body>
<h1>Privacy Policy</h1>
<p><strong>Last updated: 27 March 2026</strong></p>
<p>ReturnAgent ("we", "us") operates a mail redirection notification service. This policy explains how we collect, use, and protect personal information in accordance with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs).</p>

<h2>1. Information We Collect</h2>
<p>When a property manager photographs a misdelivered envelope and sends it to our WhatsApp number, we collect:</p>
<ul>
  <li>The photograph of the envelope</li>
  <li>The delivery address (property address)</li>
  <li>The sender name and return address extracted from the envelope</li>
  <li>The recipient name printed on the envelope</li>
  <li>The WhatsApp number of the property manager</li>
</ul>

<h2>2. How We Use This Information</h2>
<p>We use this information solely to notify the original sender that the named recipient no longer resides at the delivery address. We do not sell personal information to third parties.</p>

<h2>3. Disclosure</h2>
<p>We may share information with third-party service providers (including AI vision processing, postal services, and email delivery providers) strictly for the purpose of delivering our service.</p>

<h2>4. Data Retention</h2>
<p>Event records are retained for up to 7 years for business intelligence and audit purposes. Envelope photographs may be deleted after 90 days.</p>

<h2>5. Access and Correction</h2>
<p>You may request access to or correction of personal information we hold about you by contacting us at the address below.</p>

<h2>6. Contact</h2>
<p>For privacy enquiries: <a href="mailto:privacy@returnagent.com.au">privacy@returnagent.com.au</a></p>
</body></html>`);
});

app.get('/terms', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Terms of Service — ReturnAgent</title>
<style>body{font-family:sans-serif;max-width:760px;margin:60px auto;padding:0 24px;line-height:1.7;color:#222}h1{font-size:1.8rem}h2{font-size:1.2rem;margin-top:2rem}</style>
</head>
<body>
<h1>Terms of Service</h1>
<p><strong>Last updated: 27 March 2026</strong></p>
<p>By using ReturnAgent you agree to these terms.</p>

<h2>1. Service Description</h2>
<p>ReturnAgent provides a WhatsApp-based service that notifies original senders when mail is delivered to a property where the recipient no longer resides.</p>

<h2>2. Acceptable Use</h2>
<p>You must only photograph and submit mail that has been physically delivered to a property you manage. Misuse of the service is prohibited.</p>

<h2>3. Disclaimer</h2>
<p>We make no guarantee that notifications will be received or acted upon by the original sender. The service is provided as-is.</p>

<h2>4. Governing Law</h2>
<p>These terms are governed by the laws of New South Wales, Australia.</p>

<h2>5. Contact</h2>
<p><a href="mailto:hello@returnagent.com.au">hello@returnagent.com.au</a></p>
</body></html>`);
});

app.use('/webhook', webhookRouter);

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`ReturnAgent server running on port ${PORT}`);
});

export default app;
