import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** Public Supabase client for browser-side operations */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Service-role client for server-side operations.
 * Only use in Supabase Edge Functions or secure server contexts.
 * Never expose the service key to the browser.
 */
export function createServiceClient(serviceKey: string) {
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}