import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (supabaseUrl && !supabaseServiceKey) {
  console.warn("[lexagent-api] SUPABASE_URL set but SUPABASE_SERVICE_KEY missing — auth will be bypassed.");
}

/**
 * Service-role Supabase client.
 * null when SUPABASE_URL / SUPABASE_SERVICE_KEY are not configured.
 * In that case, requireAuth middleware runs in bypass mode (userId = "anon").
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
