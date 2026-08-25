import { createClient } from 'npm:@supabase/supabase-js@2.43.0'; // Use npm: specifier with version
import { Database } from './supabase.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Supabase URL, Anon Key, and Service Key must be set in environment variables.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  // Optional: You might want to specify schema or other options
  auth: {
    persistSession: false, // Prevents storing session in memory/localStorage, important for serverless
  }
});