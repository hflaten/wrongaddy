/**
 * Claude Vision — envelope address extraction
 */
import Anthropic from '@anthropic-ai/sdk';
import type { EnvelopeExtraction } from '../types/index.js';

const CONFIDENCE_AUTO = 0.8;
const CONFIDENCE_REVIEW = 0.6;

const SYSTEM_PROMPT = `You are an expert at reading addresses from envelope photographs.
Extract the delivery address and return address from this envelope image.
Respond ONLY with valid JSON matching the schema provided. No explanation, no markdown fences.`;

const USER_PROMPT = `Analyse this envelope photograph and extract the following information.

Return this exact JSON structure:
{
  "delivery_address": {
    "recipient_name": string | null,
    "line1": string | null,
    "line2": string | null,
    "suburb": string | null,
    "state": string | null,
    "postcode": string | null,
    "country": string | null,
    "confidence": number
  },
  "sender_address": {
    "sender_name": string | null,
    "line1": string | null,
    "line2": string | null,
    "suburb": string | null,
    "state": string | null,
    "postcode": string | null,
    "country": string | null,
    "confidence": number
  },
  "flags": {
    "multiple_envelopes_detected": boolean,
    "image_quality": "clear" | "acceptable" | "poor",
    "address_type": "printed" | "handwritten" | "mixed",
    "notes": string | null
  }
}

Rules:
- If a field cannot be read, set it to null
- confidence: 1.0 = perfectly clear and unambiguous, 0.0 = completely illegible
- For Australian addresses: state codes are NSW, VIC, QLD, SA, WA, TAS, ACT, NT
- Normalise postcode to 4-digit string
- Do not infer or guess — only extract what is clearly visible`;

export interface VisionResult {
  extraction: EnvelopeExtraction;
  rawResponse: object;
  needsManualReview: boolean;
  reviewReason: string | null;
  model: string;
}

export async function extractEnvelopeAddresses(
  imageBuffer: Buffer,
  mimeType: string
): Promise<VisionResult> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const client = new Anthropic({ apiKey });
  const model = 'claude-sonnet-4-6';

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBuffer.toString('base64'),
            },
          },
          { type: 'text', text: USER_PROMPT },
        ],
      },
    ],
  });

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const rawResponse = JSON.parse(JSON.stringify(response)) as object;

  let extraction: EnvelopeExtraction;
  try {
    extraction = JSON.parse(rawText) as EnvelopeExtraction;
  } catch {
    return {
      extraction: emptyExtraction(),
      rawResponse,
      needsManualReview: true,
      reviewReason: 'Claude returned non-JSON response',
      model,
    };
  }

  const deliveryConf = extraction.delivery_address.confidence ?? 0;
  const senderConf = extraction.sender_address.confidence ?? 0;
  const minConf = Math.min(deliveryConf, senderConf);

  let needsManualReview = false;
  let reviewReason: string | null = null;

  if (minConf < CONFIDENCE_REVIEW) {
    needsManualReview = true;
    reviewReason = `Low confidence score: ${minConf.toFixed(2)}`;
  } else if (extraction.flags.image_quality === 'poor') {
    needsManualReview = true;
    reviewReason = 'Image quality flagged as poor';
  } else if (extraction.flags.multiple_envelopes_detected) {
    needsManualReview = true;
    reviewReason = 'Multiple envelopes detected in image';
  } else if (minConf < CONFIDENCE_AUTO) {
    // Between 0.6–0.79: process but flag
    needsManualReview = true;
    reviewReason = `Borderline confidence: ${minConf.toFixed(2)} — please verify`;
  }

  return { extraction, rawResponse, needsManualReview, reviewReason, model };
}

function emptyExtraction(): EnvelopeExtraction {
  return {
    delivery_address: {
      recipient_name: null, line1: null, line2: null,
      suburb: null, state: null, postcode: null, country: null, confidence: 0,
    },
    sender_address: {
      sender_name: null, line1: null, line2: null,
      suburb: null, state: null, postcode: null, country: null, confidence: 0,
    },
    flags: {
      multiple_envelopes_detected: false,
      image_quality: 'poor',
      address_type: 'printed',
      notes: null,
    },
  };
}
