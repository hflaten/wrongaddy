/**
 * Email finder agent.
 *
 * Before sending a physical letter, this agent tries two stages:
 *   1. Ask Claude if it already knows the sender's undeliverable mail email
 *   2. If not confident, search the web with Tavily
 *
 * Successful lookups are cached in institutional_senders so the search
 * only ever runs once per organisation.
 */
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';

export interface EmailFinderResult {
  email: string | null;
  confidence: 'high' | 'low' | 'none';
  source: 'claude_knowledge' | 'web_search' | 'none';
  notes: string | null;
}

// ─── Stage 0: Resolve organisation name from address ──────────────────────

async function resolveNameFromAddress(address: string): Promise<string | null> {
  const tavilyKey = process.env['TAVILY_API_KEY'];
  if (!tavilyKey) return null;

  try {
    const response = await axios.post<{ results: { content: string; url: string }[] }>(
      'https://api.tavily.com/search',
      {
        api_key: tavilyKey,
        query: `"${address}" Australia organisation company`,
        search_depth: 'basic',
        max_results: 3,
      }
    );

    const context = response.data.results
      .map((r) => r.content)
      .join('\n')
      .slice(0, 1500);

    if (!context) return null;

    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) return null;

    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: `Based on these search results, what Australian organisation is located at or uses the address "${address}"?

${context}

Reply with ONLY the organisation name, nothing else. If unknown, reply with null.`,
      }],
    });

    const name = res.content[0]?.type === 'text' ? res.content[0].text.trim() : null;
    return name === 'null' || !name ? null : name;
  } catch {
    return null;
  }
}

// ─── Stage 1: Claude knowledge ─────────────────────────────────────────────

async function askClaudeForEmail(senderName: string): Promise<EmailFinderResult> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const client = new Anthropic({ apiKey });

  const prompt = `You are helping an Australian mail redirection service find the correct email address to notify organisations about undeliverable mail.

For the organisation "${senderName}", do you know their official undeliverable mail, returns, or address-change notification email address?

This is typically used by banks, utilities, telcos, and government agencies in Australia to handle returned/undeliverable mail.

Respond ONLY with this JSON structure, no explanation:
{
  "email": string | null,
  "confidence": "high" | "low",
  "notes": string | null
}

Rules:
- "high" confidence = you are certain this is a real, current, official email
- "low" confidence = you are guessing or unsure
- If you don't know, set email to null and confidence to "low"
- Do not make up email addresses
- Australian organisations only`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const text = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const result = JSON.parse(text) as { email: string | null; confidence: 'high' | 'low'; notes: string | null };
    return {
      email: result.email,
      confidence: result.confidence,
      source: 'claude_knowledge',
      notes: result.notes,
    };
  } catch {
    console.log(`[emailFinder] Claude knowledge raw response: ${raw}`);
    return { email: null, confidence: 'none', source: 'claude_knowledge', notes: 'Failed to parse Claude response' };
  }
}

// ─── Stage 2: Tavily web search ────────────────────────────────────────────

async function searchWebForEmail(senderName: string, senderAddress: string | null): Promise<EmailFinderResult> {
  const tavilyKey = process.env['TAVILY_API_KEY'];
  if (!tavilyKey) {
    return { email: null, confidence: 'none', source: 'web_search', notes: 'TAVILY_API_KEY not set' };
  }

  const query = `"${senderName}" Australia undeliverable mail returns email address contact${senderAddress ? ` "${senderAddress}"` : ''}`;

  let searchResults = '';
  try {
    const response = await axios.post<{ results: { content: string; url: string }[] }>(
      'https://api.tavily.com/search',
      {
        api_key: tavilyKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }
    );
    searchResults = response.data.results
      .map((r) => `URL: ${r.url}\n${r.content}`)
      .join('\n\n')
      .slice(0, 3000); // cap context size
  } catch (err) {
    return { email: null, confidence: 'none', source: 'web_search', notes: `Tavily error: ${String(err)}` };
  }

  // Ask Claude to extract email from search results
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const client = new Anthropic({ apiKey });

  const prompt = `You are helping find the official undeliverable mail or returns email address for "${senderName}" (an Australian organisation${senderAddress ? `, address: ${senderAddress}` : ''}).

Here are web search results:
---
${searchResults}
---

Based ONLY on the above search results, extract the most relevant official email address for notifying this organisation about undeliverable mail or address changes.

Respond ONLY with this JSON:
{
  "email": string | null,
  "confidence": "high" | "low",
  "notes": string | null
}

Rules:
- Only use emails actually found in the search results above
- "high" = email is clearly official and relevant to returns/undeliverable mail
- "low" = email found but not specifically for returns
- null if no relevant email found
- Do not invent or guess email addresses`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const text = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const result = JSON.parse(text) as { email: string | null; confidence: 'high' | 'low'; notes: string | null };
    return {
      email: result.email,
      confidence: result.confidence,
      source: 'web_search',
      notes: result.notes,
    };
  } catch {
    console.log(`[emailFinder] Web search raw response: ${raw}`);
    return { email: null, confidence: 'none', source: 'web_search', notes: 'Failed to parse Claude response' };
  }
}

// ─── Cache result in institutional_senders ─────────────────────────────────

async function cacheResult(senderName: string, email: string, source: string): Promise<void> {
  await supabase.from('institutional_senders').insert({
    name: senderName,
    common_names: [senderName],
    address_patterns: [],
    undeliverable_email: email,
    contact_method: 'email',
    notes: `Auto-discovered via ${source}`,
    verified: false,
  });
}

// ─── Main export ───────────────────────────────────────────────────────────

/**
 * Try to find an email address for a sender before resorting to a physical letter.
 * Returns the best email found, or null if nothing usable was found.
 */
export async function findSenderEmail(
  senderName: string | null,
  senderAddress: string | null
): Promise<EmailFinderResult> {
  // We need at least a name or an address to search
  if (!senderName && !senderAddress) {
    return { email: null, confidence: 'none', source: 'none', notes: 'No sender info available' };
  }

  // If no name, try to identify the organisation from the address using Claude
  let resolvedName = senderName;
  if (!resolvedName && senderAddress) {
    resolvedName = await resolveNameFromAddress(senderAddress);
    console.log(`[emailFinder] Resolved name from address "${senderAddress}": ${resolvedName}`);
  }

  const searchTerm = resolvedName ?? senderAddress ?? '';
  console.log(`[emailFinder] Searching for email: ${searchTerm}`);

  // Stage 1: Claude knowledge (only if we have a name)
  if (resolvedName) {
    const claudeResult = await askClaudeForEmail(resolvedName);
    console.log(`[emailFinder] Claude result:`, claudeResult);

    if (claudeResult.email && claudeResult.confidence === 'high') {
      await cacheResult(resolvedName, claudeResult.email, 'claude_knowledge');
      return claudeResult;
    }
  }

  // Stage 2: Web search via Tavily (works with name or address)
  const webResult = await searchWebForEmail(searchTerm, senderAddress);
  console.log(`[emailFinder] Web search result:`, webResult);

  if (webResult.email && webResult.confidence === 'high') {
    await cacheResult(resolvedName ?? searchTerm, webResult.email, 'web_search');
    return webResult;
  }

  // Return best available even if low confidence (caller decides what to do)
  if (webResult.email) return webResult;

  return { email: null, confidence: 'none', source: 'none', notes: 'No email found after all stages' };
}
