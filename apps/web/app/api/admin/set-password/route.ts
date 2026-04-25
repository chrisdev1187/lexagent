import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "../_lib";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId, password } = await req.json();
  if (!userId || !password || password.length < 6) {
    return NextResponse.json(
      { error: "userId and password (min 6 chars) are required" },
      { status: 400 }
    );
  }

  const svc = serviceClient();
  const { error } = await svc.auth.admin.updateUserById(userId, { password });

  if (error) {
    // GoTrue Admin API fails on malformed auth.users records — fall back to direct SQL.
    const { error: rpcErr } = await svc.rpc("admin_set_user_password", {
      uid: userId,
      new_pw: password,
    });
    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
