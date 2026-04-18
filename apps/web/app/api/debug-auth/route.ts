import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const diag: Record<string, unknown> = {
    env: {
      url: supabaseUrl || "(empty)",
      anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.slice(0, 20) + "…" : "(empty)",
      anonKeyLength: supabaseAnonKey.length,
    },
  };

  // 1. Raw fetch health
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey },
      signal: AbortSignal.timeout(5000),
    });
    diag.healthFetch = { status: r.status, ok: r.ok };
  } catch (e) {
    diag.healthFetch = { error: String(e) };
  }

  // 2. Raw fetch signInWithPassword
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: "drwillybum@gmail.com",
        password: "P@ssword1212*#*#",
      }),
    });
    const json = await r.json();
    diag.rawSignIn = {
      status: r.status,
      ok: r.ok,
      hasAccessToken: !!json.access_token,
      errorCode: json.error_code ?? json.error ?? null,
      errorMsg: json.error_description ?? json.msg ?? null,
    };
  } catch (e) {
    diag.rawSignIn = { error: String(e) };
  }

  // 3. JS client signInWithPassword
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: "drwillybum@gmail.com",
      password: "P@ssword1212*#*#",
    });
    diag.jsClientSignIn = {
      hasSession: !!data?.session,
      errorCode: error?.code ?? null,
      errorMsg: error?.message ?? null,
      errorStatus: (error as { status?: number } | null)?.status ?? null,
    };
  } catch (e) {
    diag.jsClientSignIn = { error: String(e) };
  }

  return NextResponse.json(diag, { status: 200 });
}
