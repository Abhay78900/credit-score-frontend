import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_KEY = 'your-anon-public-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);