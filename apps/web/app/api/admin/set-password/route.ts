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

  const { error } = await serviceClient().auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
