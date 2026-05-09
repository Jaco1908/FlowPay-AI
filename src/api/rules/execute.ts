import type { ParsedRule, ExecuteResult } from '@/types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Calls the rules-execute Edge Function.
 * Sends a confirmed ParsedRule and gets back execution results.
 */
export async function executeRule(rule: ParsedRule): Promise<ExecuteResult> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/rules-execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rule),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Error al ejecutar los pagos');
  }

  return response.json();
}