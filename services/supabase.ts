import { createClient } from '@supabase/supabase-js';

// Configuration from Environment Variables
const getEnvVar = (key: string, nextKey?: string) => {
  // Check import.meta.env (Vite)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {
    // Ignore error if import.meta is not accessible
  }

  // Check process.env (Next.js / CRA / Node)
  try {
    if (typeof process !== 'undefined' && process.env) {
        if (process.env[key]) return process.env[key];
        if (nextKey && process.env[nextKey]) return process.env[nextKey];
    }
  } catch (e) {
    // Ignore error
  }
  
  return '';
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Supabase is not configured properly. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

// Initialize with fallback to prevent crash if env vars are missing
// The client will still fail on network requests if keys are invalid, but the app won't crash on boot.
export const supabase = createClient(
    SUPABASE_URL || 'https://placeholder.supabase.co', 
    SUPABASE_KEY || 'placeholder'
);