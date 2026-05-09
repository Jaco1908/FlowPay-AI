import type { ParsedRule } from '@/types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Calls the rules-parse Edge Function.
 * Sends natural-language text and gets back a structured ParsedRule.
 */
export async function parseRule(text: string): Promise<ParsedRule> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/rules-parse`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'X-FlowPay-Secret': import.meta.env.VITE_FLOWPAY_SECRET || '',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Error al parsear la instrucción');
  }

  return response.json();
}