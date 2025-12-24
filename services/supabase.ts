import { createClient } from '@supabase/supabase-js';

// Configuration from Environment Variables
// Fix: Cast import.meta to any to resolve TS error 'Property env does not exist on type ImportMeta'
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Supabase is not configured properly. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);