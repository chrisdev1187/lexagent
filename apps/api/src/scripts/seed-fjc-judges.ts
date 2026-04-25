/**
 * Seed FJC Biographical Directory of Article III Federal Judges into Supabase.
 *
 * Usage:
 *   tsx --env-file .env src/scripts/seed-fjc-judges.ts
 *
 * FJC CSV source (download manually or via URL below):
 *   https://www.fjc.gov/sites/default/files/history/judges.csv
 *
 * The CSV is UTF-8 with a BOM. Columns of interest (FJC header names):
 *   nid, Last Name, First Name, Middle Name, Suffix, Birth Year, Death Year,
 *   Gender, Race or Ethnicity, School 1 (undergrad), School 2 (law school),
 *   Appointing President, Party of Appointing President,
 *   Commission Date, Court Name (1), Court Type (1), Termination Date (1)
 *
 * Rows with duplicate nids are upserted (last appointment row wins for court fields).
 */

import { createClient } from "@supabase/supabase-js";

const FJC_CSV_URL =
  "https://www.fjc.gov/sites/default/files/history/judges.csv";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCsvRow(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = splitCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h.trim()] = (cells[idx] ?? "").trim(); });
    rows.push(row);
  }
  return rows;
}

function splitCsvRow(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === "," && !inQuote) {
      cells.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseDate(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseYear(s: string): number | null {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

// FJC column names vary slightly between exports; try multiple candidates
function col(row: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    if (row[n] !== undefined && row[n] !== "") return row[n];
  }
  return "";
}

async function main() {
  console.log("Fetching FJC CSV…");
  const res = await fetch(FJC_CSV_URL);
  if (!res.ok) {
    console.error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const raw = await res.text();
  console.log(`Downloaded ${Math.round(raw.length / 1024)}KB`);

  const rows = parseCsv(raw);
  console.log(`Parsed ${rows.length} rows`);

  const judges = rows
    .filter(r => col(r, "nid", "NID"))
    .map(r => ({
      nid:                  col(r, "nid", "NID"),
      last_name:            col(r, "Last Name"),
      first_name:           col(r, "First Name") || null,
      middle_name:          col(r, "Middle Name") || null,
      suffix:               col(r, "Suffix") || null,
      birth_year:           parseYear(col(r, "Birth Year")),
      death_year:           parseYear(col(r, "Death Year")),
      gender:               col(r, "Gender") || null,
      race_ethnicity:       col(r, "Race or Ethnicity") || null,
      undergrad:            col(r, "School 1", "Undergraduate School 1") || null,
      law_school:           col(r, "School 2", "Law School 1", "Law School") || null,
      appointing_president: col(r, "Appointing President", "President") || null,
      party_of_president:   col(r, "Party of Appointing President", "Party") || null,
      commission_date:      parseDate(col(r, "Commission Date (1)", "Commission Date")),
      court_name:           col(r, "Court Name (1)", "Court Name") || null,
      court_type:           col(r, "Court Type (1)", "Court Type") || null,
      termination_date:     parseDate(col(r, "Termination Date (1)", "Termination Date")),
    }));

  console.log(`Mapped ${judges.length} judges — upserting in batches…`);

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < judges.length; i += BATCH) {
    const batch = judges.slice(i, i + BATCH);
    const { error } = await db.from("judges").upsert(batch, { onConflict: "nid" });
    if (error) { console.error(`Batch ${i}–${i + BATCH} error:`, error.message); }
    else { inserted += batch.length; process.stdout.write(`\r${inserted}/${judges.length}`); }
  }
  console.log(`\nDone — ${inserted} judges upserted.`);
}

main().catch(e => { console.error(e); process.exit(1); });
