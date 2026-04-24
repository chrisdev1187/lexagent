export interface AppSettings {
  // AI / Model
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  webSearch: boolean;
  autoVerify: boolean;

  // API Keys
  anthropicKey: string;
  courtListenerToken: string;
  govInfoKey: string;
  openStatesKey: string;

  // Firm Profile (NEW)
  firmName: string;
  firmAddress: string;
  firmCity: string;
  firmState: string;
  firmZip: string;
  firmPhone: string;
  firmEmail: string;
  firmWebsite: string;
  firmLogo: string | null;
  barNumber: string;
  barJurisdiction: string;
  practiceAreas: string[];
  letterheadText: string;

  // Billing
  hourlyRate: number;

  // UI Preferences (NEW)
  tooltipsEnabled: boolean;
  animationsEnabled: boolean;
  sidebarCollapsed: boolean;
}

export const DEFAULT_SYSTEM = `You are ARES (Advanced Research & Evidence System), an elite AI legal assistant trained at the intersection of law, strategy, and adversarial reasoning. You work exclusively with licensed attorneys and legal professionals.

CORE IDENTITY: You are not a general chatbot. You are a specialized legal intelligence system that thinks like a senior partner at a top-tier law firm — precise, strategic, and relentlessly focused on winning cases. You never hedge unnecessarily. You give real legal analysis, not disclaimers.

CITATION STANDARD — BLUEBOOK RULE 10 (NON-NEGOTIABLE):
Every single legal citation MUST contain ALL FOUR parts in this exact order:
  [Case Name], [Volume] [Reporter] [Page] ([Court Abbreviation] [Year])

CORRECT: United States v. Weimert, 819 F.3d 351, 355 (7th Cir. 2016)
CORRECT: Neder v. United States, 527 U.S. 1, 25 (1999)
CORRECT: Brown v. Board of Education, 347 U.S. 483 (1954)
WRONG:   816 F.2d 94
WRONG:   United States v. Smith (2019)
WRONG:   Smith, supra at 4

STATUTORY CITATIONS — BLUEBOOK RULE 12:
  [Title] U.S.C. § [Section] ([Year])
  CORRECT: 42 U.S.C. § 1983 (2018)
  CORRECT: Fed. R. Civ. P. 12(b)(6)

CITATION INTEGRITY: Only cite cases you are confident exist. If uncertain, flag it explicitly: "[VERIFY: citation may need confirmation]". Never fabricate a case name or reporter. A wrong citation destroys credibility.

OUTPUT FORMAT RULES:
- Use ## for major section headings (CAPS, e.g., ## CASE ASSESSMENT)
- Use ### for subsections
- Use **bold** for key legal terms and holding language
- Use bullet lists for enumerated arguments, factors, and elements
- Use > blockquotes for direct quotations from cases or statutes
- End every analysis with a ## BOTTOM LINE that states the practical recommendation in 2-3 sentences

ANALYSIS POSTURE:
- Lead with the strongest legal argument, not the weakest
- Anticipate the opposing party's best counterarguments and address them
- Flag circuit splits and unsettled law explicitly
- Distinguish between binding authority (same jurisdiction) and persuasive authority (other jurisdictions)
- Note any recent SCOTUS, circuit, or state supreme court developments that affect the analysis

JURISDICTION AWARENESS:
- Always consider whether federal or state law governs
- Apply the Erie doctrine where relevant in federal diversity cases
- Note when state law varies significantly from federal standards
- Flag when a jurisdiction has peculiar local rules that matter

DOCUMENT DRAFTING RULES:
- All documents must include proper caption blocks with court name, parties, case number, and document title
- Motions must include Certificate of Service
- Briefs must include Table of Contents and Table of Authorities when substantive
- Use gender-neutral language throughout
- Use active voice in argument sections; passive voice only for procedural history
- Page and line numbers must be referenced when citing to the record

REFUSAL POLICY:
- Decline requests that ask you to help with clearly fraudulent, perjurious, or otherwise illegal conduct
- Do not generate content designed to deceive courts or obstruct justice
- If a request is ambiguous, ask a clarifying question rather than refusing outright
- Always complete legitimate legal research requests even if the legal theory is aggressive or unpopular`;

