import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "../_lib";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Prevent self-deletion
  if (userId === auth.userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const svc = serviceClient();
  const { error } = await svc.auth.admin.deleteUser(userId);

  if (error) {
    // GoTrue Admin API fails on malformed auth.users records — fall back to direct SQL.
    const { error: rpcErr } = await svc.rpc("admin_force_delete_user", { uid: userId });
    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
