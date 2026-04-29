import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";
import { supabase } from "../lib/supabase.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const CL_TOKEN = process.env.COURTLISTENER_TOKEN ?? "";
const CL_BASE = "https://www.courtlistener.com/api/rest/v4";
const POLL_SECRET = process.env.DOCKET_POLL_SECRET ?? "";
const RESEND_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? "alerts@lexagent.ai";

export const docketsRouter = new Hono();
docketsRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

function clHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (CL_TOKEN) h["Authorization"] = `Token ${CL_TOKEN}`;
  return h;
}

// GET /api/dockets/watched?matter_id=...
docketsRouter.get("/watched", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);
  const matterId = c.req.query("matter_id");
  if (!matterId) return c.json({ error: "matter_id required" }, 400);

  const { data, error } = await supabase
    .from("watched_dockets")
    .select(`*, docket_alerts(id, entry_date, description, seen_at, created_at)`)
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// POST /api/dockets/watch  { matter_id, docket_id }
docketsRouter.post("/watch", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);
  const userId = c.get("userId");
  const { matter_id, docket_id } = await c.req.json<{ matter_id: string; docket_id: number }>();
  if (!matter_id || !docket_id) return c.json({ error: "matter_id + docket_id required" }, 400);

  // Fetch docket metadata from CL
  const res = await fetch(`${CL_BASE}/dockets/${docket_id}/`, { headers: clHeaders() });
  if (!res.ok) return c.json({ error: `CL returned ${res.status}` }, 502);
  const docket = await res.json() as {
    case_name?: string; court_id?: string; docket_number?: string;
    date_filed?: string; absolute_url?: string; id?: number;
  };

  const { data, error } = await supabase
    .from("watched_dockets")
    .upsert({
      matter_id,
      docket_id,
      case_name: docket.case_name ?? null,
      court: docket.court_id ?? null,
      docket_number: docket.docket_number ?? null,
      cl_url: docket.absolute_url ? `https://www.courtlistener.com${docket.absolute_url}` : null,
      created_by: userId,
    }, { onConflict: "matter_id,docket_id" })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

// DELETE /api/dockets/watch/:id
docketsRouter.delete("/watch/:id", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);
  const { error } = await supabase
    .from("watched_dockets")
    .delete()
    .eq("id", c.req.param("id"));
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// POST /api/dockets/poll/:id  — poll a single watched docket for new entries
docketsRouter.post("/poll/:id", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);

  const { data: wd, error: wdErr } = await supabase
    .from("watched_dockets")
    .select("*")
    .eq("id", c.req.param("id"))
    .single();
  if (wdErr || !wd) return c.json({ error: "Not found" }, 404);

  // Fetch latest docket entries from CL
  const since = wd.last_entry_date
    ? `&date_filed__gte=${wd.last_entry_date.slice(0, 10)}`
    : "";
  const url = `${CL_BASE}/docket-entries/?docket=${wd.docket_id}&order_by=-date_filed&page_size=20${since}`;
  const res = await fetch(url, { headers: clHeaders() });
  if (!res.ok) return c.json({ error: `CL returned ${res.status}` }, 502);

  const payload = await res.json() as {
    results: Array<{
      id: number; entry_number?: number; date_filed?: string;
      description?: string; recap_documents?: Array<{ description?: string }>;
    }>;
  };

  const entries = payload.results ?? [];
  let newCount = 0;

  for (const e of entries) {
    const entryDate = e.date_filed ? new Date(e.date_filed).toISOString() : null;
    if (wd.last_entry_date && entryDate && entryDate <= wd.last_entry_date) continue;

    await supabase.from("docket_alerts").insert({
      watched_docket_id: wd.id,
      entry_number: e.entry_number ?? null,
      entry_date: entryDate,
      description: e.description ?? e.recap_documents?.[0]?.description ?? null,
      docket_text: e.description ?? null,
    });
    newCount++;
  }

  // Update last_checked + last_entry_date
  const latestDate = entries[0]?.date_filed
    ? new Date(entries[0].date_filed).toISOString()
    : wd.last_entry_date;

  await supabase
    .from("watched_dockets")
    .update({
      last_checked: new Date().toISOString(),
      last_entry_date: latestDate,
      entry_count: (wd.entry_count ?? 0) + newCount,
    })
    .eq("id", wd.id);

  return c.json({ new_entries: newCount });
});

// PATCH /api/dockets/alerts/:id/seen  — mark alert seen
docketsRouter.patch("/alerts/:id/seen", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);
  const { error } = await supabase
    .from("docket_alerts")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", c.req.param("id"))
    .is("seen_at", null);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// POST /api/dockets/search?q=...  — search CL dockets by case name / docket number
