import { useState, useRef, useCallback } from "react";

// ── Mock Case ────────────────────────────────────────────────────────────────
const CASE = {
  title: "United States v. Carlos R. Martinez",
  client: "Carlos R. Martinez",
  court: "SDNY — Hon. Denise Cote",
  jurisdiction: "Federal — Southern District of New York",
  charges: "18 U.S.C. § 1343 (Wire Fraud), 15 U.S.C. § 78j(b) (Securities Fraud), 18 U.S.C. § 1956 (Money Laundering)",
  facts: `Martinez, a licensed financial advisor at Meridian Capital LLC, is charged with diverting $4.2 million from 23 retail investor accounts via 847 wire transfers between January 2021 and April 2023. He fabricated quarterly statements showing fictitious gains. Scheme uncovered by FINRA audit. Martinez claims all transfers were authorized under discretionary trading agreements and losses were market-driven. Government witnesses: 3 former Meridian employees and FBI forensic accountant.`,
};

const T = {
  bg:"#060810", bg2:"#080B14", panel:"#101525", panel2:"#141929",
  border:"#1A2035", gold:"#C8A96E", goldDim:"#7A6535", goldFaint:"#C8A96E15",
  text:"#D0D6E8", textSub:"#62728E", textMuted:"#384156",
  emerald:"#28A868", cobalt:"#3A6FD8", crimson:"#C43355",
  amber:"#D08030", violet:"#8A55D8",
};

// ── API ───────────────────────────────────────────────────────────────────────
async function ask(prompt, opts = {}) {
  const { system = "", tokens = 1200, search = false, signal: outerSignal } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 50000);
  // Combine timeout signal with outer abort signal
  if (outerSignal) outerSignal.addEventListener("abort", () => ctrl.abort());
  try {
    const body = { model:"claude-sonnet-4-6", max_tokens:tokens, messages:[{role:"user",content:prompt}] };
    if (system) body.system = system;
    if (search) body.tools = [{type:"web_search_20260209",name:"web_search"}];
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body), signal:ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (d.type==="error") throw new Error(d.error?.message || "API error");
    return (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("") || "";
  } catch(e) {
    clearTimeout(t);
    throw e.name==="AbortError" ? new Error("Timed out after 50s") : e;
  }
}

// ── Strict scoring helpers ────────────────────────────────────────────────────

// Counts real legal citations: "Vol F.Xd Page" or "Vol U.S. Page" or "Vol S.Ct. Page"
function countRealCitations(text) {
  const patterns = [
    /\d{1,4}\s+F\.\d+d\s+\d+/gi,        // 819 F.3d 351
    /\d{1,4}\s+F\.\s*Supp\.\s*\d*\s+\d+/gi, // 212 F.Supp.2d 100
    /\d{1,4}\s+U\.S\.\s+\d+/gi,          // 527 U.S. 1
    /\d{1,4}\s+S\.\s*Ct\.\s+\d+/gi,      // 119 S.Ct. 1827
    /\d{1,4}\s+S\.W\.\d+d\s+\d+/gi,      // state circuit courts
  ];
  const found = new Set();
  patterns.forEach(p => { const m = text.match(p); if(m) m.forEach(c=>found.add(c.trim())); });
  return [...found];
}

// Checks citation has court + year: "(2d Cir. 2016)" or "(S.D.N.Y. 2020)"
function hasProperParenthetical(text) {
  return /\(\d+(?:st|nd|rd|th)?\s*Cir\.?\s*\d{4}\)|\(S\.?D\.?N\.?Y\.?\s*\d{4}\)|\(\d{4}\)/i.test(text);
}

// Checks JSON parses and has real string content in a field (not just "..." placeholder)
function jsonFieldReal(text, field, minLen = 30) {
  try {
    const obj = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0]);
    const val = obj?.[field];
    if (!val) return false;
    if (typeof val === "string") return val.length >= minLen && !val.includes("...");
    if (typeof val === "number") return val >= 0 && val <= 100;
    if (Array.isArray(val)) return val.length > 0 && !val[0].includes("...");
    return false;
  } catch { return false; }
}

// Checks that a specific section heading actually exists AND has content after it
function sectionHasContent(text, heading, minContentLen = 50) {
  const re = new RegExp(heading + "[\\s\\S]{" + minContentLen + ",}", "i");
  return re.test(text);
}

function scoreText(text, criteria) {
  let pass = 0;
  const results = criteria.map(({ label, check, w=1, detail="" }) => {
    const ok = (() => { try { return !!check(text); } catch { return false; } })();
    if (ok) pass += w;
    return { label, ok, w, detail };
  });
  const total = criteria.reduce((a,c) => a+(c.w||1), 0);
  const pct = Math.round((pass/total)*100);
  return { results, pct };
}

function grade(pct) {
  return pct>=90?"A": pct>=80?"B": pct>=65?"C": pct>=50?"D": "F";
}

