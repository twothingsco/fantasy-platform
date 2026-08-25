import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase';

// --- Supabase Configuration ---
// process.env will now be typed more strongly if env.d.ts is set up
const SUPABASE_URL: string = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  // Optional: You might want to specify schema or other options
  auth: {
    persistSession: false, // Prevents storing session in memory/localStorage, important for serverless
  }
});