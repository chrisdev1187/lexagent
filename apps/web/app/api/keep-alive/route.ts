import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://lexagent-0o5u.onrender.com";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json();
    return NextResponse.json({ ok: res.ok, api: body, ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), ts: new Date().toISOString() },
      { status: 503 }
    );
  }
}
