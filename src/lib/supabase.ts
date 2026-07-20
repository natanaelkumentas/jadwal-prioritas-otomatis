import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase public environment variables in .env');
}

// Client-side and standard server-side client (respects RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'jadwal',
  },
});

// Admin client (server-side only, bypasses RLS policies)
// Note: This client is only created when the service role key is available
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      db: {
        schema: 'jadwal',
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