export const DEFAULT_SETTINGS: AppSettings = {
  systemPrompt: DEFAULT_SYSTEM,
  model: "auto",
  temperature: 0.2,
  maxTokens: 8000,
  webSearch: true,
  autoVerify: true,
  courtListenerToken: "",
  govInfoKey: "",
  openStatesKey: "",
  anthropicKey: "",

  // Firm Profile defaults
  firmName: "",
  firmAddress: "",
  firmCity: "",
  firmState: "",
  firmZip: "",
  firmPhone: "",
  firmEmail: "",
  firmWebsite: "",
  firmLogo: null,
  barNumber: "",
  barJurisdiction: "",
  practiceAreas: [],
  letterheadText: "",

  // Billing defaults
  hourlyRate: 350,

  // UI Preference defaults
  tooltipsEnabled: true,
  animationsEnabled: true,
  sidebarCollapsed: false,
};

export const PRACTICE_AREAS = [
  "Criminal Defense","Civil Litigation","Corporate / M&A","Employment",
  "Family Law","IP / Patent","Real Estate","Constitutional","Immigration",
  "Personal Injury","Bankruptcy","Securities","Tax","Environmental",
  "Healthcare","Government / Admin",
];

export const CASE_TYPES = [
  "Criminal Defense","Civil Litigation","Corporate / M&A","Employment",
  "Family Law","IP / Patent","Real Estate","Constitutional","Immigration",
  "Personal Injury","Bankruptcy","Securities",
];

export const JURISDICTIONS = [
  "Federal – SCOTUS","Federal – Circuit","Federal – District",
  "California","New York","Texas","Florida","Illinois",
  "Georgia","Washington","Other State",
];

export const TABS = [
  { id: "overview",     label: "Overview",      icon: "LayoutDashboard", tooltip: "Matter summary — details, stats, and quick actions" },
  { id: "research",     label: "Research",      icon: "Search",     tooltip: "AI-powered case law research using CourtListener (9M+ opinions)" },
  { id: "deepresearch", label: "Deep Research",  icon: "ScanSearch", tooltip: "Multi-source legal research: Congress, eCFR, EDGAR, USPTO, OpenStates" },
  { id: "vault",        label: "Vault",          icon: "FileText",   tooltip: "Secure document storage — upload PDFs, evidence, discovery materials" },
  { id: "strategy",     label: "Strategy",       icon: "Target",     tooltip: "AI-generated case strategy with argument strength analysis" },
  { id: "judge",        label: "Judge Intel",    icon: "Users",      tooltip: "Judge profile: career history, rulings, political affiliations (CourtListener)" },
  { id: "deadlines",    label: "Deadlines",      icon: "Clock",      tooltip: "Case deadline tracking and calendar management" },
  { id: "timeline",     label: "Timeline",       icon: "CalendarDays", tooltip: "Visual timeline of case events and milestones" },
  { id: "citations",    label: "Shield",         icon: "ShieldCheck", tooltip: "Hallucination Shield — verify all citations against 18M+ CourtListener records" },
  { id: "draft",        label: "Draft",          icon: "FileEdit",   tooltip: "AI document drafting: motions, briefs, letters, memos" },
  { id: "notes",        label: "Evidence",       icon: "BookOpen",   tooltip: "Case notes, evidence log, and annotations" },
  { id: "billing",      label: "Billing",        icon: "Receipt",    tooltip: "Billable hours, time entries, and invoice generation" },
  { id: "conflict",     label: "Conflict",       icon: "Scale",      tooltip: "Conflict of interest checker across all active matters" },
] as const;

export type TabId = typeof TABS[number]["id"];
