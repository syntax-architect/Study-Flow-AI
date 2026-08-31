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
  if (token) {
    return createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
  }
  return supabase;
};

export const adminSupabase = createClient(
  supabaseUrl,
  supabaseAdminKey || supabaseKey, // Fallback if no admin key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
