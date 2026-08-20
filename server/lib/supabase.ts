import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

const supabaseUrl = config.supabaseUrl || 'https://placeholder.supabase.co';
const supabaseKey = config.supabaseAnonKey || 'placeholder';
const supabaseAdminKey = config.supabaseServiceRoleKey;

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn("⚠️ Warning: Missing Supabase credentials in environment variables. Database features will not work.");
}

// Create a Supabase client using the anon key
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const getAuthSupabase = (token?: string) => {
  // If a user token is provided, prioritize it to respect RLS policies tied to the user's Clerk JWT
  if (token && token !== 'null' && token !== 'undefined') {
    return createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  // Removed service role fallback to prevent RLS bypass on unauthenticated requests.
  // Fallback to anon client if nothing else is available
  return supabase;
};
