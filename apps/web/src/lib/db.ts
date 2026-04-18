import { supabase } from "./supabase";

// Map LexAgent matter shape → Supabase row
function toRow(userId: string, matter: any) {
  const {
    id, title, client, caseType, jurisdiction, status,
    facts, judgeName, court, shared, createdAt,
    // extract fields that have dedicated columns so they don't duplicate in metadata
    ...rest
  } = matter;

  return {
    id,
    user_id: userId,
    title: title || "Untitled Matter",
    client: client || null,
    matter_type: caseType || null,
    jurisdiction: jurisdiction || null,
    status: status || "active",
    facts: facts || null,
    judge_name: judgeName || null,
    court: court || null,
    shared: shared || false,
    metadata: { ...rest, createdAt },
    updated_at: new Date().toISOString(),
  };
}

// Map Supabase row → LexAgent matter shape
function fromRow(row: any) {
  const {
    id, title, client, matter_type, jurisdiction, status,
    facts, judge_name, court, shared, metadata, created_at,
  } = row;
  const meta = metadata || {};
  return {
    // Spread metadata first so explicit column values always win
    ...meta,
    id,
    title,
    client: client || "",
    caseType: matter_type || "",
    jurisdiction: jurisdiction || "",
    status: status || "active",
    facts: facts || "",
    judgeName: judge_name || "",
    court: court || "",
    shared: shared || false,
    createdAt: meta.createdAt || new Date(created_at).getTime(),
    // Ensure arrays always exist even on old rows
    precedents: meta.precedents || [],
    notes: meta.notes || [],
    allVerifications: meta.allVerifications || [],
    deadlines: meta.deadlines || [],
    timeEntries: meta.timeEntries || [],
    totalMinsBilled: meta.totalMinsBilled || 0,
  };
}

export async function loadMatters(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("matters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function upsertMatter(userId: string, matter: any): Promise<void> {
  const row = toRow(userId, matter);
  const { error } = await supabase
    .from("matters")
    .upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function upsertMatters(userId: string, matters: any[]): Promise<void> {
  if (!matters.length) return;
  const rows = matters.map((m) => toRow(userId, m));
  const { error } = await supabase
    .from("matters")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteMatter(matterId: string): Promise<void> {
  const { error } = await supabase
    .from("matters")
    .delete()
    .eq("id", matterId);
  if (error) throw error;
}
