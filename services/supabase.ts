import { createClient } from '@supabase/supabase-js';

// Credentials provided by the user
const SUPABASE_URL = 'https://zqnvoejwsqjchendaquv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_134jHpJtnCmgAsH4TmVX5Q_rznjYvkk';

// Initialize Supabase Client
// We use 'persistSession: true' to keep the user logged in across reloads if Auth is used
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});