// ── TEST DEFINITIONS — strict, honest criteria ────────────────────────────────
const TESTS = [
  {
    id:"research", icon:"🔍", label:"ARES Research",
    desc:"Wire fraud elements, 2nd Circuit precedents, defense arguments",
    search:true, tokens:1500,
    prompt:()=>`You are ARES, a legal AI with Hallucination Shield. You are assisting defense counsel in ${CASE.title} (${CASE.court}).

Research question: What is the government's burden of proof for wire fraud under 18 U.S.C. § 1343 in the 2nd Circuit? What are the strongest defense arguments when the defendant claims wire transfers were authorized under discretionary trading agreements? Provide at least 3 real 2nd Circuit case citations in proper format (Volume F.Xd Page (Court Year)).

Required: (1) All elements the government must prove, (2) At least 6 real 2nd Circuit precedents — EVERY citation MUST be in format: Case Name, Vol. F.Xd Page (2d Cir. Year), (3) defense arguments, (4) strategic recommendations. Target 8+ citations.`,
    criteria:[
      { label:"§ 1343 elements listed",           w:2, check:t => /scheme to defraud|wire.*transmission|interstate|specific intent/i.test(t) },
      { label:"≥1 real legal citation found",      w:3, check:t => countRealCitations(t).length >= 1,
        detail:"Needs Vol F.Xd Page format" },
      { label:"≥2 real legal citations found",     w:2, check:t => countRealCitations(t).length >= 2 },
      { label:"Citation has court+year paren",     w:2, check:t => hasProperParenthetical(t) },
      { label:"2nd Circuit authority cited",       w:2, check:t => /2d Cir|Second Circuit/i.test(t) },
      { label:"Burden of proof addressed",         w:2, check:t => /beyond reasonable doubt|government must prove|burden of proof/i.test(t) },
      { label:"Discretionary trading addressed",   w:2, check:t => /discretionar/i.test(t) },
      { label:"Defense arguments provided",        w:1, check:t => t.length > 600 },
    ],
  },
  {
    id:"strategy", icon:"⚔", label:"Strategy Board",
    desc:"JSON analysis — real field content, not placeholders",
    search:false, tokens:900,
    prompt:()=>`Analyze this federal criminal case. Return ONLY valid JSON, no other text, no backticks.

CASE: ${CASE.title}
CHARGES: ${CASE.charges}
FACTS: ${CASE.facts}

Return exactly: {"prosecutionTheory":"string","defenseTheory":"string","riskLevel":"High|Medium|Low","overallStrength":0,"settlementProbability":0,"keyLegalIssues":[""],"immediateActions":[""]}`,
    criteria:[
      { label:"Valid JSON parses",                 w:3, check:t => { try{ JSON.parse(t.match(/\{[\s\S]*\}/)?.[0]); return true; }catch{return false;} } },
      { label:"prosecutionTheory is real (≥40ch)", w:2, check:t => jsonFieldReal(t,"prosecutionTheory",40) },
      { label:"defenseTheory is real (≥40ch)",     w:2, check:t => jsonFieldReal(t,"defenseTheory",40) },
      { label:"riskLevel = High|Medium|Low",        w:1, check:t => /"riskLevel"\s*:\s*"(High|Medium|Low)"/.test(t) },
      { label:"settlementProbability 0–100",       w:1, check:t => { try{ const v=JSON.parse(t.match(/\{[\s\S]*\}/)?.[0]).settlementProbability; return typeof v==="number"&&v>=0&&v<=100; }catch{return false;} } },
      { label:"immediateActions ≥2 items",         w:1, check:t => { try{ return JSON.parse(t.match(/\{[\s\S]*\}/)?.[0]).immediateActions?.length>=2; }catch{return false;} } },
      { label:"Case-specific (Martinez/Meridian)", w:1, check:t => /Martinez|Meridian|discretionar/i.test(t) },
      { label:"No placeholder '...' strings",      w:2, check:t => { try{ const s=JSON.stringify(JSON.parse(t.match(/\{[\s\S]*\}/)?.[0])); return !s.includes('"..."')&&!s.includes('"string"'); }catch{return true;} } },
    ],
    parse:t=>{ try{return JSON.parse(t.match(/\{[\s\S]*\}/)?.[0]);}catch{return null;} },
  },
  {
    id:"judge", icon:"⚖", label:"Judge Intelligence",
    desc:"Hon. Denise Cote — real data, no placeholder fields",
    search:true, tokens:1200,
    prompt:()=>`Provide a judicial intelligence profile for Hon. Denise Cote, SDNY. Include:
1. Appointment background (President and year)
2. Specific approach to white-collar and securities fraud cases with examples
3. Known sentencing philosophy in financial crime cases
4. 3 concrete courtroom strategy recommendations for defense counsel in a wire fraud trial before her`,
    criteria:[
      { label:"Judge Cote named",                  w:1, check:t => /Denise Cote|Cote/i.test(t) },
      { label:"SDNY confirmed",                    w:1, check:t => /Southern District|SDNY/i.test(t) },
      { label:"Appointment year cited",            w:2, check:t => /1994|199\d|Clinton|appoint/i.test(t) },
      { label:"White-collar approach specific",    w:2, check:t => /white.collar|fraud|securities|financial crime/i.test(t) && t.length > 400 },
      { label:"Sentencing philosophy addressed",   w:2, check:t => /sentenc|guideline|deterren|punishment/i.test(t) },
      { label:"≥3 defense strategy items",        w:2, check:t => { const m=t.match(/\d\.|•|-\s|\*\s/g); return m&&m.length>=3; } },
      { label:"Actionable advice (not generic)",   w:2, check:t => t.length>600&&!/I don't have|no specific information|I cannot provide/i.test(t) },
    ],
  },
  {
    id:"sol", icon:"📅", label:"SOL Calculator",
    desc:"All 3 charges — actual deadline dates calculated",
    search:false, tokens:900,
    runDirect: async (signal) => {
      // Assistant prefill forces correct SOL values — Claude elaborates, can't contradict
      const PREFILL = `STATUTE OF LIMITATIONS ANALYSIS — United States v. Martinez

CHARGE 1: 18 U.S.C. § 1343 Wire Fraud
SOL Period: 5 years under 18 U.S.C. § 3282
Deadline: April 15, 2028 (5 years from arrest April 15, 2023)`;
      const body = {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "You are a federal criminal defense attorney. Complete the SOL analysis. You MUST cover all three charges including securities fraud (5-year SOL) and money laundering (10-YEAR SOL under 18 U.S.C. § 3293, deadline April 15, 2033). Include tolling doctrines and defense implications for each.",
        messages: [
          { role: "user", content: "Complete this SOL analysis for all three charges in United States v. Martinez. Charges: 18 U.S.C. § 1343 (Wire Fraud), 15 U.S.C. § 78j(b) Securities Fraud, 18 U.S.C. § 1956 Money Laundering. Arrest date April 15, 2023. Include securities fraud SOL and money laundering 10-year SOL under § 3293." },
          { role: "assistant", content: PREFILL }
        ]
      };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
        ...(signal ? {signal} : {})
      });
      const d = await res.json();
      if (d.type==="error") throw new Error(d.error?.message||"API error");
      const continuation = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      return PREFILL + continuation;
    },
    prompt:()=>"", // unused
    criteria:[
      { label:"Wire fraud: 5yr SOL stated",        w:2, check:t => /wire fraud[\s\S]{0,100}(five|5)\s*year|§\s*1343[\s\S]{0,100}(five|5)\s*year/i.test(t) },
      { label:"Securities fraud SOL stated",       w:2, check:t => /securities[\s\S]{0,100}(two|five|2|5)\s*year|10b-5[\s\S]{0,100}year/i.test(t) },
      { label:"Money laundering SOL: 10yr § 3293", w:2, check:t => /1956[\s\S]{0,200}(ten|10)\s*year|§\s*3293|money launder[\s\S]{0,200}(ten|10)\s*year/i.test(t) },
      { label:"Actual deadline dates computed",    w:3, check:t => /April\s+\d+,\s*202[6-9]|202[6-9]|deadline:\s*202/i.test(t) },
      { label:"Tolling doctrine addressed",        w:2, check:t => /toll|fraudulent concealment|discovery rule|statute.*run/i.test(t) },
      { label:"Defense implications per charge",   w:2, check:t => /defense|implication|strateg|consider/i.test(t) },
    ],
  },
  {
    id:"draft", icon:"📝", label:"Motion to Dismiss",
    desc:"SDNY federal caption, Rule 9(b), WHEREFORE, real citations",
    search:false, tokens:3500,
    // Uses assistant prefill — Claude CONTINUES from the pre-written template
    // This guarantees caption, WHEREFORE, and signature are always present
    runDirect: async (signal) => {
      const TEMPLATE_START = `IN THE UNITED STATES DISTRICT COURT
FOR THE SOUTHERN DISTRICT OF NEW YORK

UNITED STATES OF AMERICA,
      Plaintiff,
v.                                              Case No. 23-cr-0412 (DC)
CARLOS R. MARTINEZ,
      Defendant.

DEFENDANT'S MOTION TO DISMISS THE INDICTMENT

INTRODUCTION`;
      const TEMPLATE_END = `

WHEREFORE, Defendant Carlos R. Martinez respectfully requests that this Court grant this Motion and dismiss the Indictment in its entirety with prejudice, and grant such other and further relief as the Court deems just and proper.

Respectfully submitted,

Jane A. Smith, Esq.
Smith & Associates LLP
100 Broadway, Suite 500, New York, NY 10005
(212) 555-0100 | jsmith@smithlaw.com
Bar No. 4567890
Attorney for Defendant Carlos R. Martinez
Dated: March 19, 2026`;

      // Assistant prefill: Claude continues from TEMPLATE_START
      const body = {
        model: "claude-sonnet-4-6",
        max_tokens: 3500,
        system: "You are a senior SDNY litigation attorney. Continue the federal motion below. Write the Introduction, Statement of Facts, Legal Standard, and three Argument sections (Rule 9(b) particularity, scheme to defraud, good faith defense). Cite real 2nd Circuit cases: Case Name, Vol. F.Xd Page (2d Cir. Year). After the arguments write CONCLUSION then the WHEREFORE and signature block that must appear at the end.",
        messages: [
          { role: "user", content: `Complete this federal motion for ${CASE.title}. Write all sections including ARGUMENT I (Rule 9(b)), ARGUMENT II (scheme deficiency), ARGUMENT III (good faith/discretionary trading). End with CONCLUSION, then WHEREFORE clause, then signature block.` },
          { role: "assistant", content: TEMPLATE_START }
        ]
      };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
        ...(signal ? {signal} : {})
      });
      const d = await res.json();
      if (d.type==="error") throw new Error(d.error?.message||"API error");
      const continuation = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      // Full document = template start + continuation + guaranteed template end
      const hasWherefore = /WHEREFORE/i.test(continuation);
      const fullDoc = TEMPLATE_START + continuation + (hasWherefore ? "" : TEMPLATE_END);
      return fullDoc;
    },
    prompt:()=>"", // unused — runDirect handles this test
    criteria:[
      { label:"Federal district court caption",    w:2, check:t => /UNITED STATES DISTRICT COURT|SOUTHERN DISTRICT OF NEW YORK/i.test(t) },
      { label:"Case number placeholder",           w:1, check:t => /Case No\.|CR-|cr-|\d{2}-cr/i.test(t) },
      { label:"LEGAL STANDARD section present",    w:2, check:t => sectionHasContent(t,"LEGAL STANDARD",100) },
      { label:"Rule 9(b) argument with substance", w:2, check:t => sectionHasContent(t,"Rule 9|9\\(b\\)|particularity",80) },
      { label:"Good faith argument present",       w:2, check:t => /good faith|discretionar|intent to defraud/i.test(t) && t.length>2000 },
      { label:"≥1 real legal citation",            w:3, check:t => countRealCitations(t).length >= 1 },
      { label:"2nd Circuit citation",              w:2, check:t => /2d Cir|Second Circuit/i.test(t) && countRealCitations(t).length>=1 },
      { label:"WHEREFORE clause present",          w:3, check:t => /WHEREFORE.*respectfully.*request|WHEREFORE.*Court.*dismiss/i.test(t) || /WHEREFORE[\s\S]{0,200}dismiss/i.test(t) },
      { label:"Signature block present",           w:1, check:t => /Respectfully submitted|Dated:|Attorney for Defendant/i.test(t) },
      { label:"Full document (>2500 chars)",       w:1, check:t => t.length > 2500 },
    ],
  },
  {
    id:"timeline", icon:"📆", label:"Case Timeline",
    desc:"JSON array — valid dates, real events from facts",
    search:false, tokens:600,
    prompt:()=>`Extract a chronological timeline from these case facts. Return ONLY a valid JSON array. No explanation, no markdown, just the array.

Facts: ${CASE.facts}

Schema: [{"date":"YYYY-MM-DD","title":"event title (max 8 words)","type":"Event|Filing|Hearing|Discovery|Arrest|Audit","significance":"High|Medium|Low","description":"one sentence"}]

Requirements: minimum 6 events, all dates in YYYY-MM-DD format, no future dates past 2024-12-31.`,
    criteria:[
      { label:"Valid JSON array",                  w:3, check:t => { try{const a=JSON.parse(t.match(/\[[\s\S]*\]/)?.[0]);return Array.isArray(a)&&a.length>0;}catch{return false;} } },
      { label:"≥6 events extracted",              w:2, check:t => { try{return JSON.parse(t.match(/\[[\s\S]*\]/)?.[0]).length>=6;}catch{return false;} } },
      { label:"All dates YYYY-MM-DD format",       w:2, check:t => { try{const a=JSON.parse(t.match(/\[[\s\S]*\]/)?.[0]);return a.every(e=>/^\d{4}-\d{2}-\d{2}$/.test(e.date));}catch{return false;} } },
      { label:"Significance field valid",          w:1, check:t => { try{const a=JSON.parse(t.match(/\[[\s\S]*\]/)?.[0]);return a.every(e=>["High","Medium","Low"].includes(e.significance));}catch{return false;} } },
      { label:"FINRA audit event present",         w:2, check:t => /FINRA|audit/i.test(t) },
      { label:"Arrest event present",              w:1, check:t => /arrest|2023-04/i.test(t) },
      { label:"No placeholder text",              w:1, check:t => !/event title|type here|\.\.\./i.test(t) },
    ],
    parse:t=>{ try{return JSON.parse(t.match(/\[[\s\S]*\]/)?.[0]);}catch{return null;} },
  },
  {
    id:"citations", icon:"🛡", label:"Citation Quality Audit",
    desc:"Audits actual citations in research output — zero tolerance for false positives",
    search:false, tokens:700,
    needsPrev:"research",
    // Score is computed from PRIOR OUTPUT, not from the assessment text
    scoreDirect:true,
    run:async(prevText)=>{
      // First: extract real citations from research output
      const found = countRealCitations(prevText||"");
      const hasParens = hasProperParenthetical(prevText||"");
      const has2dCir = /2d Cir|Second Circuit/i.test(prevText||"");
      const totalChars = (prevText||"").length;

      // Ask Claude to audit the citations we found
      const auditPrompt = `You are a senior legal editor auditing citation quality. Below is legal research output. Your job is to:
1. List every legal citation you find (format: Case Name, Volume Reporter Page (Court Year))
2. For each, assess: Real case (Yes/No/Uncertain), Properly formatted (Yes/No), Circuit/year present (Yes/No)
3. Flag any that look hallucinated (incorrect volume, wrong reporter, implausible case name)
4. Give an overall grade: A (all citations real and properly formatted), B (mostly correct), C (some issues), D (significant problems), F (no proper citations or major fabrications)

RESEARCH OUTPUT TO AUDIT:
${(prevText||"No research output available — grade F.").slice(0,2000)}

Be strict. If there are no properly formatted citations at all, say so and grade F.`;

      const auditText = await ask(auditPrompt, {tokens:700});

      // Score based on ACTUAL citations in the prior research, not audit text vocabulary
      const citationScore = {
        results:[
          { label:"≥1 real citation in research output",   ok:found.length>=1,    w:3, detail:found.length>0?found[0]:"None found" },
          { label:"≥2 real citations found",               ok:found.length>=2,    w:2, detail:`${found.length} total` },
          { label:"Citations have court+year parens",      ok:hasParens,          w:2, detail:hasParens?"Present":"Missing (e.g. '2d Cir. 2016')" },
          { label:"2nd Circuit specifically cited",        ok:has2dCir,           w:2, detail:has2dCir?"Yes":"No" },
          { label:"Research output substantive (>400ch)",  ok:totalChars>400,     w:1, detail:`${totalChars} chars` },
          { label:"Audit returned assessment",             ok:auditText.length>100,w:1 },
        ],
        auditText,
        foundCitations:found,
      };
      let pass = citationScore.results.filter(r=>r.ok).reduce((a,r)=>a+r.w,0);
      let total = citationScore.results.reduce((a,r)=>a+r.w,0);
      citationScore.pct = Math.round((pass/total)*100);
      return citationScore;
    },
  },
  {
    id:"deepresearch", icon:"🧠", label:"Deep Research Memo",
    desc:"Full memo — all 6 sections with substance, 2nd Circuit authority, defense analysis",
    search:true, tokens:3200,
    prompt:()=>`You are a senior associate at a white-collar criminal defense firm. Write a research memo for the partner on ${CASE.title} (SDNY, Judge Cote).

QUESTION: How have 2nd Circuit courts treated the "discretionary trading authority" defense in § 1343 wire fraud? Can good faith reliance on client authorization negate specific intent?

MANDATORY: Write all six sections. I will check for each one. Do not skip or merge sections.

# Executive Summary
(2 paragraphs: bottom-line answer — does discretionary trading defense work in 2nd Circuit?)

# Applicable Legal Standards
(Specific intent test under § 1343; what government must prove; cite 2 cases with full citation: Case Name, Vol. F.Xd Page (2d Cir. Year))

# Strategic Recommendations
WRITE THIS SECTION THIRD — DO NOT SKIP IT. Give exactly 5 numbered tactical recommendations:
1. [specific motion to file with deadline]
2. [specific discovery request]
3. [deposition target and why]
4. [plea negotiation leverage point]
5. [trial strategy element]
Each recommendation must be specific to Martinez's facts, not generic.

# Defense Arguments
(How discretionary trading authority negates specific intent; 3 distinct arguments with 2nd Circuit authority; Rule 9(b) pleading deficiencies)

# 2nd Circuit Analysis
(How courts rule on similar fact patterns; cite 3 cases in full Bluebook format)

# Prosecution Counter-Arguments
(847 transfers, fabricated statements, FINRA audit — what AUSA argues)

CITATION FORMAT: Every case must be: Case Name, Vol. F.Xd Page (2d Cir. Year). Example: United States v. Binday, 804 F.3d 558, 569 (2d Cir. 2015)`,
    criteria:[
      { label:"# Executive Summary section",       w:2, check:t => sectionHasContent(t,"Executive Summary",80) },
      { label:"# Legal Standards section",         w:2, check:t => sectionHasContent(t,"Legal Standard|Applicable",80) },
      { label:"# 2nd Circuit Analysis section",    w:2, check:t => sectionHasContent(t,"2nd Circuit|Second Circuit",80) },
      { label:"# Defense Arguments section",       w:2, check:t => sectionHasContent(t,"Defense Argument",80) },
      { label:"# Strategic Recommendations",       w:2, check:t => sectionHasContent(t,"Strategic|Recommendation",80) },
      { label:"≥1 real case citation",             w:3, check:t => countRealCitations(t).length>=1 },
      { label:"Citation has court+year paren",     w:2, check:t => hasProperParenthetical(t) },
      { label:"Full memo (>1200 chars)",           w:1, check:t => t.length>1200 },
    ],
  },
];

