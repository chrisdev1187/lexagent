import { CLOpinion } from "@/lib/courtlistener";
import { CongressBill } from "@/components/deep-research/CongressResult";
import { EcfrResult } from "@/components/deep-research/EcfrResult";
import { EdgarFiling } from "@/components/deep-research/EdgarResult";
import { GovInfoDoc } from "@/components/deep-research/GovInfoResult";
import { OpenStatesBill } from "@/components/deep-research/OpenStatesResult";
import { PatentResult } from "@/components/deep-research/PatentResult";

export interface SavedPrecedent {
  id: string;
  source: "congress" | "ecfr" | "opinion" | "edgar" | "govinfo" | "openstates" | "patent";
  title: string;
  citation: string;
  url?: string;
  savedAt: number;
}
