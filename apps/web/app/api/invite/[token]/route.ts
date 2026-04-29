import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function svc() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { data, error } = await svc()
    .from("team_invites")
    .select("id, email, role, expires_at, accepted_at, teams(name)")
    .eq("token", token)
    .single();

  if (error || !data) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  if (data.accepted_at) return NextResponse.json({ error: "This invite has already been accepted" }, { status: 410 });
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });

  return NextResponse.json({
    email: data.email,
    role: data.role,
    teamName: (data.teams as any)?.name ?? "Unknown Team",
    expiresAt: data.expires_at,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const authHeader = req.headers.get("authorization");
  const jwt = authHeader?.replace("Bearer ", "");
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authErr } = await caller.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = svc();

  const { data: invite, error: invErr } = await db
    .from("team_invites")
    .select("id, team_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (invErr || !invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "This invite has already been accepted" }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 });
  }

  const { error: memberErr } = await db
    .from("team_members")
    .upsert({ team_id: invite.team_id, user_id: user.id, role: invite.role }, { onConflict: "team_id,user_id" });
  if (memberErr) return NextResponse.json({ error: "Failed to join team" }, { status: 500 });

  await db.from("team_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
