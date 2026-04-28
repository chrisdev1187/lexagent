// ARES v6 — cite_verify tool.
// Verifies a Bluebook citation by parsing it, checking the reporter/year for
// plausibility, then resolving against CourtListener Citation-Lookup API.
//
// Subsequent history is currently set to "unknown" — full KeyCite-substitute
// requires an eyecite JS port (1.6.3 follow-on). This stub returns enough
// signal for the v5 [VERIFY] / [GOOD LAW WARNING] flag pipeline to function.
//
// Plan: ~/.claude/plans/jaunty-dazzling-horizon.md

import { citationLookup } from "@/lib/courtlistener";
import type { CiteVerifyInput, CiteVerifyOutput } from "./types";
import type { CiteType } from "../shadow-schema";

const REPORTERS = [
  { abbr: "U.S.",      court: "scotus" },
  { abbr: "S. Ct.",    court: "scotus" },
  { abbr: "L. Ed.",    court: "scotus" },
  { abbr: "F.4th",     court: "circuit" },
  { abbr: "F.3d",      court: "circuit" },
  { abbr: "F.2d",      court: "circuit" },
  { abbr: "F. Supp.",  court: "district" },
  { abbr: "F. Supp. 2d", court: "district" },
  { abbr: "F. Supp. 3d", court: "district" },
  { abbr: "F.R.D.",    court: "district" },
];

interface ParsedCite {
  caseName?: string;
  volume?: number;
  reporter?: string;
  page?: number;
  pincite?: number;
  court?: string;
  year?: number;
  type: CiteType;
}

const CASE_RE = /^([^,]+),\s*(\d+)\s+([A-Za-z\.\s]+?)\s+(\d+)(?:,\s*(\d+))?\s*\(([^,]+?)\s+(\d{4})\)\s*$/;
const STATUTE_RE = /^(\d+)\s+U\.?S\.?C\.?\s*§\s*([\d\w\(\)\.]+)/;
const REG_RE = /^(\d+)\s+C\.?F\.?R\.?\s*§\s*([\d\w\(\)\.]+)/;
const RULE_RE = /^Fed\.\s*R\.\s*(?:Civ\.|Crim\.|Evid\.|App\.)\s*P\.\s*[\d\w\(\)\.]+/i;

export function parseCite(raw: string): ParsedCite {
  const trimmed = raw.trim();
  const caseMatch = CASE_RE.exec(trimmed);
  if (caseMatch) {
    return {
      caseName: caseMatch[1].trim(),
      volume: parseInt(caseMatch[2], 10),
      reporter: caseMatch[3].trim(),
      page: parseInt(caseMatch[4], 10),
      pincite: caseMatch[5] ? parseInt(caseMatch[5], 10) : undefined,
      court: caseMatch[6].trim(),
      year: parseInt(caseMatch[7], 10),
      type: "case",
    };
  }
  if (STATUTE_RE.test(trimmed)) return { type: "statute" };
  if (REG_RE.test(trimmed)) return { type: "reg" };
  if (RULE_RE.test(trimmed)) return { type: "rule" };
  return { type: "secondary" };
}

function reporterMatchesCourt(reporter: string | undefined, court: string | undefined): boolean {
  if (!reporter || !court) return false;
  const r = reporter.replace(/\s+/g, "").toLowerCase();
  const c = court.toLowerCase();
  for (const entry of REPORTERS) {
    const target = entry.abbr.replace(/\s+/g, "").toLowerCase();
    if (r === target || r.startsWith(target)) {
      if (entry.court === "scotus" && (c.includes("u.s") || c.includes("supreme"))) return true;
      if (entry.court === "circuit" && (c.includes("cir") || c.includes("circuit"))) return true;
      if (entry.court === "district" && (c.includes("d.") || c.includes("dist"))) return true;
      return false;
    }
  }
  return true; // unknown reporter — don't penalize
}

function yearPlausible(year: number | undefined): boolean {
  if (!year) return false;
  const now = new Date().getFullYear();
  return year >= 1789 && year <= now;
}

export async function citeVerify(input: CiteVerifyInput): Promise<CiteVerifyOutput> {
  const parsed = parseCite(input.raw);

  // Statute / reg / rule citations are not resolved through CL Citation-Lookup
  // (which is opinion-only). Validate by structural plausibility.
  if (parsed.type !== "case") {
    return {
      ok: parsed.type === "statute" || parsed.type === "reg" || parsed.type === "rule",
      normalized: input.raw.trim(),
      type: parsed.type,
      reporter_match: parsed.type !== "secondary",
      year_plausible: yearPlausible(parsed.year),
      subsequent_history: "unknown",
      confidence: parsed.type === "secondary" ? 0.4 : 0.8,
    };
  }

  // Case → CL Citation-Lookup API (existing client).
  const reporterCite = parsed.volume && parsed.reporter && parsed.page
    ? `${parsed.volume} ${parsed.reporter} ${parsed.page}`
    : input.raw;

  let verified = false;
  let normalized = input.raw.trim();
  let sourceUrl: string | undefined;
  try {
    const [hit] = await citationLookup([reporterCite]);
    if (hit?.verified) {
      verified = true;
      sourceUrl = hit.absoluteUrl;
      if (hit.caseName && hit.reporter) {
        normalized = `${hit.caseName}, ${hit.reporter}${parsed.year ? ` (${parsed.year})` : ""}`;
      }
    }
  } catch {
    // Network or CL outage — fall back to structural confidence; do not fabricate verification.
    verified = false;
  }

  const reporterMatch = reporterMatchesCourt(parsed.reporter, parsed.court);
  const yearOk = yearPlausible(parsed.year);

  // Confidence blend: verification dominates, structural checks fill in.
  const structural = (reporterMatch ? 0.4 : 0) + (yearOk ? 0.3 : 0) + (parsed.pincite ? 0.1 : 0);
  const confidence = verified ? Math.min(0.99, 0.7 + structural) : Math.min(0.7, structural + 0.1);

  return {
    ok: verified && reporterMatch && yearOk,
    normalized,
    type: "case",
    reporter_match: reporterMatch,
    year_plausible: yearOk,
    subsequent_history: "unknown", // 1.6.3 follow-on: derive via eyecite + CL opinion-cluster lookups
    confidence,
    source_url: sourceUrl,
  };
}