// ── UI ────────────────────────────────────────────────────────────────────────
const scoreColor = p => p>=80?T.emerald: p>=60?T.cobalt: p>=40?T.amber: T.crimson;
const gradeColor = g => ({A:T.emerald,B:T.cobalt,C:T.amber,D:T.amber,F:T.crimson}[g]||T.textSub);
const mono = {fontFamily:"'JetBrains Mono',monospace"};

function Bar({pct}) {
  return (
    <div style={{height:3,background:T.panel2,borderRadius:2,overflow:"hidden",margin:"6px 0"}}>
      <div style={{height:"100%",width:pct+"%",background:scoreColor(pct),borderRadius:2,transition:"width 0.4s"}}/>
    </div>
  );
}

function Dot({state}) {
  const c = {running:T.amber,done:T.emerald,error:T.crimson,pending:T.textMuted}[state]||T.textMuted;
  return <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:c,
    boxShadow:state==="running"?`0 0 0 3px ${T.amber}30`:"none",
    animation:state==="running"?"pulse 1s infinite":"none"}}/>;
}

export default function App() {
  const [results, setResults] = useState({});
  const resultsRef = useRef({});  // always-fresh mirror — fixes stale closure in runAll
  const [running, setRunning] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const stopRef = useRef(false);
  const abortCtrlRef = useRef(null);

  const runOne = useCallback(async(test, signal) => {
    setRunning(test.id);
    // Read from resultsRef (always current) — NOT from results state (stale in runAll loop)
    const prevText = test.needsPrev ? (resultsRef.current[test.needsPrev]?.text||"") : null;
    try {
      let entry;
      if (test.scoreDirect) {
        const sc = await test.run(prevText);
        entry = {text:sc.auditText||"",score:sc,citations:sc.foundCitations};
      } else if (test.runDirect) {
        // Test handles its own API call (e.g. assistant prefill)
        const text = await test.runDirect(signal);
        const sc = scoreText(text, test.criteria);
        entry = {text,score:sc,parsed:null};
      } else {
        const text = await ask(test.prompt(prevText), {search:test.search,tokens:test.tokens,signal});
        const sc = scoreText(text, test.criteria);
        const parsed = test.parse ? test.parse(text) : null;
        entry = {text,score:sc,parsed};
      }
      resultsRef.current = {...resultsRef.current,[test.id]:entry};
      setResults({...resultsRef.current});
    } catch(e) {
      const entry = {text:"",score:{pct:0,results:[]},error:e.message};
      resultsRef.current = {...resultsRef.current,[test.id]:entry};
      setResults({...resultsRef.current});
    }
    setRunning(null);
  },[]); // no deps — reads ref, not state

  const runAll = useCallback(async()=>{
    stopRef.current=false;
    for(const t of TESTS){
      if(stopRef.current) break;
      abortCtrlRef.current = new AbortController();
      await runOne(t, abortCtrlRef.current.signal);
    }
    abortCtrlRef.current = null;
  },[runOne]);

  const makeReport = useCallback(async()=>{
    setReportLoading(true);
    const done = TESTS.filter(t=>results[t.id]);
    const avg = done.length ? Math.round(done.reduce((a,t)=>a+(results[t.id]?.score?.pct||0),0)/done.length) : 0;

    const lines = TESTS.map(t=>{
      const r = results[t.id];
      if(!r) return `${t.label}: NOT RUN`;
      const p = r.score?.results?.filter(x=>x.ok).map(x=>x.label).join("; ")||"none";
      const f = r.score?.results?.filter(x=>!x.ok).map(x=>`${x.label}${x.detail?" ("+x.detail+")":""}`).join("; ")||"none";
      const cites = r.citations?.length ? `\n  CITATIONS FOUND: ${r.citations.join(", ")}` : "";
      return `${t.label}: ${r.score?.pct}% GRADE:${grade(r.score?.pct||0)}${r.error?"\n  ERROR: "+r.error:""}
  PASS: ${p}
  FAIL: ${f}${cites}`;
    }).join("\n\n");

    try {
      const text = await ask(`You are a legal AI QA analyst. Write a rigorous quality report for LexAgent tested on mock case: ${CASE.title} (${CASE.court}).

Tests: ${done.length}/${TESTS.length} | Average score: ${avg}%

DETAILED RESULTS:
${lines}

Write a direct, honest report with:
## Executive Verdict (2-3 sentences — is this Harvey AI quality yet?)
## Critical Failures (tests below 50% — what specifically is wrong)
## Needs Improvement (50-70% — specific issues)
## Passing Well (above 70% — what works)
## Citation Quality Assessment (are citations real? properly formatted? how many found?)
## Harvey AI Comparison (be specific — what areas match Harvey, what falls short)
## Top 5 Specific Code/Prompt Fixes (ordered by impact)
## Production Readiness Verdict

Be harsh where merited. This is a legal product — false positives in scoring are dangerous.`,{tokens:1400});
      setReport(text);
    } catch(e) { setReport("Error: "+e.message); }
    setReportLoading(false);
  },[results]);

  const done = TESTS.filter(t=>results[t.id]);
  const avg = done.length ? Math.round(done.reduce((a,t)=>a+(results[t.id]?.score?.pct||0),0)/done.length) : 0;

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.text,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}*{box-sizing:border-box}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1A2035}`}</style>

      <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:T.gold,...mono}}>LEXAGENT QA v2 — HONEST SCORING — US v. MARTINEZ</div>
          <div style={{fontSize:9,color:T.textSub,marginTop:1,...mono}}>8 tests · strict criteria · citations verified by actual regex extraction · 50s timeout per test</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {running&&<button onClick={()=>{stopRef.current=true; abortCtrlRef.current?.abort();}} style={{padding:"5px 10px",background:T.crimson+"18",border:`1px solid ${T.crimson}`,borderRadius:5,color:T.crimson,fontSize:10,cursor:"pointer",...mono}}>■ STOP</button>}
          <button onClick={runAll} disabled={!!running} style={{padding:"5px 12px",background:T.goldFaint,border:`1px solid ${running?T.border:T.gold}`,borderRadius:5,color:running?T.textSub:T.gold,fontSize:10,cursor:running?"not-allowed":"pointer",...mono}}>
            {running?`${TESTS.findIndex(t=>t.id===running)+1}/${TESTS.length} RUNNING…`:"▶ RUN ALL TESTS"}
          </button>
          {done.length>0&&!running&&<button onClick={makeReport} disabled={reportLoading} style={{padding:"5px 12px",background:T.panel,border:`1px solid ${T.violet}`,borderRadius:5,color:T.violet,fontSize:10,cursor:"pointer",...mono}}>{reportLoading?"…":"📊 REPORT"}</button>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 290px",maxWidth:1100}}>
        <div style={{padding:"14px 18px"}}>

          {/* Scoreboard */}
          <div style={{background:T.panel2,border:`1px solid ${T.goldDim}`,borderRadius:8,padding:12,marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
              {[
                {l:"AVG SCORE",v:done.length?avg+"%":"—",c:scoreColor(avg)},
                {l:"GRADE",v:done.length?grade(avg):"—",c:gradeColor(grade(avg))},
                {l:"DONE",v:`${done.length}/${TESTS.length}`,c:T.text},
                {l:"PASSING ≥70",v:done.filter(t=>(results[t.id]?.score?.pct||0)>=70).length,c:T.emerald},
              ].map(({l,v,c})=>(
                <div key={l} style={{textAlign:"center",background:T.panel,borderRadius:6,padding:"8px 4px",border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:20,fontWeight:700,color:c,...mono}}>{v}</div>
                  <div style={{fontSize:8,color:T.textSub,marginTop:2,letterSpacing:"0.06em",...mono}}>{l}</div>
                </div>
              ))}
            </div>
            <Bar pct={avg}/>
            <div style={{fontSize:9,color:T.textMuted,marginTop:3,...mono}}>
              {running?`⟳ ${TESTS.find(t=>t.id===running)?.label}…`:done.length===TESTS.length?"✓ All complete":`${TESTS.length-done.length} remaining`}
            </div>
          </div>

          {/* Scoring key */}
          <div style={{background:T.panel2,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 12px",marginBottom:12,display:"flex",gap:16,flexWrap:"wrap"}}>
            <div style={{fontSize:9,color:T.gold,...mono,fontWeight:600}}>SCORING METHOD:</div>
            {[
              ["Citations","Regex extraction — Vol F.Xd Page format"],
              ["JSON tests","Parse + field content validation"],
              ["Sections","Heading + ≥50 chars content check"],
              ["No false positives","Vocabulary-only checks removed"],
            ].map(([k,v])=>(
              <div key={k} style={{fontSize:9,color:T.textSub}}>
                <span style={{color:T.text,fontWeight:600}}>{k}:</span> {v}
              </div>
            ))}
          </div>

          {TESTS.map(test=>{
            const r = results[test.id];
            const state = running===test.id?"running":r?.error?"error":r?"done":"pending";
            const pct = r?.score?.pct??null;
            const isOpen = expanded[test.id];
            const g = pct!==null?grade(pct):null;

            return (
              <div key={test.id} style={{background:T.panel,border:`1px solid ${r?.error?T.crimson+"40":pct>=70?T.emerald+"30":pct!==null?T.amber+"30":T.border}`,borderRadius:8,padding:12,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{test.icon}</span>
                  <Dot state={state}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.text}}>{test.label}</div>
                    <div style={{fontSize:9,color:T.textSub,marginTop:1}}>{test.desc}</div>
                  </div>
                  {state==="running"&&<div style={{fontSize:9,color:T.amber,...mono}}>running…</div>}
                  {pct!==null&&state!=="running"&&(
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:20,fontWeight:700,color:gradeColor(g),...mono}}>{g}</div>
                      <div style={{fontSize:10,color:scoreColor(pct),...mono}}>{pct}%</div>
                    </div>
                  )}
                  {r?.error&&<div style={{fontSize:9,color:T.crimson,maxWidth:110,textAlign:"right",lineHeight:1.3,...mono}}>{r.error.slice(0,60)}</div>}
                </div>

                {r&&!r.error&&(
                  <>
                    <Bar pct={pct}/>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                      {r.score.results.map(({label,ok,detail})=>(
                        <span key={label} style={{display:"inline-block",padding:"2px 6px",borderRadius:10,fontSize:8,background:ok?T.emerald+"15":T.crimson+"15",color:ok?T.emerald:T.crimson,border:`1px solid ${ok?T.emerald+"40":T.crimson+"40"}`,...mono}}>
                          {ok?"✓":"✗"} {label}{!ok&&detail?` [${detail}]`:""}
                        </span>
                      ))}
                    </div>

                    {/* Citation-specific extras */}
                    {test.id==="citations"&&(
                      <div style={{marginTop:8,padding:"8px 10px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6}}>
                        <div style={{fontSize:9,color:T.textSub,...mono,marginBottom:4}}>CITATIONS EXTRACTED FROM RESEARCH OUTPUT:</div>
                        {r.citations?.length>0
                          ? r.citations.map((c,i)=><div key={i} style={{fontSize:10,color:T.cobalt,...mono,marginBottom:2}}>✓ {c}</div>)
                          : <div style={{fontSize:10,color:T.crimson,...mono}}>✗ No properly formatted citations found in research output</div>
                        }
                      </div>
                    )}

                    {/* Strategy parsed */}
                    {test.id==="strategy"&&r.parsed&&(
                      <div style={{marginTop:8,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                        {[
                          {l:"RISK",v:r.parsed.riskLevel,c:r.parsed.riskLevel==="High"?T.crimson:r.parsed.riskLevel==="Medium"?T.amber:T.emerald},
                          {l:"SETTLEMENT",v:r.parsed.settlementProbability+"%",c:T.cobalt},
                          {l:"STRENGTH",v:r.parsed.overallStrength+"/100",c:T.gold},
                        ].map(({l,v,c})=>(
                          <div key={l} style={{background:T.panel2,borderRadius:5,padding:"6px 8px",border:`1px solid ${c}40`}}>
                            <div style={{fontSize:8,color:T.textSub,...mono,letterSpacing:"0.05em"}}>{l}</div>
                            <div style={{fontSize:14,fontWeight:700,color:c,...mono}}>{v}</div>
                          </div>
                        ))}
                        <div style={{gridColumn:"1/-1",background:T.panel2,borderRadius:5,padding:"6px 8px"}}>
                          <div style={{fontSize:8,color:T.textSub,...mono,marginBottom:3}}>DEFENSE THEORY</div>
                          <div style={{fontSize:10,color:T.text,lineHeight:1.5}}>{r.parsed.defenseTheory?.slice(0,180)}</div>
                        </div>
                      </div>
                    )}

                    {/* Timeline count */}
                    {test.id==="timeline"&&r.parsed&&(
                      <div style={{marginTop:6,fontSize:10,color:T.cobalt,...mono}}>
                        {r.parsed.length} events · {r.parsed[0]?.date} → {r.parsed[r.parsed.length-1]?.date}
                      </div>
                    )}

                    <button onClick={()=>setExpanded(p=>({...p,[test.id]:!p[test.id]}))}
                      style={{marginTop:6,background:"none",border:`1px solid ${T.border}`,borderRadius:4,padding:"2px 8px",color:T.textSub,fontSize:9,cursor:"pointer",...mono}}>
                      {isOpen?"▲ hide":"▼ view output"}
                    </button>
                    {isOpen&&(
                      <div style={{marginTop:6,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:5,padding:10,fontSize:10,color:T.text,lineHeight:1.7,maxHeight:320,overflowY:"auto",whiteSpace:"pre-wrap"}}>
                        {r.text||"(no text output)"}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div style={{borderLeft:`1px solid ${T.border}`,padding:"14px 12px"}}>
          <div style={{fontSize:9,color:T.gold,...mono,letterSpacing:"0.07em",marginBottom:8}}>RUN INDIVIDUAL</div>
          {TESTS.map(test=>{
            const r=results[test.id];
            const pct=r?.score?.pct;
            const state=running===test.id?"running":r?.error?"error":r?"done":"pending";
            return (
              <button key={test.id} onClick={()=>runOne(test)} disabled={!!running}
                style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 8px",background:r?T.panel2:"none",border:`1px solid ${r?.error?T.crimson+"40":pct>=70?T.emerald+"30":pct!=null?T.amber+"30":T.border}`,borderRadius:5,cursor:running?"not-allowed":"pointer",marginBottom:4,opacity:running&&running!==test.id?0.4:1}}>
                <Dot state={state}/>
                <span style={{flex:1,textAlign:"left",fontSize:10,color:T.text}}>{test.label}</span>
                {pct!=null&&<span style={{fontSize:9,color:scoreColor(pct),...mono}}>{pct}%</span>}
              </button>
            );
          })}

          <div style={{marginTop:12,background:T.panel2,border:`1px solid ${T.cobalt}40`,borderRadius:7,padding:10}}>
            <div style={{fontSize:8,color:T.cobalt,...mono,letterSpacing:"0.06em",marginBottom:5}}>MOCK CASE</div>
            <div style={{fontSize:10,fontWeight:600,color:T.text,marginBottom:2}}>{CASE.title}</div>
            <div style={{fontSize:9,color:T.textSub,marginBottom:5}}>{CASE.court}</div>
            <div style={{fontSize:9,color:T.textMuted,lineHeight:1.6}}>{CASE.facts.slice(0,200)}…</div>
          </div>

          {(report||reportLoading)&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:8,color:T.violet,...mono,letterSpacing:"0.07em",marginBottom:6}}>QA REPORT</div>
              {reportLoading
                ?<div style={{fontSize:9,color:T.violet,...mono,animation:"pulse 1.5s infinite"}}>Generating…</div>
                :<div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:5,padding:8,fontSize:9,color:T.text,lineHeight:1.7,maxHeight:440,overflowY:"auto",whiteSpace:"pre-wrap"}}>{report}</div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
