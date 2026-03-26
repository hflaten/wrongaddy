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
  res.json({ status: 'ok', service: 'wrongaddy', ts: new Date().toISOString() });
});

app.use('/webhook', webhookRouter);

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`WrongAddy server running on port ${PORT}`);
});

export default app;
