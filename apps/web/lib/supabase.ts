import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://nildwhegvjbrnrpaqkto.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbGR3aGVndmpicm5ycGFxa3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjAwNjEsImV4cCI6MjA5MjAzNjA2MX0.Pa-DgzbswaIUY0BoHwo6lHln75pvzGgX3FuNX5PSeoE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
