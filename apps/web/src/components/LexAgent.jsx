import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ANTHROPIC_ENDPOINT, COURTLISTENER_BASE, CAP_BASE, GOVINFO_BASE, getAnthropicKey, setAnthropicKey } from "../lib/api";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

// ── API helper: checks .ok AND data.error, throws with clear message ───────
async function safeFetch(url, options={}) {
  // Rewrite direct Anthropic calls to the proxy endpoint (keeps key server-side)
  const isAnthropic = url === "https://api.anthropic.com/v1/messages";
  const resolvedUrl = isAnthropic ? ANTHROPIC_ENDPOINT : url;
  // When calling Anthropic directly (no backend proxy), inject the API key
  const isDirect = isAnthropic && resolvedUrl === "https://api.anthropic.com/v1/messages";
  if (isDirect) {
    const key = getAnthropicKey();
    if (key) {
      options = { ...options, headers: { ...options.headers, "x-api-key": key, "anthropic-version": "2023-06-01" } };
    }
  }
  const res = await fetch(resolvedUrl, options);
  if(!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const e = await res.json(); msg = e.error?.message || e.message || msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  // Claude API error format: {type:"error", error:{type, message}}
  if(data.type==="error" || data.error) {
    const e = data.error || data;
    const type = e.type||"";
    if(type.includes("authentication")) throw new Error("Invalid API key — check Anthropic key");
    if(type.includes("rate_limit"))     throw new Error("Rate limit reached — wait a moment");
    if(type.includes("overloaded"))     throw new Error("Claude is overloaded — try again");
    throw new Error(e.message || "API error");
  }
  return data;
}

// ── Storage (localStorage-backed, replaces window.storage Claude artifact API) ──
const _ns = (k, shared) => (shared ? "lexagent:vault:" : "lexagent:") + k;
const store = {
  get: async (k) => { try { const r = localStorage.getItem(_ns(k)); return r !== null ? JSON.parse(r) : null; } catch { return null; } },
  set: async (k, v) => { try { localStorage.setItem(_ns(k), JSON.stringify(v)); } catch {} },
};
// vaultStore — namespaced separately to preserve vault/non-vault isolation
const vaultStore = {
  get: async (k) => { try { const r = localStorage.getItem(_ns(k, true)); return r !== null ? JSON.parse(r) : null; } catch { return null; } },
  set: async (k, v) => { try { localStorage.setItem(_ns(k, true), JSON.stringify(v)); } catch {} },
  del: async (k) => { try { localStorage.removeItem(_ns(k, true)); } catch {} },
};
const VAULT_KEY = "lex4-api-vault-v1";

// ── Responsive ─────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { isMobile: w < 768, isTablet: w < 1100, width: w };
}

// ── Theme v5 ───────────────────────────────────────────────────────────────
const T = {
  bg:"#08090F",bg2:"#0C0E18",surface:"#10131F",panel:"#141828",panel2:"#191E30",
  border:"#1E2438",borderHi:"#2A3252",
  gold:"#C8A96E",goldBright:"#D8BB80",goldDim:"#C8A96E40",goldFaint:"#C8A96E0E",
  platinum:"#A8B4CC",platDim:"#5A6880",
  text:"#D4D9EC",textSub:"#5E6E90",textMuted:"#303855",
  crimson:"#C43355",crimsonFaint:"#C4335514",
  cobalt:"#4070D8",cobaltFaint:"#4070D814",
  emerald:"#26A860",emeraldFaint:"#26A86014",
  amber:"#C87828",amberFaint:"#C8782814",
  violet:"#8A55D8",violetFaint:"#8A55D814",
  verified:"#26A860",hallucinated:"#C43355",unverified:"#C87828",
  sidebarBg:"#07080E",sidebarBorder:"#181C2C",
};

// ── Bluebook Citation Regex ────────────────────────────────────────────────
// Whitelist of real case law reporters only — excludes U.S.C., C.F.R., etc.
const LEGAL_REPORTERS = new Set([
  "U.S.","S.Ct.","S. Ct.","L.Ed.","L. Ed.","F.","F.2d","F.3d","F.4th","F.Supp.","F.Supp.2d","F.Supp.3d",
  "F.App'x","Fed.Cl.","B.R.","Cal.","Cal.2d","Cal.3d","Cal.4th","Cal.5th",
  "N.Y.","N.Y.2d","N.Y.3d","N.E.","N.E.2d","N.E.3d","A.","A.2d","A.3d",
  "So.","So.2d","So.3d","P.","P.2d","P.3d","S.W.","S.W.2d","S.W.3d",
  "N.W.","N.W.2d","S.E.","S.E.2d","Tex.","Ill.","Fla.","Ga.","Ohio St.",
  "Wash.","Va.","Pa.","Mich.","Wis.","Minn.","Mo.","Ind.","Ala.","Ark.",
]);

// Statute reporter fragments to explicitly exclude
const STATUTE_PATTERNS = /\bU\.S\.C\b|\bC\.F\.R\b|\bFed\.\s*Reg\b|\b§\s*\d/;

function extractCitations(text) {
  if (!text) return [];
  const found = [];
  const seen = new Set();
  // Match: number + reporter-like token(s) + number
  const re = /\b(\d{1,4})\s+((?:[A-Z][a-zA-Z.']*\.?\s*){1,5})(\d{1,4})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0].trim();
    const reporter = m[2].trim();
    // Skip if it looks like a statute or regulation
    if (STATUTE_PATTERNS.test(raw)) continue;
    // Only proceed if the reporter matches a known legal reporter
    const reporterClean = reporter.replace(/\s+/g, "");
    const isKnown = [...LEGAL_REPORTERS].some(r => reporterClean.includes(r.replace(/\s+/g,"")));
    if (!isKnown) continue;
    if (!seen.has(raw) && raw.length > 6) {
      seen.add(raw);
      found.push({ raw, index: m.index });
    }
  }
  return found;
}

// ── Citation Verifier ──────────────────────────────────────────────────────
// Uses a silent Claude call (with web search) to verify citations
// Returns: [{citation, status: "verified"|"not_found"|"ambiguous", caseName, url, notes}]
async function verifyCitations(citations, settings) {
  if (!citations.length) return [];
  const citeList = citations.map(c => c.raw).join("\n");
  const prompt = `Verify each legal case citation below against CourtListener.com and Google Scholar Legal.

Citations:
${citeList}

Return ONLY a JSON array. No preamble, no explanation, no markdown fences:
[{"citation":"<exact>","status":"verified|not_found|ambiguous","caseName":"<name>","court":"<court>","year":"<year>","url":"<courtlistener path>","notes":"<brief>"}]`;

  try {
    const body = {
      model: settings.model || "claude-sonnet-4-6",
      max_tokens: 1500,
      system: "You are a legal citation database lookup tool. Return ONLY a valid JSON array. No preamble, no explanation, no markdown fences whatsoever. Start your response with [ and end with ].",
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20260209", name: "web_search" }],
    };
    const data = await safeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    // Robust extraction: find the JSON array even if there's surrounding text
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return citations.map(c => ({ citation: c.raw, status: "ambiguous", notes: "Verification service unavailable — verify manually" }));
  }
}

// ── CourtListener Direct API ───────────────────────────────────────────────
// Hits the real CourtListener database directly (9M+ opinions, 18M+ citations)

async function courtListenerVerifyDirect(citations, token) {
  if (!citations.length) return [];
  const text = citations.map(c => c.raw).join(". ");
  const headers = { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  const res = await fetch(`${COURTLISTENER_BASE}/citation-lookup/`, {
    method: "POST", headers, body: new URLSearchParams({ text }), mode: "cors",
  });
  if (!res.ok) throw new Error(`CourtListener API ${res.status} — check token in Admin settings`);
  const data = await res.json();
  return citations.map(c => {
    const match = data.find(d => d.citation?.includes(c.raw.replace(/\s+/g,"")) || c.raw.includes(d.citation?.replace(/\s+/g,"")||"__"));
    if (!match) return { citation: c.raw, status: "ambiguous", notes: "Not found in CourtListener response" };
    const cluster = match.clusters?.[0];
    return {
      citation: match.normalized_citations?.[0] || c.raw,
      status: match.status === 200 ? "verified" : match.status === 404 ? "not_found" : "ambiguous",
      caseName: cluster?.case_name || "",
      court: cluster?.court || "",
      year: cluster?.date_filed?.slice(0,4) || "",
      url: cluster?.absolute_url || "",
      notes: match.status === 200 ? "Verified via CourtListener (18M+ citation database)" : match.status === 404 ? "Not found in CourtListener — possible hallucination" : "Ambiguous — verify independently",
      source: "courtlistener_direct",
    };
  });
}

async function courtListenerSearchDirect(query, jurisdiction, token) {
  const jParam = jurisdiction && jurisdiction !== "Other State" ? `&court=${encodeURIComponent(jurisdiction.toLowerCase().replace(/[^a-z]/g,""))}` : "";
  const url = `${COURTLISTENER_BASE}/search/?q=${encodeURIComponent(query)}&type=o&semantic=true&order_by=score+desc${jParam}`;
  const headers = { "Accept": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`CourtListener search ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, 8).map(r => ({
    name: r.caseName || r.caseNameFull || "Unknown",
    citation: (r.citation || [])[0] || "",
    court: r.court || "",
    year: r.dateFiled?.slice(0,4) || "",
    url: r.absolute_url || "",
    snippet: r.snippet?.replace(/<[^>]+>/g,"").slice(0,200) || "",
    citeCount: r.citeCount || 0,
    source: "courtlistener_direct",
    confidence: "High",
  }));
}

// ── CourtListener Judge API ───────────────────────────────────────────────
// Fetches structured judge data: biography, political affiliation, ABA rating,
// career positions, education — 16,000+ federal and state judges
async function courtListenerJudgeLookup(judgeName, token) {
  const headers = { "Accept": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  const url = `${COURTLISTENER_BASE}/people/?name__icontains=${encodeURIComponent(judgeName)}&type=jud&fields=id,name_full,date_dob,date_dod,gender,race,political_affiliations,positions,educations,aba_ratings,sources`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Judge lookup ${res.status}`);
  const data = await res.json();
  if (!data.results?.length) return null;
  const j = data.results[0];
  // Fetch positions for this judge
  const posUrl = `${COURTLISTENER_BASE}/positions/?person=${j.id}&fields=court,position_type,date_start,date_termination,appointer,how_selected,termination_reason`;
  let positions = [];
  try {
    const posRes = await fetch(posUrl, { headers });
    if (posRes.ok) { const posData = await posRes.json(); positions = posData.results || []; }
  } catch {}
  return { ...j, positions };
}

// Build a rich judge context string from CL structured data for Claude to analyze
function buildJudgeContext(judgeData) {
  if (!judgeData) return "";
  const pos = (judgeData.positions || []).map(p =>
    `${p.position_type||"Judge"} at ${p.court||"Unknown Court"} (${p.date_start?.slice(0,4)||"?"}–${p.date_termination?.slice(0,4)||"present"}), Appointed by: ${p.appointer||"Unknown"}`
  ).join("\n");
  const pa = (judgeData.political_affiliations || []).map(a => a.political_party).filter(Boolean).join(", ");
  const ed = (judgeData.educations || []).map(e => `${e.degree_level||""} ${e.school||""}`).join(", ");
  const aba = (judgeData.aba_ratings || []).map(a => `${a.year_rated}: ${a.rating}`).join(", ");
  return `
STRUCTURED JUDGE DATA FROM COURTLISTENER DATABASE (authoritative, not web search):
Name: ${judgeData.name_full}
Born: ${judgeData.date_dob||"Unknown"} | Died: ${judgeData.date_dod||"N/A"}
Gender: ${judgeData.gender||"?"} | Race: ${(judgeData.race||[]).join(", ")||"?"}
Political Affiliation: ${pa||"Not on record"}
ABA Ratings: ${aba||"Not on record"}
Education: ${ed||"Not on record"}
Judicial Positions:
${pos||"No positions on record"}
`.trim();
}

// ── Harvard Caselaw Access Project API ────────────────────────────────────
// 6.7M cases, 1658–2020, fully free, no auth required
// Supplements CourtListener for historical precedents
async function harvardCAPSearch(query, jurisdiction) {
  const jParam = jurisdiction && !["Other State","Federal – SCOTUS","Federal – Circuit","Federal – District"].includes(jurisdiction)
    ? `&jurisdiction=${encodeURIComponent(jurisdiction.toLowerCase().split("–")[0].trim())}`
    : "";
  const url = `${CAP_BASE}/cases/?search=${encodeURIComponent(query)}&full_case=false&page_size=5${jParam}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`Harvard CAP ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, 5).map(c => ({
    name: c.name || c.name_abbreviation || "Unknown",
    citation: c.citations?.[0]?.cite || "",
    court: c.court?.name || "",
    year: c.decision_date?.slice(0,4) || "",
    url: c.frontend_url || "",
    snippet: c.preview || "",
    source: "harvard_cap",
    confidence: "High",
    note: "Harvard Law Library — 360yr archive"
  }));
}

// ── GovInfo API (US Code, CFR, Federal Register) ─────────────────────────
// Official GPO source for statutes, regulations, bills
// Free key from api.data.gov
async function govInfoStatuteLookup(query, govInfoKey) {
  const key = govInfoKey || "DEMO_KEY"; // DEMO_KEY works but is rate-limited
  const url = `${GOVINFO_BASE}/search?query=${encodeURIComponent(query)}&pageSize=5&offsetMark=*&collections=USCODE,CFR,FR&api_key=${key}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`GovInfo ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, 5).map(r => ({
    title: r.title || "",
    citation: r.citation || r.packageId || "",
    collection: r.collectionCode || "",
    dateIssued: r.dateIssued || "",
    url: r.detailsLink || "",
    excerpt: r.context || "",
    source: "govinfo",
  }));
}

// ── Smart verifier: tries CourtListener direct first, falls back to Claude AI
async function smartVerify(citations, settings) {
  if (settings.courtListenerToken) {
    try { return await courtListenerVerifyDirect(citations, settings.courtListenerToken); }
    catch (e) { console.warn("CourtListener direct failed, falling back:", e.message); }
  }
  return verifyCitations(citations, settings);
}

// PDF/document reader utility
const readFileAsBase64 = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result.split(",")[1]);
  r.onerror = reject;
  r.readAsDataURL(file);
});

// Browser-side PDF text extraction via PDF.js
// Returns { text: string, chars: number } or { text: null, chars: 0 } for image-only PDFs
const extractPdfText = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      pages.push(pageText);
    }
    const text = pages.join("\n\n").trim();
    return { text: text || null, chars: text.length };
  } catch {
    return { text: null, chars: 0 };
  }
};

// ── Default Settings ───────────────────────────────────────────────────────
const DEFAULT_SYSTEM = `You are ARES — Autonomous Research & Evidence System — an elite legal AI backed by multiple authoritative legal databases. You produce attorney-grade output indistinguishable from work product of a senior associate at a top-tier litigation firm.

DATA SOURCES AVAILABLE (use in priority order):
1. CourtListener Direct API — 9M+ opinions, 18M+ citations, real-time (when token configured)
2. Harvard Caselaw Access Project — 6.7M cases, 1658–2020, fully authoritative
3. GovInfo API — Official US Code, CFR, Federal Register (when configured)
4. Web search — Google Scholar Legal, CourtListener.com, official court sites

CRITICAL ANTI-HALLUCINATION RULES:
1. NEVER cite a case from memory alone. Every citation must be found through search or provided database context.
2. When given STRUCTURED DATABASE CONTEXT (marked "FROM COURTLISTENER DATABASE" or "FROM HARVARD CAP"), treat that as authoritative — it comes from primary sources.
3. Every citation must include: Case Name, Volume Reporter Page (Court Year)
4. If you cannot find a case through available sources, say so explicitly. Never fabricate.
5. Mark confidence: [VERIFIED] = found in real database, [UNCONFIRMED] = found via web search only.
6. Never fabricate docket numbers, dates, holdings, or statute text.
7. When quoting statutes, always note the source (US Code §, CFR §, etc.) and verify via GovInfo when possible.

RESEARCH PROTOCOL:
• Search databases in priority order above
• For each precedent: full citation, holding, court, year, citation count, relevance
• Structure: Executive Summary → Verified Precedents → Analysis → Strategic Implications
• Attorney-grade prose — cite primary sources, not secondary commentary
• Flag any uncertainty clearly rather than papering over gaps

FEW-SHOT EXAMPLES — OUTPUT FORMAT:

CITATION FORMAT — NON-NEGOTIABLE RULE:
Every single legal citation MUST contain ALL FOUR parts in this exact order:
  [Case Name], [Volume] [Reporter] [Page] ([Court Abbreviation] [Year])

CORRECT: United States v. Weimert, 819 F.3d 351, 355 (7th Cir. 2016)
CORRECT: Neder v. United States, 527 U.S. 1, 25 (1999)
CORRECT: SEC v. Obus, 693 F.3d 276, 282 (2d Cir. 2012)
WRONG:   816 F.2d 94                    ← missing case name AND parenthetical
WRONG:   United States v. Smith (2019)  ← missing volume, reporter, page
WRONG:   United States v. Jones, 450 F.3d 100 ← missing court abbreviation and year

The parenthetical (Court Year) is REQUIRED BY BLUEBOOK RULE 10.4. Without it, attorneys cannot find the case. A citation missing the parenthetical is UNUSABLE and will be flagged as incomplete.

EXAMPLE 2 — Correct legal argument structure:
"The government must prove three elements beyond a reasonable doubt: (1) the defendant devised or participated in a scheme to defraud; (2) the defendant used wire communications in furtherance of the scheme; and (3) the defendant acted with specific intent to defraud. United States v. Autuori, 212 F.3d 105, 115 (2d Cir. 2000) [VERIFIED]."

EXAMPLE 3 — Correct WHEREFORE clause:
"WHEREFORE, Defendant Carlos R. Martinez respectfully requests that this Court dismiss the Indictment in its entirety for failure to state an offense, and grant such other and further relief as the Court deems just and proper.
Respectfully submitted,
[Defense Counsel Name]
[Firm Name]
[Address]
Dated: [Date]"

EXAMPLE 4 — Correct research memo structure:
"## QUESTION PRESENTED
Whether the government can establish specific intent to defraud under 18 U.S.C. § 1343 where the defendant held express discretionary trading authority over client accounts.

## BRIEF ANSWER
Likely no. The 2nd Circuit requires proof that the defendant knew the representations were false at the time made. Good faith reliance on client authorization is a complete defense to specific intent."`;

const DEFAULT_SETTINGS = {
  systemPrompt: DEFAULT_SYSTEM,
  model: "auto",
  temperature: 0.2,
  maxTokens: 2500,
  webSearch: true,
  autoVerify: true,
  courtListenerToken: "", // Free: courtlistener.com/register
  govInfoKey: "",         // api.data.gov — covers GovInfo + Congress.gov + regulations.gov
  openStatesKey: "",      // openstates.org — 50-state legislation
};

// ── Utils ──────────────────────────────────────────────────────────────────
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const fmtDate = d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtTime = d => new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const fmtDuration = s => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`; };
const CASE_TYPES = ["Criminal Defense","Civil Litigation","Corporate / M&A","Employment","Family Law","IP / Patent","Real Estate","Constitutional","Immigration","Personal Injury","Bankruptcy","Securities"];
const JURISDICTIONS = ["Federal – SCOTUS","Federal – Circuit","Federal – District","California","New York","Texas","Florida","Illinois","Georgia","Washington","Other State"];
const STATUS_C = { Active: T.emerald, Pending: T.amber, "On Hold": T.cobalt, Closed: T.textMuted };
const RISK_C = { Low: T.emerald, Medium: T.amber, High: T.crimson, Critical: T.crimson };

// ── Markdown Renderer ──────────────────────────────────────────────────────
function renderMd(text) {
  if (!text) return "";
  // 1. HTML-escape raw text first
  const escaped = text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  // 2. Process block-level elements first (headers, hr, blockquote)
  let html = escaped
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/^---$/gm,"<hr/>")
    .replace(/^&gt; (.+)$/gm,"<blockquote><p>$1</p></blockquote>");

  // 3. Convert inline styles (bold, italic, code) — these are inline, safe inside p
  html = html
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,"<em>$1</em>")
    .replace(/`(.*?)`/g,"<code>$1</code>");

  // 4. Convert shield/confidence badges
  html = html
    .replace(/\[VERIFIED\]/g,`<span class="cite-verified">✓ VERIFIED</span>`)
    .replace(/\[UNCONFIRMED\]/g,`<span class="cite-unconfirmed">⚠ UNCONFIRMED</span>`)
    .replace(/\[HIGH\]/g,`<span class="conf-high">✓ HIGH</span>`)
    .replace(/\[MEDIUM\]/g,`<span class="conf-med">⚠ MED</span>`)
    .replace(/\[LOW\]/g,`<span class="conf-low">⚡ LOW</span>`);

  // 5. Convert list items — gather consecutive li lines into a ul block
  html = html.replace(/((?:^[-•*] .+\n?)+)/gm, (match) => {
    const items = match.trim().split("\n")
      .filter(l => l.match(/^[-•*] /))
      .map(l => `<li>${l.replace(/^[-•*] /,"")}</li>`)
      .join("");
    return `<ul>${items}</ul>\n`;
  });

  // 6. Split into blocks by double-newline and wrap plain-text blocks in <p>
  // Block-level tags that should NOT be wrapped in <p>
  const BLOCK_TAGS = /^<(h[1-6]|ul|ol|li|hr|blockquote|div|table)/;
  const blocks = html.split(/\n{2,}/);
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (BLOCK_TAGS.test(trimmed)) return trimmed;
    // If block contains only inline HTML (strong, em, code, span) wrap in p
    return `<p>${trimmed}</p>`;
  }).filter(Boolean).join("\n");

  return html;
}

// ── Export Functions ───────────────────────────────────────────────────────
function exportToPDF(title, content, caseData, verifications) {
  const verReport = verifications.length ? `
    <div class="ver-report">
      <h2>Citation Verification Report</h2>
      <p style="font-size:10px;color:#666;margin-bottom:12px">Generated by LexAgent ARES Hallucination Shield · ${new Date().toLocaleString()}</p>
      <table>
        <thead><tr><th>Citation</th><th>Case Name</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          ${verifications.map(v => `<tr>
            <td style="font-family:monospace;font-size:10px">${v.citation}</td>
            <td>${v.caseName || "—"}</td>
            <td style="color:${v.status==="verified"?"#1a7a45":v.status==="not_found"?"#c43355":"#d08030"};font-weight:600;text-transform:uppercase">${v.status.replace("_"," ")}</td>
            <td style="font-size:10px;color:#666">${v.notes || "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : "";

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;600&display=swap');
    @page { margin: 1.2in 1in; size: letter; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Source Sans 3', 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; background: white; }
    .header { border-bottom: 2px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 24px; }
    .matter-title { font-family: 'Libre Baskerville', serif; font-size: 18pt; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 9pt; color: #555; line-height: 1.8; }
    .doc-type { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 6px; font-weight: 600; }
    h1 { font-family: 'Libre Baskerville', serif; font-size: 15pt; font-weight: 700; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin: 16px 0 6px; font-weight: 700; }
    h3 { font-size: 11pt; font-weight: 700; color: #222; margin: 12px 0 4px; }
    p { margin-bottom: 10px; } ul { padding-left: 18px; margin-bottom: 10px; } li { margin-bottom: 4px; }
    strong { font-weight: 700; color: #111; } em { font-style: italic; }
    code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f4f4f4; padding: 1px 4px; border-radius: 2px; }
    blockquote { border-left: 3px solid #888; padding: 6px 14px; margin: 10px 0; color: #444; font-style: italic; }
    hr { border: none; border-top: 1px solid #ddd; margin: 14px 0; }
    .cite-verified { background: #e8f5ef; color: #1a7a45; border: 1px solid #a8ddc0; border-radius: 3px; padding: 1px 5px; font-size: 9pt; font-family: monospace; }
    .cite-unconfirmed { background: #fef5e7; color: #d08030; border: 1px solid #f0c070; border-radius: 3px; padding: 1px 5px; font-size: 9pt; font-family: monospace; }
    .conf-high { background: #e8f5ef; color: #1a7a45; border-radius: 3px; padding: 1px 5px; font-size: 9pt; font-family: monospace; }
    .conf-med { background: #fef5e7; color: #d08030; border-radius: 3px; padding: 1px 5px; font-size: 9pt; font-family: monospace; }
    .conf-low { background: #fce8ec; color: #c43355; border-radius: 3px; padding: 1px 5px; font-size: 9pt; font-family: monospace; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 8pt; color: #888; }
    .disclaimer { margin-top: 20px; padding: 12px 16px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; font-size: 8pt; color: #666; line-height: 1.6; }
    .ver-report { margin-top: 30px; padding-top: 20px; border-top: 2px solid #1a1a1a; page-break-before: always; }
    .ver-report h2 { font-size: 13pt; font-family: 'Libre Baskerville',serif; font-weight: 700; margin-bottom: 6px; text-transform: none; letter-spacing: 0; color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
    th { background: #f0f0f0; font-weight: 700; padding: 6px 8px; text-align: left; border: 1px solid #ddd; font-size: 9pt; }
    td { padding: 6px 8px; border: 1px solid #ddd; vertical-align: top; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head><body>
  <div class="header">
    <div class="doc-type">${title.split("—")[0].trim() || "Legal Document"}</div>
    <div class="matter-title">${caseData.title}</div>
    <div class="meta">
      <span><strong>Client:</strong> ${caseData.client}</span> &nbsp;&nbsp;
      <span><strong>Type:</strong> ${caseData.caseType}</span> &nbsp;&nbsp;
      <span><strong>Jurisdiction:</strong> ${caseData.jurisdiction}</span><br>
      <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span> &nbsp;&nbsp;
      <span><strong>ARES Verification:</strong> ${verifications.filter(v=>v.status==="verified").length}/${verifications.length} citations verified</span>
    </div>
  </div>
  <div class="content">${content}</div>
  <div class="disclaimer">
    <strong>⚠ LexAgent Hallucination Shield Notice:</strong> This document was generated by AI and automatically verified against CourtListener and Google Scholar Legal. 
    ${verifications.filter(v=>v.status==="not_found").length > 0 
      ? `<strong style="color:#c43355">${verifications.filter(v=>v.status==="not_found").length} citation(s) could NOT be verified.</strong> Do not file citations marked "NOT FOUND" without independent verification.`
      : verifications.length > 0 
        ? `All ${verifications.filter(v=>v.status==="verified").length} citations verified against legal databases.`
        : "Citations have not been independently verified."
    }
    All AI-generated content must be reviewed and verified by a licensed attorney before filing. LexAgent is not a law firm and does not provide legal advice.
  </div>
  ${verReport}
  <div class="footer">LexAgent ARES v4 · Hallucination Shield Active · Do not file without attorney review</div>
</body></html>`;

  // Try popup first; fall back to blob download if popups are blocked
  const w = window.open("", "_blank");
  if (w && !w.closed) {
    w.document.write(htmlContent);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch {} }, 600);
  } else {
    // Fallback: download as HTML file that user can open and print
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${caseData.title.replace(/[^a-zA-Z0-9]/g,"_").slice(0,40)}_document.html`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function exportToDocx(title, content, caseData, verifications) {
  const verRows = verifications.map(v => `
    <tr>
      <td style="font-family:Courier New;font-size:10pt">${v.citation}</td>
      <td>${v.caseName || "—"}</td>
      <td style="color:${v.status==="verified"?"#1a7a45":v.status==="not_found"?"#c43355":"#d08030"};font-weight:bold">${v.status.replace("_"," ").toUpperCase()}</td>
      <td style="font-size:9pt;color:#666">${v.notes || "—"}</td>
    </tr>`).join("");

  const htmlBody = `
<div style="font-family:Times New Roman;font-size:12pt;color:#1a1a1a">
  <div style="border-bottom:2pt solid black;padding-bottom:12pt;margin-bottom:18pt">
    <div style="font-size:9pt;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:4pt">${title.split("—")[0].trim()}</div>
    <div style="font-size:16pt;font-weight:bold;margin-bottom:4pt">${caseData.title}</div>
    <div style="font-size:9pt;color:#555">
      <b>Client:</b> ${caseData.client} &nbsp;&nbsp;
      <b>Type:</b> ${caseData.caseType} &nbsp;&nbsp;
      <b>Jurisdiction:</b> ${caseData.jurisdiction}<br>
      <b>Generated:</b> ${new Date().toLocaleString()} &nbsp;&nbsp;
      <b>Citations Verified:</b> ${verifications.filter(v=>v.status==="verified").length}/${verifications.length}
    </div>
  </div>
  ${content}
  <div style="margin-top:24pt;padding:10pt;background:#f9f9f9;border:1pt solid #ccc;font-size:9pt;color:#666">
    <b>⚠ LexAgent Hallucination Shield Notice:</b> AI-generated content verified against CourtListener.
    ${verifications.filter(v=>v.status==="not_found").length > 0
      ? `<b style="color:#c43355"> ${verifications.filter(v=>v.status==="not_found").length} citation(s) NOT verified — do not file without independent verification.</b>`
      : ` All citations passed verification.`}
    Must be reviewed by licensed attorney before filing.
  </div>
  ${verifications.length ? `
  <div style="margin-top:24pt;page-break-before:always">
    <div style="font-size:14pt;font-weight:bold;border-bottom:1pt solid black;padding-bottom:6pt;margin-bottom:12pt">Citation Verification Report</div>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">
      <tr style="background:#f0f0f0"><th style="border:1pt solid #ccc;padding:5pt;text-align:left">Citation</th><th style="border:1pt solid #ccc;padding:5pt;text-align:left">Case Name</th><th style="border:1pt solid #ccc;padding:5pt;text-align:left">Status</th><th style="border:1pt solid #ccc;padding:5pt;text-align:left">Notes</th></tr>
      ${verRows}
    </table>
  </div>` : ""}
</div>`;

  const full = `\ufeff<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${title}</title>
<style>
  @page { margin: 1in; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; }
  h1 { font-size: 14pt; font-weight: bold; margin: 16pt 0 8pt; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin: 14pt 0 5pt; }
  p { margin-bottom: 8pt; line-height: 1.6; }
  ul { margin: 8pt 0; padding-left: 18pt; }
  li { margin-bottom: 4pt; }
  strong { font-weight: bold; }
  em { font-style: italic; }
</style>
</head><body>${htmlBody}</body></html>`;

  const blob = new Blob([full], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${caseData.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}_${title.split(" ")[0]}.doc`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSS v5 ────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden;-webkit-text-size-adjust:100%}
