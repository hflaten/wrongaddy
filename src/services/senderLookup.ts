/**
 * Institutional sender matching.
 * Looks up sender_name and sender_address against the institutional_senders table.
 */
import { supabase } from '../lib/supabase.js';
import type { InstitutionalSender } from '../types/index.js';

export async function findInstitutionalSender(
  senderName: string | null,
  senderAddress: string | null
): Promise<InstitutionalSender | null> {
  if (!senderName && !senderAddress) return null;

  const { data, error } = await supabase
    .from('institutional_senders')
    .select('*');

  if (error || !data) return null;

  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const normName = senderName ? normalise(senderName) : '';
  const normAddr = senderAddress ? normalise(senderAddress) : '';

  for (const sender of data as InstitutionalSender[]) {
    // Check common_names array
    for (const alias of sender.common_names ?? []) {
      if (normName.includes(normalise(alias))) return sender;
    }

    // Check primary name
    if (normName.includes(normalise(sender.name))) return sender;

    // Check address patterns
    for (const pattern of sender.address_patterns ?? []) {
      if (normAddr.includes(normalise(pattern))) return sender;
    }
  }

  return null;
}
