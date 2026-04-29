import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";
import { supabase } from "../lib/supabase.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const PCL_BASE = "https://pcl.uscourts.gov/pcl/api";
const PACER_AUTH_URL = "https://pacer.login.uscourts.gov/services/cso-auth";

export const pacerRouter = new Hono();
pacerRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

async function getPacerToken(username: string, password: string): Promise<string | null> {
  const res = await fetch(PACER_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ loginId: username, password, redactFlag: "1" }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { loginResult?: string; nextGenCSO?: string };
  if (data.loginResult !== "0") return null;
  return data.nextGenCSO ?? null;
}

async function getUserCredentials(userId: string): Promise<{ username: string; password: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("user_roles")
    .select("pacer_username, pacer_password")
    .eq("user_id", userId)
    .single();
  if (!data?.pacer_username || !data?.pacer_password) return null;
  return { username: data.pacer_username, password: data.pacer_password };
}

// POST /api/pacer/credentials  { username, password }  — save/update
pacerRouter.post("/credentials", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);
  const userId = c.get("userId");
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  if (!username || !password) return c.json({ error: "username + password required" }, 400);

  // Verify credentials against PACER before saving
  const token = await getPacerToken(username, password);
  if (!token) return c.json({ error: "PACER authentication failed — check credentials" }, 401);

  const { error } = await supabase
    .from("user_roles")
    .update({ pacer_username: username, pacer_password: password })
    .eq("user_id", userId);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// DELETE /api/pacer/credentials
pacerRouter.delete("/credentials", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);
  const userId = c.get("userId");
  await supabase
    .from("user_roles")
    .update({ pacer_username: null, pacer_password: null })
    .eq("user_id", userId);
  return c.json({ ok: true });
});

// GET /api/pacer/credentials/status  — has credentials saved?
pacerRouter.get("/credentials/status", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);
  const userId = c.get("userId");
  const creds = await getUserCredentials(userId);
  return c.json({ connected: !!creds, username: creds?.username ?? null });
});

// GET /api/pacer/search?q=<case title or number>&court=<id>&dateFrom=YYYY-MM-DD
pacerRouter.get("/search", async (c) => {
  const userId = c.get("userId");
  const creds = await getUserCredentials(userId);
  if (!creds) return c.json({ error: "No PACER credentials saved" }, 401);

  const token = await getPacerToken(creds.username, creds.password);
  if (!token) return c.json({ error: "PACER authentication failed" }, 401);

  const q = c.req.query("q") ?? "";
  const court = c.req.query("court") ?? "";
  const dateFrom = c.req.query("dateFrom") ?? "";

  const params = new URLSearchParams({ pageSize: "20", page: "1" });
  if (q) params.set("caseTitle", q);
  if (court) params.set("courtId", court);
  if (dateFrom) params.set("dateFiledStart", dateFrom);

  const res = await fetch(`${PCL_BASE}/cases/search?${params}`, {
    headers: { "X-NEXT-GEN-CSO": token, Accept: "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text();
    return c.json({ error: `PACER returned ${res.status}`, detail: txt }, 502);
  }
  const data = await res.json();
  return c.json(data);
});

// GET /api/pacer/docket/:court/:caseId  — fetch docket sheet metadata
pacerRouter.get("/docket/:court/:caseId", async (c) => {
  const userId = c.get("userId");
  const creds = await getUserCredentials(userId);
  if (!creds) return c.json({ error: "No PACER credentials saved" }, 401);

  const token = await getPacerToken(creds.username, creds.password);
  if (!token) return c.json({ error: "PACER authentication failed" }, 401);

  const { court, caseId } = c.req.param();
  const res = await fetch(`${PCL_BASE}/cases/${court}/${caseId}`, {
    headers: { "X-NEXT-GEN-CSO": token, Accept: "application/json" },
  });
  if (!res.ok) return c.json({ error: `PACER returned ${res.status}` }, 502);
  const data = await res.json();
  return c.json(data);
});
