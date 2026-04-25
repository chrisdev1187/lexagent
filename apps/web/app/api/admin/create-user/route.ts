import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "../_lib";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { email, password, role = "member", plan_id = "starter" } = await req.json();
  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "email and password (min 6 chars) are required" },
      { status: 400 }
    );
  }

  // Create auth user (email already confirmed)
  const { data, error } = await serviceClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const newUserId = data.user.id;

  // The on_auth_user_created trigger inserts member/starter automatically.
  // Override role/plan if different from defaults.
  if (role !== "member" || plan_id !== "starter") {
    await serviceClient()
      .from("user_roles")
      .update({ role, plan_id })
      .eq("user_id", newUserId);
  }

  return NextResponse.json({ ok: true, userId: newUserId });
}