docketsRouter.get("/search", async (c) => {
  const q = c.req.query("q") ?? "";
  const court = c.req.query("court") ?? "";
  if (!q) return c.json({ results: [] });

  const params = new URLSearchParams({ q, order_by: "-date_filed", page_size: "10" });
  if (court) params.set("court", court);

  const res = await fetch(`${CL_BASE}/dockets/?${params}`, { headers: clHeaders() });
  if (!res.ok) return c.json({ error: `CL returned ${res.status}` }, 502);
  const data = await res.json();
  return c.json(data);
});

// GET /api/dockets/alert-count  — unseen alert count for current user
docketsRouter.get("/alert-count", async (c) => {
  if (!supabase) return c.json({ count: 0 });
  const userId = c.get("userId");
  const { data } = await supabase.rpc("get_user_alert_count", { p_user_id: userId });
  return c.json({ count: data ?? 0 });
});

// GET /api/dockets/alerts/recent  — recent unseen alerts for bell dropdown
docketsRouter.get("/alerts/recent", async (c) => {
  if (!supabase) return c.json([]);
  const userId = c.get("userId");
  const { data } = await supabase.rpc("get_user_recent_alerts", { p_user_id: userId, p_limit: 10 });
  return c.json(data ?? []);
});

// POST /api/dockets/poll-all  — cron-triggered; requires X-Poll-Secret header
// Point cron-job.org at: POST https://lexagent-0o5u.onrender.com/api/dockets/poll-all
// with header X-Poll-Secret: <DOCKET_POLL_SECRET>
docketsRouter.post("/poll-all", async (c) => {
  if (!supabase) return c.json({ error: "DB not configured" }, 503);
  if (POLL_SECRET && c.req.header("X-Poll-Secret") !== POLL_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { data: allWatched } = await supabase
    .from("watched_dockets")
    .select("id, docket_id, last_entry_date, entry_count, matter_id, case_name");

  if (!allWatched?.length) return c.json({ polled: 0, new_entries: 0 });

  let totalNew = 0;
  const alertsByUser: Record<string, Array<{ case_name: string; description: string; matter_id: string }>> = {};

  for (const wd of allWatched) {
    const since = wd.last_entry_date
      ? `&date_filed__gte=${(wd.last_entry_date as string).slice(0, 10)}`
      : "";
    const url = `${CL_BASE}/docket-entries/?docket=${wd.docket_id}&order_by=-date_filed&page_size=20${since}`;
    let entries: Array<{ entry_number?: number; date_filed?: string; description?: string; recap_documents?: Array<{ description?: string }> }> = [];

    try {
      const res = await fetch(url, { headers: clHeaders() });
      if (res.ok) {
        const payload = await res.json() as { results?: typeof entries };
        entries = payload.results ?? [];
      }
    } catch { continue; }

    let newForThis = 0;
    for (const e of entries) {
      const entryDate = e.date_filed ? new Date(e.date_filed).toISOString() : null;
      if (wd.last_entry_date && entryDate && entryDate <= wd.last_entry_date) continue;
      await supabase.from("docket_alerts").insert({
        watched_docket_id: wd.id,
        entry_number: e.entry_number ?? null,
        entry_date: entryDate,
        description: e.description ?? e.recap_documents?.[0]?.description ?? null,
        docket_text: e.description ?? null,
      });
      newForThis++;
    }

    if (newForThis > 0) {
      totalNew += newForThis;
      const latestDate = entries[0]?.date_filed
        ? new Date(entries[0].date_filed).toISOString()
        : wd.last_entry_date;
      await supabase.from("watched_dockets").update({
        last_checked: new Date().toISOString(),
        last_entry_date: latestDate,
        entry_count: (wd.entry_count ?? 0) + newForThis,
      }).eq("id", wd.id);

      // Collect alerts per user for email
      const { data: members } = await supabase
        .from("user_roles")
        .select("user_id, alert_email_enabled")
        .eq("org_id", (await supabase.from("matters").select("org_id").eq("id", wd.matter_id).single()).data?.org_id ?? "");

      for (const m of members ?? []) {
        if (!m.alert_email_enabled) continue;
        if (!alertsByUser[m.user_id]) alertsByUser[m.user_id] = [];
        alertsByUser[m.user_id].push({
          case_name: wd.case_name ?? `Docket ${wd.docket_id}`,
          description: entries[0]?.description ?? "New filing",
          matter_id: wd.matter_id,
        });
      }
    }
  }

  // Send emails
  if (RESEND_KEY) {
    for (const [userId, alerts] of Object.entries(alertsByUser)) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email) continue;

      const lines = alerts.map(a =>
        `<li><strong>${a.case_name}</strong>: ${a.description}</li>`
      ).join("");

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: `LexAgent: ${alerts.length} new docket filing${alerts.length > 1 ? "s" : ""}`,
          html: `<p>New filings detected on your watched dockets:</p><ul>${lines}</ul><p><a href="https://lexagent-ochre.vercel.app/dashboard">Open LexAgent</a></p>`,
        }),
      });
    }
  }

  return c.json({ polled: allWatched.length, new_entries: totalNew });
});
