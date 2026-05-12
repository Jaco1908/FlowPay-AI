import type { ParsedRule } from '@/types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');

function getSessionToken(): string {
  try {
    const stored = localStorage.getItem('flowpay_user');
    return stored ? (JSON.parse(stored).token ?? '') : '';
  } catch {
    return '';
  }
}

export async function parseRule(text: string): Promise<ParsedRule> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/rules-parse`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getSessionToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Error al parsear la instrucción');
  }

  return response.json();
}