body{background:${T.bg};color:${T.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:99px}
::-webkit-scrollbar-thumb:hover{background:${T.borderHi}}
textarea,input,select{font-family:inherit;outline:none}textarea{resize:none}button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.serif{font-family:'Playfair Display',serif}.mono{font-family:'JetBrains Mono',monospace}

/* Animations */
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:0}50%{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes shieldPulse{0%,100%{box-shadow:0 0 0 0 ${T.emerald}00}50%{box-shadow:0 0 0 8px ${T.emerald}00}}
@keyframes slideModal{from{opacity:0;transform:translateY(24px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes verifyPop{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes timerPulse{0%,100%{background:${T.emerald}08}50%{background:${T.emerald}18}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes synthProgress{0%{width:0%}60%{width:75%}85%{width:90%}100%{width:96%}}
@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}

.fade-up{animation:fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both}
.fade-in{animation:fadeIn 0.2s ease both}
.slide-modal{animation:slideModal 0.35s cubic-bezier(0.16,1,0.3,1) both}
.bottom-sheet{animation:sheetUp 0.3s cubic-bezier(0.16,1,0.3,1)}
.scale-in{animation:slideModal 0.2s cubic-bezier(0.16,1,0.3,1) both}
.cmd-in{animation:slideModal 0.25s cubic-bezier(0.16,1,0.3,1) both}

/* Layout utilities */
.scroll-y{overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tab-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none}
.tab-scroll::-webkit-scrollbar{display:none}
.del{text-decoration:line-through;opacity:0.45}

/* Focus rings */
.gold-focus:focus{border-color:${T.gold}50 !important;box-shadow:0 0 0 3px ${T.gold}12 !important}
.interactive{transition:all 0.15s;cursor:pointer}
.interactive:hover{border-color:${T.borderHi} !important}

/* Matter cards */
.case-card{transition:border-color 0.15s,background 0.15s,transform 0.15s;cursor:pointer}
.case-card:hover{border-color:${T.borderHi};background:${T.panel};transform:translateY(-1px)}

/* Sidebar collapse transition */
.sidebar-rail{transition:width 0.22s cubic-bezier(0.4,0,0.2,1),min-width 0.22s cubic-bezier(0.4,0,0.2,1)}
.sidebar-label{transition:opacity 0.15s,width 0.22s cubic-bezier(0.4,0,0.2,1);overflow:hidden;white-space:nowrap}
.sidebar-collapsed .sidebar-label{opacity:0;width:0;pointer-events:none}
.sidebar-toggle{transition:transform 0.22s cubic-bezier(0.4,0,0.2,1)}
.sidebar-collapsed .sidebar-toggle{transform:rotate(180deg)}

/* Prose styles */
.prose h1{font-family:'Playfair Display',serif;font-size:18px;color:${T.text};font-weight:500;margin:18px 0 8px;padding-bottom:8px;border-bottom:1px solid ${T.border}}
.prose h2{font-size:10px;color:${T.gold};font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:16px 0 6px;font-family:'JetBrains Mono',monospace}
.prose h3{font-size:13px;color:${T.platinum};font-weight:600;margin:12px 0 4px}
.prose p{color:${T.text};line-height:1.75;margin-bottom:10px;font-size:13px}
.prose ul{margin-bottom:10px}
.prose li{color:${T.text};font-size:13px;line-height:1.65;margin-bottom:5px;list-style:none;position:relative;padding-left:14px}
.prose li::before{content:'›';position:absolute;left:0;color:${T.gold}}
.prose strong{color:${T.goldBright};font-weight:600}
.prose em{color:${T.platinum};font-style:italic}
.prose code{font-family:'JetBrains Mono',monospace;font-size:11px;background:${T.panel2};color:${T.gold};padding:2px 6px;border-radius:4px;border:1px solid ${T.border}}
.prose hr{border:none;border-top:1px solid ${T.border};margin:14px 0}
.prose blockquote{border-left:2px solid ${T.gold};padding:8px 14px;margin:10px 0;color:${T.textSub};font-style:italic}

/* Citation badges */
.cite-verified{background:${T.emerald}20;color:${T.emerald};border:1px solid ${T.emerald}40;border-radius:3px;padding:1px 6px;font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:0.04em}
.cite-unconfirmed{background:${T.amber}20;color:${T.amber};border:1px solid ${T.amber}40;border-radius:3px;padding:1px 6px;font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:0.04em}
.conf-high{background:${T.emerald}20;color:${T.emerald};border-radius:3px;padding:1px 5px;font-size:10px;font-family:'JetBrains Mono',monospace}
.conf-med{background:${T.amber}20;color:${T.amber};border-radius:3px;padding:1px 5px;font-size:10px;font-family:'JetBrains Mono',monospace}
.conf-low{background:${T.crimson}20;color:${T.crimson};border-radius:3px;padding:1px 5px;font-size:10px;font-family:'JetBrains Mono',monospace}

/* Shield states */
.shield-active{background:${T.emerald}14;border-color:${T.emerald}40 !important}
.shield-warning{background:${T.amber}14;border-color:${T.amber}40 !important}
.shield-danger{background:${T.crimson}14;border-color:${T.crimson}40 !important}
.verify-pop{animation:verifyPop 0.3s cubic-bezier(0.16,1,0.3,1) both}

/* Skeleton loading */
.skeleton{background:linear-gradient(90deg,${T.panel} 25%,${T.panel2} 50%,${T.panel} 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}

@media(max-width:767px){
  .desktop-sidebar{display:none}
  .mobile-bottom-nav{display:flex}
}
@media(min-width:768px){
  .mobile-bottom-nav{display:none}
}
`;

// ── SVG Icons ─────────────────────────────────────────────────────────────
const IC = {
  home:["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M9 22V12h6v10"],
  search:["M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z","M21 21l-4.35-4.35"],
  strategy:["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  draft:["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7","M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"],
  shield:["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z","M9 12l2 2 4-4"],
  clock:["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M12 6v6l4 2"],
  notes:["M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2","M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2"],
  judge:["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"],
  plus:["M12 5v14","M5 12h14"],
  close:["M18 6 6 18","M6 6l12 12"],
  send:["M22 2L11 13","M22 2l-7 20-4-9-9-4 20-7z"],
  check:["M20 6L9 17l-5-5"],
  copy:["M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2","M8 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"],
  trash:["M3 6h18","M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6","M9 6V4h6v2"],
  back:["M19 12H5","M12 5l-7 7 7 7"],
  arrow:["M5 12h14","M12 5l7 7-7 7"],
  admin:["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
  download:["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
  scale:["M12 3v18","M3 9l9-6 9 6","M3 15l9 6 9-6"],
  alert:["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"],
  link:["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71","M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
  pdf:["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"],
  word:["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M12 11v6","M9 14l3 3 3-3"],
  eye:["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
};
const SVG = ({d,size=16,color="currentColor",sw=1.7}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {(Array.isArray(d)?d:[d]).map((p,i)=><path key={i} d={p}/>)}
  </svg>
);
const Icon = ({n,size,color,sw}) => <SVG d={IC[n]||["M12 12"]} size={size} color={color} sw={sw}/>;

// ── Primitives ─────────────────────────────────────────────────────────────
const Divider = ({my=8}) => <div style={{height:1,background:T.border,margin:`${my}px 0`}}/>;
const Spinner = ({size=16,color=T.gold}) => <div style={{width:size,height:size,border:`1.5px solid ${T.border}`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;

const Badge = ({children,color=T.gold,size="sm",dot,style:sx={}}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:3,background:`${color}18`,color,border:`1px solid ${color}35`,borderRadius:3,padding:size==="xs"?"1px 5px":"2px 8px",fontSize:size==="xs"?9:10,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap",flexShrink:0,...sx}}>
    {dot&&<span style={{width:4,height:4,borderRadius:"50%",background:color}}/>}{children}
  </span>
);

const Btn = ({children,onClick,variant="primary",size="md",disabled,icon,full,style:sx={}}) => {
  const vs = {
    primary:{bg:T.gold,fg:"#060300"},
    ghost:{bg:"transparent",fg:T.textSub,border:`1px solid ${T.border}`},
    subtle:{bg:T.panel2,fg:T.text,border:`1px solid ${T.border}`},
    danger:{bg:T.crimsonFaint,fg:T.crimson,border:`1px solid ${T.crimson}40`},
    gold:{bg:T.goldFaint,fg:T.gold,border:`1px solid ${T.goldDim}`},
    emerald:{bg:T.emeraldFaint,fg:T.emerald,border:`1px solid ${T.emerald}40`},
    cobalt:{bg:T.cobaltFaint,fg:T.cobalt,border:`1px solid ${T.cobalt}40`},
  }[variant]||{};
  const pd = {sm:"5px 11px",xs:"3px 8px",md:"8px 16px",lg:"11px 22px"}[size]||"8px 16px";
  const fs = {sm:11,xs:10,md:13,lg:14}[size]||13;
  return (
    <button onClick={disabled?undefined:onClick} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,background:vs.bg||"transparent",color:vs.fg||T.text,border:vs.border||"none",borderRadius:6,padding:pd,fontSize:fs,fontWeight:500,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,transition:"all 0.15s",width:full?"100%":undefined,whiteSpace:"nowrap",...sx}}>
      {icon&&<Icon n={icon} size={fs-1} color={vs.fg||T.text}/>}{children}
    </button>
  );
};

const Field = ({label,value,onChange,type="text",as,opts,rows=3,mono,placeholder,note,style:sx={}}) => (
  <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:10,color:T.textSub,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}</div>}
    {as==="textarea"?<textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,padding:"9px 12px",fontSize:mono?11:13,fontFamily:mono?"'JetBrains Mono',monospace":"inherit",lineHeight:1.65,...sx}} className="gold-focus"/>
    :as==="select"?<select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,padding:"9px 12px",fontSize:13,...sx}} className="gold-focus">
        {opts.map(o=>typeof o==="object"?<option key={o.v} value={o.v}>{o.l}</option>:<option key={o} value={o}>{o}</option>)}
      </select>
    :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,padding:"9px 12px",fontSize:13,...sx}} className="gold-focus"/>
    }
    {note&&<div style={{fontSize:10,color:T.textMuted,marginTop:4}}>{note}</div>}
  </div>
);

const Panel = ({children,style:sx={}}) => (
  <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,...sx}}>{children}</div>
);

const SectionHeader = ({label,color=T.gold,right}) => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <div style={{width:2,height:12,borderRadius:2,background:color}}/>
      <span style={{fontSize:10,color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.09em",textTransform:"uppercase",fontWeight:600}}>{label}</span>
    </div>
    {right}
  </div>
);

const Meter = ({val,max=100,color=T.emerald,label,size="md"}) => {
  const pct = Math.min(100,Math.max(0,(val/max)*100));
  return (
    <div>
      {label&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</span>
        <span style={{fontSize:11,color,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{val}</span>
      </div>}
      <div style={{height:size==="sm"?3:4,background:T.panel2,borderRadius:99,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${color}90,${color})`,borderRadius:99,transition:"width 1s cubic-bezier(0.16,1,0.3,1)"}}/>
      </div>
    </div>
  );
};

// ── Notification System ────────────────────────────────────────────────────
// Types: success | error | warning | info
// Each notification: {id, type, title, message, service, ts}
function useNotifications() {
  const [notes,setNotes] = useState([]);
  const add = useCallback((type, title, message="", service="") => {
    const n = {id:genId(), type, title, message, service, ts:Date.now()};
    setNotes(prev=>[n,...prev].slice(0,6)); // Max 6 visible
    // Auto-dismiss: errors stay 6s, others 3.5s
    setTimeout(()=>setNotes(prev=>prev.filter(x=>x.id!==n.id)), type==="error"?6000:3500);
    return n.id;
  },[]);
  const dismiss = useCallback(id=>setNotes(prev=>prev.filter(x=>x.id!==id)),[]);
  // Convenience shortcuts
  const notify = {
    success:(title,msg,svc)=>add("success",title,msg,svc),
    error:  (title,msg,svc)=>add("error",  title,msg,svc),
    warn:   (title,msg,svc)=>add("warning",title,msg,svc),
    info:   (title,msg,svc)=>add("info",   title,msg,svc),
  };
  return {notes, notify, dismiss};
}

const NOTE_COLORS = {success:T.emerald, error:T.crimson, warning:T.amber, info:T.cobalt};
const NOTE_ICONS  = {success:"check", error:"alert", warning:"alert", info:"search"};

function NotificationCenter({notes, dismiss, isMobile}) {
  if(!notes.length) return null;
  return (
    <div style={{
      position:"fixed",
      bottom:isMobile?72:20,
      right:isMobile?8:20,
      zIndex:9600,
      display:"flex",
      flexDirection:"column",
      gap:6,
      maxWidth:isMobile?"calc(100vw - 16px)":380,
      pointerEvents:"none",
    }}>
      {notes.map(n=>{
        const c = NOTE_COLORS[n.type]||T.cobalt;
        return (
          <div key={n.id} className="slide-modal" style={{
            background:T.panel,
            border:`1px solid ${c}50`,
            borderLeft:`3px solid ${c}`,
            borderRadius:8,
            padding:"10px 14px",
            boxShadow:`0 8px 32px rgba(0,0,0,0.5),0 0 0 1px ${c}18`,
            display:"flex",
            alignItems:"flex-start",
            gap:10,
            pointerEvents:"all",
            animation:"slideModal 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <Icon n={NOTE_ICONS[n.type]} size={14} color={c} style={{marginTop:1,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:n.message?2:0}}>{n.title}</div>
              {n.message&&<div style={{fontSize:11,color:T.textSub,lineHeight:1.45}}>{n.message}</div>}
              {n.service&&(
                <div style={{fontSize:9,color:c,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em",marginTop:3,opacity:0.8}}>
                  via {n.service}
                </div>
              )}
            </div>
            <button onClick={()=>dismiss(n.id)} style={{background:"none",border:"none",padding:2,cursor:"pointer",flexShrink:0,opacity:0.5,marginTop:-1}}>
              <Icon n="close" size={11} color={T.textSub}/>
            </button>
          </div>
        );
      })}
    </div>
  );
}


function ShieldBanner({verifying,verifications,caseData}) {
  if(verifying) return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:`${T.amber}12`,border:`1px solid ${T.amber}35`,borderRadius:7,marginBottom:10}}>
      <Spinner size={12} color={T.amber}/>
      <span style={{fontSize:11,color:T.amber,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em"}}>HALLUCINATION SHIELD ACTIVE — VERIFYING CITATIONS…</span>
    </div>
  );
  const all = verifications||[];
  if(!all.length) return null;
  const verified = all.filter(v=>v.status==="verified").length;
  const bad = all.filter(v=>v.status==="not_found").length;
  const ambig = all.filter(v=>v.status==="ambiguous").length;
  const cls = bad>0?"shield-danger":ambig>0?"shield-warning":"shield-active";
  const color = bad>0?T.crimson:ambig>0?T.amber:T.emerald;
  return (
    <div className={`verify-pop ${cls}`} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",border:`1px solid ${color}50`,borderRadius:7,marginBottom:10}}>
      <Icon n={bad>0?"alert":"shield"} size={14} color={color}/>
      <div style={{flex:1,display:"flex",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,letterSpacing:"0.05em"}}>CITATION SHIELD</span>
        {verified>0&&<Badge color={T.emerald} size="xs">✓ {verified} VERIFIED</Badge>}
        {ambig>0&&<Badge color={T.amber} size="xs">⚠ {ambig} UNCONFIRMED</Badge>}
        {bad>0&&<Badge color={T.crimson} size="xs">✗ {bad} NOT FOUND</Badge>}
      </div>
      {bad>0&&<span style={{fontSize:10,color:T.crimson,maxWidth:200,lineHeight:1.4}}>Do not file unverified citations without independent review</span>}
    </div>
  );
}

// ── Citation Audit Panel ───────────────────────────────────────────────────
function CitationAuditPanel({caseData,settings,onUpdateCase,isMobile,notify}) {
  const all = useMemo(()=>{
    const seen = new Set();
    return (caseData.allVerifications||[]).filter(v=>{
      if(seen.has(v.citation)) return false;
      seen.add(v.citation); return true;
    });
  },[caseData.allVerifications]);

  const [reverifying,setReverifying] = useState(false);

    const reverify = async()=>{
    if(!all.length||reverifying) return;
    setReverifying(true);
    try{
      const citations = all.map(v=>({raw:v.citation}));
      const fresh = await smartVerify(citations, settings);
      // Functional update — avoids stale caseData snapshot
      const freshVerified = fresh.filter(v=>v.status==="verified").length;
      const freshFailed = fresh.filter(v=>v.status==="not_found").length;
      onUpdateCase(prev => {
        const prevAll = prev.allVerifications || [];
        const merged = prevAll.map(v=>{
          const nw = fresh.find(f=>f.citation===v.citation);
          return nw?{...v,...nw}:v;
        });
        return { ...prev, allVerifications: merged };
      });
      const svc = settings?.courtListenerToken?"CourtListener Direct":"AI Verification";
      if(freshFailed>0) notify?.warn(`Re-verify: ${freshFailed} NOT FOUND`, `${freshVerified}/${fresh.length} verified via ${svc}`, svc);
      else notify?.success(`All ${freshVerified} citations re-verified`, `Via ${svc}`, svc);
    }catch(e){
      notify?.error("Re-verification Failed", e.message||"Could not re-verify citations", "Hallucination Shield");
    }
    setReverifying(false);
  };

  const counts = {
    verified: all.filter(v=>v.status==="verified").length,
    not_found: all.filter(v=>v.status==="not_found").length,
    ambiguous: all.filter(v=>v.status==="ambiguous").length,
  };
  const shieldStatus = counts.not_found>0?"DANGER":counts.ambiguous>0?"CAUTION":"CLEAR";
  const shieldColor = {DANGER:T.crimson,CAUTION:T.amber,CLEAR:T.emerald}[shieldStatus];

  return (
    <div className="scroll-y" style={{height:"100%"}}>
      {/* Shield summary */}
      <Panel style={{padding:18,marginBottom:14,borderColor:`${shieldColor}40`,background:`${shieldColor}08`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:11,background:`${shieldColor}20`,border:`1px solid ${shieldColor}40`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Icon n={counts.not_found>0?"alert":"shield"} size={22} color={shieldColor}/>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span className="mono" style={{fontSize:16,fontWeight:700,color:shieldColor,letterSpacing:"0.05em"}}>SHIELD {shieldStatus}</span>
                <Badge color={shieldColor} size="xs">{all.length} citations tracked</Badge>
              </div>
              <div style={{fontSize:12,color:T.textSub,lineHeight:1.5}}>
                Hallucination Shield has verified {counts.verified}/{all.length} citations against CourtListener and Google Scholar Legal.
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:16,flexShrink:0}}>
            {[["VERIFIED",counts.verified,T.emerald],["UNCONFIRMED",counts.ambiguous,T.amber],["NOT FOUND",counts.not_found,T.crimson]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:2}}>{l}</div>
                <div style={{fontSize:22,fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {!settings?.courtListenerToken&&(
          <div style={{background:`${T.amber}15`,border:`1px solid ${T.amber}50`,borderRadius:6,padding:"8px 12px",marginTop:10}}>
            <span style={{fontSize:11,color:T.amber,lineHeight:1.5}}>
              <strong>AI Estimate Mode</strong> — Citations verified against model knowledge only. Add a free CourtListener token in Settings for database-backed verification (18M+ cases).
            </span>
          </div>
        )}
        <Divider my={12}/>
        <div style={{fontSize:11,color:T.textMuted,lineHeight:1.65,marginBottom:10}}>
          <strong style={{color:T.platinum}}>Legal Liability Notice:</strong> Courts are sanctioning attorneys $100K+ for hallucinated citations. This audit trail is your evidence that you performed due diligence. All citations marked "NOT FOUND" must be independently verified before filing with any court.
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="emerald" size="sm" icon="shield" onClick={reverify} disabled={!all.length||reverifying}>{reverifying?"Re-verifying…":"Re-verify All Citations"}</Btn>
          {all.length>0&&<Btn variant="ghost" size="sm" icon="pdf" onClick={()=>{
            const content = all.map(v=>`<p><strong>${v.citation}</strong> — ${v.caseName||"Unknown"} — <span style="color:${v.status==="verified"?"#1a7a45":v.status==="not_found"?"#c43355":"#d08030"}">${v.status.toUpperCase()}</span>${v.notes?` — ${v.notes}`:""}</p>`).join("");
            exportToPDF("Citation Audit Report",content,caseData,all);
          }}>Export Audit PDF</Btn>}
        </div>
      </Panel>

      {all.length===0?(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"50px 20px",gap:12,textAlign:"center"}}>
          <Icon n="shield" size={36} color={T.textMuted}/>
          <div className="serif" style={{fontSize:20,color:T.textMuted,fontStyle:"italic"}}>No citations tracked yet</div>
          <div style={{fontSize:12,color:T.textMuted,maxWidth:380,lineHeight:1.7}}>Start researching in the Research tab. Every citation ARES generates will be automatically extracted and verified here.</div>
        </div>
      ):(
        <div>
          {[{label:"✗ NOT FOUND — Do not file",status:"not_found",color:T.crimson},{label:"⚠ UNCONFIRMED — Verify before filing",status:"ambiguous",color:T.amber},{label:"✓ VERIFIED — Found in legal database",status:"verified",color:T.emerald}].map(group=>{
            const items = all.filter(v=>v.status===group.status);
            if(!items.length) return null;
            return (
              <div key={group.status} style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{height:1,flex:1,background:T.border}}/>
                  <Badge color={group.color} size="xs">{group.label}</Badge>
                  <div style={{height:1,flex:1,background:T.border}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {items.map((v,i)=>(
                    <div key={i} style={{background:T.surface,border:`1px solid ${group.color}35`,borderRadius:7,padding:"11px 14px",borderLeft:`3px solid ${group.color}`}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.text,fontWeight:600}}>{v.citation}</span>
                            <Badge color={group.color} size="xs">{v.status.replace("_"," ")}</Badge>
                            {v.url||settings?.courtListenerToken
                              ? <Badge color={T.emerald} size="xs">DB</Badge>
                              : <Badge color={T.amber} size="xs">AI</Badge>
                            }
                          </div>
                          {v.caseName&&<div style={{fontSize:13,color:T.platinum,fontWeight:500,marginBottom:3}}>{v.caseName}</div>}
                          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                            {v.court&&<span style={{fontSize:11,color:T.textSub}}>{v.court}</span>}
                            {v.year&&<span style={{fontSize:11,color:T.textSub}}>· {v.year}</span>}
                          </div>
                          {v.notes&&<div style={{fontSize:11,color:T.textMuted,marginTop:5,lineHeight:1.5}}>{v.notes}</div>}
                        </div>
                        {v.url&&<a href={`https://www.courtlistener.com${v.url}`} target="_blank" rel="noopener" style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.cobalt,border:`1px solid ${T.cobalt}40`,borderRadius:4,padding:"3px 8px",whiteSpace:"nowrap"}}>
                          <Icon n="link" size={11} color={T.cobalt}/>CourtListener
                        </a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Research Panel ─────────────────────────────────────────────────────────
function ResearchPanel({caseData,settings,onUpdateCase,onLog,isMobile,notify}) {
  const [msgs,setMsgs] = useState([]);
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const [verifying,setVerifying] = useState(false);
  const [lastVerifications,setLastVerifications] = useState([]);
  const [copied,setCopied] = useState(null);
  const [uploadedDocs,setUploadedDocs] = useState([]); // [{name, base64, type}]
  const [clSearchResults,setClSearchResults] = useState([]); // CourtListener direct results
  const endRef = useRef();
  const inputRef = useRef();
  const fileRef = useRef();

  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs.length]);

  useEffect(()=>{
    if(!msgs.length){
      setMsgs([{role:"assistant",id:genId(),ts:Date.now(),content:`# Matter Active: ${caseData.title}\n\n**Client:** ${caseData.client} · **Type:** ${caseData.caseType} · **Jurisdiction:** ${caseData.jurisdiction}${caseData.judge?`\n\n**Presiding Judge:** ${caseData.judge}`:""}\n\n${caseData.facts?`**Key Facts:** ${caseData.facts}\n\n`:""}ARES is active with Hallucination Shield enabled. All citations will be automatically verified against CourtListener and Google Scholar before being marked safe to use.\n\n**Begin with:**\n- Find similar ${caseData.caseType} cases in ${caseData.jurisdiction}\n- What are the key legal standards and burden of proof?\n- Strongest defense arguments with verified citations`}]);
    }
  },[]);

  const send = useCallback(async()=>{
    if(!input.trim()||loading) return;
    const uMsg = {role:"user",id:genId(),ts:Date.now(),content:input};
    setMsgs(m=>[...m,uMsg]);
    const q = input;
    setInput(""); setLoading(true);

    const dataSources = [];
    if(settings.courtListenerToken) dataSources.push("CourtListener Direct API (9M opinions, 18M citations, judge profiles)");
    dataSources.push("Harvard Caselaw Access Project (6.7M cases, 1658–2020, always active)");
    if(settings.govInfoKey) {
      dataSources.push("GovInfo API (US Code, CFR, Federal Register — official GPO source)");
      dataSources.push("Congress.gov API (bills, amendments, committee reports, voting records)");
      dataSources.push("Regulations.gov API (federal rulemaking, public comments, agency dockets)");
    }
    dataSources.push("eCFR API (live Electronic Code of Federal Regulations — always active)");
    dataSources.push("SEC EDGAR (corporate filings: 10-K, 10-Q, 8-K — always active)");
    dataSources.push("USPTO PatentsView (patent full-text, IP case research — always active)");
    if(settings.openStatesKey) dataSources.push("OpenStates API (50-state legislation, bills, legislators)");
    dataSources.push("Web search (Google Scholar Legal, CourtListener.com)");

    const sys = `${settings.systemPrompt}\n\nACTIVE MATTER:\nTitle: ${caseData.title}\nType: ${caseData.caseType}\nJurisdiction: ${caseData.jurisdiction}\nFacts: ${caseData.facts||"Not provided"}\nJudge: ${caseData.judge||"Not specified"}\n\nACTIVE DATA SOURCES (in priority order):\n${dataSources.map((s,i)=>`${i+1}. ${s}`).join("\n")}\n\nPrecedents found so far: ${(caseData.precedents||[]).map(p=>`${p.name} (${p.citation})`).join("; ")||"None"}\n\nIMPORTANT: When you find cases, append JSON:\n<prec>[{"name":"...","citation":"...","court":"...","year":"...","outcome":"...","holding":"...","confidence":"High|Medium|Low"}]</prec>\n\nMANDATORY: After every case citation in your response, append exactly one tag:\n  [DB] = found in CourtListener or Harvard CAP database\n  [WEB] = found via web search this session\n  [MEM] = from training memory only — must be independently verified\nExample: United States v. Weimert, 819 F.3d 351 (7th Cir. 2016) [MEM]`;

    // Build conversation history — Claude API requires first message to be user role
    // The welcome message is role:"assistant" so we must strip any leading assistant messages
    const rawHistory = msgs.slice(-10).map(m=>({role:m.role,content:m.content}));
    const firstUserIdx = rawHistory.findIndex(m=>m.role==="user");
    const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

    // Build userContent — plain text, or multipart array if docs are attached
    const userContent = uploadedDocs.length > 0
      ? [
          ...uploadedDocs.slice(0,3).map(d=>({type:"document",source:{type:"base64",media_type:d.type,data:d.base64}})),
          {type:"text",text:q}
        ]
      : q;

    try {
      const body = {model:settings.model,max_tokens:settings.maxTokens,system:sys,messages:[...history,{role:"user",content:userContent}]};
      if(settings.webSearch) body.tools=[{type:"web_search_20260209",name:"web_search"}];
      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("")||"No response.";

      const pm = text.match(/<prec>(\[[\s\S]*?\])<\/prec>/);
      let parsedPrecs = [];
      if(pm){try{
        parsedPrecs = JSON.parse(pm[1]);
        // Functional update — always merges against latest precedents, not stale caseData snapshot
        onUpdateCase(prev => {
          const existingPrecs = prev.precedents || [];
          const merged = [...existingPrecs, ...parsedPrecs.filter(n=>!existingPrecs.find(p=>p.citation===n.citation))];
          return {...prev, precedents: merged};
        });
      }catch{}}

      const clean = text.replace(/<prec>[\s\S]*?<\/prec>/g,"").trim();

      // Fallback: if no <prec> tags found (LLaMA ignores the instruction), auto-extract citations from response text
      if(!parsedPrecs.length){
        const autoFound = extractCitations(clean);
        if(autoFound.length){
          const autoPrecs = autoFound.map(c=>({
            name:c.raw.split(",")[0].trim(),citation:c.raw,court:"",year:"",
            outcome:"",holding:"",confidence:"Medium",source:"auto_extracted"
          }));
          onUpdateCase(prev=>{
            const existingPrecs = prev.precedents||[];
            const merged=[...existingPrecs,...autoPrecs.filter(n=>!existingPrecs.find(p=>p.citation===n.citation))];
            return {...prev,precedents:merged};
          });
        }
      }
      const aMsg = {role:"assistant",id:genId(),ts:Date.now(),content:clean};
      setMsgs(m=>[...m,aMsg]);
      setUploadedDocs([]);
      onLog({type:"research",caseId:caseData.id,query:q,ts:Date.now(),chars:clean.length});
      // Notify success
      const usedDocs = uploadedDocs.length>0;
      if(usedDocs) setUploadedDocs([]); // clear after send
      notify?.success(
        "ARES Research Complete",
        usedDocs?`Response with ${uploadedDocs.length} document(s) attached`:`${clean.length} chars · ${settings.webSearch?"Web search active":"No web search"}`,
        settings.model
      );

      // Auto-verify citations
      if(settings.autoVerify){
        const cites = extractCitations(clean);
        if(cites.length){
          setVerifying(true);
          setLastVerifications([]);
          const vResults = await smartVerify(cites, settings);
          setLastVerifications(vResults);
          setVerifying(false);
          const verified = vResults.filter(v=>v.status==="verified").length;
          const notFound = vResults.filter(v=>v.status==="not_found").length;
          const svc = settings.courtListenerToken?"CourtListener Direct":"AI Verification";
          if(notFound>0) notify?.warn(`Shield: ${notFound} citation(s) NOT FOUND`, `${verified}/${vResults.length} verified. Do not file unverified citations.`, svc);
          else if(vResults.length>0) notify?.success(`Shield: All ${verified} citations verified`, `Via ${svc}`, svc);

          onUpdateCase(prev => {
            const existing = prev.allVerifications || [];
            const merged2 = [
              ...existing,
              ...vResults.filter(nv => !existing.find(ev => ev.citation === nv.citation))
            ];
            return { ...prev, allVerifications: merged2 };
          });
        }
      }
    }catch(e){
      setMsgs(m=>[...m,{role:"assistant",id:genId(),ts:Date.now(),content:`⚠ Error: ${e.message}`}]);
      notify?.error("ARES Research Failed", e.message, settings.model);
      setVerifying(false);
    }
    setLoading(false);
  },[input,msgs,loading,caseData,settings,onUpdateCase,onLog]);

  const onKey = e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
  const copy = (c,id)=>{navigator.clipboard.writeText(c);setCopied(id);setTimeout(()=>setCopied(null),1800);};

  const QUICK = [
    `Find 5 precedents for this ${caseData.caseType} case`,
    `Key legal standards in ${caseData.jurisdiction}`,
    "Strongest defense arguments with citations",
    "Prosecution's likely theory",
    `${caseData.judge?`Judge ${caseData.judge}'s ruling tendencies`:"Available procedural motions"}`,
  ];

  return (
    <div style={{display:"flex",gap:12,height:"100%",overflow:"hidden"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden",minWidth:0}}>
        <div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:settings.webSearch?T.emerald:T.textMuted,animation:settings.webSearch?"pulse 2s infinite":""}}/>
            <span style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em"}}>ARES · HALLUCINATION SHIELD {settings.autoVerify?"ON":"OFF"}</span>
          </div>
          <div style={{display:"flex",gap:5}}>
            {(caseData.allVerifications?.length>0)&&(
              <Badge color={(caseData.allVerifications||[]).find(v=>v.status==="not_found")?T.crimson:T.emerald} size="xs">
                {(caseData.allVerifications||[]).filter(v=>v.status==="verified").length}/{(caseData.allVerifications||[]).length} verified
              </Badge>
            )}
          </div>
        </div>

        {(verifying||lastVerifications.length>0)&&(
          <div style={{padding:"8px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
            <ShieldBanner verifying={verifying} verifications={lastVerifications}/>
          </div>
        )}

        <div className="scroll-y" style={{flex:1,padding:"14px 14px 6px",display:"flex",flexDirection:"column",gap:12}}>
          {msgs.map(m=>(
            <div key={m.id} style={{display:"flex",gap:9,animation:"fadeUp 0.2s ease both"}}>
              <div style={{width:30,height:30,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:m.role==="user"?`${T.gold}18`:`${T.cobalt}18`,border:`1px solid ${m.role==="user"?T.goldDim:`${T.cobalt}40`}`,marginTop:2}}>
                {m.role==="user"
                  ? <span style={{fontSize:9,color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>YOU</span>
                  : <Icon n="shield" size={14} color={T.cobalt}/>
                }
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <span style={{fontSize:11,color:m.role==="user"?T.gold:T.platinum,fontWeight:500}}>{m.role==="user"?"You":"ARES"}</span>
                  <span style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{fmtTime(m.ts)}</span>
                  <button onClick={()=>copy(m.content,m.id)} style={{background:"none",border:"none",padding:0,marginLeft:"auto",opacity:0.4,transition:"opacity 0.15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.4}>
                    <Icon n={copied===m.id?"check":"copy"} size={11} color={copied===m.id?T.emerald:T.textSub}/>
                  </button>
                </div>
                {m.role==="assistant"
                  ?<div className="prose" dangerouslySetInnerHTML={{__html:renderMd(m.content)}}/>
                  :<div style={{fontSize:13,color:T.text,lineHeight:1.65,background:T.goldFaint,border:`1px solid ${T.gold}20`,borderRadius:7,padding:"9px 12px"}}>{m.content}</div>
                }
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{display:"flex",gap:9,animation:"fadeUp 0.2s ease both"}}>
              <div style={{width:30,height:30,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:`${T.cobalt}18`,border:`1px solid ${T.cobalt}40`,marginTop:2}}>
                <Icon n="shield" size={14} color={T.cobalt}/>
              </div>
              <div style={{background:T.panel,border:`1px solid ${T.borderHi}`,borderRadius:8,padding:"10px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:12,color:T.cobalt,fontWeight:500}}>ARES is researching</span>
                  {[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:T.cobalt,animation:`dotBounce 1.2s ${i*0.15}s infinite ease-in-out`}}/>)}
                </div>
                <div style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>
                  {settings.webSearch?"Searching web + legal databases…":"Querying legal knowledge base…"}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
          {/* Uploaded document pills */}
          {uploadedDocs.length>0&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7}}>
              {uploadedDocs.map((doc,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:5,background:`${T.cobalt}18`,border:`1px solid ${T.cobalt}40`,borderRadius:4,padding:"3px 8px"}}>
                  <Icon n="pdf" size={11} color={T.cobalt}/>
                  <span style={{fontSize:10,color:T.cobalt,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</span>
                  <button onClick={()=>setUploadedDocs(d=>d.filter((_,j)=>j!==i))} style={{background:"none",border:"none",padding:0,cursor:"pointer",color:T.textSub,lineHeight:1}}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Quick chips + CourtListener search */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7,gap:6}}>
            <div className="tab-scroll" style={{display:"flex",gap:4,flex:1}}>
              {QUICK.map((q,i)=>(
                <button key={i} onClick={()=>{setInput(q);setTimeout(()=>inputRef.current?.focus(),0);}}
                  style={{fontSize:10,color:T.textSub,background:T.panel,border:`1px solid ${T.border}`,borderRadius:20,padding:"5px 11px",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s",fontFamily:"'Plus Jakarta Sans',sans-serif",flexShrink:0}}
                  onMouseEnter={e=>{e.currentTarget.style.color=T.gold;e.currentTarget.style.borderColor=T.goldDim;e.currentTarget.style.background=T.goldFaint;}}
                  onMouseLeave={e=>{e.currentTarget.style.color=T.textSub;e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.panel;}}>
                  {q}
                </button>
              ))}
            </div>
            {/* CourtListener direct search button */}
            {settings.courtListenerToken&&(
              <button onClick={async()=>{
                if(!input.trim()) return;
                setLoading(true);
                try{
                  const results = await courtListenerSearchDirect(input, caseData.jurisdiction, settings.courtListenerToken);
                  const precs = results.map(r=>({name:r.name,citation:r.citation,court:r.court,year:r.year,holding:r.snippet,confidence:"High",source:"courtlistener_direct"}));
                  onUpdateCase(prev=>{
                    const existing = prev.precedents||[];
                    const merged = [...existing,...precs.filter(p=>!existing.find(e=>e.citation===p.citation))];
                    return {...prev,precedents:merged};
                  });
                  setMsgs(m=>[...m,{role:"assistant",id:genId(),ts:Date.now(),content:`## CourtListener Direct Search Results\n\n**Query:** ${input}\n\n${results.map((r,i)=>`### ${i+1}. ${r.name}\n**Citation:** ${r.citation}  \n**Court:** ${r.court} · ${r.year} · ${r.citeCount} citations  \n${r.snippet||""}\n[View on CourtListener](https://www.courtlistener.com${r.url})\n`).join("\n---\n")}\n\n*${results.length} cases retrieved from CourtListener database (9M+ opinions). Added to precedents.*`}]);
                }catch(e){
                  notify?.error("CourtListener Search Failed", e.message||"Database query error", "CourtListener Direct");
                  setMsgs(m=>[...m,{role:"assistant",id:genId(),ts:Date.now(),content:`⚠ CourtListener error: ${e.message}`}]);
                }
                setLoading(false);
              }}
                style={{fontSize:10,color:T.cobalt,background:T.cobaltFaint,border:`1px solid ${T.cobalt}40`,borderRadius:4,padding:"4px 9px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>
                🏛 CL Direct
              </button>
            )}
            {/* Harvard CAP search — 6.7M cases, 1658–2020, always free */}
            <button onClick={async()=>{
              if(!input.trim()) return;
              setLoading(true);
              try{
                const results = await harvardCAPSearch(input, caseData.jurisdiction);
                if(!results.length) throw new Error("No results — try different search terms");
                const precs = results.map(r=>({name:r.name,citation:r.citation,court:r.court,year:r.year,holding:r.snippet,confidence:"High",source:"harvard_cap"}));
                onUpdateCase(prev=>{
                  const existing = prev.precedents||[];
                  const merged = [...existing,...precs.filter(p=>!existing.find(e=>e.citation===p.citation))];
                  return {...prev,precedents:merged};
                });
                setMsgs(m=>[...m,{role:"assistant",id:genId(),ts:Date.now(),content:`## Harvard Caselaw Access Project Results\n\n**Query:** ${input}\n\n${results.map((r,i)=>`### ${i+1}. ${r.name}\n**Citation:** ${r.citation}  \n**Court:** ${r.court} · ${r.year}  \n${r.snippet||""}\n[View on CAP](${r.url})\n`).join("\n---\n")}\n\n*${results.length} cases from Harvard Law Library (6.7M cases, 1658–2020). Added to precedents.*`}]);
              }catch(e){
                notify?.error("Harvard CAP Failed", e.message||"Database query error", "Harvard Caselaw Access Project");
                setMsgs(m=>[...m,{role:"assistant",id:genId(),ts:Date.now(),content:`⚠ Harvard CAP error: ${e.message}`}]);
              }
              setLoading(false);
            }}
              style={{fontSize:10,color:T.violet,background:T.violetFaint,border:`1px solid ${T.violet}40`,borderRadius:4,padding:"4px 9px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>
              🎓 Harvard CAP
            </button>
          </div>

          <div style={{display:"flex",gap:6,alignItems:"flex-end"}}>
            {/* Hidden file input */}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" multiple style={{display:"none"}}
              onChange={async e=>{
                const files = Array.from(e.target.files||[]);
                const docs = await Promise.all(files.map(async f=>({
                  name:f.name,
                  base64: await readFileAsBase64(f),
                  type: f.type||"application/pdf",
                })));
                setUploadedDocs(d=>[...d,...docs]);
                e.target.value="";
              }}/>
            {/* Upload button */}
            <button onClick={()=>fileRef.current?.click()}
              title="Attach PDF or document for ARES to analyze"
              style={{width:42,height:42,borderRadius:7,background:uploadedDocs.length?T.cobaltFaint:T.panel2,border:`1px solid ${uploadedDocs.length?T.cobalt:T.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
              <Icon n="pdf" size={15} color={uploadedDocs.length?T.cobalt:T.textMuted}/>
            </button>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey} ref={inputRef}
              placeholder="Query the legal database or ask about attached documents… (Enter to send)" rows={2}
              style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,padding:"9px 12px",fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.5}} className="gold-focus"/>
            <button onClick={send} disabled={loading||!input.trim()}
              style={{width:42,height:42,borderRadius:7,background:input.trim()&&!loading?T.gold:T.panel2,border:`1px solid ${input.trim()&&!loading?T.gold:T.border}`,cursor:input.trim()&&!loading?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",flexShrink:0}}>
              <Icon n="send" size={14} color={input.trim()&&!loading?"#050200":T.textMuted}/>
            </button>
          </div>
        </div>
      </div>

      {/* Precedents sidebar */}
      {!isMobile&&(
        <div style={{width:264,flexShrink:0,display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
          <Panel style={{padding:14}}>
            <SectionHeader label={`Precedents (${(caseData.precedents||[]).length})`} color={T.gold}/>
            {!(caseData.precedents||[]).length
              ?<div style={{fontSize:12,color:T.textMuted,textAlign:"center",padding:"16px 0",lineHeight:1.6}}>Ask ARES to find similar cases</div>
              :(caseData.precedents||[]).map((p,i)=>(
                <div key={i} style={{background:T.panel2,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 11px",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.text,lineHeight:1.35,marginBottom:3}}>{p.name}</div>
                  <div style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono',monospace",marginBottom:5,wordBreak:"break-all"}}>{p.citation}</div>
                  <div style={{fontSize:10,color:T.textSub,marginBottom:5}}>{p.court} · {p.year}</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {p.outcome&&<Badge color={T.emerald} size="xs">{p.outcome}</Badge>}
                    {p.confidence&&<Badge color={p.confidence==="High"?T.emerald:p.confidence==="Medium"?T.amber:T.crimson} size="xs">{p.confidence}</Badge>}
                    {(caseData.allVerifications||[]).find(v=>v.citation===p.citation)&&(()=>{
                      const vr = (caseData.allVerifications||[]).find(v=>v.citation===p.citation);
                      return <Badge color={vr.status==="verified"?T.emerald:vr.status==="not_found"?T.crimson:T.amber} size="xs">
                        {vr.status==="verified"?"✓ Verified":vr.status==="not_found"?"✗ Not Found":"⚠ Unconfirmed"}
                      </Badge>;
                    })()}
                  </div>
                  {p.holding&&<div style={{fontSize:11,color:T.platDim,marginTop:7,lineHeight:1.5,borderTop:`1px solid ${T.border}`,paddingTop:7}}>{p.holding.slice(0,130)}{p.holding.length>130?"…":""}</div>}
                </div>
              ))
            }
          </Panel>
        </div>
      )}
    </div>
  );
}

// ── Draft Panel with Export ────────────────────────────────────────────────
function DraftPanel({caseData,settings,onLog,isMobile,notify}) {
  const DTYPES = [
    {id:"memo",label:"Research Memo",icon:"search",desc:"Issue analysis with citations"},
    {id:"motion_dismiss",label:"Motion to Dismiss",icon:"shield",desc:"Criminal 12(b)(3)(B) or Civil 12(b)(6)"},
    {id:"summary_judgment",label:"Summary Judgment",icon:"scale",desc:"No genuine dispute of fact"},
    {id:"demand",label:"Demand Letter",icon:"draft",desc:"Pre-litigation demand"},
    {id:"opening",label:"Opening Statement",icon:"notes",desc:"Trial opening narrative"},
    {id:"cross_exam",label:"Cross-Examination Qs",icon:"eye",desc:"Witness questioning outline"},
    {id:"settlement",label:"Settlement Memo",icon:"strategy",desc:"Confidential settlement analysis"},
    {id:"appeal",label:"Notice of Appeal",icon:"alert",desc:"Appellate court filing"},
  ];
  // All hooks at the top — React Rules of Hooks
  const [type,setType] = useState(null);
  const [instr,setInstr] = useState("");
  const [draft,setDraft] = useState("");
  const [loading,setLoading] = useState(false);
  const [exporting,setExporting] = useState(null);
  const [mobileView, setMobileView] = useState("config"); // "config"|"output"

  const generate = async()=>{
    if(!type||loading) return;
    setLoading(true); setDraft("");
    const dt = DTYPES.find(d=>d.id===type);
    // Detect criminal vs civil to select the correct motion to dismiss rule
    const isCriminalCase = /criminal|felony|misdemeanor|indictment|charge|wire fraud|securities fraud|drug|assault|robbery|conspiracy|federal prosecution/i.test(caseData.caseType||"");
    const mtdRule = isCriminalCase
      ? "Fed. R. Crim. P. 12(b)(3)(B) (failure to state an offense) or 12(b)(3)(A) (defect in indictment)"
      : "Fed. R. Civ. P. 12(b)(6) (failure to state a claim) or 12(b)(1) (lack of subject matter jurisdiction)";
    const jxLower = (caseData.jurisdiction||"").toLowerCase();
    const mtdLocalRule = (jxLower.includes("sdny")||jxLower.includes("southern district of new york"))
      ? "SDNY Local Rule 7.1" : "applicable local rules";

    const DOC_STRUCTURE = {
      motion_dismiss:`REQUIRED SECTIONS (use these exact headers in order):
# [COURT NAME AND DIVISION]
# [CASE CAPTION — PARTY v. PARTY, Case No.]
# MOTION TO DISMISS
## INTRODUCTION
## STATEMENT OF FACTS
## LEGAL STANDARD
Pursuant to ${mtdRule} and ${mtdLocalRule}, [party] moves to dismiss because [grounds]. Under this standard, [applicable legal standard text].
## ARGUMENT
### I. [First Legal Argument]
### II. [Second Legal Argument]
### III. [Third Legal Argument]
## CONCLUSION
End with: WHEREFORE, [party] respectfully requests that this Court [specific relief requested], and grant such other and further relief as the Court deems just and proper.
[Signature block: Respectfully submitted, Attorney name, firm, address, date]`,
      summary_judgment:`REQUIRED SECTIONS:
# MOTION FOR SUMMARY JUDGMENT
## INTRODUCTION
## STATEMENT OF UNDISPUTED MATERIAL FACTS (numbered)
## LEGAL STANDARD
## ARGUMENT
### I. [Heading]
## CONCLUSION
End with: WHEREFORE, [party] respectfully moves this Court to enter summary judgment in its favor.`,
      demand:`REQUIRED FORMAT:
[Date]
[Recipient name and address]
Via [delivery method]
Re: [Subject]
Dear [Recipient]:
[Opening paragraph — clearly state the demand]
[Factual background]
[Legal basis and claims]
[Specific demand with dollar amount or action required]
[Deadline — typically 30 days]
[Consequences of non-compliance]
Sincerely,
[Attorney name, firm, bar number]`,
      opening:`REQUIRED SECTIONS:
## OPENING STATEMENT
### Introduction
### Overview of the Case
### Key Facts We Will Prove
### Preview of Evidence
### Theme and Theory
### Conclusion (what we will ask the jury to do)`,
      settlement:`REQUIRED SECTIONS:
# SETTLEMENT MEMORANDUM — CONFIDENTIAL
## TO / FROM / DATE / RE
## EXECUTIVE SUMMARY
## CASE OVERVIEW AND POSTURE
## STRENGTHS OF OUR POSITION
## RISKS AND WEAKNESSES
## SETTLEMENT VALUE ANALYSIS
## RECOMMENDATION
## PROPOSED TERMS`,
      appeal:`REQUIRED SECTIONS:
# NOTICE OF APPEAL
[Court, case number, parties]
## NOTICE OF APPEAL
[Party] hereby appeals to [appellate court] from [specific order/judgment, dated X].
## GROUNDS FOR APPEAL
## RELIEF SOUGHT
Respectfully submitted, [signature block]`,
      memo:`REQUIRED SECTIONS:
# MEMORANDUM OF LAW
TO: [Recipient]
FROM: [Author]
DATE: [Date]
RE: [Subject]
## QUESTION PRESENTED
## BRIEF ANSWER
## STATEMENT OF FACTS
## DISCUSSION
### I. [Legal Issue One]
### II. [Legal Issue Two]
## CONCLUSION`,
      cross_exam:`REQUIRED SECTIONS:
# CROSS-EXAMINATION OUTLINE: [WITNESS NAME]
## OBJECTIVES
## BACKGROUND / CREDIBILITY ATTACKS
## FACTUAL DISPUTES (numbered questions)
## PRIOR INCONSISTENT STATEMENTS
## KEY QUESTIONS AND FOLLOW-UPS
## CLOSING SEQUENCE`,
    };
    // CHANGE 5: Jurisdiction-aware caption and court rule lookup
    const JURISDICTION_RULES = {
      "federal": {
        caption: `IN THE UNITED STATES DISTRICT COURT\nFOR THE [DISTRICT NAME]\n\n[PARTY],\n        Plaintiff/Prosecution,\n\nv.\t\t\t\t\tCase No. [XX-cr-XXXX]\n\n[PARTY],\n        Defendant.`,
        rules: "Follow Federal Rules of Criminal/Civil Procedure. Use CM/ECF formatting. Double-space body text. 12pt Times New Roman or Courier. 1-inch margins. Page limit per local rules.",
        cite: "Use federal citation format: Vol. F.Xd Page (Circuit Year) or Vol. U.S. Page (Year)",
      },
      "new york": {
        caption: `SUPREME COURT OF THE STATE OF NEW YORK\nCOUNTY OF [COUNTY]\n\n[PARTY],\n        Plaintiff,\n-against-\n[PARTY],\t\t\t\tIndex No. [XXXXXX/XXXX]\n        Defendant.`,
        rules: "Follow CPLR. Caption uses '-against-' not 'v.' for state court. Affirmation format for attorney declarations. County clerk filing requirements.",
        cite: "NY cases: Party v. Party, Vol A.D.Xd/N.Y.Xd Page (App.Div./Ct.App. Year)",
      },
      "california": {
        caption: `[COURT NAME]\nSTATE OF CALIFORNIA, COUNTY OF [COUNTY]\n\n[PARTY],\n        Plaintiff,\nvs.\n[PARTY],\t\t\t\tCase No. [XXXXXXXX]\n        Defendant.`,
        rules: "Follow California Rules of Court. Declarations under penalty of perjury. Point headings required. Table of contents for briefs over 10 pages.",
        cite: "CA cases: Party v. Party (Year) Vol Cal.Xd/Cal.App.Xd Page",
      },
      "texas": {
        caption: `IN THE [COURT NAME]\n[COUNTY] COUNTY, TEXAS\n\n[PARTY],\n        Plaintiff,\nv.\n[PARTY],\t\t\t\tCause No. [XXXXXXXXXX]\n        Defendant.`,
        rules: "Follow Texas Rules of Civil/Criminal Procedure. Verification requirements. Certificate of service. Texas citation format.",
        cite: "TX cases: Party v. Party, Vol S.W.Xd/Tex. Page (Tex. Year)",
      },
      "illinois": {
        caption: `IN THE CIRCUIT COURT OF [COUNTY] COUNTY\nSTATE OF ILLINOIS\n\n[PARTY],\n        Plaintiff,\nv.\n[PARTY],\t\t\t\tCase No. [XX L XXXXXX]\n        Defendant.`,
        rules: "Follow Illinois Supreme Court Rules and Illinois Code of Civil Procedure. Cook County has specific local rules for e-filing.",
        cite: "IL cases: Party v. Party, Vol Ill.Xd/Ill.App.Xd Page (Year)",
      },
    };

    // Detect jurisdiction type from case data
    const jx = (caseData.jurisdiction||"").toLowerCase();
    let jxRules = JURISDICTION_RULES["federal"]; // default
    if(jx.includes("new york") || jx.includes("n.y.") || jx.includes("sdny") || jx.includes("edny")) {
      jxRules = jx.includes("federal") || jx.includes("district") || jx.includes("sdny") || jx.includes("edny")
        ? JURISDICTION_RULES["federal"]
        : JURISDICTION_RULES["new york"];
    } else if(jx.includes("california") || jx.includes("cal.") || jx.includes("n.d. cal") || jx.includes("c.d. cal")) {
      jxRules = jx.includes("federal") || jx.includes("district") ? JURISDICTION_RULES["federal"] : JURISDICTION_RULES["california"];
    } else if(jx.includes("texas")) {
      jxRules = jx.includes("federal") || jx.includes("district") ? JURISDICTION_RULES["federal"] : JURISDICTION_RULES["texas"];
    } else if(jx.includes("illinois") || jx.includes("cook county")) {
      jxRules = jx.includes("federal") || jx.includes("district") ? JURISDICTION_RULES["federal"] : JURISDICTION_RULES["illinois"];
    }

    const jurisdictionNote = `
JURISDICTION: ${caseData.jurisdiction}
CAPTION FORMAT TO USE:
${jxRules.caption}
COURT RULES: ${jxRules.rules}
CITATION FORMAT: ${jxRules.cite}`;

    const structure = (DOC_STRUCTURE[type] || `Use complete professional legal document structure with proper section headings. For motions, include a WHEREFORE clause and prayer for relief.`) + jurisdictionNote;
    const prompt = `You are a senior litigation attorney drafting a complete, court-ready ${dt.label}. Write the full document — do not summarize, do not truncate, do not add notes like "[continue as needed]".

MATTER: ${caseData.title}
Client: ${caseData.client}
Type: ${caseData.caseType} | Jurisdiction: ${caseData.jurisdiction}
Court / Judge: ${caseData.judge||"Not specified"}
Facts: ${caseData.facts||"Not provided"}
Charges / Claims: ${caseData.charges||caseData.caseType}
Verified Precedents Available: ${(caseData.allVerifications||[]).filter(v=>v.status==="verified").map(v=>`${v.caseName||""} ${v.citation}`).join("; ")||"None yet — use standard legal research from memory"}
Defense Theory: ${caseData.strategy?.defenseTheory||caseData.strategy?.summaryAssessment||"Not generated — use facts above"}
Attorney Instructions: ${instr||"Standard professional format — thorough and complete"}

DOCUMENT STRUCTURE — FOLLOW EXACTLY:
${structure}

CITATION RULES:
- Mark verified precedents as [VERIFIED] in text
- If no verified precedents, cite well-known cases in EXACT Bluebook format: Case Name, Vol. F.Xd Page (Court Year)
- EXAMPLE of correct format: United States v. Weimert, 819 F.3d 351, 355 (7th Cir. 2016)
- EXAMPLE of correct format: Neder v. United States, 527 U.S. 1, 25 (1999)  
- The parenthetical with court abbreviation and 4-digit year is REQUIRED — never omit it
- Never invent citations — if unsure, state the legal principle without citing a specific case

BEFORE WRITING THE BODY: Your document MUST end with exactly this block — write it now at the end after you complete all sections:

---REQUIRED ENDING (copy verbatim, fill in brackets)---
## CONCLUSION
For the foregoing reasons, Defendant ${caseData.client} respectfully requests that this Court [specific relief requested].

WHEREFORE, Defendant ${caseData.client} respectfully requests that this Court [specific relief — e.g., dismiss all counts of the Indictment with prejudice, grant the motion, etc.], together with such other and further relief as the Court deems just and proper.

Respectfully submitted,

______________________________
[Attorney Name], Esq.
[Law Firm Name]
[Street Address]
[City, State, ZIP]
[Phone] | [Email]
Bar No. [XXXXX]
Attorney for Defendant ${caseData.client}

Dated: [Date]
---END REQUIRED ENDING---

Now write the complete ${dt.label}, starting with the caption. The REQUIRED ENDING block above MUST appear at the bottom of your output.`;


    // CHANGE 2: Citation grounding — fetch real holdings from CourtListener before drafting
    let groundedCitations = "";
    const verifiedCites = (caseData.allVerifications||[]).filter(v=>v.status==="verified" && v.citation);
    if(verifiedCites.length > 0 && settings.courtListenerToken) {
      try {
        // Fetch the top 3 verified citations' opinion snippets from CourtListener
        const snippets = await Promise.all(
          verifiedCites.slice(0,3).map(async v => {
            try {
              const searchUrl = `${COURTLISTENER_BASE}/search/?q=${encodeURIComponent(v.citation)}&type=o&fields=caseName,citation,court_id,dateFiled,headmatter&page_size=1`;
              const res = await fetch(searchUrl, { headers: { Authorization: `Token ${settings.courtListenerToken}` } });
              if(!res.ok) return null;
              const data = await res.json();
              const op = data.results?.[0];
              if(!op) return null;
              return `CASE: ${op.caseName||v.caseName||""} | CITATION: ${v.citation} | COURT: ${op.court_id||""} | DATE: ${op.dateFiled||""} | HOLDING SNIPPET: ${(op.headmatter||"").slice(0,300)}`;
            } catch { return null; }
          })
        );
        const valid = snippets.filter(Boolean);
        if(valid.length > 0) {
          groundedCitations = "\n\nGROUNDED CITATION CONTEXT (from CourtListener database — use these holdings in the document):\n" + valid.join("\n\n");
        }
      } catch(e) { /* grounding failed — continue without it */ }
    }
    const groundedPrompt = prompt + groundedCitations;

    try{
      const draftModel = settings.model;
      const body = {model:draftModel,max_tokens:Math.max(settings.maxTokens,6000),system:settings.systemPrompt,messages:[{role:"user",content:groundedPrompt}]};
      if(settings.webSearch && !groundedCitations) body.tools=[{type:"web_search_20260209",name:"web_search"}];
      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      
      setDraft((data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("")||"");
      onLog({type:"draft",docType:type,caseId:caseData.id,ts:Date.now()});
      notify?.success("Draft Complete", DTYPES.find(d=>d.id===type)?.label||"Document", settings.model);
    }catch(e){
      setDraft(`Error: ${e.message}`);
      notify?.error("Draft Failed", e.message, settings.model);
    }
    setLoading(false);
  };

  const doExport = (format) => {
    if(!draft) return;
    const dt = DTYPES.find(d=>d.id===type);
    const title = `${dt?.label||"Document"} — ${caseData.title}`;
    const verifications = caseData.allVerifications||[];
    // For DOCX: convert CSS classes to inline styles so Word renders them
    const docxContent = renderMd(draft)
      .replace(/class="cite-verified"/g, `style="background:#e8f5ef;color:#1a7a45;border:1px solid #a8ddc0;border-radius:3px;padding:1px 5px;font-size:10pt;font-family:Courier New"`)
      .replace(/class="cite-unconfirmed"/g, `style="background:#fef5e7;color:#d08030;border:1px solid #f0c070;border-radius:3px;padding:1px 5px;font-size:10pt;font-family:Courier New"`)
      .replace(/class="conf-high"/g, `style="background:#e8f5ef;color:#1a7a45;border-radius:3px;padding:1px 5px;font-size:9pt;font-family:Courier New"`)
      .replace(/class="conf-med"/g, `style="background:#fef5e7;color:#d08030;border-radius:3px;padding:1px 5px;font-size:9pt;font-family:Courier New"`)
      .replace(/class="conf-low"/g, `style="background:#fce8ec;color:#c43355;border-radius:3px;padding:1px 5px;font-size:9pt;font-family:Courier New"`);
    setExporting(format);
    if(format==="pdf") exportToPDF(title, renderMd(draft), caseData, verifications);
    else exportToDocx(title, docxContent, caseData, verifications);
    setTimeout(()=>setExporting(null),1500);
  };

  return (
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:12,height:"100%",overflow:"hidden"}}>
      {/* Mobile: tab switcher between config and output */}
      {isMobile&&(
        <div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          {["config","output"].map(v=>(
            <button key={v} onClick={()=>setMobileView(v)}
              style={{flex:1,padding:"10px",background:"transparent",border:"none",borderBottom:`2px solid ${mobileView===v?T.gold:"transparent"}`,cursor:"pointer",color:mobileView===v?T.gold:T.textSub,fontSize:12,fontWeight:mobileView===v?600:400,transition:"all 0.12s",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              {v==="config"?"Document Setup":"Preview & Export"}
            </button>
          ))}
        </div>
      )}

      {/* Config panel */}
      {(!isMobile||mobileView==="config")&&(
      <div style={{width:isMobile?"100%":220,flexShrink:0,display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
        <Panel style={{padding:14}}>
          <SectionHeader label="Document Type"/>
          {DTYPES.map(dt=>(
            <div key={dt.id} onClick={()=>{ setType(dt.id); if(isMobile) setMobileView("output"); }}
              style={{display:"flex",alignItems:"center",gap:8,padding:"10px",borderRadius:6,cursor:"pointer",marginBottom:3,background:type===dt.id?T.goldFaint:"transparent",border:`1px solid ${type===dt.id?T.goldDim:T.border}`,transition:"all 0.12s",minHeight:44}}
              onMouseEnter={e=>{if(type!==dt.id)e.currentTarget.style.background=T.panel2;}}
              onMouseLeave={e=>{if(type!==dt.id)e.currentTarget.style.background="transparent";}}>
              <Icon n={dt.icon} size={14} color={type===dt.id?T.gold:T.textSub} style={{flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:type===dt.id?T.gold:T.textSub,lineHeight:1.3}}>{dt.label}</div>
                {!isMobile&&<div style={{fontSize:10,color:T.textMuted,marginTop:1}}>{dt.desc}</div>}
              </div>
              {isMobile&&<Icon n="arrow" size={12} color={T.textMuted}/>}
            </div>
          ))}
        </Panel>
        <Panel style={{padding:14}}>
          <Field label="Instructions" value={instr} onChange={setInstr} as="textarea" rows={3} placeholder="Specific arguments, tone, parties…"/>
          {/* CHANGE 3: Model indicator */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:settings.highQualityDraft?`${T.violet}15`:T.panel2,border:`1px solid ${settings.highQualityDraft?T.violet:T.border}`,borderRadius:6,marginBottom:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:settings.highQualityDraft?T.violet:T.textMuted,flexShrink:0}}/>
            <div>
              <div style={{fontSize:10,color:settings.highQualityDraft?T.violet:T.textSub,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{settings.highQualityDraft?"OPUS 4.6 — HIGH QUALITY":"SONNET 4.6 — STANDARD"}</div>
              <div style={{fontSize:9,color:T.textMuted}}>{settings.highQualityDraft?"Better legal prose · Slower":"Enable Opus in Admin → Model Settings"}</div>
            </div>
          </div>
          <Btn onClick={generate} disabled={!type||loading} full icon="draft">{loading?"Drafting…":"Generate Draft"}</Btn>
          {draft&&(
            <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:2}}>EXPORT DOCUMENT</div>
              <Btn variant="cobalt" size="sm" icon="pdf" onClick={()=>doExport("pdf")} full disabled={!!exporting}>{exporting==="pdf"?"Opening…":"Export PDF"}</Btn>
              <Btn variant="emerald" size="sm" icon="word" onClick={()=>doExport("docx")} full disabled={!!exporting}>{exporting==="docx"?"Downloading…":"Export Word (.doc)"}</Btn>
              <div style={{fontSize:9,color:T.textMuted,lineHeight:1.5,marginTop:2}}>Exports include Citation Verification Report and hallucination disclaimer.</div>
            </div>
          )}
        </Panel>
        {(caseData.allVerifications||[]).length>0&&(
          <Panel style={{padding:14,borderColor:`${T.emerald}30`}}>
            <div style={{fontSize:10,color:T.emerald,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:8}}>SHIELD STATUS</div>
            <div style={{fontSize:12,color:T.text,marginBottom:4}}>{(caseData.allVerifications||[]).filter(v=>v.status==="verified").length}/{(caseData.allVerifications||[]).length} verified</div>
            {(caseData.allVerifications||[]).filter(v=>v.status==="not_found").length>0&&(
              <div style={{fontSize:11,color:T.crimson,lineHeight:1.5}}>⚠ {(caseData.allVerifications||[]).filter(v=>v.status==="not_found").length} unverified — only verified citations used in draft</div>
            )}
          </Panel>
        )}
      </div>
      )}

      {/* Output panel */}
      {(!isMobile||mobileView==="output")&&(
      <div style={{flex:1,display:"flex",flexDirection:"column",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <span style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>
              {draft?`DRAFT — ${DTYPES.find(d=>d.id===type)?.label||""}`:"DOCUMENT OUTPUT"}
            </span>
            {draft&&(
              <span style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>
                {draft.split(/\s+/).filter(Boolean).length.toLocaleString()} words · ~{Math.ceil(draft.split(/\s+/).filter(Boolean).length/500)} pages
              </span>
            )}
          </div>
          {draft&&(
            <div style={{display:"flex",gap:5,flexShrink:0}}>
              <Btn variant="cobalt" size="xs" icon="pdf" onClick={()=>doExport("pdf")} disabled={!!exporting}>{exporting==="pdf"?"…":"PDF"}</Btn>
              <Btn variant="emerald" size="xs" icon="word" onClick={()=>doExport("docx")} disabled={!!exporting}>{exporting==="docx"?"…":"Word"}</Btn>
              <Btn variant="ghost" size="xs" onClick={()=>navigator.clipboard.writeText(draft)} icon="copy">Copy</Btn>
            </div>
          )}
        </div>
        <div className="scroll-y" style={{flex:1,padding:isMobile?"14px":"24px 28px"}}>
          {loading?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12}}><Spinner size={28}/><div style={{fontSize:13,color:T.textSub}}>Drafting with verified citations only…</div></div>
          :draft?<div className="prose" style={{maxWidth:700,margin:"0 auto",fontFamily:"'Playfair Display',serif"}} dangerouslySetInnerHTML={{__html:renderMd(draft)}}/>
          :<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12,textAlign:"center"}}>
            <Icon n="draft" size={32} color={T.textMuted}/>
            <div className="serif" style={{fontSize:18,color:T.textMuted,fontStyle:"italic"}}>Select a type and generate</div>
            <div style={{fontSize:12,color:T.textMuted,maxWidth:360,lineHeight:1.7}}>ARES will only use verified citations in drafted documents.</div>
            {isMobile&&<Btn variant="gold" size="sm" onClick={()=>setMobileView("config")}>← Choose Document Type</Btn>}
          </div>}
        </div>
      </div>
      )}
    </div>
  );
}

// ── Strategy Panel ─────────────────────────────────────────────────────────
function StrategyPanel({caseData,settings,onUpdateCase,onLog,isMobile,notify}) {
  const [strat,setStrat] = useState(caseData.strategy||null);
  const [loading,setLoading] = useState(false);
  const [stratError,setStratError] = useState(null);

  const generate = async()=>{
    setLoading(true);
    try{
      const prompt = `MATTER: ${caseData.title}\nType: ${caseData.caseType} | Jurisdiction: ${caseData.jurisdiction}\nFacts: ${caseData.facts||"Not provided"}\nVerified Precedents: ${(caseData.allVerifications||[]).filter(v=>v.status==="verified").map(v=>`${v.caseName} (${v.citation})`).join("; ")||"None verified yet"}\n\nReturn ONLY valid JSON:\n{"overallStrength":<0-100>,"settlementProbability":<0-100>,"riskLevel":"Low|Medium|High|Critical","summaryAssessment":"...","prosecution":{"theory":"...","burden":"...","keyArguments":["...","...","..."],"evidencePoints":["...","..."],"weaknesses":["...","..."],"strengthScore":<0-100>},"defense":{"theory":"...","keyArguments":["...","...","..."],"counterMoves":["...","..."],"strengths":["...","..."],"weaknesses":["..."],"strengthScore":<0-100>},"keyLegalIssues":[{"issue":"...","significance":"High|Medium|Low","notes":"..."}],"immediateActions":["...","...","..."],"recommendation":"..."}`;

      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:settings.model,max_tokens:2000,system:settings.systemPrompt,messages:[{role:"user",content:prompt}]})});
      
      const raw = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      // Robust JSON extraction — works even if model adds preamble text
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error("No JSON object found in strategy response");
      const rawParsed = JSON.parse(jsonMatch[0]);
      // Normalize schema — free models (LLaMA) return simplified keys; fill in full schema
      const parsed = {
        overallStrength: rawParsed.overallStrength ?? rawParsed.strengthScore ?? rawParsed.caseStrength ?? 50,
        settlementProbability: rawParsed.settlementProbability ?? rawParsed.settlementChance ?? 40,
        riskLevel: rawParsed.riskLevel ?? rawParsed.risk ?? "Medium",
        summaryAssessment: rawParsed.summaryAssessment ?? rawParsed.summary ?? rawParsed.assessment ?? rawParsed.recommendation ?? "",
        prosecution: rawParsed.prosecution ?? {
          theory: rawParsed.prosecutionTheory ?? "",
          burden: "Beyond a reasonable doubt",
          keyArguments: rawParsed.prosecutionArguments ?? rawParsed.weaknesses ?? [],
          evidencePoints: rawParsed.prosecutionEvidence ?? [],
          weaknesses: rawParsed.weaknesses ?? [],
          strengthScore: rawParsed.prosecutionStrength ?? 50
        },
        defense: rawParsed.defense ?? {
          theory: rawParsed.defenseTheory ?? "",
          keyArguments: rawParsed.defenseArguments ?? rawParsed.strengths ?? [],
          counterMoves: rawParsed.motions ?? rawParsed.counterMoves ?? [],
          strengths: rawParsed.strengths ?? [],
          weaknesses: rawParsed.defenseWeaknesses ?? [],
          strengthScore: rawParsed.defenseStrength ?? 50
        },
        keyLegalIssues: rawParsed.keyLegalIssues ?? rawParsed.legalIssues ?? [],
        immediateActions: rawParsed.immediateActions ?? rawParsed.motions ?? rawParsed.nextSteps ?? [],
        recommendation: rawParsed.recommendation ?? rawParsed.summaryAssessment ?? ""
      };
      setStrat(parsed);
      onUpdateCase(prev => ({ ...prev, strategy: parsed }));
      onLog({type:"strategy",caseId:caseData.id,ts:Date.now()});
      notify?.success("Strategy Analysis Complete", `Risk: ${parsed.riskLevel} · Strength: ${parsed.overallStrength}%`, settings.model);
    }catch(e){
      const msg = e.message || "Strategy generation failed";
      setStratError(msg);
      notify?.error("Strategy Failed", msg, settings.model);
    }
    setLoading(false);
  };

  const doExport = ()=>{
    if(!strat) return;
    const content = `<h1>Strategy Analysis: ${caseData.title}</h1>
<h2>Executive Assessment</h2><p>${strat.summaryAssessment}</p>
<p><strong>Risk Level:</strong> ${strat.riskLevel} &nbsp; <strong>Case Strength:</strong> ${strat.overallStrength}/100 &nbsp; <strong>Settlement Probability:</strong> ${strat.settlementProbability}%</p>
<h2>Prosecution Theory</h2><p>${strat.prosecution?.theory}</p><ul>${(strat.prosecution?.keyArguments||[]).map(a=>`<li>${a}</li>`).join("")}</ul>
<h2>Defense Theory</h2><p>${strat.defense?.theory}</p><ul>${(strat.defense?.keyArguments||[]).map(a=>`<li>${a}</li>`).join("")}</ul>
<h2>Strategic Recommendation</h2><p>${strat.recommendation}</p>`;
    exportToPDF(`Strategy Analysis — ${caseData.title}`, content, caseData, caseData.allVerifications||[]);
  };

  if(!strat) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16,textAlign:"center",padding:20}}>
      <div style={{width:64,height:64,borderRadius:16,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon n="strategy" size={28} color={T.gold}/>
      </div>
      <div className="serif" style={{fontSize:24,fontStyle:"italic",color:T.text}}>Strategy War Room</div>
      <div style={{fontSize:13,color:T.textSub,maxWidth:360,lineHeight:1.7}}>AI-powered analysis using only your verified precedents. Settlement probability, risk scoring, prosecution vs. defense breakdown.</div>
      {stratError&&(
        <div style={{background:T.crimsonFaint,border:`1px solid ${T.crimson}50`,borderRadius:7,padding:"10px 16px",maxWidth:400,width:"100%"}}>
          <div style={{fontSize:12,color:T.crimson,fontWeight:600,marginBottom:3}}>Generation Failed</div>
          <div style={{fontSize:11,color:T.textSub,lineHeight:1.5}}>{stratError}</div>
        </div>
      )}
      <Btn onClick={()=>{setStratError(null);generate();}} disabled={loading} icon="strategy">
        {loading?"Analyzing…":stratError?"Retry Strategy":"Generate Strategy"}
      </Btn>
    </div>
  );

  const rc = RISK_C[strat.riskLevel]||T.textSub;

  return (
    <div className="scroll-y" style={{height:"100%",paddingBottom:20}}>
      {/* Metrics row — single column on mobile */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr auto",gap:10,marginBottom:12}}>
        {[{l:"Case Strength",v:strat.overallStrength,c:strat.overallStrength>=60?T.emerald:strat.overallStrength>=35?T.amber:T.crimson,suf:"/100"},
          {l:"Settlement Prob.",v:strat.settlementProbability,c:T.cobalt,suf:"%"},
          {l:"Risk Level",v:strat.riskLevel,c:rc,text:true}].map(s=>(
          <Panel key={s.l} style={{padding:"12px 14px"}}>
            <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
            {s.text?<div style={{fontSize:isMobile?16:20,fontWeight:700,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</div>
            :<div><div style={{fontSize:isMobile?18:22,fontWeight:700,color:s.c,fontFamily:"'JetBrains Mono',monospace",marginBottom:4}}>{s.v}<span style={{fontSize:11,fontWeight:400,color:T.textSub}}>{s.suf}</span></div><Meter val={s.v} color={s.c} size="sm"/></div>}
          </Panel>
        ))}
        {!isMobile&&<div style={{display:"flex",flexDirection:"column",gap:6,alignSelf:"center"}}>
          <Btn variant="ghost" size="sm" onClick={generate}>↻</Btn>
          <Btn variant="cobalt" size="sm" icon="pdf" onClick={doExport}>PDF</Btn>
        </div>}
      </div>
      {isMobile&&<div style={{display:"flex",gap:6,marginBottom:12}}>
        <Btn variant="ghost" size="sm" onClick={generate} style={{flex:1}}>↻ Regenerate</Btn>
        <Btn variant="cobalt" size="sm" icon="pdf" onClick={doExport} style={{flex:1}}>Export PDF</Btn>
      </div>}

      <Panel style={{padding:"12px 16px",marginBottom:12,borderColor:`${T.gold}30`}}>
        <div style={{fontSize:13,color:T.text,lineHeight:1.75}}>{strat.summaryAssessment}</div>
      </Panel>

      {/* Pro/Defense — single column on mobile */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
        <Panel style={{padding:16,borderColor:`${T.crimson}35`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:T.crimson,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",fontWeight:600}}>PROSECUTION</div>
            <Meter val={strat.prosecution?.strengthScore||50} color={T.crimson} size="sm"/>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:3,lineHeight:1.4}}>{strat.prosecution?.theory}</div>
          <div style={{fontSize:11,color:T.textMuted,marginBottom:10,fontFamily:"'JetBrains Mono',monospace"}}>Burden: {strat.prosecution?.burden}</div>
          <Divider/>
          <div style={{fontSize:10,color:T.crimson,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:7,marginTop:4}}>KEY ARGUMENTS</div>
          {strat.prosecution?.keyArguments?.map((a,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:6}}><span style={{color:T.crimson,flexShrink:0,lineHeight:1.6}}>▸</span><span style={{fontSize:12,color:T.text,lineHeight:1.6}}>{a}</span></div>)}
        </Panel>
        <Panel style={{padding:16,borderColor:`${T.cobalt}35`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:T.cobalt,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",fontWeight:600}}>DEFENSE</div>
            <Meter val={strat.defense?.strengthScore||50} color={T.cobalt} size="sm"/>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:10,lineHeight:1.4}}>{strat.defense?.theory}</div>
          <Divider/>
          <div style={{fontSize:10,color:T.cobalt,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:7,marginTop:4}}>KEY ARGUMENTS</div>
          {strat.defense?.keyArguments?.map((a,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:6}}><span style={{color:T.cobalt,flexShrink:0,lineHeight:1.6}}>▸</span><span style={{fontSize:12,color:T.text,lineHeight:1.6}}>{a}</span></div>)}
          <Divider/>
          <div style={{fontSize:10,color:T.emerald,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:7,marginTop:4}}>STRENGTHS</div>
          {strat.defense?.strengths?.map((s,i)=><div key={i} style={{fontSize:12,color:T.emerald,marginBottom:4}}>✓ {s}</div>)}
        </Panel>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
        <Panel style={{padding:16}}>
          <SectionHeader label="Key Legal Issues"/>
          {strat.keyLegalIssues?.map((issue,i)=>(
            <div key={i} style={{display:"flex",gap:9,marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${T.border}`}}>
              <div style={{background:`${T.goldDim}30`,color:T.gold,borderRadius:4,padding:"2px 7px",fontSize:10,fontFamily:"'JetBrains Mono',monospace",flexShrink:0,height:"fit-content"}}>{String(i+1).padStart(2,"0")}</div>
              <div><div style={{fontSize:12,color:T.text,fontWeight:500,marginBottom:3}}>{issue.issue}</div>
              <Badge color={issue.significance==="High"?T.crimson:issue.significance==="Medium"?T.amber:T.textSub} size="xs">{issue.significance}</Badge>
              {issue.notes&&<div style={{fontSize:11,color:T.textSub,marginTop:4,lineHeight:1.5}}>{issue.notes}</div>}</div>
            </div>
          ))}
        </Panel>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Panel style={{padding:16}}>
            <SectionHeader label="Immediate Actions" color={T.emerald}/>
            {strat.immediateActions?.map((a,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <div style={{width:18,height:18,borderRadius:4,border:`1px solid ${T.emerald}50`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                  <span style={{fontSize:9,color:T.emerald,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</span>
                </div>
                <span style={{fontSize:12,color:T.text,lineHeight:1.6}}>{a}</span>
              </div>
            ))}
          </Panel>
          <Panel style={{padding:16,borderColor:`${T.gold}30`,background:T.goldFaint}}>
            <SectionHeader label="Strategic Recommendation"/>
            <div style={{fontSize:13,color:T.text,lineHeight:1.75}}>{strat.recommendation}</div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ── Notes Panel ────────────────────────────────────────────────────────────
function NotesPanel({caseData,onUpdateCase,isMobile,notify,settings}) {
  const [notes,setNotes] = useState(caseData.notes||[]);
  const [input,setInput] = useState("");
  const [tag,setTag] = useState("fact");
  const [analysisLoading,setAnalysisLoading] = useState(false);
  const [analysis,setAnalysis] = useState(null);
  const TAGS = [{id:"fact",label:"Key Fact",c:T.cobalt},{id:"evidence",label:"Evidence",c:T.emerald},{id:"witness",label:"Witness",c:T.amber},{id:"deadline",label:"Deadline",c:T.crimson},{id:"note",label:"Note",c:T.platDim}];

  const analyzeEvidence = async()=>{
    const relevantNotes = notes.filter(n=>["evidence","witness","fact"].includes(n.tag));
    if(!relevantNotes.length){notify?.warn("No Evidence to Analyze","Add evidence, witness, or fact notes first","Evidence AI");return;}
    setAnalysisLoading(true);
    try{
      const noteList = relevantNotes.map(n=>`[${n.tag.toUpperCase()}] ${n.text}`).join("\n");
      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:settings?.model||"claude-sonnet-4-6",max_tokens:1200,
        system:"You are a senior litigation analyst reviewing case notes for defense strategy.",
        messages:[{role:"user",content:`Review these case notes for a ${caseData.caseType} matter (${caseData.title}):

${noteList}

Analyze and return ONLY valid JSON:
{"strongestFacts":["top 3 facts for defense — with tag reference"],"contradictions":["any inconsistencies or contradictions found"],"witnessesToDepose":["3 suggested witnesses to depose and why"],"evidenceGaps":["critical missing evidence or facts"],"keyDefenseTheme":"one sentence defense narrative","analyzedAt":"${new Date().toISOString()}"}`}]
      })});
      const raw = (data.content||[]).map(b=>b.text||"").join("");
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error("No analysis returned");
      setAnalysis(JSON.parse(jsonMatch[0]));
      notify?.success("Evidence Analysis Complete", `${relevantNotes.length} notes analyzed`, "Evidence AI");
    }catch(e){
      notify?.error("Evidence Analysis Failed", e.message, "Evidence AI");
    }
    setAnalysisLoading(false);
  };

  const add = ()=>{
    if(!input.trim()) return;
    const n = {id:genId(),text:input,tag,ts:Date.now()};
    const next=[n,...notes];
    setNotes(next);
    onUpdateCase(prev=>({...prev,notes:next}));
    setInput("");
  };
  const del = id=>{
    const next=notes.filter(n=>n.id!==id);
    setNotes(next);
    onUpdateCase(prev=>({...prev,notes:next}));
  };

  return (
    <div className="scroll-y" style={{height:"100%"}}>
      <Panel style={{padding:14,marginBottom:12}}>
        <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
          {TAGS.map(t=>(
            <button key={t.id} onClick={()=>setTag(t.id)} style={{fontSize:10,color:tag===t.id?t.c:T.textMuted,background:tag===t.id?`${t.c}18`:"transparent",border:`1px solid ${tag===t.id?t.c+"50":T.border}`,borderRadius:5,padding:"4px 10px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em",transition:"all 0.12s"}}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Add a key fact, evidence note, witness detail…" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,padding:"9px 12px",fontSize:13,minHeight:44}} className="gold-focus"/>
          <Btn onClick={add} disabled={!input.trim()} icon="plus">Add</Btn>
          <Btn variant="ghost" onClick={analyzeEvidence} disabled={analysisLoading||!notes.some(n=>["evidence","witness","fact"].includes(n.tag))} icon="sparkle">{analysisLoading?"Analyzing…":"Analyze"}</Btn>
        </div>
      </Panel>

      {/* Evidence Analysis Panel */}
      {analysis&&(
        <Panel style={{padding:16,marginBottom:12,borderColor:`${T.emerald}40`}} className="fade-in">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <SectionHeader label="Evidence Analysis" color={T.emerald}/>
            <button onClick={()=>setAnalysis(null)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}><Icon n="close" size={12} color={T.textMuted}/></button>
          </div>
          {analysis.keyDefenseTheme&&(
            <div style={{background:`${T.gold}12`,border:`1px solid ${T.gold}40`,borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:12,color:T.gold,lineHeight:1.6}}>
              <strong>Defense Theme:</strong> {analysis.keyDefenseTheme}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
            {analysis.strongestFacts?.length>0&&(
              <div>
                <div style={{fontSize:10,color:T.emerald,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:6}}>STRONGEST DEFENSE FACTS</div>
                {analysis.strongestFacts.map((f,i)=><div key={i} style={{fontSize:11,color:T.text,marginBottom:5,paddingLeft:10,borderLeft:`2px solid ${T.emerald}50`}}>· {f}</div>)}
              </div>
            )}
            {analysis.witnessesToDepose?.length>0&&(
              <div>
                <div style={{fontSize:10,color:T.amber,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:6}}>DEPOSE THESE WITNESSES</div>
                {analysis.witnessesToDepose.map((w,i)=><div key={i} style={{fontSize:11,color:T.text,marginBottom:5,paddingLeft:10,borderLeft:`2px solid ${T.amber}50`}}>· {w}</div>)}
              </div>
            )}
            {analysis.contradictions?.length>0&&(
              <div>
                <div style={{fontSize:10,color:T.crimson,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:6}}>CONTRADICTIONS</div>
                {analysis.contradictions.map((c,i)=><div key={i} style={{fontSize:11,color:T.text,marginBottom:5,paddingLeft:10,borderLeft:`2px solid ${T.crimson}50`}}>⚠ {c}</div>)}
              </div>
            )}
            {analysis.evidenceGaps?.length>0&&(
              <div>
                <div style={{fontSize:10,color:T.violet,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",marginBottom:6}}>EVIDENCE GAPS</div>
                {analysis.evidenceGaps.map((g,i)=><div key={i} style={{fontSize:11,color:T.text,marginBottom:5,paddingLeft:10,borderLeft:`2px solid ${T.violet}50`}}>· {g}</div>)}
              </div>
            )}
          </div>
        </Panel>
      )}

      {notes.length===0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"50px 20px",gap:10,textAlign:"center"}}><Icon n="notes" size={32} color={T.textMuted}/><div className="serif" style={{fontSize:18,color:T.textMuted,fontStyle:"italic"}}>Evidence & Notes Board</div></div>}
      {TAGS.map(t=>{
        const tn=notes.filter(n=>n.tag===t.id);if(!tn.length)return null;
        return (<div key={t.id} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{height:1,flex:1,background:T.border}}/><Badge color={t.c} size="xs">{t.label} ({tn.length})</Badge><div style={{height:1,flex:1,background:T.border}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
            {tn.map(n=>(
              <div key={n.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:7,padding:"11px 13px",borderLeft:`3px solid ${t.c}50`,position:"relative"}}
                onMouseEnter={e=>{const b=e.currentTarget.querySelector(".del");if(b)b.style.opacity="1"}}
                onMouseLeave={e=>{const b=e.currentTarget.querySelector(".del");if(b)b.style.opacity="0"}}>
                <div style={{fontSize:13,color:T.text,lineHeight:1.6,marginBottom:4,paddingRight:20}}>{n.text}</div>
                <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{fmtDate(n.ts)}</div>
                <button className="del" onClick={()=>del(n.id)} style={{position:"absolute",top:8,right:8,background:"none",border:"none",padding:4,cursor:"pointer",opacity:0,transition:"opacity 0.15s"}}><Icon n="close" size={11} color={T.textMuted}/></button>
              </div>
            ))}
          </div>
        </div>);
      })}
    </div>
  );
}

// ── Judge Intelligence Panel ───────────────────────────────────────────────
function JudgePanel({caseData,settings,onUpdateCase,onLog,isMobile,notify}) {
  const [intel,setIntel] = useState(caseData.judgeIntel||null);
  const [loading,setLoading] = useState(false);
  const [loadingStep,setLoadingStep] = useState("");
  const [customJudge,setCustomJudge] = useState(caseData.judge||"");
  const [error,setError] = useState(null);
  const [clJudgeData,setClJudgeData] = useState(null); // raw structured CL data

  const analyze = async()=>{
    if(!customJudge.trim()) return;
    setLoading(true); setError(null); setClJudgeData(null);

    let judgeContext = "";

    // Step 1: Try CourtListener Judge API for structured biographical data
    if(settings.courtListenerToken){
      try{
        setLoadingStep("Querying CourtListener Judge Database…");
        const jData = await courtListenerJudgeLookup(customJudge, settings.courtListenerToken);
        if(jData){
          setClJudgeData(jData);
          judgeContext = buildJudgeContext(jData);
        }
      }catch(e){ console.warn("CL Judge API failed:", e.message); }
    }

    // Step 2: Build enhanced prompt with real data if available
    const dataSource = judgeContext
      ? `You have been provided STRUCTURED JUDGE DATA from CourtListener's official judge database (16,000+ judges). Use this as your primary source — it is authoritative.\n\n${judgeContext}\n\nNow analyze this judge for a ${caseData.caseType} case in ${caseData.jurisdiction}.`
      : `Search for information about Judge ${customJudge} in ${caseData.jurisdiction}. Analyze their ruling tendencies in ${caseData.caseType} cases.`;

    setLoadingStep("ARES analyzing judicial record…");
    try{
      const prompt = `${dataSource}

      Based on all available information, return ONLY valid JSON with no backticks, no preamble, no trailing commas. Every field is required — use "Unknown" where data is unavailable.
      {
        "name": "${customJudge}",
        "court": "full court name",
        "appointedBy": "President name and year e.g. Clinton 1994",
        "yearsOnBench": "number",
        "politicalAffiliation": "Republican|Democrat|Independent|Unknown",
        "abaRating": "Well Qualified|Qualified|Not Qualified|Unknown",
        "education": "law school and undergraduate",
        "rulingTendencies": {"prosecution": 50, "defense": 50, "notes": "QUALITATIVE description of tendencies — do not invent percentages or statistics without citing a source"},
        "motionPreferences": ["specific documented preference 1", "specific documented preference 2"],
        "argumentStyle": "how this judge likes oral and written argument presented",
        "knownFor": "what this judge is most known for in legal community — if not in training data, say 'Limited information available'",
        "redFlags": ["thing that draws sanctions or annoys this judge"],
        "winningStrategies": ["concrete strategy 1", "concrete strategy 2"],
        "recentNotableRulings": ["Full Bluebook citation: Case Name, Vol. Reporter Page (Court Year) — one line holding"],
        "overallBias": "Prosecution-Leaning|Neutral|Defense-Leaning",
        "confidenceLevel": "High|Medium|Low",
        "dataSource": "${judgeContext ? "CourtListener Judge Database + AI Analysis" : "Web Search"}"
      }\n\nCRITICAL CONSTRAINTS: (1) rulingTendencies values must be integers 0-100 representing a qualitative lean, NOT empirical statistics — never state "grants X% of motions" without a citable source. (2) If this judge is NOT in your training data, set confidenceLevel to "Low" and explicitly note "Limited training data — profile is speculative" in the notes field. (3) overallBias must be exactly one of the three options. (4) All arrays need at least 1 item. (5) For recentNotableRulings, only include cases you are confident exist — do not fabricate citations.`;

      const body = {model:settings.model,max_tokens:1800,system:settings.systemPrompt,messages:[{role:"user",content:prompt}]};
      if(settings.webSearch && !judgeContext) body.tools=[{type:"web_search_20260209",name:"web_search"}];
      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      
      const raw = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error("No data returned — try a more specific judge name");
      const rawParsed = JSON.parse(jsonMatch[0]);
      // CHANGE 4b: Validate and fill defaults for missing fields
      const parsed = {
        name: rawParsed.name || customJudge,
        court: rawParsed.court || caseData.jurisdiction || "Unknown Court",
        appointedBy: rawParsed.appointedBy || "Unknown",
        yearsOnBench: rawParsed.yearsOnBench || "Unknown",
        politicalAffiliation: rawParsed.politicalAffiliation || "Unknown",
        abaRating: rawParsed.abaRating || "Unknown",
        education: rawParsed.education || "Unknown",
        rulingTendencies: {
          prosecution: parseInt(rawParsed.rulingTendencies?.prosecution) || 50,
          defense: parseInt(rawParsed.rulingTendencies?.defense) || 50,
          notes: rawParsed.rulingTendencies?.notes || "Insufficient data",
        },
        motionPreferences: Array.isArray(rawParsed.motionPreferences) && rawParsed.motionPreferences.length ? rawParsed.motionPreferences : ["Concise, well-organized briefs", "Thorough record citations"],
        argumentStyle: rawParsed.argumentStyle || "Prefers direct, concise advocacy",
        knownFor: rawParsed.knownFor || "Unknown",
        redFlags: Array.isArray(rawParsed.redFlags) && rawParsed.redFlags.length ? rawParsed.redFlags : ["Unprepared counsel"],
        winningStrategies: Array.isArray(rawParsed.winningStrategies) && rawParsed.winningStrategies.length ? rawParsed.winningStrategies : ["Thorough factual record", "Clear legal standard articulation"],
        recentNotableRulings: Array.isArray(rawParsed.recentNotableRulings) && rawParsed.recentNotableRulings.length ? rawParsed.recentNotableRulings : ["Insufficient data"],
        overallBias: ["Prosecution-Leaning","Neutral","Defense-Leaning"].includes(rawParsed.overallBias) ? rawParsed.overallBias : "Neutral",
        confidenceLevel: ["High","Medium","Low"].includes(rawParsed.confidenceLevel) ? rawParsed.confidenceLevel : "Low",
        dataSource: rawParsed.dataSource || (judgeContext ? "CourtListener + AI" : "Web Search"),
      };
      setIntel(parsed);
      onUpdateCase(prev=>({...prev,judgeIntel:parsed}));
      onLog({type:"judge",caseId:caseData.id,ts:Date.now()});
      const src2 = parsed.dataSource?.includes("CourtListener")?"CourtListener Judge DB + AI":"Web Search";
      notify?.success("Judge Analysis Complete", `${parsed.name} · ${parsed.overallBias||"Bias unknown"} · Confidence: ${parsed.confidenceLevel}`, src2);
    }catch(e){
      setError(e.message||"Analysis failed");
      notify?.error("Judge Analysis Failed", e.message||"Analysis failed", settings.model);
    }
    setLoading(false); setLoadingStep("");
  };

  return (
    <div className="scroll-y" style={{height:"100%"}}>
      <Panel style={{padding:16,marginBottom:12}}>
        <SectionHeader label="Judge Intelligence Engine" color={T.violet}/>
        <div style={{display:"flex",gap:8,flexWrap:isMobile?"wrap":"nowrap"}}>
          <input value={customJudge} onChange={e=>setCustomJudge(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()}
            placeholder="Judge full name (e.g. Hon. Richard Posner)"
            style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,padding:"9px 12px",fontSize:13,minWidth:0}} className="gold-focus"/>
          <Btn onClick={analyze} disabled={loading||!customJudge.trim()} icon="search">{loading?"Searching…":"Analyze Judge"}</Btn>
        </div>
        {error&&<div style={{marginTop:8,fontSize:11,color:T.crimson,background:T.crimsonFaint,border:`1px solid ${T.crimson}40`,borderRadius:5,padding:"6px 10px"}}>{error}</div>}
        <div style={{fontSize:11,color:T.textMuted,marginTop:8,lineHeight:1.5}}>
          {settings.courtListenerToken
            ? <span style={{color:T.cobalt}}>✓ CourtListener Judge Database connected — {">"}16,000 judges with biographical data, political affiliations & financial disclosures</span>
            : "Connect CourtListener token in Admin for structured judge data (political affiliation, career history, ABA ratings). Without token, uses web search only."}
        </div>
      </Panel>

      {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"50px 20px",gap:12}}>
        <Spinner size={28}/>
        <div style={{fontSize:13,color:T.textSub}}>{loadingStep||"Searching judicial records…"}</div>
        {clJudgeData&&<div style={{fontSize:11,color:T.cobalt,fontFamily:"'JetBrains Mono',monospace"}}>✓ Structured data retrieved — running analysis…</div>}
      </div>}

      {intel&&!loading&&(
        <div className="fade-up">
          <div style={{background:`${T.amber}12`,border:`1px solid ${T.amber}40`,borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:11,color:T.amber,lineHeight:1.5}}>
            ⚠ <strong>Profile generated from AI training data.</strong> Sentence ranges, ruling tendencies, and grant rates are qualitative estimates — not statistics. Verify independently via PACER, Westlaw, or Bloomberg Law before relying on this profile for case strategy.
          </div>
          <Panel style={{padding:18,marginBottom:12}}>
            {/* Profile header */}
            <div style={{display:"flex",gap:18,alignItems:"flex-start",marginBottom:20}}>
              <div style={{width:72,height:72,borderRadius:20,background:`${T.violet}20`,border:`2px solid ${T.violet}50`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span className="serif" style={{fontSize:30,color:T.violet,fontStyle:"italic",lineHeight:1}}>{intel.name.trim()[0]}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div className="serif" style={{fontSize:22,color:T.text,lineHeight:1.1,marginBottom:4,letterSpacing:"-0.02em"}}>{intel.name}</div>
                <div style={{fontSize:12,color:T.textSub,marginBottom:10,lineHeight:1.4}}>{intel.court}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <Badge color={intel.overallBias==="Defense-Leaning"?T.cobalt:intel.overallBias==="Prosecution-Leaning"?T.crimson:T.gold}>{intel.overallBias||"Unknown"}</Badge>
                  <Badge color={intel.confidenceLevel==="High"?T.emerald:intel.confidenceLevel==="Medium"?T.amber:T.crimson} size="xs">Confidence: {intel.confidenceLevel}</Badge>
                  {intel.dataSource?.includes("CourtListener")&&<Badge color={T.cobalt} size="xs">🏛 CourtListener DB</Badge>}
                </div>
              </div>
            </div>
            {/* Stats bar */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:1,background:T.border,borderRadius:8,overflow:"hidden",marginBottom:16}}>
              {[
                {label:"YEARS",value:intel.yearsOnBench,color:T.platinum},
                {label:"PRO WIN %",value:intel.rulingTendencies?.prosecution??"—",color:T.crimson},
                {label:"DEF WIN %",value:intel.rulingTendencies?.defense??"—",color:T.cobalt},
                {label:"PARTY",value:intel.politicalAffiliation==="Republican"?"GOP":intel.politicalAffiliation==="Democrat"?"DEM":intel.politicalAffiliation||"?",color:T.textSub},
                {label:"ABA",value:intel.abaRating==="Well Qualified"?"WQ":intel.abaRating==="Qualified"?"Q":intel.abaRating||"—",color:T.amber},
              ].map(({label,value,color})=>(
                <div key={label} style={{background:T.panel2,padding:"12px 8px",textAlign:"center"}}>
                  <div style={{fontSize:8,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",marginBottom:5}}>{label}</div>
                  <div style={{fontSize:17,fontWeight:700,color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{value}</div>
                </div>
              ))}
            </div>
            {intel.appointedBy&&intel.appointedBy!=="Unknown"&&(
              <div style={{fontSize:12,color:T.textSub,marginBottom:12}}>
                <span style={{color:T.textMuted}}>Appointed by: </span>{intel.appointedBy}
                {intel.education&&intel.education!=="Unknown"&&<><span style={{color:T.textMuted}}> · </span>{intel.education}</>}
              </div>
            )}
            {intel.rulingTendencies?.notes&&<div style={{fontSize:12,color:T.textSub,lineHeight:1.65,borderTop:`1px solid ${T.border}`,paddingTop:12}}>{intel.rulingTendencies.notes}</div>}
          </Panel>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
            <Panel style={{padding:16}}>
              <SectionHeader label="Winning Strategies" color={T.emerald}/>
              {(intel.winningStrategies||[]).map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"10px",background:T.emeraldFaint,border:`1px solid ${T.emerald}30`,borderRadius:7,marginBottom:6}}>
                  <div style={{width:22,height:22,borderRadius:6,background:`${T.emerald}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    <span style={{fontSize:10,color:T.emerald,fontWeight:700}}>✓</span>
                  </div>
                  <span style={{fontSize:12,color:T.text,lineHeight:1.6}}>{s}</span>
                </div>
              ))}
            </Panel>
            <Panel style={{padding:16}}>
              <SectionHeader label="Red Flags — Avoid" color={T.crimson}/>
              {(intel.redFlags||[]).map((r,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"10px",background:T.crimsonFaint,border:`1px solid ${T.crimson}30`,borderRadius:7,marginBottom:6}}>
                  <div style={{width:22,height:22,borderRadius:6,background:`${T.crimson}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    <span style={{fontSize:10,color:T.crimson,fontWeight:700}}>!</span>
                  </div>
                  <span style={{fontSize:12,color:T.text,lineHeight:1.6}}>{r}</span>
                </div>
              ))}
            </Panel>
            <Panel style={{padding:16}}>
              <SectionHeader label="Motion Preferences" color={T.gold}/>
              {(intel.motionPreferences||[]).map((m,i)=><div key={i} style={{fontSize:12,color:T.textSub,marginBottom:6,paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>· {m}</div>)}
            </Panel>
            <Panel style={{padding:16}}>
              <SectionHeader label="Recent Notable Rulings" color={T.cobalt}/>
              {(intel.recentNotableRulings||[]).map((r,i)=><div key={i} style={{fontSize:12,color:T.textSub,marginBottom:6,paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>· {r}</div>)}
            </Panel>
          </div>

          {(intel.argumentStyle||intel.knownFor)&&(
            <Panel style={{padding:16,borderColor:`${T.violet}30`}}>
              <SectionHeader label="Argument Style & Known For" color={T.violet}/>
              {intel.argumentStyle&&<div style={{fontSize:13,color:T.text,lineHeight:1.7,marginBottom:intel.knownFor?10:0}}>{intel.argumentStyle}</div>}
              {intel.knownFor&&<div style={{fontSize:12,color:T.textSub,lineHeight:1.65,borderTop:`1px solid ${T.border}`,paddingTop:10}}><strong style={{color:T.platinum}}>Known for:</strong> {intel.knownFor}</div>}
            </Panel>
          )}

          <div style={{marginTop:10,display:"flex",justifyContent:"flex-end"}}>
            <Btn variant="ghost" size="sm" onClick={()=>{setIntel(null);setCustomJudge(caseData.judge||"");}}>Analyze Different Judge</Btn>
          </div>
        </div>
      )}

      {!intel&&!loading&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px",gap:12,textAlign:"center"}}>
          <Icon n="judge" size={36} color={T.textMuted}/>
          <div className="serif" style={{fontSize:20,color:T.textMuted,fontStyle:"italic"}}>No judge analyzed yet</div>
          <div style={{fontSize:12,color:T.textMuted,maxWidth:380,lineHeight:1.7}}>Enter a judge's name to unlock ruling tendencies, win rates, motion preferences, and what works in their courtroom. Not available in Harvey AI or CoCounsel.</div>
        </div>
      )}
    </div>
  );
}

// ── Deadline Command Center ────────────────────────────────────────────────
function DeadlinePanel({caseData,onUpdateCase,isMobile,notify,settings}) {
  const [deadlines,setDeadlines] = useState(caseData.deadlines||[]);
  const [form,setForm] = useState({title:"",date:"",type:"Filing",priority:"High",notes:""});
  const [suggestLoading,setSuggestLoading] = useState(false);
  const [suggestions,setSuggestions] = useState([]);
  const [suggestSelected,setSuggestSelected] = useState({});
  const [showSuggest,setShowSuggest] = useState(false);
  // Pre-select state from jurisdiction if possible
  const guessState = ()=>{
    const jx = caseData.jurisdiction||"";
    const STATES = ["Alabama","Alaska","Arizona","California","Colorado","Connecticut","Florida","Georgia","Illinois","New York","Ohio","Pennsylvania","Texas","Virginia","Washington"];
    return STATES.find(s=>jx.includes(s))||"California";
  };
  const [calc,setCalc] = useState({caseType:caseData.caseType,state:guessState(),incident:caseData.incidentDate||""});
  const [sol,setSol] = useState(null);
  const [solLoading,setSolLoading] = useState(false);
  const ff = k=>v=>setForm(p=>({...p,[k]:v}));
  const fc = k=>v=>setCalc(p=>({...p,[k]:v}));

  const TYPES = ["Filing","Court Date","Discovery","Deposition","Response Due","Appeal","Statute of Limitations","Other"];
  const PRIO = ["Critical","High","Medium","Low"];
  const PRIO_C = {Critical:T.crimson,High:T.amber,Medium:T.cobalt,Low:T.textSub};

  const addDeadline = ()=>{
    if(!form.title.trim()||!form.date) return;
    const d = {id:genId(),ts:Date.now(),...form};
    const next = [...deadlines,d].sort((a,b)=>new Date(a.date)-new Date(b.date));
    setDeadlines(next);
    onUpdateCase(prev=>({...prev,deadlines:next}));
    setForm({title:"",date:"",type:"Filing",priority:"High",notes:""});
  };

  const removeDeadline = id=>{
    const next = deadlines.filter(d=>d.id!==id);
    setDeadlines(next);
    onUpdateCase(prev=>({...prev,deadlines:next}));
  };

  const calcSOL = async()=>{
    if(!calc.incident) return;
    setSolLoading(true);
    try{
      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:"claude-sonnet-4-6",max_tokens:400,
        system:"Return ONLY valid JSON, no preamble.",
        messages:[{role:"user",content:`Calculate statute of limitations for: Case type: ${calc.caseType}. State/jurisdiction: ${calc.state}. Incident date: ${calc.incident}.

IMPORTANT FEDERAL SOL RULES — use these exact periods:
- Wire Fraud (18 U.S.C. § 1343): 5 years under 18 U.S.C. § 3282
- Securities Fraud (15 U.S.C. § 78j / Rule 10b-5): 5 years from violation, 2 years from discovery
- Money Laundering (18 U.S.C. § 1956/1957): 10 years under 18 U.S.C. § 3293 (NOT 5 years)
- RICO (18 U.S.C. § 1961): 4 years
- Bank Fraud (18 U.S.C. § 1344): 10 years under 18 U.S.C. § 3293
- Mail/Wire Fraud affecting financial institution: 10 years under § 3293

Calculate the exact deadline from the incident date. Return ONLY valid JSON:
{"solYears":<number>,"deadline":"<YYYY-MM-DD>","notes":"<specific statute and period>","exceptions":"<tolling doctrines: fraudulent concealment, continuing offense, etc.>"}`}]
      })});
      
      const raw = (data.content||[]).map(b=>b.text||"").join("");
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if(jsonMatch) setSol(JSON.parse(jsonMatch[0]));
      else throw new Error("parse failed");
    }catch(e){
    setSol({solYears:"?",deadline:"Consult local counsel",notes:"Unable to calculate automatically",exceptions:""});
    notify?.error("SOL Calculation Failed", e?.message||"Could not calculate statute of limitations", "SOL Calculator");
  }
    setSolLoading(false);
  };

  const autoSuggestDeadlines = async()=>{
    setSuggestLoading(true);
    try{
      const keyDates = [
        caseData.incidentDate && `Incident/filing date: ${caseData.incidentDate}`,
        (caseData.deadlines||[]).find(d=>d.title?.toLowerCase().includes("arraign"))?.date && `Arraignment: ${(caseData.deadlines||[]).find(d=>d.title?.toLowerCase().includes("arraign")).date}`,
        (caseData.deadlines||[]).find(d=>d.title?.toLowerCase().includes("indict"))?.date && `Indictment: ${(caseData.deadlines||[]).find(d=>d.title?.toLowerCase().includes("indict")).date}`,
      ].filter(Boolean).join("; ") || "No key dates on file — suggest typical deadlines from today";

      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:settings?.model||"claude-sonnet-4-6",max_tokens:1200,
        system:"Return ONLY valid JSON array, no preamble.",
        messages:[{role:"user",content:`Generate standard procedural deadlines for a ${caseData.caseType} case in ${caseData.jurisdiction}.
Key case dates: ${keyDates}
Today's date: ${new Date().toISOString().split("T")[0]}

Include standard deadlines such as: Motion to Dismiss, Discovery cutoff, Speedy Trial Act (if federal criminal), preliminary hearing, bail review, pretrial conference, trial date, and any jurisdiction-specific deadlines.
For each deadline, cite the governing rule (e.g. Fed. R. Crim. P. 12(c)(3), 18 U.S.C. § 3161(c)(1), SDNY Local Rule 16.1).

Return ONLY a JSON array:
[{"title":"...","date":"YYYY-MM-DD","type":"Filing|Court Date|Discovery|Deposition|Response Due|Appeal|Other","priority":"Critical|High|Medium|Low","rule":"...","notes":"..."}]`}]
      })});
      const raw = (data.content||[]).map(b=>b.text||"").join("");
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if(!jsonMatch) throw new Error("No suggestions returned");
      const sugs = JSON.parse(jsonMatch[0]);
      setSuggestions(sugs);
      const sel = {};
      sugs.forEach((_,i)=>{sel[i]=true;});
      setSuggestSelected(sel);
      setShowSuggest(true);
    }catch(e){
      notify?.error("Auto-Suggest Failed", e.message, "Deadline AI");
    }
    setSuggestLoading(false);
  };

  const addSuggested = ()=>{
    const toAdd = suggestions.filter((_,i)=>suggestSelected[i]).map(s=>({id:genId(),ts:Date.now(),title:s.title,date:s.date,type:s.type||"Filing",priority:s.priority||"High",notes:(s.rule?`Rule: ${s.rule}. `:"")+( s.notes||"")}));
    if(!toAdd.length) return;
    const next = [...deadlines,...toAdd].sort((a,b)=>new Date(a.date)-new Date(b.date));
    setDeadlines(next);
    onUpdateCase(prev=>({...prev,deadlines:next}));
    setShowSuggest(false);
    setSuggestions([]);
    notify?.success(`Added ${toAdd.length} deadline(s)`, "From AI auto-suggest", "Deadline AI");
  };

  const today = new Date();
  const upcoming = deadlines.filter(d=>new Date(d.date)>=today);
  const overdue = deadlines.filter(d=>new Date(d.date)<today);
  const daysUntil = d=>Math.ceil((new Date(d.date)-today)/(1000*60*60*24));

  const STATES = ["Alabama","Alaska","Arizona","California","Colorado","Connecticut","Florida","Georgia","Illinois","New York","Ohio","Pennsylvania","Texas","Virginia","Washington"];

  return (
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:12,height:"100%",overflow:"hidden"}}>
      <div className="scroll-y" style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
        {/* SOL Calculator */}
        <Panel style={{padding:16}}>
          <SectionHeader label="Statute of Limitations Calculator" color={T.amber}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <Field label="Practice Area" value={calc.caseType} onChange={fc("caseType")} as="select" opts={CASE_TYPES}/>
            <Field label="State" value={calc.state} onChange={fc("state")} as="select" opts={STATES}/>
          </div>
          <Field label="Incident / Cause of Action Date" value={calc.incident} onChange={fc("incident")} type="date"/>
          <Btn onClick={calcSOL} disabled={!calc.incident||solLoading} icon="clock">{solLoading?"Calculating…":"Calculate SOL Deadline"}</Btn>
          {sol&&(
            <div className="fade-in" style={{marginTop:12,background:T.panel2,border:`1px solid ${sol.deadline&&new Date(sol.deadline)<today?T.crimson:T.emerald}40`,borderRadius:7,padding:14}}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div style={{textAlign:"center",minWidth:60}}>
                  <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em",marginBottom:3}}>SOL PERIOD</div>
                  <div style={{fontSize:22,fontWeight:700,color:T.amber,fontFamily:"'JetBrains Mono',monospace"}}>{sol.solYears}<span style={{fontSize:12}}>yr</span></div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em",marginBottom:3}}>FILING DEADLINE</div>
                  <div style={{fontSize:15,fontWeight:700,color:new Date(sol.deadline)<today?T.crimson:T.emerald,fontFamily:"'JetBrains Mono',monospace"}}>{sol.deadline}</div>
                  {sol.notes&&<div style={{fontSize:11,color:T.textSub,marginTop:4,lineHeight:1.5}}>{sol.notes}</div>}
                  {sol.exceptions&&<div style={{fontSize:11,color:T.amber,marginTop:4}}>⚠ {sol.exceptions}</div>}
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Add deadline */}
        <Panel style={{padding:16}}>
          <SectionHeader label="Add Deadline"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Title" value={form.title} onChange={ff("title")} placeholder="e.g. Motion to Dismiss Filing"/>
            <Field label="Due Date" value={form.date} onChange={ff("date")} type="date"/>
            <Field label="Type" value={form.type} onChange={ff("type")} as="select" opts={TYPES}/>
            <Field label="Priority" value={form.priority} onChange={ff("priority")} as="select" opts={PRIO}/>
          </div>
          <Field label="Notes (optional)" value={form.notes} onChange={ff("notes")} placeholder="Context or instructions…"/>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={addDeadline} disabled={!form.title.trim()||!form.date} icon="plus">Add Deadline</Btn>
            <Btn variant="ghost" onClick={autoSuggestDeadlines} disabled={suggestLoading} icon="sparkle">{suggestLoading?"Generating…":"Auto-Suggest"}</Btn>
          </div>
        </Panel>

        {/* AI Deadline Suggestion Modal */}
        {showSuggest&&suggestions.length>0&&(
          <Panel style={{padding:16,borderColor:`${T.cobalt}40`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <SectionHeader label={`AI Suggested Deadlines (${suggestions.length})`} color={T.cobalt}/>
              <button onClick={()=>setShowSuggest(false)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}><Icon n="close" size={12} color={T.textMuted}/></button>
            </div>
            <div style={{fontSize:11,color:T.textMuted,marginBottom:10}}>Select which deadlines to add:</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              {suggestions.map((s,i)=>(
                <label key={i} style={{display:"flex",alignItems:"flex-start",gap:9,padding:"8px 10px",background:suggestSelected[i]?`${T.cobalt}12`:T.panel2,border:`1px solid ${suggestSelected[i]?T.cobalt:T.border}`,borderRadius:6,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!suggestSelected[i]} onChange={e=>setSuggestSelected(p=>({...p,[i]:e.target.checked}))} style={{marginTop:2,accentColor:T.cobalt}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.text}}>{s.title}</div>
                    <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                      <Badge color={T.amber} size="xs">{s.date}</Badge>
                      <Badge color={T.cobalt} size="xs">{s.priority||"High"}</Badge>
                      {s.rule&&<span style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{s.rule}</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="emerald" size="sm" onClick={addSuggested} disabled={!Object.values(suggestSelected).some(Boolean)}>Add Selected ({Object.values(suggestSelected).filter(Boolean).length})</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>setShowSuggest(false)}>Cancel</Btn>
            </div>
          </Panel>
        )}
      </div>

      {/* Deadline list */}
      <div className="scroll-y" style={{width:isMobile?"100%":290,flexShrink:0}}>
        {overdue.length>0&&(
          <Panel style={{padding:14,marginBottom:10,borderColor:`${T.crimson}40`}}>
            <SectionHeader label={`Overdue (${overdue.length})`} color={T.crimson}/>
            {overdue.map(d=>(
              <div key={d.id} style={{background:`${T.crimson}10`,border:`1px solid ${T.crimson}30`,borderRadius:6,padding:"9px 11px",marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.crimson,flex:1}}>{d.title}</div>
                  <button onClick={()=>removeDeadline(d.id)} style={{background:"none",border:"none",padding:2,color:T.textMuted,cursor:"pointer"}}><Icon n="close" size={11} color={T.textMuted}/></button>
                </div>
                <div style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginTop:3}}>{d.date} · {Math.abs(daysUntil(d))}d overdue</div>
              </div>
            ))}
          </Panel>
        )}
        <Panel style={{padding:14}}>
          <SectionHeader label={`Upcoming (${upcoming.length})`} color={T.gold}/>
          {upcoming.length===0
            ? <div style={{fontSize:12,color:T.textMuted,textAlign:"center",padding:"20px 0"}}>No upcoming deadlines</div>
            : upcoming.map(d=>{
                const days = daysUntil(d);
                const urgent = days<=7;
                const pc = PRIO_C[d.priority]||T.textSub;
                return (
                  <div key={d.id} style={{background:T.panel2,border:`1px solid ${urgent?T.amber+"50":T.border}`,borderRadius:6,padding:"10px 11px",marginBottom:8,borderLeft:`3px solid ${pc}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:2}}>{d.title}</div>
                        <div style={{display:"flex",gap:5,marginBottom:5,flexWrap:"wrap"}}>
                          <Badge color={pc} size="xs">{d.priority}</Badge>
                          <Badge color={T.textSub} size="xs">{d.type}</Badge>
                        </div>
                        <div style={{fontSize:10,color:urgent?T.amber:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{d.date} · {days}d remaining</div>
                        {d.notes&&<div style={{fontSize:11,color:T.textMuted,marginTop:4}}>{d.notes}</div>}
                      </div>
                      <button onClick={()=>removeDeadline(d.id)} style={{background:"none",border:"none",padding:2,cursor:"pointer",flexShrink:0}}><Icon n="close" size={11} color={T.textMuted}/></button>
                    </div>
                  </div>
                );
              })
          }
        </Panel>
      </div>
    </div>
  );
}

// ── Deep Research Panel ────────────────────────────────────────────────────
// CoCounsel's killer feature: agentic multi-step research plan → execute → memo
function DeepResearchPanel({caseData,settings,onUpdateCase,onLog,isMobile,notify}) {
  const [query,setQuery] = useState("");
  const [plan,setPlan] = useState(null);
  const [steps,setSteps] = useState([]); // [{id,title,status,result}]
  const [memo,setMemo] = useState("");
  const [phase,setPhase] = useState("idle"); // idle|planning|executing|complete|error
  const [error,setError] = useState("");
  const planRef = useRef();

  const apiCall = async (messages, maxTokens=2000, withSearch=true) => {
    const body = {model:settings.model,max_tokens:maxTokens,system:settings.systemPrompt,messages};
    if(withSearch&&settings.webSearch) body.tools=[{type:"web_search_20260209",name:"web_search"}];
    const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    
    return (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  };

  const runDeepResearch = async () => {
    if(!query.trim()) return;
    setPhase("planning"); setError(""); setPlan(null); setSteps([]); setMemo("");

    try{
      // PHASE 1: Generate a research plan
      const planPrompt = `You are conducting deep legal research for: "${query}"

MATTER CONTEXT:
- Case: ${caseData.title}
- Type: ${caseData.caseType} | Jurisdiction: ${caseData.jurisdiction}
- Facts: ${caseData.facts||"Not provided"}
- Existing precedents: ${(caseData.precedents||[]).map(p=>p.citation).join(", ")||"None"}

Create a structured research plan. Return ONLY valid JSON:
{
  "researchQuestion": "refined version of the query",
  "hypothesis": "preliminary legal position",
  "steps": [
    {"id":"1","title":"Step title","objective":"What to find","searchQuery":"exact query to run"},
    ...3-5 steps max
  ],
  "expectedOutputs": ["memo sections expected"]
}`;

      const planRaw = await apiCall([{role:"user",content:planPrompt}], 1000, false);
      const planMatch = planRaw.match(/\{[\s\S]*\}/);
      if(!planMatch) throw new Error("Could not generate research plan");
      const planData = JSON.parse(planMatch[0]);
      setPlan(planData);
      const initialSteps = planData.steps.map(s=>({...s,status:"pending",result:""}));
      setSteps(initialSteps);
      setPhase("executing");

      // PHASE 2: Execute each step
      const stepResults = [];
      for(let i=0; i<initialSteps.length; i++){
        const step = initialSteps[i];
        setSteps(prev=>prev.map((s,j)=>j===i?{...s,status:"running"}:s));
        try{
          const stepPrompt = `Research step ${step.id}: ${step.title}
Objective: ${step.objective}
Search query: ${step.searchQuery}

MATTER: ${caseData.title} | ${caseData.caseType} | ${caseData.jurisdiction}
Facts: ${caseData.facts||"Not provided"}

Find authoritative sources. Provide: key findings, relevant citations (with full Bluebook format), and analysis. Be specific and cite primary sources only.`;
          const result = await apiCall([{role:"user",content:stepPrompt}], 1500, true);
          stepResults.push({...step, result});
          setSteps(prev=>prev.map((s,j)=>j===i?{...s,status:"complete",result}:s));
          // Extract precedents from each step
          const cites = extractCitations(result);
          if(cites.length){
            onUpdateCase(prev=>{
              const existing = prev.precedents||[];
              const newPrecs = cites.map(c=>({name:"",citation:c.raw,court:"",year:"",confidence:"Medium",source:"deep_research"}));
              const merged = [...existing,...newPrecs.filter(n=>!existing.find(e=>e.citation===n.citation))];
              return {...prev,precedents:merged};
            });
          }
        }catch(e){
          setSteps(prev=>prev.map((s,j)=>j===i?{...s,status:"error",result:`Error: ${e.message}`}:s));
          stepResults.push({...step,result:`Failed: ${e.message}`});
          notify?.error(`Step Failed`, e.message||"Research step error", settings.model);
        }
      }

      const successSteps = stepResults.filter(s=>!s.result.startsWith("Failed:"));
      const failedSteps  = stepResults.filter(s=>s.result.startsWith("Failed:"));

      // PHASE 3: Synthesize into a comprehensive memo
      setPhase("synthesizing");
      const synthPrompt = `You completed a multi-step legal research process. Now synthesize ALL findings into a comprehensive research memo.

RESEARCH QUESTION: ${planData.researchQuestion}
HYPOTHESIS: ${planData.hypothesis}
MATTER: ${caseData.title} | ${caseData.caseType} | ${caseData.jurisdiction}
${failedSteps.length>0?`NOTE: ${failedSteps.length} research step(s) could not complete — do not fabricate results for those steps.\n`:""}
COMPLETED RESEARCH STEPS:
${successSteps.map(s=>`## ${s.title}\n${s.result}`).join("\n\n---\n\n")}

Write a complete, attorney-grade research memo. EVERY section below is mandatory — do not skip or merge any. Write each section in full before moving to the next.

# Executive Summary
(Bottom-line answer in 2-3 paragraphs: what does the research show? What should counsel know immediately?)

# Applicable Legal Standards
(Exact legal tests — specific intent standard, scheme to defraud elements, burden of proof. Cite cases from research above with full citation: Case Name, Vol. F.Xd Page (Court Year))

# Defense Arguments
(THIS IS THE MOST IMPORTANT SECTION. Write at minimum 300 words. Analyze: (a) how the specific legal standards favor the defense, (b) factual arguments from the case, (c) Rule 9(b) pleading deficiencies if applicable, (d) good faith reliance doctrine. Each argument must be substantive, not conclusory.)

# Analysis by Issue
(Apply each legal standard to the specific facts of this matter. Cite cases from research above.)

# Verified Precedents
(Full citation for each case from research — format: Case Name, Vol. F.Xd Page (Court Year) — mark each [VERIFIED])

# Counter-Arguments
(What the opposing party argues — address prosecution's strongest points honestly)

# Strategic Recommendations
(MANDATORY — minimum 4 concrete action items: specific motions to file, discovery to seek, witnesses, plea considerations, trial strategy. Each must be actionable, not generic.)

# Conclusion
(Brief summary and overall assessment)

CITATION REQUIREMENTS: Every citation MUST have ALL 4 parts: Case Name, Volume Reporter Page (Court Year). Example: United States v. Treadwell, 816 F.2d 94, 99 (2d Cir. 1987). A citation like "816 F.2d 94" alone is INCOMPLETE — always include the case name and parenthetical.
VOLUME REQUIREMENT: Include at least 6 citations in the Verified Precedents section.
STRATEGIC RECOMMENDATIONS: Must contain at least 3 specific, actionable items for defense counsel.
Mark each citation [VERIFIED] if found in the research steps above.`;

      const finalMemo = await apiCall([{role:"user",content:synthPrompt}], Math.max(settings.maxTokens, 4000), false);
      setMemo(finalMemo);
      setPhase("complete");
      onLog({type:"deep_research",caseId:caseData.id,query,ts:Date.now()});
      notify?.success("Deep Research Complete", `${stepResults.length} steps · Comprehensive memo generated`, settings.model);
    }catch(e){
      setPhase("error");
      setError(e.message||"Deep Research failed");
      notify?.error("Deep Research Failed", e.message||"Deep Research failed", settings.model);
    }
  };

  const reset = ()=>{setPhase("idle");setPlan(null);setSteps([]);setMemo("");setError("");};

  return (
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",height:"100%",gap:12,overflow:"hidden"}}>
      {/* Left: Plan + Steps */}
      <div style={{width:isMobile?"100%":280,flexShrink:0,display:"flex",flexDirection:"column",gap:10,overflow:isMobile?"visible":"auto"}}>
        <Panel style={{padding:14}}>
          <SectionHeader label="Deep Research" color={T.cobalt}/>
          <div style={{fontSize:11,color:T.textSub,marginBottom:10,lineHeight:1.6}}>
            ARES generates a multi-step research plan, executes each step autonomously against real databases, then synthesizes a comprehensive memo — same approach as <strong style={{color:T.platinum}}>CoCounsel Deep Research</strong>.
          </div>
          <Field label="Research Question" value={query} onChange={setQuery} as="textarea" rows={3}
            placeholder="e.g. What are the constitutional limits on warrantless digital searches in the 9th Circuit?"/>
          <div style={{display:"flex",gap:6}}>
            <Btn onClick={runDeepResearch} disabled={!query.trim()||phase==="planning"||phase==="executing"||phase==="synthesizing"} full icon="search">
              {phase==="planning"?"Planning…":phase==="executing"?"Executing…":phase==="synthesizing"?"Synthesizing memo…":"Run Deep Research"}
            </Btn>
            {phase!=="idle"&&<Btn variant="ghost" onClick={reset} size="sm">↺</Btn>}
          </div>
          {error&&<div style={{marginTop:8,fontSize:11,color:T.crimson,background:T.crimsonFaint,border:`1px solid ${T.crimson}40`,borderRadius:5,padding:"7px 10px"}}>{error}</div>}
        </Panel>

        {plan&&(
          <Panel style={{padding:14}}>
            <SectionHeader label="Research Plan" color={T.gold}/>
            <div style={{fontSize:12,color:T.text,fontWeight:600,marginBottom:4,lineHeight:1.4}}>{plan.researchQuestion}</div>
            <div style={{fontSize:11,color:T.textSub,marginBottom:10,fontStyle:"italic",lineHeight:1.5}}>{plan.hypothesis}</div>
            {steps.map((s,i)=>(
              <div key={s.id} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <div style={{width:20,height:20,borderRadius:5,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                  background:s.status==="complete"?T.emeraldFaint:s.status==="running"?`${T.amber}18`:s.status==="error"?T.crimsonFaint:T.panel2,
                  border:`1px solid ${s.status==="complete"?T.emerald:s.status==="running"?T.amber:s.status==="error"?T.crimson:T.border}`}}>
                  {s.status==="running"?<Spinner size={10} color={T.amber}/>:
                   s.status==="complete"?<Icon n="check" size={10} color={T.emerald}/>:
                   s.status==="error"?<Icon n="close" size={10} color={T.crimson}/>:
                   <span style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:s.status==="running"?T.amber:s.status==="complete"?T.text:T.textSub,fontWeight:s.status==="running"?600:400,lineHeight:1.4}}>{s.title}</div>
                  {s.status==="running"&&<div style={{fontSize:10,color:T.amber,marginTop:2}}>Searching databases…</div>}
                </div>
              </div>
            ))}
          </Panel>
        )}
      </div>

      {/* Right: Memo Output */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <span style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em"}}>
            {phase==="complete"?"DEEP RESEARCH MEMO":phase==="synthesizing"?"SYNTHESIZING MEMO…":phase==="executing"?"EXECUTING RESEARCH PLAN…":phase==="planning"?"GENERATING PLAN…":"RESEARCH OUTPUT"}
          </span>
          {memo&&<div style={{display:"flex",gap:5}}>
            <Btn variant="cobalt" size="xs" icon="pdf" onClick={()=>exportToPDF("Deep Research Memo — "+caseData.title,renderMd(memo),caseData,caseData.allVerifications||[])}>PDF</Btn>
            <Btn variant="ghost" size="xs" onClick={()=>navigator.clipboard.writeText(memo)} icon="copy">Copy</Btn>
          </div>}
        </div>
        <div className="scroll-y" style={{flex:1,padding:isMobile?14:"24px 28px"}}>
          {phase==="idle"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12,textAlign:"center",padding:20}}>
            <Icon n="search" size={36} color={T.textMuted}/>
            <div className="serif" style={{fontSize:20,color:T.textMuted,fontStyle:"italic"}}>Multi-Step Legal Research</div>
            <div style={{fontSize:12,color:T.textMuted,maxWidth:400,lineHeight:1.7}}>Enter a complex legal question and ARES will autonomously plan, execute, and synthesize a comprehensive research memo — grounded in real case law databases.</div>
          </div>}
          {(phase==="planning"||phase==="executing"&&!memo)&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12}}>
            <Spinner size={32}/>
            <div style={{fontSize:14,color:T.textSub}}>{phase==="planning"?"Generating research plan…":"Executing step "+((steps.filter(s=>s.status!=="pending").length)+1)+" of "+steps.length+"…"}</div>
          </div>}
          {phase==="synthesizing"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16,padding:24}}>
            <Spinner size={32} color={T.gold}/>
            <div className="serif" style={{fontSize:18,color:T.gold,fontStyle:"italic"}}>Synthesizing Research Memo</div>
            <div style={{fontSize:12,color:T.textSub,textAlign:"center",maxWidth:340,lineHeight:1.7}}>
              ARES is combining {steps.filter(s=>s.status==="complete").length} research steps into a comprehensive legal memo. This takes 20–40 seconds.
            </div>
            <div style={{width:"100%",maxWidth:320}}>
              <div style={{height:3,background:T.border,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",background:T.gold,borderRadius:2,animation:"synthProgress 30s linear forwards",width:"0%"}} id="synthBar"/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>
                <span>Drafting…</span><span>Almost done…</span>
              </div>
            </div>
          </div>}
          {memo&&<div className="prose" dangerouslySetInnerHTML={{__html:renderMd(memo)}}/>}
        </div>
      </div>
    </div>
  );
}

// ── Vault Panel (Batch Document Analysis) ─────────────────────────────────
// Harvey Vault equivalent: upload multiple docs, ask questions across all of them
function VaultPanel({caseData,settings,onUpdateCase,isMobile,notify}) {
  const [docs,setDocs] = useState(caseData.vaultDocs||[]);
  const [query,setQuery] = useState("");
  const [loading,setLoading] = useState(false);
  const [results,setResults] = useState([]);
  const [mode,setMode] = useState("ask"); // "ask"|"extract"|"compare"
  const vaultRef = useRef();

  const EXTRACT_TEMPLATES = [
    {id:"parties",label:"Extract all parties & roles"},
    {id:"dates",label:"Extract all key dates & deadlines"},
    {id:"claims",label:"Extract claims & allegations"},
    {id:"damages",label:"Extract damages & relief sought"},
    {id:"exhibits",label:"Extract referenced exhibits"},
    {id:"custom",label:"Custom extraction…"},
  ];

  const addDocs = async e=>{
    const files = Array.from(e.target.files||[]);
    const newDocs = await Promise.all(files.map(async f=>{
      const [base64, extracted] = await Promise.all([
        readFileAsBase64(f),
        (f.type==="application/pdf"||f.name.endsWith(".pdf")) ? extractPdfText(f) : Promise.resolve({text:null,chars:0})
      ]);
      return {
        id:genId(),name:f.name,size:f.size,type:f.type||"application/pdf",
        base64,extractedText:extracted.text,extractedChars:extracted.chars,addedAt:Date.now()
      };
    }));
    const merged = [...docs,...newDocs];
    setDocs(merged);
    onUpdateCase(prev=>({...prev,vaultDocs:merged.map(d=>({id:d.id,name:d.name,size:d.size,addedAt:d.addedAt}))}));
    e.target.value="";
  };

  const removeDoc = id=>{
    const next = docs.filter(d=>d.id!==id);
    setDocs(next);
    onUpdateCase(prev=>({...prev,vaultDocs:next.map(d=>({id:d.id,name:d.name,size:d.size,addedAt:d.addedAt}))}));
  };

  const analyze = async()=>{
    if(!docs.length||!query.trim()) return;
    setLoading(true); setResults([]);
    try{
      const q = mode==="extract" ? query : query;
      // Build message — prefer extracted text (works with all providers), fall back to base64 for native Anthropic
      const activeDocs = docs.slice(0,5);
      const docBlocks = activeDocs.map(d => {
        if (d.extractedText) {
          return {type:"text", text:`[Document: ${d.name}]\n\n${d.extractedText.slice(0,12000)}`};
        }
        // Image-based or non-PDF: send base64 (only Anthropic native can read it)
        return {type:"document",source:{type:"base64",media_type:d.type,data:d.base64}};
      });
      const imagePdfWarning = activeDocs.some(d=>!d.extractedText&&(d.type==="application/pdf"||d.name?.endsWith(".pdf")))
        ? "\n\n⚠ One or more PDFs appear to be image-based — text could not be extracted. Analysis may be limited."
        : "";
      const content = [
        ...docBlocks,
        {type:"text",text:`You have been given ${activeDocs.length} legal document(s)${docs.length>5?` (showing first 5 of ${docs.length})`:""}.\n\nDocument names: ${activeDocs.map(d=>d.name).join(", ")}\n\nTask: ${q}\n\nMatter context: ${caseData.title} | ${caseData.caseType} | ${caseData.jurisdiction}\n\nAnalyze all documents and provide a comprehensive, structured response. For each document analyzed, clearly label findings by document name.${imagePdfWarning}`}
      ];
      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:settings.model,max_tokens:settings.maxTokens,system:settings.systemPrompt,
        messages:[{role:"user",content}]
      })});
      
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("") || "No response";
      setResults([{query:q,response:text,ts:Date.now(),docCount:Math.min(docs.length,5)}]);
      notify?.success("Vault Analysis Complete", `${Math.min(docs.length,5)} document(s) analyzed`, settings.model);
    }catch(e){
      setResults([{query,response:`Error: ${e.message}`,ts:Date.now(),docCount:0}]);
      notify?.error("Vault Analysis Failed", e.message, settings.model);
    }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",height:"100%",gap:12,overflow:"hidden"}}>
      {/* Sidebar: document list */}
      <div style={{width:isMobile?"100%":240,flexShrink:0,display:"flex",flexDirection:"column",gap:10,overflow:isMobile?"visible":"auto"}}>
        <Panel style={{padding:14}}>
          <SectionHeader label="Document Vault" color={T.amber}/>
          <div style={{fontSize:11,color:T.textSub,marginBottom:10,lineHeight:1.6}}>Upload multiple documents and ask questions across all of them — contracts, complaints, depositions, discovery.</div>
          <input ref={vaultRef} type="file" accept=".pdf,.doc,.docx,.txt" multiple style={{display:"none"}} onChange={addDocs}/>
          <Btn onClick={()=>vaultRef.current?.click()} full icon="pdf">Add Documents</Btn>
          <div style={{fontSize:9,color:T.textMuted,marginTop:6,fontFamily:"'JetBrains Mono',monospace"}}>Up to 5 docs analyzed per query · PDF, DOCX, TXT</div>
        </Panel>
        <Panel style={{padding:14,flex:1}}>
          <SectionHeader label={`Vault (${docs.length})`}/>
          {!docs.length&&<div style={{fontSize:12,color:T.textMuted,textAlign:"center",padding:"16px 0",lineHeight:1.6}}>No documents yet</div>}
          {docs.map(d=>(
            <div key={d.id} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
              <Icon n="pdf" size={13} color={T.cobalt}/>
              <div style={{flex:1,minWidth:0}}>
                <span className="truncate" style={{fontSize:11,color:T.text,display:"block"}}>{d.name}</span>
                {d.extractedChars>0
                  ? <span style={{fontSize:9,color:T.green,fontFamily:"'JetBrains Mono',monospace"}}>{(d.extractedChars/1000).toFixed(1)}k chars extracted</span>
                  : (d.type==="application/pdf"||d.name?.endsWith(".pdf"))
                    ? <span style={{fontSize:9,color:T.amber,fontFamily:"'JetBrains Mono',monospace"}}>image PDF — text unavailable</span>
                    : null
                }
              </div>
              <button onClick={()=>removeDoc(d.id)} style={{background:"none",border:"none",padding:2,cursor:"pointer",flexShrink:0}}><Icon n="close" size={10} color={T.textMuted}/></button>
            </div>
          ))}
        </Panel>
      </div>

      {/* Main: query + results */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
          <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
            {[{id:"ask",label:"Ask Across Docs"},{id:"extract",label:"Extract Data"},{id:"compare",label:"Compare Docs"}].map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)}
                style={{fontSize:11,padding:"4px 10px",borderRadius:4,cursor:"pointer",background:mode===m.id?T.goldFaint:"transparent",border:`1px solid ${mode===m.id?T.goldDim:T.border}`,color:mode===m.id?T.gold:T.textSub,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                {m.label}
              </button>
            ))}
          </div>
          {mode==="extract"&&(
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
              {EXTRACT_TEMPLATES.map(t=>(
                <button key={t.id} onClick={()=>setQuery(t.id==="custom"?"":t.label)}
                  style={{fontSize:10,padding:"3px 8px",borderRadius:3,cursor:"pointer",background:T.panel2,border:`1px solid ${T.border}`,color:T.textSub,fontFamily:"'JetBrains Mono',monospace"}}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:6}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()}
              placeholder={mode==="ask"?"Ask a question across all documents…":mode==="extract"?"What to extract from all documents…":"How should I compare these documents?"}
              style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,padding:"9px 12px",fontSize:13,minWidth:0}} className="gold-focus"/>
            <Btn onClick={analyze} disabled={loading||!docs.length||!query.trim()} icon="search">{loading?"Analyzing…":"Analyze"}</Btn>
          </div>
          {!docs.length&&<div style={{fontSize:11,color:T.amber,marginTop:6}}>⚠ Add documents to the vault first</div>}
          {!!docs.length&&docs.some(d=>d.extractedChars>0)&&(
            <div style={{fontSize:11,color:T.green,marginTop:6,lineHeight:1.5}}>
              ✓ Text extracted from {docs.filter(d=>d.extractedChars>0).length} document(s) — AI will read full content.
            </div>
          )}
          {!!docs.length&&docs.some(d=>!d.extractedChars&&(d.type==="application/pdf"||d.name?.endsWith(".pdf")))&&(
            <div style={{fontSize:11,color:T.amber,marginTop:4,lineHeight:1.5}}>
              ⚠ <strong>Image-based PDF detected:</strong> Text could not be extracted. For scanned documents, configure a direct Anthropic API key in Settings for native PDF reading.
            </div>
          )}
        </div>
        <div className="scroll-y" style={{flex:1,padding:isMobile?14:"20px 24px"}}>
          {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px",gap:12}}><Spinner size={28}/><div style={{fontSize:13,color:T.textSub}}>Analyzing {Math.min(docs.length,5)} document(s)…</div></div>}
          {!loading&&!results.length&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px",gap:12,textAlign:"center"}}>
            <Icon n="pdf" size={36} color={T.textMuted}/>
            <div className="serif" style={{fontSize:20,color:T.textMuted,fontStyle:"italic"}}>Document Vault</div>
            <div style={{fontSize:12,color:T.textMuted,maxWidth:400,lineHeight:1.7}}>Upload documents and ask questions across all of them at once. Extract structured data, compare contracts, or analyze discovery materials.</div>
          </div>}
          {results.map((r,i)=>(
            <div key={i} style={{marginBottom:20}}>
              <div style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:8}}>
                {new Date(r.ts).toLocaleTimeString()} · {r.docCount} document(s)
              </div>
              <div className="prose" dangerouslySetInnerHTML={{__html:renderMd(r.response)}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Case Timeline Panel ───────────────────────────────────────────────────
function TimelinePanel({caseData,settings,onUpdateCase,isMobile,notify}) {
  const [events,setEvents] = useState(caseData.timeline||[]);
  const [generating,setGenerating] = useState(false);
  const [form,setForm] = useState({date:"",title:"",type:"Event",description:""});
  const ff = k=>v=>setForm(p=>({...p,[k]:v}));
  const TYPES = ["Event","Filing","Hearing","Deposition","Discovery","Deadline","Ruling","Settlement","Other"];
  const TYPE_C = {Filing:T.gold,Hearing:T.cobalt,Deposition:T.violet,Discovery:T.amber,Deadline:T.crimson,Ruling:T.emerald,Settlement:T.emerald,Event:T.textSub,Other:T.textSub};

  const autoGenerate = async()=>{
    setGenerating(true);
    try{
      const prompt = `Extract and generate a chronological case timeline for:\n\nCase: ${caseData.title}\nType: ${caseData.caseType} | Jurisdiction: ${caseData.jurisdiction}\nFacts: ${caseData.facts||"Not provided"}\n\nReturn ONLY valid JSON array — no preamble:\n[{"date":"YYYY-MM-DD","title":"Event title","type":"Event|Filing|Hearing|Deposition|Discovery|Deadline|Ruling|Settlement","description":"Brief description","significance":"High|Medium|Low"}]`;
      const data = await safeFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:settings.model,max_tokens:1500,system:settings.systemPrompt,messages:[{role:"user",content:prompt}]})});
      
      const raw = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const match = raw.match(/\[[\s\S]*\]/);
      if(match){
        const generated = JSON.parse(match[0]).map(e=>({...e,id:genId(),auto:true}));
        const merged = [...events,...generated.filter(g=>!events.find(e=>e.date===g.date&&e.title===g.title))].sort((a,b)=>new Date(a.date)-new Date(b.date));
        setEvents(merged);
        onUpdateCase(prev=>({...prev,timeline:merged}));
      }
      notify?.success("Timeline Generated", "Events auto-populated from case facts", settings.model);
    }catch(e){
      notify?.error("Timeline Generation Failed", e.message||"Could not extract timeline", settings.model);
    }
    setGenerating(false);
  };

  const addEvent = ()=>{
    if(!form.date||!form.title) return;
    const next = [...events,{...form,id:genId(),auto:false}].sort((a,b)=>new Date(a.date)-new Date(b.date));
    setEvents(next);
    onUpdateCase(prev=>({...prev,timeline:next}));
    setForm({date:"",title:"",type:"Event",description:""});
  };

  const removeEvent = id=>{
    const next = events.filter(e=>e.id!==id);
    setEvents(next);
    onUpdateCase(prev=>({...prev,timeline:next}));
  };

  return (
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",height:"100%",gap:12,overflow:"hidden"}}>
      <div style={{width:isMobile?"100%":240,flexShrink:0,display:"flex",flexDirection:"column",gap:10,overflow:isMobile?"visible":"auto"}}>
        <Panel style={{padding:14}}>
          <SectionHeader label="Add Event"/>
          <Field label="Date" value={form.date} onChange={ff("date")} type="date"/>
          <Field label="Title" value={form.title} onChange={ff("title")} placeholder="Event title"/>
          <Field label="Type" value={form.type} onChange={ff("type")} as="select" opts={TYPES}/>
          <Field label="Description" value={form.description} onChange={ff("description")} as="textarea" rows={2} placeholder="Optional details"/>
          <Btn onClick={addEvent} disabled={!form.date||!form.title} full icon="plus">Add to Timeline</Btn>
        </Panel>
        <Btn onClick={autoGenerate} disabled={generating} variant="gold" full icon="strategy">
          {generating?"Generating…":"Auto-Generate from Facts"}
        </Btn>
      </div>

      <div className="scroll-y" style={{flex:1,paddingBottom:20}}>
        {!events.length&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 20px",gap:12,textAlign:"center"}}>
          <Icon n="clock" size={36} color={T.textMuted}/>
          <div className="serif" style={{fontSize:20,color:T.textMuted,fontStyle:"italic"}}>Case Timeline</div>
          <div style={{fontSize:12,color:T.textMuted,maxWidth:380,lineHeight:1.7}}>Add events manually or click "Auto-Generate" to extract a timeline from your case facts. Events sort chronologically automatically.</div>
        </div>}
        {events.map((e,i)=>{
          const c = TYPE_C[e.type]||T.textSub;
          const isLast = i===events.length-1;
          return (
            <div key={e.id} style={{display:"flex",gap:14,marginBottom:isLast?0:4}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:20}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:c,border:`2px solid ${c}`,marginTop:4,flexShrink:0}}/>
                {!isLast&&<div style={{width:2,flex:1,background:`${c}30`,marginTop:3}}/>}
              </div>
              <div style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderLeft:`3px solid ${c}`,borderRadius:6,padding:"10px 14px",marginBottom:8,position:"relative"}}
                onMouseEnter={e=>{const b=e.currentTarget.querySelector(".del");if(b)b.style.opacity="1";}}
                onMouseLeave={e=>{const b=e.currentTarget.querySelector(".del");if(b)b.style.opacity="0";}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div>
                    <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",marginBottom:2}}>{e.date}{e.auto&&<span style={{marginLeft:6,color:T.gold}}>AUTO</span>}</div>
                    <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:2}}>{e.title}</div>
                    <Badge color={c} size="xs">{e.type}</Badge>
                    {e.significance&&<Badge color={e.significance==="High"?T.crimson:e.significance==="Medium"?T.amber:T.textSub} size="xs" style={{marginLeft:4}}>{e.significance}</Badge>}
                    {e.description&&<div style={{fontSize:11,color:T.textSub,marginTop:6,lineHeight:1.5}}>{e.description}</div>}
                  </div>
                  <button className="del" onClick={()=>removeEvent(e.id)} style={{background:"none",border:"none",padding:2,cursor:"pointer",opacity:0,transition:"opacity 0.15s",flexShrink:0}}><Icon n="close" size={11} color={T.textMuted}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Conflict Check Panel ──────────────────────────────────────────────────
function ConflictCheckPanel({cases,caseData,isMobile,notify}) {
  const [search,setSearch] = useState("");
  const [checked,setChecked] = useState(false);

  const allParties = cases.flatMap(c=>{
    const parties = [];
    if(c.client) parties.push({name:c.client,role:"Client",matterId:c.id,matterTitle:c.title,caseType:c.caseType});
    // Extract party names from title (common format: Party v. Party)
    const vMatch = c.title?.match(/^(.+?)\s+v\.?\s+([^,\-—(]+)/i);
    if(vMatch){
      parties.push({name:vMatch[1].trim(),role:"Plaintiff/Prosecution",matterId:c.id,matterTitle:c.title,caseType:c.caseType});
      parties.push({name:vMatch[2].trim(),role:"Defendant",matterId:c.id,matterTitle:c.title,caseType:c.caseType});
    }
    return parties;
  });

  const results = search.trim().length>=2
    ? allParties.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const conflicts = results.filter(r=>r.matterId!==caseData.id);
  const sameMatter = results.filter(r=>r.matterId===caseData.id);
  const hasConflict = conflicts.length>0;

  return (
    <div className="scroll-y" style={{height:"100%"}}>
      <Panel style={{padding:18,marginBottom:12,borderColor:hasConflict?`${T.crimson}40`:`${T.emerald}30`}}>
        <SectionHeader label="Conflict of Interest Check" color={hasConflict?T.crimson:T.emerald}/>
        <div style={{fontSize:12,color:T.textSub,marginBottom:14,lineHeight:1.65}}>
          Search all open matters for parties who appear as adverse parties in other matters. Required before accepting new representation under ABA Model Rule 1.7.
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>{setSearch(e.target.value);setChecked(true);}}
            placeholder="Enter party name, client, or opposing counsel…"
            style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,padding:"10px 13px",fontSize:13}} className="gold-focus"/>
          {search&&<Btn variant="ghost" size="sm" onClick={()=>{setSearch("");setChecked(false);}}>Clear</Btn>}
        </div>
      </Panel>

      {/* Current matter context */}
      <Panel style={{padding:14,marginBottom:12}}>
        <SectionHeader label="Current Matter"/>
        <div style={{fontSize:13,color:T.text,fontWeight:600}}>{caseData.title}</div>
        <div style={{fontSize:12,color:T.textSub,marginTop:2}}>{caseData.client} · {caseData.caseType}</div>
      </Panel>

      {checked&&search.length>=2&&(
        <div className="fade-in">
          {!conflicts.length&&!sameMatter.length&&(
            <Panel style={{padding:18,borderColor:`${T.emerald}40`,background:T.emeraldFaint}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Icon n="shield" size={20} color={T.emerald}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.emerald}}>No Conflicts Found</div>
                  <div style={{fontSize:11,color:T.textSub,marginTop:2}}>"{search}" does not appear in any other matters in this system.</div>
                </div>
              </div>
            </Panel>
          )}

          {hasConflict&&(
            <Panel style={{padding:18,marginBottom:12,borderColor:`${T.crimson}50`,background:T.crimsonFaint}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <Icon n="alert" size={20} color={T.crimson}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.crimson}}>⚠ Potential Conflict Detected</div>
                  <div style={{fontSize:11,color:T.textSub,marginTop:2}}>"{search}" appears in {conflicts.length} other matter(s). Review for ABA Rule 1.7 compliance before proceeding.</div>
                </div>
              </div>
              {conflicts.map((c,i)=>(
                <div key={i} style={{background:T.surface,border:`1px solid ${T.crimson}30`,borderRadius:6,padding:"10px 14px",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.text}}>{c.matterTitle}</div>
                  <div style={{fontSize:11,color:T.textSub,marginTop:2}}>{c.name} appears as: <strong style={{color:T.crimson}}>{c.role}</strong></div>
                  <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>{c.caseType}</div>
                </div>
              ))}
            </Panel>
          )}

          {sameMatter.length>0&&(
            <Panel style={{padding:14}}>
              <SectionHeader label="Found in Current Matter" color={T.gold}/>
              {sameMatter.map((c,i)=><div key={i} style={{fontSize:12,color:T.textSub,marginBottom:4}}>· {c.name} ({c.role})</div>)}
            </Panel>
          )}
        </div>
      )}

      {!checked&&(
        <Panel style={{padding:18}}>
          <SectionHeader label="All Parties Across Matters"/>
          <div style={{fontSize:12,color:T.textSub,lineHeight:1.65,marginBottom:12}}>
            {allParties.length} parties found across {cases.length} matters. Search above to check for conflicts.
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
            {cases.map(c=>(
              <div key={c.id} style={{background:T.panel2,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px"}}>
                <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:2}}>{c.title}</div>
                <div style={{fontSize:10,color:T.textSub}}>{c.client}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ── Admin Panel ────────────────────────────────────────────────────────────
function AdminPanel({settings,onSave,logs,cases,isMobile,notify}) {
  const [s,setS] = useState(settings);
  const f = k=>v=>setS(p=>({...p,[k]:v}));
  const totalVerified = cases.reduce((a,c)=>(a+(c.allVerifications||[]).filter(v=>v.status==="verified").length),0);
  const totalFailed = cases.reduce((a,c)=>(a+(c.allVerifications||[]).filter(v=>v.status==="not_found").length),0);

  return (
    <div className="scroll-y" style={{height:"100%",maxWidth:860}}>
      <div style={{marginBottom:isMobile?16:24}}>
        <div className="serif" style={{fontSize:isMobile?20:26,fontStyle:"italic",color:T.text,marginBottom:4}}>Administration</div>
        <div style={{fontSize:13,color:T.textSub}}>Configure ARES, Hallucination Shield, model parameters, and analytics.</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["Research",logs.filter(l=>l.type==="research").length,T.cobalt],["Drafts",logs.filter(l=>l.type==="draft").length,T.emerald],["Citations Verified",totalVerified,T.emerald],["Citations Failed",totalFailed,totalFailed>0?T.crimson:T.textMuted]].map(([l,v,c])=>(
          <Panel key={l} style={{padding:"12px 14px"}}>
            <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div className="serif" style={{fontSize:24,color:c}}>{v}</div>
          </Panel>
        ))}
      </div>

      {/* Shield settings */}
      <Panel style={{padding:18,marginBottom:12,borderColor:`${T.emerald}30`}}>
        <SectionHeader label="Hallucination Shield" color={T.emerald}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div onClick={()=>f("autoVerify")(!s.autoVerify)} style={{width:38,height:20,borderRadius:10,background:s.autoVerify?T.emerald:T.panel2,cursor:"pointer",position:"relative",transition:"background 0.2s",border:`1px solid ${s.autoVerify?T.emerald:T.border}`}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:1,left:s.autoVerify?19:1,transition:"left 0.2s"}}/>
          </div>
          <div>
            <div style={{fontSize:12,color:T.text,fontWeight:500}}>Auto-verify citations after every ARES response</div>
            <div style={{fontSize:10,color:T.textMuted}}>Uses a second Claude call with web search to verify each Bluebook citation against CourtListener and Google Scholar</div>
          </div>
        </div>
        <div style={{background:T.panel2,border:`1px solid ${T.border}`,borderRadius:7,padding:12}}>
          <div style={{fontSize:11,color:T.textSub,lineHeight:1.65}}>
            <strong style={{color:T.platinum}}>How it works:</strong> After each ARES response, the Hallucination Shield extracts all Bluebook citation patterns, sends them to a verification Claude call with web search enabled, and checks each against CourtListener (18M+ citations) and Google Scholar Legal. Results are displayed inline as <span className="cite-verified">✓ VERIFIED</span> or <span className="cite-unconfirmed">⚠ UNCONFIRMED</span> badges. Every citation is stored in the Citation Audit tab with full provenance. Document exports include a Citation Verification Report.
          </div>
        </div>
      </Panel>

      <Panel style={{padding:18,marginBottom:12}}>
        <SectionHeader label="Agent System Prompt"/>
        <textarea value={s.systemPrompt} onChange={e=>f("systemPrompt")(e.target.value)} rows={10} style={{width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,padding:"11px 13px",fontSize:11,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.75}} className="gold-focus"/>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Btn variant="ghost" size="sm" onClick={()=>f("systemPrompt")(DEFAULT_SYSTEM)}>Reset to Default</Btn>
          <span style={{fontSize:11,color:T.textMuted,alignSelf:"center"}}>{s.systemPrompt.length.toLocaleString()} chars</span>
        </div>
      </Panel>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:16}}>
        <Panel style={{padding:18}}>
          <SectionHeader label="Model Configuration"/>
          <Field label="AI Provider / Model" value={s.model} onChange={f("model")} as="select" opts={[
            {v:"auto",       l:"Auto — Waterfall (9 providers · always-on failover)"},
            {v:"groq",       l:"Groq — Llama 3.3 70B · fastest"},
            {v:"cerebras",   l:"Cerebras — Llama 3.3 70B · ultra-fast chip"},
            {v:"gemini",     l:"Gemini 2.0 Flash · Google multimodal"},
            {v:"xai",        l:"xAI — Grok-3 Mini · reasoning"},
            {v:"mistral",    l:"Mistral Small · EU privacy"},
            {v:"sambanova",  l:"SambaNova — Llama 3.3 70B"},
            {v:"openrouter", l:"OpenRouter — Llama 3.3 70B"},
            {v:"nvidia",     l:"NVIDIA — Llama 3.3 70B"},
          ]}/>
          <div style={{fontSize:10,color:T.textMuted,marginBottom:12,marginTop:-8}}>
            Auto mode tries Groq first and falls back through all 9 providers — best for reliability. Pick a specific provider to always use that one (falls back if rate-limited).
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:T.textSub,marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",textTransform:"uppercase"}}>Temperature: {s.temperature.toFixed(1)}</div>
            <input type="range" min="0" max="1" step="0.1" value={s.temperature} onChange={e=>f("temperature")(Number(e.target.value))} style={{width:"100%",accentColor:T.gold}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:T.textMuted,marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}><span>Precise (0)</span><span>Creative (1)</span></div>
          </div>
          <Field label="Max Tokens" value={s.maxTokens} onChange={v=>f("maxTokens")(Number(v))} type="number"/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div onClick={()=>f("webSearch")(!s.webSearch)} style={{width:38,height:20,borderRadius:10,background:s.webSearch?T.emerald:T.panel2,cursor:"pointer",position:"relative",transition:"background 0.2s",border:`1px solid ${s.webSearch?T.emerald:T.border}`}}>
              <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:1,left:s.webSearch?19:1,transition:"left 0.2s"}}/>
            </div>
            <div><div style={{fontSize:12,color:T.text}}>Live Web Search</div><div style={{fontSize:10,color:T.textMuted}}>CourtListener · Google Scholar</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div onClick={()=>f("autoVerify")(!s.autoVerify)} style={{width:38,height:20,borderRadius:10,background:s.autoVerify?T.emerald:T.panel2,cursor:"pointer",position:"relative",transition:"background 0.2s",border:`1px solid ${s.autoVerify?T.emerald:T.border}`}}>
              <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:1,left:s.autoVerify?19:1,transition:"left 0.2s"}}/>
            </div>
            <div><div style={{fontSize:12,color:T.text}}>Hallucination Shield</div><div style={{fontSize:10,color:T.textMuted}}>Auto-verify all citations after each response</div></div>
          </div>
        </Panel>

        {/* Legal Database Panel */}
        <Panel style={{padding:18,gridColumn:"1/-1",borderColor:`${T.cobalt}30`}}>
          <SectionHeader label="Legal Database Connections" color={T.cobalt}/>
          <div style={{fontSize:12,color:T.textSub,lineHeight:1.65,marginBottom:16}}>
            LexAgent connects to multiple authoritative legal databases for primary-source research.
            The more you connect, the higher the output quality — moving from "AI recall" to genuine primary-source retrieval.
          </div>

          {/* Status overview */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:10,marginBottom:16}}>
            {[
              {label:"CourtListener",sub:"9M opinions · 18M citations",active:!!s.courtListenerToken,note:"Token required"},
              {label:"CL Judge DB",sub:"16,000+ judges · disclosures",active:!!s.courtListenerToken,note:"Uses CL token"},
              {label:"Harvard CAP",sub:"6.7M cases · 1658–2020",active:true,note:"Always free"},
              {label:"GovInfo",sub:"US Code · CFR · Fed Register",active:!!s.govInfoKey,note:"api.data.gov key"},
              {label:"Congress.gov",sub:"Bills · amendments · votes",active:!!s.govInfoKey,note:"Uses same key"},
              {label:"Regulations.gov",sub:"Federal rulemaking · dockets",active:!!s.govInfoKey,note:"Uses same key"},
              {label:"eCFR",sub:"Live federal regulations",active:true,note:"Always free"},
              {label:"SEC EDGAR",sub:"10-K · 10-Q · 8-K filings",active:true,note:"Always free"},
              {label:"USPTO Patents",sub:"Full patent text · IP research",active:true,note:"Always free"},
              {label:"OpenStates",sub:"50-state legislation · bills",active:!!s.openStatesKey,note:"Free key required"},
            ].map(db=>(
              <div key={db.label} style={{padding:"10px 12px",background:db.active?`${T.cobalt}10`:T.panel2,border:`1px solid ${db.active?T.cobalt:T.border}`,borderRadius:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:db.active?T.cobalt:T.textMuted,flexShrink:0}}/>
                  <span style={{fontSize:11,color:db.active?T.cobalt:T.textSub,fontWeight:600}}>{db.label}</span>
                </div>
                <div style={{fontSize:9,color:T.textMuted,lineHeight:1.4}}>{db.sub}</div>
                <div style={{fontSize:9,color:db.active?T.emerald:T.textMuted,marginTop:3,fontFamily:"'JetBrains Mono',monospace"}}>{db.active?"● ACTIVE":"○ "+db.note}</div>
              </div>
            ))}
          </div>

          {/* ── API Key Vault ── */}
          <div style={{background:T.panel2,border:`1px solid ${T.goldDim}`,borderRadius:8,padding:16,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:7,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Icon n="shield" size={13} color={T.gold}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:T.gold,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em"}}>API KEY VAULT</div>
                  <div style={{fontSize:10,color:T.textMuted}}>Syncs automatically across all your devices</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:T.emerald,animation:"pulse 2s infinite"}}/>
                <span style={{fontSize:10,color:T.emerald,fontFamily:"'JetBrains Mono',monospace"}}>VAULT ACTIVE</span>
              </div>
            </div>

            {/* CourtListener */}
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:s.courtListenerToken?T.cobalt:T.border,flexShrink:0}}/>
                <div style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",textTransform:"uppercase",flex:1}}>CourtListener Token</div>
                {s.courtListenerToken&&<div style={{fontSize:9,color:T.cobalt,fontFamily:"'JetBrains Mono',monospace"}}>● CONNECTED · 18M+ citations · 16K+ judges</div>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <input
                  type="password"
                  value={s.courtListenerToken||""}
                  onChange={e=>f("courtListenerToken")(e.target.value)}
                  placeholder="Paste free token from courtlistener.com/register"
                  style={{flex:1,background:T.bg2,border:`1px solid ${s.courtListenerToken?T.cobalt:T.border}`,borderRadius:6,color:T.text,padding:"8px 12px",fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}
                  className="gold-focus"
                />
                {s.courtListenerToken&&<button onClick={()=>f("courtListenerToken")("")}
                  style={{padding:"0 10px",background:T.crimsonFaint,border:`1px solid ${T.crimson}40`,borderRadius:6,color:T.crimson,fontSize:11,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>Clear</button>}
              </div>
              <div style={{fontSize:10,color:T.textMuted,marginTop:4}}>Unlocks: opinion search, citation verification, judge profiles, financial disclosures · <span style={{color:T.cobalt,cursor:"pointer"}} onClick={()=>window.open&&window.open("https://www.courtlistener.com/register")}>Get free token →</span></div>
            </div>

            {/* api.data.gov — covers GovInfo + Congress + regulations.gov */}
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:s.govInfoKey?T.amber:T.border,flexShrink:0}}/>
                <div style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",textTransform:"uppercase",flex:1}}>api.data.gov Key</div>
                {s.govInfoKey&&<div style={{fontSize:9,color:T.amber,fontFamily:"'JetBrains Mono',monospace"}}>● CONNECTED · GovInfo · Congress.gov · Regulations.gov</div>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <input
                  type="password"
                  value={s.govInfoKey||""}
                  onChange={e=>f("govInfoKey")(e.target.value)}
                  placeholder="Free key from api.data.gov/signup — unlocks 3 federal APIs"
                  style={{flex:1,background:T.bg2,border:`1px solid ${s.govInfoKey?T.amber:T.border}`,borderRadius:6,color:T.text,padding:"8px 12px",fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}
                  className="gold-focus"
                />
                {s.govInfoKey&&<button onClick={()=>f("govInfoKey")("")}
                  style={{padding:"0 10px",background:T.crimsonFaint,border:`1px solid ${T.crimson}40`,borderRadius:6,color:T.crimson,fontSize:11,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>Clear</button>}
              </div>
              <div style={{fontSize:10,color:T.textMuted,marginTop:4}}>One key unlocks: US Code/CFR/Federal Register (GovInfo) · Bills/amendments/votes (Congress.gov) · Federal rulemaking (Regulations.gov) · <span style={{color:T.amber,cursor:"pointer"}} onClick={()=>window.open&&window.open("https://api.data.gov/signup/")}>Get free key →</span></div>
            </div>

            {/* OpenStates */}
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:s.openStatesKey?T.violet:T.border,flexShrink:0}}/>
                <div style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em",textTransform:"uppercase",flex:1}}>OpenStates API Key</div>
                {s.openStatesKey&&<div style={{fontSize:9,color:T.violet,fontFamily:"'JetBrains Mono',monospace"}}>● CONNECTED · 50-state legislation</div>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <input
                  type="password"
                  value={s.openStatesKey||""}
                  onChange={e=>f("openStatesKey")(e.target.value)}
                  placeholder="Free key from openstates.org/accounts/register"
                  style={{flex:1,background:T.bg2,border:`1px solid ${s.openStatesKey?T.violet:T.border}`,borderRadius:6,color:T.text,padding:"8px 12px",fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}
                  className="gold-focus"
                />
                {s.openStatesKey&&<button onClick={()=>f("openStatesKey")("")}
                  style={{padding:"0 10px",background:T.crimsonFaint,border:`1px solid ${T.crimson}40`,borderRadius:6,color:T.crimson,fontSize:11,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>Clear</button>}
              </div>
              <div style={{fontSize:10,color:T.textMuted,marginTop:4}}>State bills, legislators, votes across all 50 states · <span style={{color:T.violet,cursor:"pointer"}} onClick={()=>window.open&&window.open("https://openstates.org/accounts/register/")}>Get free key →</span></div>
            </div>

            {/* Always-active sources */}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {label:"Harvard Caselaw Access Project",sub:"6.7M cases · 360 years · automatic on every search"},
                {label:"eCFR — Electronic Code of Federal Regulations",sub:"Live current regulations · always up to date"},
                {label:"SEC EDGAR",sub:"Corporate filings: 10-K, 10-Q, 8-K · full-text search"},
                {label:"USPTO PatentsView",sub:"Full patent text · IP case research"},
              ].map(src=>(
                <div key={src.label} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:T.emeraldFaint,border:`1px solid ${T.emerald}30`,borderRadius:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:T.emerald,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:T.emerald,fontWeight:600}}>{src.label}</div>
                    <div style={{fontSize:10,color:T.textMuted}}>{src.sub}</div>
                  </div>
                  <div style={{fontSize:9,color:T.emerald,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>● FREE</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel style={{padding:18}}>
          <SectionHeader label="Recent Activity"/>
          <div className="scroll-y" style={{maxHeight:260}}>
            {[...logs].reverse().slice(0,30).map((l,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${T.border}`,alignItems:"center"}}>
                <Badge color={{research:T.cobalt,strategy:T.gold,draft:T.emerald}[l.type]||T.textSub} size="xs">{l.type}</Badge>
                <span style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>{new Date(l.ts).toLocaleDateString()}</span>
                {l.query&&<span style={{fontSize:11,color:T.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.query}</span>}
              </div>
            ))}
            {!logs.length&&<div style={{fontSize:12,color:T.textMuted,textAlign:"center",padding:"20px 0"}}>No activity yet</div>}
          </div>
        </Panel>
      </div>
      <Btn onClick={()=>onSave(s)} icon="check">Save Configuration</Btn>
    </div>
  );
}

// ── Billable Timer ─────────────────────────────────────────────────────────
function BillableTimer({cases,onUpdateCase}) {
  const [active,setActive] = useState(null); // {caseId, start}
  const [elapsed,setElapsed] = useState(0);
  const intervalRef = useRef();

  useEffect(()=>{
    if(active){
      intervalRef.current = setInterval(()=>setElapsed(e=>e+1),1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return ()=>clearInterval(intervalRef.current);
  },[active]);

  const startFor = caseId=>{
    if(active) stop();
    setActive({caseId});
    setElapsed(0);
  };

  const stop = ()=>{
    if(!active) return;
    const mins = Math.max(1,Math.round(elapsed/60));
    const c = cases.find(x=>x.id===active.caseId);
    if(c){
      const entry = {ts:Date.now(),mins,note:"ARES Session"};
      const entries = [...(c.timeEntries||[]),entry];
      const total = entries.reduce((a,t)=>a+t.mins,0);
      onUpdateCase({...c,timeEntries:entries,totalMinsBilled:total});
    }
    setActive(null); setElapsed(0);
  };

  const activeCase = active ? cases.find(c=>c.id===active.caseId) : null;

  if(!active) return (
    <div style={{padding:"8px 12px",borderTop:`1px solid ${T.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:T.emerald}}/>
        <span style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em"}}>SHIELD ACTIVE · TIMER READY</span>
      </div>
      {cases.length>0&&(
        <select onChange={e=>{if(e.target.value) startFor(e.target.value);e.target.value="";}}
          style={{width:"100%",background:T.panel2,border:`1px solid ${T.border}`,borderRadius:4,color:T.textSub,padding:"4px 6px",fontSize:9,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer"}}>
          <option value="">▶ Start billing timer…</option>
          {cases.map(c=><option key={c.id} value={c.id}>{c.title.slice(0,28)}</option>)}
        </select>
      )}
    </div>
  );

  return (
    <div style={{padding:"8px 12px",borderTop:`1px solid ${T.border}`,background:`${T.emerald}08`,animation:"timerPulse 2s infinite"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:T.emerald}}/>
        <span style={{fontSize:9,color:T.emerald,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em"}}>BILLING</span>
      </div>
      <div className="truncate" style={{fontSize:9,color:T.textSub,marginBottom:4}}>{activeCase?.title?.slice(0,26)||"…"}</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:15,color:T.text,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmtDuration(elapsed)}</span>
        <button onClick={stop} style={{fontSize:9,color:T.crimson,background:T.crimsonFaint,border:`1px solid ${T.crimson}40`,borderRadius:3,padding:"2px 7px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>STOP</button>
      </div>
    </div>
  );
}

// ── New Case Modal ─────────────────────────────────────────────────────────
function NewCaseModal({onClose,onSave,isMobile,notify}) {
  const EMPTY = {title:"",client:"",caseType:CASE_TYPES[0],jurisdiction:JURISDICTIONS[0],status:"Active",facts:"",judge:"",shared:false,incidentDate:""};
  const [f,setF] = useState(EMPTY);
  const [mode,setMode] = useState("choose"); // "choose"|"doc"|"manual"
  const [extracting,setExtracting] = useState(false);
  const [extractError,setExtractError] = useState("");
  const [docName,setDocName] = useState("");
  const [confidence,setConfidence] = useState(null); // {field: "high"|"low"}
  const intakeRef = useRef();
  const set = k=>v=>setF(p=>({...p,[k]:v}));
  const ok = f.title.trim() && f.client.trim();

  const handleDocUpload = async e=>{
    const file = e.target.files?.[0];
    if(!file) return;
    setDocName(file.name);
    setExtracting(true);
    setExtractError("");
    setMode("doc");

    try{
      const base64 = await readFileAsBase64(file);
      const mediaType = file.type||"application/pdf";

      const prompt = `You are a legal intake specialist. Analyze this legal document and extract case matter information to open a new matter file.

Extract the following fields (use null if not clearly present):
- caseTitle: The full case name or matter title (e.g. "State v. Johnson", "Smith v. Acme Corp", "In re: Estate of Brown")
- clientName: The client's name (defendant, plaintiff, petitioner — whoever is being represented)
- caseType: Best match from: ${CASE_TYPES.join(", ")}
- jurisdiction: Best match from: ${JURISDICTIONS.join(", ")}
- judgeName: Presiding judge's full name if mentioned
- keyFacts: 2-4 sentence summary of the core allegations, charges, or legal issues
- incidentDate: Date of the incident/offense/filing trigger (YYYY-MM-DD format)
- documentType: What type of document this is (e.g. "Criminal Complaint", "Civil Complaint", "Indictment", "Contract", "Court Order", "Retainer Agreement", "Deposition Transcript")
- confidenceScore: 0-100, how confident you are in the extracted data

Return ONLY valid JSON, no explanation:
{"caseTitle":null,"clientName":null,"caseType":null,"jurisdiction":null,"judgeName":null,"keyFacts":null,"incidentDate":null,"documentType":null,"confidenceScore":0}`;

      const data = await safeFetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:800,
          system:"Return ONLY valid JSON, no preamble, no markdown fences. Start with { and end with }.",
          messages:[{role:"user",content:[
            {type:"document",source:{type:"base64",media_type:mediaType,data:base64}},
            {type:"text",text:prompt}
          ]}]
        })
      });
      
      const raw = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error("Could not parse document — try a different file");
      const extracted = JSON.parse(jsonMatch[0]);

      // Map extracted data to form fields
      const conf = {};
      const score = extracted.confidenceScore||0;

      setF(prev=>({
        ...prev,
        title: extracted.caseTitle||prev.title,
        client: extracted.clientName||prev.client,
        // Smart matching: try exact, then first-word, then any-word, then default
        caseType: (() => {
          const ct = (extracted.caseType||"").toLowerCase();
          return CASE_TYPES.find(t=>t.toLowerCase()===ct) ||
            CASE_TYPES.find(t=>ct.includes(t.toLowerCase().split(" ")[0])) ||
            CASE_TYPES.find(t=>t.toLowerCase().split(" ").some(w=>ct.includes(w)&&w.length>3)) ||
            prev.caseType;
        })(),
        jurisdiction: (() => {
          const jx = (extracted.jurisdiction||"").toLowerCase();
          return JURISDICTIONS.find(j=>j.toLowerCase()===jx) ||
            JURISDICTIONS.find(j=>jx.includes(j.toLowerCase().split("–")[0].trim())) ||
            JURISDICTIONS.find(j=>j.toLowerCase().split(/\s|–/).some(w=>jx.includes(w)&&w.length>3)) ||
            prev.jurisdiction;
        })(),
        judge: extracted.judgeName||prev.judge,
        facts: extracted.keyFacts||prev.facts,
        incidentDate: (()=>{
          const d = extracted.incidentDate||prev.incidentDate||"";
          // Normalize to YYYY-MM-DD for the date input field
          if(!d) return "";
          // Already YYYY-MM-DD
          if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
          // Try to parse natural language dates
          const parsed = new Date(d);
          if(!isNaN(parsed.getTime())) return parsed.toISOString().slice(0,10);
          return "";
        })(),
      }));

      setConfidence({score, documentType:extracted.documentType});
    }catch(e){
      setExtractError(e.message||"Extraction failed — fill fields manually");
      notify?.error("Document Extraction Failed", e.message||"Could not read document", "ARES");
    }
    setExtracting(false);
    e.target.value="";
  };

  // ── CHOOSE MODE ──
  if(mode==="choose") return (
    <div style={{position:"fixed",inset:0,background:"rgba(3,5,10,0.92)",backdropFilter:"blur(8px)",zIndex:8000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center"}} onClick={onClose}>
      <div className={isMobile?"bottom-sheet":"slide-modal"} onClick={e=>e.stopPropagation()}
        style={{background:T.panel,border:`1px solid ${T.borderHi}`,borderRadius:isMobile?"16px 16px 0 0":"12px",padding:"28px 24px 32px",width:isMobile?"100%":"500px",maxWidth:"100vw",boxShadow:"0 -20px 80px rgba(0,0,0,0.6)"}}>
        {isMobile&&<div style={{width:36,height:3,borderRadius:99,background:T.border,margin:"-8px auto 20px"}}/>}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <div style={{width:36,height:36,borderRadius:8,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="scale" size={16} color={T.gold}/></div>
          <div>
            <div className="serif" style={{fontSize:19,color:T.text}}>Open New Matter</div>
            <div style={{fontSize:11,color:T.textSub}}>How would you like to begin?</div>
          </div>
          <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",padding:6,cursor:"pointer"}}><Icon n="close" size={15} color={T.textSub}/></button>
        </div>

        {/* Upload option */}
        <div onClick={()=>intakeRef.current?.click()}
          style={{display:"flex",gap:16,padding:"18px 20px",background:T.goldFaint,border:`1px solid ${T.goldDim}`,borderRadius:10,cursor:"pointer",marginBottom:12,transition:"all 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.background=`${T.gold}22`}
          onMouseLeave={e=>e.currentTarget.style.background=T.goldFaint}>
          <div style={{width:44,height:44,borderRadius:10,background:T.gold,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Icon n="pdf" size={20} color="#050200"/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:T.gold,marginBottom:4}}>Upload Document</div>
            <div style={{fontSize:12,color:T.textSub,lineHeight:1.6}}>Drop a complaint, indictment, contract, court order, or retainer. ARES reads it and auto-fills all fields.</div>
            <div style={{fontSize:10,color:T.textMuted,marginTop:5,fontFamily:"'JetBrains Mono',monospace"}}>PDF · DOCX · TXT — Same as Harvey Vault intake</div>
          </div>
        </div>
        <input ref={intakeRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:"none"}} onChange={handleDocUpload}/>

        {/* Manual option */}
        <div onClick={()=>setMode("manual")}
          style={{display:"flex",gap:16,padding:"18px 20px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,cursor:"pointer",transition:"all 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHi}
          onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
          <div style={{width:44,height:44,borderRadius:10,background:T.panel2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Icon n="draft" size={20} color={T.textSub}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:4}}>Enter Manually</div>
            <div style={{fontSize:12,color:T.textSub,lineHeight:1.6}}>Fill in the matter details yourself. Good for new client intake calls or matters without documents yet.</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── LOADING / EXTRACTING ──
  if(mode==="doc"&&extracting) return (
    <div style={{position:"fixed",inset:0,background:"rgba(3,5,10,0.92)",backdropFilter:"blur(8px)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.panel,border:`1px solid ${T.borderHi}`,borderRadius:12,padding:"40px 48px",textAlign:"center",maxWidth:380}}>
        <Spinner size={32}/>
        <div className="serif" style={{fontSize:18,color:T.gold,fontStyle:"italic",marginTop:16,marginBottom:8}}>Reading Document…</div>
        <div style={{fontSize:12,color:T.textSub,lineHeight:1.65}}>ARES is analyzing <strong style={{color:T.platinum}}>{docName}</strong> and extracting case details — parties, charges, jurisdiction, judge, and key facts.</div>
        <div style={{marginTop:12,fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>This typically takes 5–10 seconds</div>
      </div>
    </div>
  );

  // ── FORM (manual or post-extraction) ──
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(3,5,10,0.92)",backdropFilter:"blur(8px)",zIndex:8000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center"}} onClick={onClose}>
      <div className={isMobile?"bottom-sheet":"slide-modal"} onClick={e=>e.stopPropagation()}
        style={{background:T.panel,border:`1px solid ${T.borderHi}`,borderRadius:isMobile?"16px 16px 0 0":"12px",padding:"24px 24px 32px",width:isMobile?"100%":"560px",maxWidth:"100vw",maxHeight:isMobile?"92vh":"90vh",overflowY:"auto",boxShadow:"0 -20px 80px rgba(0,0,0,0.6)"}}>
        {isMobile&&<div style={{width:36,height:3,borderRadius:99,background:T.border,margin:"-8px auto 20px"}}/>}

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:36,height:36,borderRadius:8,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="scale" size={16} color={T.gold}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div className="serif" style={{fontSize:19,color:T.text}}>Open New Matter</div>
            <div style={{fontSize:11,color:T.textSub}}>{docName?"Auto-populated from "+docName:"Enter matter details"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",padding:6,cursor:"pointer"}}><Icon n="close" size={15} color={T.textSub}/></button>
        </div>

        {/* Confidence banner after extraction */}
        {confidence&&!extractError&&(
          <div className="fade-in" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:confidence.score>=70?T.emeraldFaint:`${T.amber}12`,border:`1px solid ${confidence.score>=70?T.emerald:T.amber}40`,borderRadius:7,marginBottom:14}}>
            <Icon n={confidence.score>=70?"shield":"alert"} size={14} color={confidence.score>=70?T.emerald:T.amber}/>
            <div style={{flex:1}}>
              <span style={{fontSize:12,color:confidence.score>=70?T.emerald:T.amber,fontWeight:600}}>
                {confidence.score>=70?"Fields auto-populated":"Partial extraction"}
              </span>
              {confidence.documentType&&<span style={{fontSize:11,color:T.textSub,marginLeft:8}}>Detected: {confidence.documentType}</span>}
              <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>Review all fields before opening — AI extraction requires human verification</div>
            </div>
            <Badge color={confidence.score>=70?T.emerald:T.amber} size="xs">{confidence.score}% confidence</Badge>
          </div>
        )}

        {/* Extract error */}
        {extractError&&(
          <div style={{padding:"10px 14px",background:T.crimsonFaint,border:`1px solid ${T.crimson}40`,borderRadius:7,marginBottom:14,fontSize:12,color:T.crimson}}>
            ⚠ {extractError}
          </div>
        )}

        {/* Upload another doc button */}
        {mode==="doc"&&!extracting&&(
          <div style={{marginBottom:14}}>
            <button onClick={()=>intakeRef.current?.click()} style={{fontSize:11,color:T.cobalt,background:T.cobaltFaint,border:`1px solid ${T.cobalt}40`,borderRadius:5,padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <Icon n="pdf" size={12} color={T.cobalt}/>Upload a different document
            </button>
            <input ref={intakeRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:"none"}} onChange={handleDocUpload}/>
          </div>
        )}

        {/* Fields */}
        <Field label="Matter Title *" value={f.title} onChange={set("title")} placeholder="e.g. State v. Johnson — Criminal Defense"/>
        <Field label="Client / Reference *" value={f.client} onChange={set("client")} placeholder="Client name or matter reference"/>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Field label="Practice Area" value={f.caseType} onChange={set("caseType")} as="select" opts={CASE_TYPES}/>
          <Field label="Jurisdiction" value={f.jurisdiction} onChange={set("jurisdiction")} as="select" opts={JURISDICTIONS}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Field label="Presiding Judge" value={f.judge} onChange={set("judge")} placeholder="Judge name (enables Judge Intel)"/>
          <Field label="Incident / Filing Date" value={f.incidentDate} onChange={v=>{
              // Ensure YYYY-MM-DD format for date input
              const parsed = new Date(v);
              set("incidentDate")(!isNaN(parsed.getTime()) ? parsed.toISOString().slice(0,10) : v);
            }} type="date"  note="Used by SOL Calculator"/>
        </div>
        <Field label="Key Facts / Allegations" value={f.facts} onChange={set("facts")} as="textarea" rows={3} placeholder="Core allegations, charges, or legal issues…"/>

        {/* Sharing */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 12px",background:T.panel2,border:`1px solid ${T.border}`,borderRadius:6}}>
          <div onClick={()=>set("shared")(!f.shared)} style={{width:38,height:20,borderRadius:10,background:f.shared?T.violet:T.panel,cursor:"pointer",position:"relative",transition:"background 0.2s",border:`1px solid ${f.shared?T.violet:T.border}`,flexShrink:0}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:1,left:f.shared?19:1,transition:"left 0.2s"}}/>
          </div>
          <div>
            <div style={{fontSize:12,color:T.text,fontWeight:500}}>Share with team</div>
            <div style={{fontSize:10,color:T.textMuted}}>Shared matters are visible to all users of this LexAgent instance</div>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center",marginTop:8}}>
          <button onClick={()=>setMode("choose")} style={{fontSize:11,color:T.textMuted,background:"none",border:"none",cursor:"pointer",padding:"4px 0"}}>← Back</button>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={()=>ok&&onSave(f)} disabled={!ok} icon="plus" size={isMobile?"lg":"md"}>Open Matter</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard v5 ──────────────────────────────────────────────────────────
const PRACTICE_COLORS = {
  "Criminal Defense":T.crimson,"Civil Litigation":T.cobalt,"Corporate / M&A":T.gold,
  "Employment":T.emerald,"Family Law":T.violet,"IP / Patent":T.amber,
  "Real Estate":T.cobalt,"Constitutional":T.crimson,"Immigration":T.emerald,
  "Personal Injury":T.amber,"Bankruptcy":T.textSub,"Securities":T.cobalt,
};

function Dashboard({cases,onSelect,onNew,logs,isMobile}) {
  const activeCount = cases.filter(c=>c.status==="Active").length;
  const precCount = cases.reduce((a,c)=>a+(c.precedents?.length||0),0);
  const verifiedCount = cases.reduce((a,c)=>a+(c.allVerifications||[]).filter(v=>v.status==="verified").length,0);
  const alertCount = cases.reduce((a,c)=>a+(c.allVerifications||[]).filter(v=>v.status==="not_found").length,0);

  const stats = [
    {l:"Active Matters",v:activeCount,c:T.emerald,icon:"scale",sub:"cases in progress"},
    {l:"Precedents",v:precCount,c:T.gold,icon:"search",sub:"cases researched"},
    {l:"Citations Verified",v:verifiedCount,c:T.cobalt,icon:"shield",sub:"via Hallucination Shield"},
    {l:"Shield Alerts",v:alertCount,c:alertCount>0?T.crimson:T.textMuted,icon:"alert",sub:alertCount>0?"require review":"no alerts"},
  ];

  return (
    <div className="scroll-y" style={{height:"100%"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:24,gap:12,flexWrap:"wrap"}}>
        <div>
          <div className="serif" style={{fontSize:isMobile?22:28,fontStyle:"italic",color:T.text,lineHeight:1.1,letterSpacing:"-0.01em"}}>
            Case Intelligence
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:T.emerald}}/>
            <span style={{fontSize:11,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em"}}>
              {cases.length} matter{cases.length!==1?"s":""} · {new Date().toLocaleDateString("en-US",{weekday:"short",month:"long",day:"numeric"})}
            </span>
          </div>
        </div>
        <Btn onClick={onNew} icon="plus" variant="primary" size={isMobile?"lg":"md"}>Open Matter</Btn>
      </div>

      {/* Metric cards */}
      <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?2:4},1fr)`,gap:10,marginBottom:24}}>
        {stats.map(s=>(
          <div key={s.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:12,right:14,opacity:0.12}}>
              <Icon n={s.icon} size={28} color={s.c}/>
            </div>
            <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:10}}>{s.l}</div>
            <div className="serif" style={{fontSize:isMobile?26:32,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
            <div style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Matter grid */}
      {!cases.length?(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 20px",gap:16,textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:18,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4}}>
            <Icon n="scale" size={32} color={T.gold}/>
          </div>
          <div>
            <div className="serif" style={{fontSize:22,color:T.textSub,fontStyle:"italic",marginBottom:6}}>No matters open</div>
            <div style={{fontSize:13,color:T.textMuted,maxWidth:320,lineHeight:1.6}}>
              Upload a complaint or indictment and ARES will extract all matter details automatically.
            </div>
          </div>
          <Btn onClick={onNew} icon="plus" size="lg" style={{marginTop:4}}>Open First Matter</Btn>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?"100%":"300px"},1fr))`,gap:10}}>
          {cases.map(c=>{
            const vAll = c.allVerifications||[];
            const hasBad = vAll.some(v=>v.status==="not_found");
            const practiceColor = PRACTICE_COLORS[c.caseType]||T.cobalt;
            return (
              <div key={c.id} onClick={()=>onSelect(c)} className="case-card"
                style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"0",cursor:"pointer",overflow:"hidden"}}>
                {/* Top accent bar */}
                <div style={{height:3,background:`linear-gradient(90deg,${practiceColor}80,${practiceColor}20)`}}/>
                <div style={{padding:"14px 16px 16px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}>
                    <div className="serif" style={{fontSize:14,color:T.text,lineHeight:1.4,flex:1,letterSpacing:"-0.01em"}}>{c.title}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
                      <Badge color={STATUS_C[c.status]||T.textSub} dot size="xs">{c.status}</Badge>
                      {c._shared&&<Badge color={T.violet} size="xs">Team</Badge>}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:T.textSub,marginBottom:10,fontWeight:500}}>{c.client}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                    <Badge color={practiceColor} size="xs">{c.caseType}</Badge>
                    <Badge color={T.textSub} size="xs">{c.jurisdiction.split("–")[0].trim()}</Badge>
                  </div>
                  {c.facts&&<div style={{fontSize:11,color:T.textMuted,lineHeight:1.6,marginBottom:10,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{c.facts}</div>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,borderTop:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {c.precedents?.length>0&&<Badge color={T.gold} size="xs">{c.precedents.length} prec.</Badge>}
                      {vAll.length>0&&(
                        <Badge color={hasBad?T.crimson:T.emerald} size="xs">
                          {hasBad?`⚠ ${vAll.filter(v=>v.status==="not_found").length} alerts`:`✓ ${vAll.filter(v=>v.status==="verified").length} verified`}
                        </Badge>
                      )}
                      {c.strategy&&<Badge color={T.emerald} size="xs">strategy ✓</Badge>}
                    </div>
                    <span style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{fmtDate(c.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab Config ─────────────────────────────────────────────────────────────
const TABS = [
  {id:"research",   label:"Research",      icon:"search"},
  {id:"deepresearch",label:"Deep Research",icon:"eye"},
  {id:"vault",      label:"Vault",         icon:"pdf"},
  {id:"strategy",   label:"Strategy",      icon:"strategy"},
  {id:"judge",      label:"Judge Intel",   icon:"judge"},
  {id:"deadlines",  label:"Deadlines",     icon:"clock"},
  {id:"timeline",   label:"Timeline",      icon:"alert"},
  {id:"citations",  label:"Shield",        icon:"shield"},
  {id:"draft",      label:"Draft",         icon:"draft"},
  {id:"notes",      label:"Evidence",      icon:"notes"},
  {id:"conflict",   label:"Conflict",      icon:"scale"},
];

// ── Onboarding Wizard (UI-01) ──────────────────────────────────────────────
function OnboardingWizard({onComplete}) {
  const [step,setStep] = useState(0);
  const [firmName,setFirmName] = useState("");
  const [selectedAreas,setSelectedAreas] = useState([]);
  const [apiKey,setApiKey] = useState("");
  const [testing,setTesting] = useState(false);
  const [testOk,setTestOk] = useState(null); // true|false|null
  // When VITE_API_URL is set, the backend handles the LLM — no client key needed
  const backendReady = !!import.meta.env.VITE_API_URL;

  const AREA_OPTIONS = ["Criminal Defense","Civil Litigation","Corporate / M&A","Employment","Family Law","IP / Patent","Real Estate","Immigration","Personal Injury","Bankruptcy","Securities","Constitutional"];

  const testKey = async()=>{
    if(!apiKey.trim()) return;
    setTesting(true); setTestOk(null);
    try{
      await safeFetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:5,messages:[{role:"user",content:"ping"}]})
      });
      setTestOk(true);
    }catch{setTestOk(false);}
    setTesting(false);
  };

  return (
    <div style={{background:T.bg,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflow:"auto"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:468}}>

        {/* Step 0 — Welcome */}
        {step===0&&(
          <div style={{textAlign:"center",animation:"scale-in 0.3s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:32}}>
              <div style={{width:56,height:56,borderRadius:16,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon n="scale" size={28} color={T.gold}/>
              </div>
              <div style={{textAlign:"left"}}>
                <div className="serif" style={{fontSize:34,color:T.gold,fontStyle:"italic",lineHeight:1}}>LexAgent</div>
                <div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.12em",marginTop:4}}>POWERED BY ARES v5</div>
              </div>
            </div>
            <div className="serif" style={{fontSize:22,color:T.text,marginBottom:6,fontStyle:"italic"}}>The AI Legal Platform</div>
            <div style={{fontSize:14,color:T.textSub,marginBottom:32,lineHeight:1.7}}>Research, verify, and draft legal documents in minutes — not hours.</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:36,textAlign:"left"}}>
              {[
                {icon:"shield",color:T.emerald,title:"Hallucination Shield",desc:"Every citation verified against 9M+ case opinions"},
                {icon:"judge",color:T.violet,title:"Judge Intelligence",desc:"Ruling tendencies for 16,000+ federal judges"},
                {icon:"search",color:T.cobalt,title:"Live Legal Research",desc:"CourtListener + Harvard CAP + web search"},
              ].map(f=>(
                <div key={f.title} style={{display:"flex",gap:12,alignItems:"flex-start",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:`${f.color}18`,border:`1px solid ${f.color}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon n={f.icon} size={16} color={f.color}/>
                  </div>
                  <div>
                    <div style={{fontSize:13,color:T.text,fontWeight:600,marginBottom:2}}>{f.title}</div>
                    <div style={{fontSize:12,color:T.textSub,lineHeight:1.5}}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Btn variant="primary" size="lg" full onClick={()=>setStep(1)}>Get Started →</Btn>
            <div style={{marginTop:12}}>
              <button onClick={()=>onComplete("","",[],true)} style={{background:"none",border:"none",color:T.textMuted,fontSize:12,cursor:"pointer",padding:4}}>
                Skip setup — go straight in
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Firm Setup */}
        {step===1&&(
          <div style={{animation:"scale-in 0.25s ease"}}>
            <div style={{marginBottom:24}}>
              <div className="serif" style={{fontSize:24,color:T.text,marginBottom:6,fontStyle:"italic"}}>Your Practice</div>
              <div style={{fontSize:13,color:T.textSub,lineHeight:1.6}}>Helps ARES tailor research and drafting to your firm's practice areas.</div>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",display:"block",marginBottom:6}}>FIRM NAME (OPTIONAL)</label>
              <input value={firmName} onChange={e=>setFirmName(e.target.value)} placeholder="Smith & Associates LLP"
                style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,padding:"11px 14px",fontSize:13,boxSizing:"border-box"}} className="gold-focus"/>
            </div>
            <div style={{marginBottom:28}}>
              <label style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",display:"block",marginBottom:8}}>PRACTICE AREAS (SELECT ALL THAT APPLY)</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {AREA_OPTIONS.map(a=>{
                  const active = selectedAreas.includes(a);
                  const c = PRACTICE_COLORS[a]||T.cobalt;
                  return (
                    <button key={a} onClick={()=>setSelectedAreas(p=>active?p.filter(x=>x!==a):[...p,a])}
                      style={{fontSize:11,color:active?c:T.textSub,background:active?`${c}18`:"transparent",border:`1px solid ${active?c:T.border}`,borderRadius:20,padding:"5px 12px",cursor:"pointer",transition:"all 0.15s"}}>
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="ghost" size="lg" onClick={()=>setStep(0)}>← Back</Btn>
              <Btn variant="primary" size="lg" full onClick={()=>setStep(2)}>Continue →</Btn>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:20}}>
              {[1,2].map(i=><div key={i} style={{width:i===1?22:6,height:6,borderRadius:3,background:i===1?T.gold:T.border,transition:"all 0.3s"}}/>)}
            </div>
          </div>
        )}

        {/* Step 2 — API Key */}
        {step===2&&(
          <div style={{animation:"scale-in 0.25s ease"}}>
            <div style={{marginBottom:24}}>
              <div className="serif" style={{fontSize:24,color:T.text,marginBottom:6,fontStyle:"italic"}}>Connect ARES</div>
              {backendReady
                ? <div style={{fontSize:13,color:T.textSub,lineHeight:1.6}}>ARES is powered by your backend — no API key required. Click Launch to begin.</div>
                : <div style={{fontSize:13,color:T.textSub,lineHeight:1.6}}>ARES requires an Anthropic API key. Your key is stored locally and never leaves your device.</div>
              }
            </div>
            {!backendReady&&(
              <>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",display:"block",marginBottom:6}}>ANTHROPIC API KEY</label>
                  <div style={{display:"flex",gap:8}}>
                    <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-api03-…"
                      type="password"
                      style={{flex:1,background:T.surface,border:`1px solid ${testOk===true?T.emerald:testOk===false?T.crimson:T.border}`,borderRadius:7,color:T.text,padding:"11px 14px",fontSize:13}} className="gold-focus"/>
                    <Btn variant="ghost" size="sm" onClick={testKey} disabled={testing||!apiKey.trim()}>
                      {testing?"…":testOk===true?"✓ OK":"Test"}
                    </Btn>
                  </div>
                  {testOk===true&&<div style={{fontSize:11,color:T.emerald,marginTop:6}}>✓ Connected — ARES is ready to launch</div>}
                  {testOk===false&&<div style={{fontSize:11,color:T.crimson,marginTop:6}}>✗ Invalid key — check console.anthropic.com</div>}
                </div>
                <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px",marginBottom:24}}>
                  <div style={{fontSize:11,color:T.textMuted,lineHeight:1.7}}>
                    <strong style={{color:T.textSub}}>Get your key:</strong> Visit{" "}
                    <span style={{color:T.cobalt,fontFamily:"'JetBrains Mono',monospace"}}>console.anthropic.com</span>
                    {" "}→ API Keys → Create Key. Typical usage: $5–20/month for active legal research.
                  </div>
                </div>
              </>
            )}
            {backendReady&&(
              <div style={{background:T.surface,border:`1px solid ${T.emeraldFaint||T.emerald+"22"}`,borderRadius:8,padding:"12px 14px",marginBottom:24,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:T.emerald,flexShrink:0}}/>
                <div style={{fontSize:11,color:T.textSub,lineHeight:1.6}}>
                  Backend proxy active — AI calls are routed securely through your server.
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <Btn variant="ghost" size="lg" onClick={()=>setStep(1)}>← Back</Btn>
              <Btn variant="primary" size="lg" full onClick={()=>onComplete(firmName,apiKey,selectedAreas,false)}>
                {backendReady||apiKey.trim()?"Launch ARES →":"Skip & Launch →"}
              </Btn>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:20}}>
              {[1,2].map(i=><div key={i} style={{width:i===2?22:6,height:6,borderRadius:3,background:i===2?T.gold:T.border,transition:"all 0.3s"}}/>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel Error Boundary ────────────────────────────────────────────────────
// Prevents a single panel crash from blacking out the entire content area.
// Wraps renderContent() on both desktop and mobile layouts.
class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[LexAgent] Panel render error:", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          height:"100%",gap:12,padding:24,textAlign:"center"
        }}>
          <div style={{fontSize:28}}>⚠️</div>
          <div style={{fontSize:14,fontWeight:600,color:T.text}}>Panel failed to render</div>
          <div style={{fontSize:12,color:T.textSub,maxWidth:320,lineHeight:1.5}}>
            {this.state.error.message || "Unknown error"}
          </div>
          <button
            onClick={()=>this.setState({error:null})}
            style={{
              marginTop:8,padding:"8px 16px",background:T.gold,border:"none",
              borderRadius:6,color:"#050200",fontSize:12,fontWeight:600,cursor:"pointer"
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main App v5 ────────────────────────────────────────────────────────────
export default function LexAgent() {
  const {isMobile,isTablet} = useBreakpoint();
  const [cases,setCases] = useState([]);
  const [sel,setSel] = useState(null);
  const [settings,setSettings] = useState(DEFAULT_SETTINGS);
  const [logs,setLogs] = useState([]);
  const [view,setView] = useState("dashboard");
  const [tab,setTab] = useState("research");
  const [showNew,setShowNew] = useState(false);
  const [showCmd,setShowCmd] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed] = useState(false);
  const [showOnboarding,setShowOnboarding] = useState(false);
  const {notes,notify,dismiss} = useNotifications();
  const swipeRef = useRef({x:0,y:0});
  const handleTouchStart = e=>{ swipeRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const handleTouchEnd = e=>{
    const dx = e.changedTouches[0].clientX - swipeRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeRef.current.y);
    if(Math.abs(dx)<60||dy>80) return;
    if(!sel) return;
    const ids = TABS.map(t=>t.id);
    const cur = ids.indexOf(tab);
    if(dx<0&&cur<ids.length-1) setTab(ids[cur+1]);
    if(dx>0&&cur>0)            setTab(ids[cur-1]);
  };


  useEffect(()=>{
    (async()=>{
      const [c,s,l,vault] = await Promise.all([vaultStore.get("lex4-cases"),store.get("lex4-settings"),vaultStore.get("lex4-logs"),vaultStore.get(VAULT_KEY)]);
      if(c) setCases(c);
              const mergedSettings = {...DEFAULT_SETTINGS,...(s||{})};
        if(vault?.courtListenerToken) mergedSettings.courtListenerToken = vault.courtListenerToken;
        if(vault?.govInfoKey) mergedSettings.govInfoKey = vault.govInfoKey;
        if(vault?.anthropicKey) mergedSettings.anthropicKey = vault.anthropicKey;
        setSettings(mergedSettings);
        // Keep module-level key in sync so safeFetch can inject it for direct calls
        if(mergedSettings.anthropicKey) setAnthropicKey(mergedSettings.anthropicKey);
      if(l) setLogs(l);
      // Load shared matters from teammates
      try{
        const sharedIds = await vaultStore.get("lex4-shared-ids")||[];
        const sharedCases = await Promise.all(
          sharedIds.map(async id=>{
            try{
              const raw = localStorage.getItem(_ns(`lex4-shared-case-${id}`, true));
              return raw ? JSON.parse(raw) : null;
            }catch{return null;}
          })
        );
        const validShared = sharedCases.filter(Boolean);
        if(validShared.length){
          setCases(prev=>{
            const existing = prev.map(x=>x.id);
            const newOnes = validShared.filter(x=>!existing.includes(x.id)).map(x=>({...x,_shared:true}));
            return newOnes.length?[...prev,...newOnes]:prev;
          });
        }
      }catch(e){console.warn("Shared matters load failed:",e);}
      setLoaded(true);
      // Show onboarding if fresh install (no matters, no API key, and no backend proxy)
      if((!c||!c.length)&&!mergedSettings.anthropicKey&&!import.meta.env.VITE_API_URL) setShowOnboarding(true);
    })();
  },[]);

  useEffect(()=>{
    const h = e=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowCmd(v=>!v);}};
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  
  const saveCase = useCallback(async updated => {
    if (typeof updated === "function") {
      // Capture both the updated case AND the full new array inside the setter (atomic)
      let result = null;
      setCases(prev => {
        const current = prev.find(x => x.id === sel?.id);
        if (!current) return prev;
        const updatedCase = updated(current);
        const next = prev.map(x => x.id === updatedCase.id ? updatedCase : x);
        result = { updatedCase, next };
        return next;
      });
      // Use setTimeout(0) to run after React commits the state change
      setTimeout(() => {
        if (result) {
          setSel(result.updatedCase);
          vaultStore.set("lex4-cases", result.next);
        }
      }, 0);
      return;
    }
    // Direct object update
    setCases(prev => {
      const next = prev.map(c => c.id === updated.id ? updated : c);
      vaultStore.set("lex4-cases", next);
      return next;
    });
    if (sel?.id === updated.id) setSel(updated);
  }, [sel]);

  const createCase = async form=>{
    const nc = {...form,id:genId(),createdAt:Date.now(),precedents:[],strategy:null,notes:[],allVerifications:[],deadlines:[],timeEntries:[],totalMinsBilled:0};
    const next = [nc,...cases];
    setCases(next); await vaultStore.set("lex4-cases",next);
    // If shared, also write to shared storage so teammates see it
    if(form.shared){
      try{
        const sharedList = (await vaultStore.get("lex4-shared-ids")||[]);
        await vaultStore.set("lex4-shared-ids",[nc.id,...sharedList]);
        localStorage.setItem(_ns(`lex4-shared-case-${nc.id}`, true), JSON.stringify(nc));
      }catch(e){console.warn("Shared storage write failed:",e);}
    }
    setShowNew(false); setSel(nc); setTab("research"); setView("case");
  };

  const deleteCase = async id=>{
    const next = cases.filter(c=>c.id!==id);
    setCases(next); await vaultStore.set("lex4-cases",next);
    setSel(null); setView("dashboard"); toast_("Matter closed.");
  };

  const addLog = useCallback(async entry=>{
    setLogs(prev => {
      const next = [...prev, entry];
      vaultStore.set("lex4-logs", next);
      return next;
    });
  },[]);

  const toast_ = (msg) => notify.success(msg); // backwards compat shim

  const saveSettings = async s=>{
    setSettings(s);
    if(s.anthropicKey) setAnthropicKey(s.anthropicKey);
    await store.set("lex4-settings",s);
    // Save API keys to cross-device vault (shared storage)
    const vaultData = {
      courtListenerToken: s.courtListenerToken||"",
      govInfoKey: s.govInfoKey||"",
      anthropicKey: s.anthropicKey||"",
      savedAt: Date.now(),
    };
    await vaultStore.set(VAULT_KEY, vaultData);
    notify.success("Configuration saved", "Settings updated and persisted.", "LexAgent Storage");
  };

  const openCase = c=>{setSel(c);setTab("research");setView("case");};
  // inCase: true when actively viewing a case tab OR when on admin with a case selected (so back button works)
  const inCase = view==="case"&&sel;
  const hasSel = !!sel; // sel exists but view might be admin

  const handleCmd = (a,p)=>{
    if(a==="new") setShowNew(true);
    if(a==="admin"){setView("admin");setSel(null);}
    if(a==="dashboard"){setView("dashboard");setSel(null);}
    if(a==="case"&&p) openCase(p);
  };

  const renderContent = ()=>{
    if(view==="dashboard") return <Dashboard cases={cases} onSelect={openCase} onNew={()=>setShowNew(true)} logs={logs} isMobile={isMobile}/>;
    if(view==="admin") return <AdminPanel settings={settings} onSave={saveSettings} logs={logs} cases={cases} isMobile={isMobile} notify={notify}/>;
    if(!sel) return null;
    if(tab==="research")     return <ResearchPanel      key={sel.id}   caseData={sel} settings={settings} onUpdateCase={saveCase} onLog={addLog} isMobile={isMobile} notify={notify}/>;
    if(tab==="deepresearch") return <DeepResearchPanel  key={sel.id}  caseData={sel} settings={settings} onUpdateCase={saveCase} onLog={addLog} isMobile={isMobile} notify={notify}/>;
    if(tab==="vault")        return <VaultPanel         key={sel.id}   caseData={sel} settings={settings} onUpdateCase={saveCase} isMobile={isMobile} notify={notify}/>;
    if(tab==="strategy")     return <StrategyPanel      key={sel.id}   caseData={sel} settings={settings} onUpdateCase={saveCase} onLog={addLog} isMobile={isMobile} notify={notify}/>;
    if(tab==="judge")        return <JudgePanel         key={sel.id}   caseData={sel} settings={settings} onUpdateCase={saveCase} onLog={addLog} isMobile={isMobile} notify={notify}/>;
    if(tab==="deadlines")    return <DeadlinePanel      key={sel.id}  caseData={sel} settings={settings} onUpdateCase={saveCase} isMobile={isMobile} notify={notify}/>;
    if(tab==="timeline")     return <TimelinePanel      key={sel.id}  caseData={sel} settings={settings} onUpdateCase={saveCase} isMobile={isMobile} notify={notify}/>;
    if(tab==="citations")    return <CitationAuditPanel key={sel.id}  caseData={sel} settings={settings} onUpdateCase={saveCase} isMobile={isMobile} notify={notify}/>;
    if(tab==="draft")        return <DraftPanel         key={sel.id}   caseData={sel} settings={settings} onLog={addLog} isMobile={isMobile} notify={notify}/>;
    if(tab==="notes")        return <NotesPanel         key={sel.id}   caseData={sel} settings={settings} onUpdateCase={saveCase} isMobile={isMobile} notify={notify}/>;
    if(tab==="conflict")     return <ConflictCheckPanel key={sel.id}  cases={cases} caseData={sel} isMobile={isMobile} notify={notify}/>;
    return null;
  };

  const handleMobNav = id=>{
    if(id==="dashboard"){ setView("dashboard"); setSel(null); }
    else if(id==="admin"){ setView("admin"); }
    else if(id==="new"){ setShowNew(true); }
  };

  // Sidebar is "icon-only" when collapsed or on tablet
  const sbCollapsed = sidebarCollapsed || isTablet;
  const sbWidth = sbCollapsed ? 52 : 224;

  if(!loaded) return (
    <div style={{background:T.bg,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
      <style>{CSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
        <div style={{width:40,height:40,borderRadius:10,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon n="scale" size={20} color={T.gold}/>
        </div>
        <div>
          <div className="serif" style={{fontSize:26,color:T.gold,fontStyle:"italic",lineHeight:1}}>LexAgent</div>
          <div style={{fontSize:8,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.14em",marginTop:3}}>ARES v5 · LEGAL AI PLATFORM</div>
        </div>
      </div>
      <Spinner size={20}/>
      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
        <div style={{width:5,height:5,borderRadius:"50%",background:T.emerald,animation:"pulse 1.5s infinite"}}/>
        <span style={{fontSize:10,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em"}}>
          HALLUCINATION SHIELD LOADING…
        </span>
      </div>
    </div>
  );

  if(showOnboarding) return (
    <OnboardingWizard onComplete={async(firm,key,areas,skip)=>{
      if(!skip&&key.trim()){
        const s = {...settings,anthropicKey:key};
        await saveSettings(s);
      }
      setShowOnboarding(false);
    }}/>
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{display:"flex",height:"100vh",background:T.bg,overflow:"hidden",flexDirection:"column"}}>
        {!isMobile?(
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>

            {/* ── Sidebar v5 — collapsible ── */}
            <div className={`desktop-sidebar sidebar-rail${sbCollapsed?" sidebar-collapsed":""}`}
              style={{width:sbWidth,minWidth:sbWidth,background:T.sidebarBg,borderRight:`1px solid ${T.sidebarBorder}`,display:"flex",flexDirection:"column",flexShrink:0,position:"relative"}}>

              {/* Brand header */}
              <div style={{padding:sbCollapsed?"14px 0":"16px 14px 14px",borderBottom:`1px solid ${T.sidebarBorder}`,display:"flex",alignItems:"center",gap:10,justifyContent:sbCollapsed?"center":"flex-start",minHeight:56,flexShrink:0}}>
                <div style={{width:30,height:30,borderRadius:8,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon n="scale" size={15} color={T.gold}/>
                </div>
                <div className="sidebar-label" style={{opacity:sbCollapsed?0:1,width:sbCollapsed?0:"auto"}}>
                  <div className="serif" style={{fontSize:16,color:T.gold,fontStyle:"italic",lineHeight:1,letterSpacing:"-0.01em"}}>LexAgent</div>
                  <div style={{fontSize:8,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",marginTop:3,display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:4,height:4,borderRadius:"50%",background:T.emerald}}/>
                    SHIELD ACTIVE
                  </div>
                </div>
              </div>

              {/* Search bar */}
              {!sbCollapsed&&(
                <div onClick={()=>setShowCmd(true)}
                  style={{margin:"10px 10px 4px",display:"flex",alignItems:"center",gap:7,background:T.panel,border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 10px",cursor:"pointer",transition:"border-color 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHi}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                  <Icon n="search" size={12} color={T.textMuted}/>
                  <span style={{fontSize:11,color:T.textMuted,flex:1}}>Search matters…</span>
                  <span style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",background:T.panel2,border:`1px solid ${T.border}`,borderRadius:3,padding:"1px 5px"}}>⌘K</span>
                </div>
              )}
              {sbCollapsed&&(
                <div onClick={()=>setShowCmd(true)} title="Search (⌘K)"
                  style={{margin:"10px 0 4px",display:"flex",justifyContent:"center",cursor:"pointer",padding:"8px 0"}}>
                  <Icon n="search" size={15} color={T.textMuted}/>
                </div>
              )}

              {/* Nav links */}
              <div style={{padding:sbCollapsed?"6px 0":"4px 8px"}}>
                {[{id:"dashboard",label:"All Matters",icon:"home"},{id:"admin",label:"Administration",icon:"admin"}].map(n=>{
                  const active = (view===n.id&&!inCase);
                  return (
                    <div key={n.id} onClick={()=>{setView(n.id);setSel(null);}} title={sbCollapsed?n.label:undefined}
                      style={{display:"flex",alignItems:"center",gap:9,padding:sbCollapsed?"10px 0":"7px 10px",borderRadius:7,cursor:"pointer",marginBottom:1,background:active?T.panel:"transparent",borderLeft:sbCollapsed?"none":`2px solid ${active?T.gold:"transparent"}`,transition:"all 0.12s",justifyContent:sbCollapsed?"center":"flex-start"}}>
                      <Icon n={n.icon} size={15} color={active?T.gold:T.textSub}/>
                      <span className="sidebar-label" style={{fontSize:12,color:active?T.text:T.textSub,fontWeight:active?500:400,opacity:sbCollapsed?0:1,width:sbCollapsed?0:"auto"}}>{n.label}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{height:1,background:T.sidebarBorder,margin:"2px 0"}}/>

              {/* Matters list */}
              <div style={{flex:1,overflowY:"auto",padding:sbCollapsed?"4px 0":"4px 8px"}}>
                {!sbCollapsed&&<div style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.09em",padding:"6px 10px 6px",textTransform:"uppercase"}}>Open Matters</div>}
                {cases.map(c=>{
                  const active = sel?.id===c.id;
                  const hasBad = (c.allVerifications||[]).some(v=>v.status==="not_found");
                  const practiceColor = PRACTICE_COLORS[c.caseType]||T.cobalt;
                  if(sbCollapsed) return (
                    <div key={c.id} onClick={()=>openCase(c)} title={c.title}
                      style={{display:"flex",justifyContent:"center",padding:"8px 0",cursor:"pointer",position:"relative"}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:active?T.gold:STATUS_C[c.status]||T.textMuted}}/>
                      {hasBad&&<div style={{position:"absolute",top:6,right:10,width:4,height:4,borderRadius:"50%",background:T.crimson}}/>}
                    </div>
                  );
                  return (
                    <div key={c.id} onClick={()=>openCase(c)}
                      style={{padding:"7px 10px",borderRadius:6,cursor:"pointer",marginBottom:1,background:active?T.panel:"transparent",borderLeft:`2px solid ${active?T.gold:"transparent"}`,transition:"all 0.1s"}}>
                      <div className="truncate" style={{fontSize:11,color:active?T.text:T.textSub,fontWeight:active?500:400}}>{c.title}</div>
                      <div style={{display:"flex",gap:4,marginTop:2,alignItems:"center"}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:STATUS_C[c.status]||T.textMuted,flexShrink:0}}/>
                        <span style={{fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{c.caseType.split(" ")[0]}</span>
                        {hasBad&&<span style={{fontSize:8,color:T.crimson}}>⚠</span>}
                        {!hasBad&&(c.allVerifications||[]).length>0&&<span style={{fontSize:8,color:T.emerald}}>✓</span>}
                      </div>
                    </div>
                  );
                })}
                {!sbCollapsed&&(
                  <div onClick={()=>setShowNew(true)}
                    style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",borderRadius:6,cursor:"pointer",marginTop:4,border:`1px dashed ${T.border}`,transition:"border-color 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.goldDim}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                    <Icon n="plus" size={11} color={T.textMuted}/>
                    <span style={{fontSize:11,color:T.textMuted}}>New Matter</span>
                  </div>
                )}
              </div>

              {/* Billable timer */}
              <BillableTimer cases={cases} onUpdateCase={saveCase}/>

              {/* Collapse toggle — only shown on full desktop (not tablet) */}
              {!isTablet&&(
                <button onClick={()=>setSidebarCollapsed(v=>!v)}
                  className="sidebar-toggle"
                  style={{position:"absolute",top:"50%",right:-12,transform:"translateY(-50%)",width:24,height:24,borderRadius:"50%",background:T.panel2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:10,color:T.textSub}}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    {sidebarCollapsed
                      ? <><path d="M9 18l6-6-6-6"/></>
                      : <><path d="M15 18l-6-6 6-6"/></>
                    }
                  </svg>
                </button>
              )}
            </div>

            {/* ── Main content area ── */}
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

              {/* Matter topbar: breadcrumb + tabs */}
              {inCase&&(
                <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
                  {/* Breadcrumb row */}
                  <div style={{padding:"8px 16px 0",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0,flex:1}}>
                      <button onClick={()=>{setSel(null);setView("dashboard");}}
                        style={{fontSize:11,color:T.textSub,background:"none",border:"none",cursor:"pointer",padding:"2px 0",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",flexShrink:0}}>
                        <Icon n="home" size={11} color={T.textSub}/>
                        All Matters
                      </button>
                      <span style={{color:T.border,fontSize:12}}>›</span>
                      <div className="truncate" style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                        <span className="serif truncate" style={{fontSize:13,color:T.text,fontWeight:500}}>{sel.title}</span>
                        <Badge color={STATUS_C[sel.status]||T.textSub} dot size="xs">{sel.status}</Badge>
                        {sel._shared&&<Badge color={T.violet} size="xs">Team</Badge>}
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {(sel.allVerifications||[]).length>0&&(
                        <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>
                          <div style={{width:5,height:5,borderRadius:"50%",background:(sel.allVerifications||[]).some(v=>v.status==="not_found")?T.crimson:T.emerald}}/>
                          <span style={{color:(sel.allVerifications||[]).some(v=>v.status==="not_found")?T.crimson:T.emerald}}>
                            {(sel.allVerifications||[]).filter(v=>v.status==="verified").length}/{(sel.allVerifications||[]).length} verified
                          </span>
                        </div>
                      )}
                      <Btn variant="danger" size="sm" onClick={()=>deleteCase(sel.id)}>Close Matter</Btn>
                    </div>
                  </div>
                  {/* Tab strip */}
                  <div className="tab-scroll" style={{display:"flex",padding:"6px 12px 0",gap:1}}>
                    {TABS.map(t=>{
                      const active = tab===t.id;
                      const isCiteTab = t.id==="citations";
                      const hasBad = isCiteTab&&(sel.allVerifications||[]).some(v=>v.status==="not_found");
                      return (
                        <button key={t.id} onClick={()=>setTab(t.id)}
                          style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",background:"transparent",border:"none",borderBottom:`2px solid ${active?T.gold:"transparent"}`,borderRadius:"0",cursor:"pointer",color:active?T.text:hasBad?T.crimson:T.textSub,fontSize:11,fontWeight:active?600:400,transition:"all 0.12s",fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap",marginBottom:-1,position:"relative"}}>
                          <Icon n={t.icon} size={11} color={active?T.gold:hasBad?T.crimson:T.textSub}/>{t.label}
                          {hasBad&&<span style={{width:5,height:5,borderRadius:"50%",background:T.crimson,position:"absolute",top:4,right:4}}/>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dashboard topbar */}
              {view==="dashboard"&&!inCase&&(
                <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:48,flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:T.emerald}}/>
                    <span style={{fontSize:10,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.07em"}}>ARES v5 · HALLUCINATION SHIELD ACTIVE</span>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setShowCmd(true)} style={{display:"flex",alignItems:"center",gap:6,background:T.panel,border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 10px",color:T.textSub,fontSize:11,cursor:"pointer"}}>
                      <Icon n="search" size={12} color={T.textSub}/>
                      <span>Search</span>
                      <span style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:T.textMuted}}>⌘K</span>
                    </button>
                    <Btn variant="primary" size="sm" icon="plus" onClick={()=>setShowNew(true)}>New Matter</Btn>
                  </div>
                </div>
              )}

              {/* Admin topbar */}
              {view==="admin"&&(
                <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"0 16px",display:"flex",alignItems:"center",height:48,flexShrink:0,gap:8}}>
                  <Icon n="admin" size={13} color={T.textSub}/>
                  <span style={{fontSize:11,color:T.textSub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em"}}>ADMINISTRATION · ARES CONFIGURATION</span>
                </div>
              )}

              <div style={{flex:1,overflow:"hidden",padding:16}}><PanelErrorBoundary>{renderContent()}</PanelErrorBoundary></div>
            </div>
          </div>
        ):(
          /* Mobile */
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:28,height:28,borderRadius:7,background:T.goldFaint,border:`1px solid ${T.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Icon n="scale" size={14} color={T.gold}/>
                </div>
                <div>
                  <div className="serif" style={{fontSize:16,color:T.gold,fontStyle:"italic",lineHeight:1}}>LexAgent</div>
                  {sel&&<div className="truncate" style={{fontSize:10,color:T.textSub,maxWidth:160}}>{sel.title}</div>}
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                {hasSel&&<button onClick={()=>{if(view==="admin"){setView("case");}else{setSel(null);setView("dashboard");}}} style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 10px",color:T.textSub,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  <Icon n="back" size={12} color={T.textSub}/>{view==="admin"?"Case":"Back"}
                </button>}
                <button onClick={()=>setShowCmd(true)} style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:6,padding:8,cursor:"pointer"}}><Icon n="search" size={15} color={T.textSub}/></button>
                <button onClick={()=>setShowNew(true)} style={{background:T.gold,border:"none",borderRadius:6,padding:"8px 10px",cursor:"pointer"}}><Icon n="plus" size={15} color="#050200"/></button>
              </div>
            </div>
            {/* ── Content area with swipe navigation ── */}
            <div style={{flex:1,overflow:"hidden",padding:isMobile?10:16}}
              onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <PanelErrorBoundary>{renderContent()}</PanelErrorBoundary>
            </div>

            {/* ── Mobile Bottom Nav — context-aware, scrollable ── */}
            <div style={{background:T.bg2,borderTop:`1px solid ${T.border}`,flexShrink:0,paddingBottom:"env(safe-area-inset-bottom)"}}>
              {inCase ? (
                /* IN A CASE: scrollable row of all 11 tabs */
                <div style={{display:"flex",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
                  {TABS.map(t=>{
                    const active = tab===t.id;
                    const isCiteTab = t.id==="citations";
                    const hasBadge = isCiteTab&&(sel?.allVerifications||[]).some(v=>v.status==="not_found");
                    return (
                      <button key={t.id} onClick={()=>setTab(t.id)}
                        style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 10px",background:"none",border:"none",cursor:"pointer",minHeight:54,minWidth:64,WebkitTapHighlightColor:"transparent",position:"relative",borderTop:`2px solid ${active?T.gold:"transparent"}`,transition:"border-color 0.12s"}}>
                        <div style={{position:"relative"}}>
                          <Icon n={t.icon} size={18} color={active?T.gold:hasBadge?T.crimson:T.textMuted}/>
                          {hasBadge&&<span style={{position:"absolute",top:-2,right:-2,width:5,height:5,borderRadius:"50%",background:T.crimson}}/>}
                        </div>
                        <span style={{fontSize:8,color:active?T.gold:hasBadge?T.crimson:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.02em",textAlign:"center",lineHeight:1.2,whiteSpace:"nowrap"}}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* NOT IN A CASE: Matters / New Matter / Admin */
                <div style={{display:"flex"}}>
                  {[
                    {id:"dashboard",label:"Matters",  icon:"home"},
                    {id:"new",      label:"New Matter",icon:"plus", isAction:true},
                    {id:"admin",    label:"Admin",     icon:"admin"},
                  ].map(n=>{
                    const isActive = n.id==="dashboard"?(view==="dashboard"):n.id==="admin"?(view==="admin"):false;
                    const tapColor = isActive?T.gold:n.isAction?T.gold:T.textMuted;
                    return (
                      <button key={n.id}
                        onClick={()=>{
                          if(n.id==="new") setShowNew(true);
                          else if(n.id==="dashboard"){setView("dashboard");setSel(null);}
                          else if(n.id==="admin") setView("admin");
                        }}
                        style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 4px",background:"none",border:"none",cursor:"pointer",minHeight:58,WebkitTapHighlightColor:"transparent",position:"relative",borderTop:`2px solid ${isActive?T.gold:"transparent"}`}}>
                        {n.isAction?(
                          <div style={{width:38,height:38,borderRadius:11,background:T.gold,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Icon n="plus" size={18} color="#050200"/>
                          </div>
                        ):(
                          <>
                            <Icon n={n.icon} size={22} color={tapColor}/>
                            <span style={{fontSize:9,color:tapColor,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em"}}>{n.label}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNew&&<NewCaseModal onClose={()=>setShowNew(false)} onSave={createCase} isMobile={isMobile} notify={notify}/>}
      {showCmd&&(
        <div className="fade-in" style={{position:"fixed",inset:0,background:"rgba(3,5,10,0.88)",backdropFilter:"blur(10px)",zIndex:9000,display:"flex",justifyContent:"center",paddingTop:"100px"}} onClick={()=>setShowCmd(false)}>
          <div className="cmd-in scale-in" style={{width:580,maxWidth:"94vw",maxHeight:"60vh",background:T.panel,border:`1px solid ${T.borderHi}`,borderRadius:12,overflow:"hidden",boxShadow:`0 40px 100px rgba(0,0,0,0.8),0 0 0 1px ${T.gold}15`}} onClick={e=>e.stopPropagation()}>
            <CommandPaletteInner onClose={()=>setShowCmd(false)} onAction={handleCmd} cases={cases}/>
          </div>
        </div>
      )}

      <NotificationCenter notes={notes} dismiss={dismiss} isMobile={isMobile}/>
    </>
  );
}

function CommandPaletteInner({onClose,onAction,cases}){
  const [q,setQ] = useState("");
  const [sel,setSel] = useState(0);
  const ref = useRef();
  useEffect(()=>{setTimeout(()=>ref.current?.focus(),50);},[]);

  const ACTIONS = [
    {label:"New Matter",desc:"Open a new case file",icon:"plus",action:()=>onAction("new")},
    {label:"Dashboard",desc:"All matters overview",icon:"home",action:()=>onAction("dashboard")},
    {label:"Administration",desc:"API keys & model settings",icon:"admin",action:()=>onAction("admin")},
  ];

  const filteredActions = q ? ACTIONS.filter(a=>a.label.toLowerCase().includes(q.toLowerCase())||a.desc.toLowerCase().includes(q.toLowerCase())) : ACTIONS;
  const filteredMatters = cases.filter(c=>!q||c.title.toLowerCase().includes(q.toLowerCase())||c.client.toLowerCase().includes(q.toLowerCase())||c.caseType.toLowerCase().includes(q.toLowerCase())).slice(0,7).map(c=>({
    label:c.title,desc:`${c.client} · ${c.caseType} · ${c.status}`,icon:"scale",action:()=>onAction("case",c),_c:c,
  }));

  // Flat list for keyboard nav
  const allItems = [...filteredActions,...filteredMatters];
  useEffect(()=>setSel(0),[q]);

  const onKey = e=>{
    if(e.key==="Escape") return onClose();
    if(e.key==="ArrowDown"){e.preventDefault();setSel(s=>Math.min(s+1,allItems.length-1));}
    if(e.key==="ArrowUp"){e.preventDefault();setSel(s=>Math.max(s-1,0));}
    if(e.key==="Enter"&&allItems[sel]){allItems[sel].action();onClose();}
  };

  const ItemRow = ({item,idx})=>{
    const active = sel===idx;
    const practiceColor = item._c ? (PRACTICE_COLORS[item._c.caseType]||T.cobalt) : null;
    return (
      <div onClick={()=>{item.action();onClose();}}
        style={{display:"flex",alignItems:"center",gap:10,padding:"9px 16px",cursor:"pointer",background:active?T.panel2:"transparent",borderLeft:`2px solid ${active?T.gold:"transparent"}`,transition:"all 0.1s"}}
        onMouseEnter={()=>setSel(idx)}>
        <div style={{width:30,height:30,borderRadius:7,background:active?T.goldFaint:T.panel,border:`1px solid ${active?T.goldDim:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {item._c && practiceColor
            ? <div style={{width:8,height:8,borderRadius:"50%",background:practiceColor}}/>
            : <Icon n={item.icon} size={13} color={active?T.gold:T.textSub}/>
          }
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,color:active?T.text:T.platinum,fontWeight:active?500:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</div>
          <div style={{fontSize:11,color:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.desc}</div>
        </div>
        {active&&<Icon n="arrow" size={12} color={T.gold}/>}
      </div>
    );
  };

  const SectionLabel = ({label})=>(
    <div style={{padding:"8px 16px 4px",fontSize:9,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</div>
  );

  let idx = 0;
  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 16px",borderBottom:`1px solid ${T.border}`}}>
        <Icon n="search" size={15} color={T.textSub}/>
        <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKey}
          placeholder="Search matters, clients, or commands…"
          style={{flex:1,background:"transparent",border:"none",color:T.text,fontSize:15,fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
        <Badge color={T.textMuted} size="xs">ESC</Badge>
      </div>
      <div className="scroll-y" style={{maxHeight:"calc(60vh - 100px)"}}>
        {filteredActions.length>0&&<>
          <SectionLabel label="Actions"/>
          {filteredActions.map(item=><ItemRow key={item.label} item={item} idx={idx++}/>)}
        </>}
        {filteredMatters.length>0&&<>
          <SectionLabel label="Matters"/>
          {filteredMatters.map(item=><ItemRow key={item.label} item={item} idx={idx++}/>)}
        </>}
        {!allItems.length&&<div style={{padding:"28px",textAlign:"center"}}>
          <div style={{fontSize:14,color:T.textMuted,marginBottom:4}}>No results</div>
          <div style={{fontSize:11,color:T.textMuted}}>Try searching by client name, case type, or matter title</div>
        </div>}
      </div>
      <div style={{padding:"7px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:12}}>
        {[["↑↓","Navigate"],["↵","Select"],["Esc","Close"]].map(([k,l])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
            <Badge color={T.textMuted} size="xs">{k}</Badge>
            <span style={{fontSize:9,color:T.textMuted}}>{l}</span>
          </div>
        ))}
      </div>
    </>
  );
}
