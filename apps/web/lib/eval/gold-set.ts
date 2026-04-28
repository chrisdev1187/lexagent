// ARES v1.6.2 — Eval gold set (seed).
// 16 hand-authored questions: 4 postures (pleadings, discovery, msj, appeal)
// × 4 jurisdictions (federal, ca, ny, tx). Target per the plan is 200
// (5×4×10) — this is the seed; expansion is content work, not code work.
//
// Authoring rules:
//  - Facts are plausible but generic (no real client matters).
//  - `expected_counterarg_count` set to the number of opposing positions a
//    competent attorney would address. Most are 3 (the v5 Devil's-Advocate
//    floor); raise where the issue is genuinely multi-front.
//  - `expected_outcome` reflects what the record-as-stated supports under
//    controlling authority — used for Brier calibration only, not as
//    "ground truth" for the legal question itself.
//  - `required_authorities` empty by default; populate as authorities are
//    confirmed. Keeps the seed honest — we only assert what we can verify.
//
// Plan: ~/.claude/plans/jaunty-dazzling-horizon.md (rows 178-185, 245)

import type { EvalQuestion } from "./types";

export const GOLD_SET_SEED: EvalQuestion[] = [
  // ── PLEADINGS ───────────────────────────────────────────────────────────
  {
    id: "pleadings-fed-001",
    posture: "pleadings",
    jurisdiction: "federal",
    question: "Should we file a Rule 12(b)(6) motion or proceed to answer?",
    facts: "Client sued in federal district court (S.D.N.Y.) for breach of an oral services agreement. Complaint alleges $250k in damages but pleads no specific performance dates, no parties to the meeting where the contract was allegedly formed, and no written confirmation. Client denies any agreement was reached.",
    expected_counterarg_count: 3,
    expected_outcome: "favorable",
  },
  {
    id: "pleadings-ca-001",
    posture: "pleadings",
    jurisdiction: "ca",
    question: "Should we demur, move to strike, or answer the complaint?",
    facts: "Plaintiff filed a putative class action under California's UCL (Bus. & Prof. Code § 17200) alleging deceptive labeling of dietary supplements. Complaint pleads only generalized allegations of consumer deception, no named class representative purchase details, and no allegation of injury beyond price premium.",
    expected_counterarg_count: 3,
    expected_outcome: "favorable",
  },
  {
    id: "pleadings-ny-001",
    posture: "pleadings",
    jurisdiction: "ny",
    question: "Should we file a CPLR 3211(a)(7) motion to dismiss?",
    facts: "Client served with complaint in New York Supreme Court alleging tortious interference with contract. Plaintiff alleges client induced its largest customer to terminate a 5-year supply agreement. The complaint identifies no specific communications, no improper means, and acknowledges the customer terminated for documented quality reasons.",
    expected_counterarg_count: 3,
    expected_outcome: "favorable",
  },
  {
    id: "pleadings-tx-001",
    posture: "pleadings",
    jurisdiction: "tx",
    question: "Should we file a Rule 91a motion to dismiss?",
    facts: "Client sued in Harris County district court for fraud. Petition alleges client made representations about a real-estate development that turned out to be false, but pleads no specific statements, no speaker, no time/place. The petition appears to be a copy-paste from an unrelated fraud case template.",
    expected_counterarg_count: 2,
    expected_outcome: "favorable",
  },

  // ── DISCOVERY ───────────────────────────────────────────────────────────
  {
    id: "discovery-fed-001",
    posture: "discovery",
    jurisdiction: "federal",
    question: "How should we respond to opposing counsel's request to depose our CEO before document production is complete?",
    facts: "We represent the corporate defendant in an antitrust matter in N.D. Cal. The CEO is the apex officer with no unique personal knowledge of the alleged price-fixing meetings. Plaintiff has not yet deposed any subordinate executives, and document production from custodians below the CEO is still in progress.",
    expected_counterarg_count: 3,
    expected_outcome: "favorable",
  },
  {
    id: "discovery-ca-001",
    posture: "discovery",
    jurisdiction: "ca",
    question: "Should we move to compel further responses to our Form Interrogatories No. 17.1?",
    facts: "Plaintiff in a California Superior Court personal-injury action responded to Form Interrogatory 17.1 with single-sentence answers and refused to identify witnesses or documents supporting denials. Meet-and-confer letter sent 21 days ago, no substantive response received.",
    expected_counterarg_count: 2,
    expected_outcome: "favorable",
  },
  {
    id: "discovery-ny-001",
    posture: "discovery",
    jurisdiction: "ny",
    question: "Can we obtain a protective order against deposition of our outside auditor?",
    facts: "Plaintiff in a NY commercial division case noticed the deposition of our client's outside auditor regarding revenue-recognition methodology. The auditor was not a witness to any operational facts at issue and the methodology is documented in audit workpapers already produced. Plaintiff has not deposed any internal finance staff.",
    expected_counterarg_count: 3,
    expected_outcome: "mixed",
  },
  {
    id: "discovery-tx-001",
    posture: "discovery",
    jurisdiction: "tx",
    question: "Should we object to plaintiff's Level 3 discovery control plan modifications?",
    facts: "Texas state-court case currently under Level 2 discovery. Plaintiff filed motion to modify to Level 3, citing complexity and the need for expert depositions. Case involves a single-vehicle accident with limited factual disputes. Plaintiff has not yet served any expert designations.",
    expected_counterarg_count: 2,
    expected_outcome: "mixed",
  },

  // ── MSJ ────────────────────────────────────────────────────────────────
  {
    id: "msj-fed-001",
    posture: "msj",
    jurisdiction: "federal",
    question: "Can we move for summary judgment on the Title VII retaliation claim?",
    facts: "Plaintiff alleges termination one week after filing an EEOC charge of race discrimination. Discovery shows: (1) plaintiff's supervisor had begun a written PIP three months before the EEOC charge; (2) two prior performance warnings on file from prior year; (3) the termination decision-maker was a different VP who, per deposition, was not informed of the EEOC charge until after the termination decision was made.",
    expected_counterarg_count: 4,
    expected_outcome: "favorable",
  },
  {
    id: "msj-ca-001",
    posture: "msj",
    jurisdiction: "ca",
    question: "Should we move for summary adjudication on the FEHA failure-to-accommodate claim?",
    facts: "Employee with anxiety disorder requested reassignment from a customer-facing role to back-office work. HR engaged in two interactive-process meetings, offered three alternative positions (plaintiff rejected each), and ultimately offered remote work which plaintiff accepted but later quit citing isolation. Documentary record of all communications.",
    expected_counterarg_count: 4,
    expected_outcome: "mixed",
  },
  {
    id: "msj-ny-001",
    posture: "msj",
    jurisdiction: "ny",
    question: "Can we move for summary judgment on the breach-of-fiduciary-duty claim?",
    facts: "Plaintiff alleges our client (former director) breached fiduciary duty by approving a related-party transaction. Discovery shows: (1) full disclosure to the board; (2) recusal from the vote; (3) independent committee approval; (4) Delaware law applies via the company's incorporation, but suit filed in NY Supreme Court.",
    expected_counterarg_count: 4,
    expected_outcome: "favorable",
  },
  {
    id: "msj-tx-001",
    posture: "msj",
    jurisdiction: "tx",
    question: "Should we file a no-evidence motion for summary judgment on plaintiff's negligence claim?",
    facts: "Texas state-court case involving slip-and-fall at our client's grocery store. Discovery period closed. Plaintiff produced no expert on causation, no evidence of constructive notice of the spill, no surveillance video, and no employee deposition testimony establishing time of spill versus time of fall.",
    expected_counterarg_count: 3,
    expected_outcome: "favorable",
  },

  // ── APPEAL ──────────────────────────────────────────────────────────────
  {
    id: "appeal-fed-001",
    posture: "appeal",
    jurisdiction: "federal",
    question: "What is the strongest issue to raise on appeal of the denial of our motion to compel arbitration?",
    facts: "Client argued in S.D. Tex. that a clickwrap arbitration clause was enforceable against the plaintiff. District court denied the motion, ruling the clause was procedurally unconscionable because the 'I Agree' button was 14 clicks deep in the registration flow and the clause itself was 18 paragraphs long. We have a clean record on procedural unconscionability.",
    expected_counterarg_count: 3,
    expected_outcome: "mixed",
  },
  {
    id: "appeal-ca-001",
    posture: "appeal",
    jurisdiction: "ca",
    question: "Should we appeal the trial court's denial of our anti-SLAPP motion?",
    facts: "Client (a journalist) was sued for defamation over a published investigative piece. We filed an anti-SLAPP motion under CCP § 425.16. Trial court ruled (a) the speech arose from protected activity but (b) plaintiff established minimal merit. Appeal must be filed within 60 days; client wants to know if the appeal is worth the cost.",
    expected_counterarg_count: 3,
    expected_outcome: "mixed",
  },
  {
    id: "appeal-ny-001",
    posture: "appeal",
    jurisdiction: "ny",
    question: "What standard of review applies to our appeal of summary judgment in a contract dispute?",
    facts: "We lost summary judgment in NY Supreme Court on a breach-of-contract claim. Trial court interpreted an ambiguous force-majeure clause against our client. Record contains conflicting extrinsic evidence about industry custom that the trial court refused to consider. Appeal pending in the First Department.",
    expected_counterarg_count: 2,
    expected_outcome: "favorable",
  },
  {
    id: "appeal-tx-001",
    posture: "appeal",
    jurisdiction: "tx",
    question: "Can we challenge the trial court's exclusion of our expert testimony as harmful error?",
    facts: "Texas state court excluded our retained accident-reconstruction expert under TRE 702 / Robinson, finding methodology unreliable. Expert had used physics-based collision modeling consistent with peer-reviewed literature. Without the expert, jury found for plaintiff. We are appealing to the appropriate court of appeals.",
    expected_counterarg_count: 3,
    expected_outcome: "mixed",
  },
];
