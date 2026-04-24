import { LexMemoryDelta, Level3Authority, Level3Strategy, Level3OpenQuestion, Level2Episode, Level1Raw, TabId, CourtTier } from "./types";
import { cavemanCompress } from "./compress";

// ── Regex patterns ────────────────────────────────────────────────────────

// Full Bluebook case citation: Name v. Name, 123 F.3d 456 (Court Year)
const CASE_CITATION_RE = /([A-Z][A-Za-z\s\.\-']+(?:v\.|vs\.)\s*[A-Z][A-Za-z\s\.\-']+),\s*(\d+\s+[A-Za-z\.\s]+\d+(?:,\s+\d+)?)\s*\(([^)]+\s+\d{4})\)/g;

// Statute citation: 42 U.S.C. § 1983 or Fed. R. Civ. P. 12(b)(6)
const STATUTE_CITATION_RE = /(\d+\s+U\.S\.C\.?\s*§\s*[\d\w\(\)]+(?:\s+\(\d{4}\))?|Fed\.\s*R\.\s*(?:Civ\.|Crim\.|Evid\.)\s*P\.\s*[\d\w\(\)\.]+)/g;

// Strategic signal phrases
const STRATEGY_PHRASES = [
  /\bfile\s+(a\s+)?(motion|MTD|MSJ|brief|complaint)\b/i,
  /\bargue\s+(that\s+)?/i,
  /\bchallenge\s+(the\s+)?/i,
  /\bground[s]?\s+(for\s+)?/i,
  /\brecommend\s+(filing|arguing|challenging)\b/i,
  /\bstrongest\s+(argument|ground|basis)\b/i,
];

// Open question signals
const OPEN_QUESTION_PHRASES = [
  /\b(verify|confirm|check|unclear|unresolved|needs?\s+(verification|confirmation|research))\b/i,
  /\[VERIFY[:\s]/i,
  /\bcircuit\s+split\b/i,
  /\b(may|might)\s+need\s+to\b/i,
];

function inferCourtTier(courtStr: string): CourtTier {
  const c = courtStr.toLowerCase();
  if (c.includes("supreme court") && (c.includes("u.s") || !c.includes("state"))) return "scotus";
  if (c.includes("cir.") || c.includes("circuit")) return "circuit";
  if (c.includes("d.") || c.includes("dist.") || c.includes("district")) return "district";
  if (c.includes("supreme")) return "state-high";
  return "unknown";
}

function slugify(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase().substring(0, 60);
}

// Deterministic ID from content (so same citation across calls = same node)
function stableId(prefix: string, content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  }
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

export function extractDelta(responseText: string, tab: TabId): LexMemoryDelta {
  const now = Date.now();
  const nodes: LexMemoryDelta["nodes"] = [];
  const seenIds = new Set<string>();

  // Extract case citations → Level3Authority
  let match: RegExpExecArray | null;
  CASE_CITATION_RE.lastIndex = 0;
  while ((match = CASE_CITATION_RE.exec(responseText)) !== null) {
    const [fullMatch, caseName, reporter, courtYear] = match;
    const citation = `${caseName.trim()}, ${reporter.trim()} (${courtYear.trim()})`;
    const shortCite = caseName.trim().substring(0, 40);
    const id = stableId("auth", citation);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const tier = inferCourtTier(courtYear);
    nodes.push({
      kind: "authority",
      id,
      citation,
      shortCite,
      authorityKind: "case",
      courtTier: tier,
      verified: false,
      confirmedBy: [tab],
      lastRefAt: now,
      confidence: 2,
    } satisfies Level3Authority);
  }

  // Extract statute citations → Level3Authority
  STATUTE_CITATION_RE.lastIndex = 0;
  while ((match = STATUTE_CITATION_RE.exec(responseText)) !== null) {
    const citation = match[0].trim();
    const id = stableId("auth", citation);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    nodes.push({
      kind: "authority",
      id,
      citation,
      shortCite: citation.substring(0, 40),
      authorityKind: "statute",
      courtTier: "unknown",
      verified: false,
      confirmedBy: [tab],
      lastRefAt: now,
      confidence: 2,
    } satisfies Level3Authority);
  }

  // Extract strategic signals → Level3Strategy
  for (const re of STRATEGY_PHRASES) {
    const stratMatch = re.exec(responseText);
    if (!stratMatch) continue;
    // Grab the sentence containing the match
    const start = Math.max(0, stratMatch.index - 80);
    const end = Math.min(responseText.length, stratMatch.index + 120);
    const sentence = responseText.slice(start, end).replace(/\n+/g, " ").trim();
    const id = stableId("strat", sentence);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    nodes.push({
      kind: "strategy",
      id,
      label: slugify(sentence.substring(0, 40)),
      detail: sentence.substring(0, 120),
      confirmedBy: [tab],
      lastRefAt: now,
      confidence: 1,
    } satisfies Level3Strategy);
    break; // one strategic node per response to avoid noise
  }

  // Extract open questions → Level3OpenQuestion
  for (const re of OPEN_QUESTION_PHRASES) {
    const openMatch = re.exec(responseText);
    if (!openMatch) continue;
    const start = Math.max(0, openMatch.index);
    const end = Math.min(responseText.length, openMatch.index + 100);
    const question = responseText.slice(start, end).replace(/\n+/g, " ").trim().substring(0, 100);
    const blocking = /\[VERIFY|circuit\s+split/i.test(question);
    const id = stableId("open", question);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    nodes.push({
      kind: "open",
      id,
      question,
      blocking,
      raisedBy: tab,
      raisedAt: now,
    } satisfies Level3OpenQuestion);
    break;
  }

  // Build L2 episode summary (caveman-compressed)
  const firstParagraph = responseText.slice(0, 400).replace(/#+\s*/g, "").replace(/\*+/g, "").trim();
  const summary = cavemanCompress(firstParagraph).substring(0, 400);

  const episode: Level2Episode = {
    id: `ep_${tab}_${now}`,
    tab,
    date: new Date(now).toISOString().substring(0, 10),
    summary,
    derivedNodeIds: nodes.map(n => n.id),
    createdAt: now,
  };

  // Store raw (truncated to 2000 chars)
  const raw: Level1Raw = {
    id: `raw_${tab}_${now}`,
    tab,
    text: responseText.substring(0, 2000),
    createdAt: now,
  };

  return { nodes, episode, raw };
}
