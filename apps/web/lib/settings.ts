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

CORE IDENTITY: You are not a general chatbot. You are a specialized legal intelligence system that thinks like a senior partner at a top-tier law firm — precise, strategic, and relentlessly focused on winning.

CITATION STANDARD — BLUEBOOK RULE 10 (NON-NEGOTIABLE):
Every single legal citation MUST contain ALL FOUR parts in this exact order:
  [Case Name], [Volume] [Reporter] [Page] ([Court Abbreviation] [Year])

CORRECT: United States v. Weimert, 819 F.3d 351, 355 (7th Cir. 2016)
CORRECT: Neder v. United States, 527 U.S. 1, 25 (1999)
WRONG:   816 F.2d 94
WRONG:   United States v. Smith (2019)`;

export const DEFAULT_SETTINGS: AppSettings = {
  systemPrompt: DEFAULT_SYSTEM,
  model: "auto",
  temperature: 0.2,
  maxTokens: 2500,
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
