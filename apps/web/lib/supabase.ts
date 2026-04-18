import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mgiqicasllvisiwvbiuu.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbGR3aGVndmpicm5ycGFxa3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjAwNjEsImV4cCI6MjA5MjAzNjA2MX0.Pa-DgzbswaIUY0BoHwo6lHln75pvzGgX3FuNX5PSeoE";

if (!supabaseAnonKey && typeof window !== "undefined") {
  console.warn(
    "[LexAgent] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
    "Get it from Supabase Dashboard → Project Settings → API → anon key, " +
    "then add it to apps/web/.env.local"
  );
}

/** Whether Supabase is reachable — resolves within 4s, false on timeout/error */
export const supabaseReachable: Promise<boolean> =
  typeof window !== "undefined"
    ? fetch(`${supabaseUrl}/auth/v1/health`, { method: "HEAD", signal: AbortSignal.timeout(4000) })
        .then((r) => r.ok)
        .catch(() => false)
    : Promise.resolve(true);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
