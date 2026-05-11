import { useState } from "react";
import {
  CONGRESS_BASE, ECFR_BASE, EDGAR_BASE, GOVINFO_BASE, OPENSTATES_BASE, USPTO_BASE
} from "@/lib/api";
import { searchOpinions, CLOpinion } from "@/lib/courtlistener";
import { CongressBill } from "@/components/deep-research/CongressResult";
import { EcfrResult } from "@/components/deep-research/EcfrResult";
import { EdgarFiling } from "@/components/deep-research/EdgarResult";
import { GovInfoDoc } from "@/components/deep-research/GovInfoResult";
import { OpenStatesBill } from "@/components/deep-research/OpenStatesResult";
import { PatentResult } from "@/components/deep-research/PatentResult";

export function useDeepResearchSearch(authHeader: Record<string, string>) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<{
    congress: CongressBill[];
    ecfr: EcfrResult[];
    opinions: CLOpinion[];
    edgar: EdgarFiling[];
    govinfo: GovInfoDoc[];
    openstates: OpenStatesBill[];
    patents: PatentResult[];
  }>({
    congress: [],
    ecfr: [],
    opinions: [],
    edgar: [],
    govinfo: [],
    openstates: [],
    patents: [],
  });

  const search = async (tab: string, query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);

    try {
      if (tab === "congress") {
        const params = new URLSearchParams({ q: JSON.stringify({ keywords: query.split(/\s+/) }), limit: "20" });
        const res = await fetch(`${CONGRESS_BASE}/bill?${params}`, { headers: authHeader });
        if (!res.ok) throw new Error(`Congress API ${res.status}`);
        const data = await res.json();
        setResults(prev => ({ ...prev, congress: data.bills ?? [] }));
      } else if (tab === "ecfr") {
        const params = new URLSearchParams({ query, per_page: "20" });
        const res = await fetch(`${ECFR_BASE}/search?${params}`, { headers: authHeader });
        if (!res.ok) throw new Error(`eCFR API ${res.status}`);
        const data = await res.json();
        setResults(prev => ({ ...prev, ecfr: data.results ?? [] }));
      } else if (tab === "edgar") {
        const params = new URLSearchParams({ q: query, dateRange: "custom", startdt: "2015-01-01", hits_from: "0" });
        const res = await fetch(`${EDGAR_BASE}/search?${params}`, { headers: authHeader });
        if (!res.ok) throw new Error(`SEC EDGAR ${res.status}`);
        const data = await res.json();
        const hits = data.hits?.hits ?? [];
        setResults(prev => ({ ...prev, edgar: hits.map((h: any) => ({
          id: h._id,
          entityName: h._source?.entity_name ?? "Unknown",
          formType: h._source?.form_type ?? "",
          fileDate: h._source?.file_date ?? "",
          periodOfReport: h._source?.period_of_report,
          description: h._source?.description,
        })) }));
      } else if (tab === "govinfo") {
        const params = new URLSearchParams({ query, pageSize: "20" });
        const res = await fetch(`${GOVINFO_BASE}/search?${params}`, { headers: authHeader });
        if (!res.ok) throw new Error(`GovInfo API ${res.status}`);
        const data = await res.json();
        setResults(prev => ({ ...prev, govinfo: data.packages ?? [] }));
      } else if (tab === "openstates") {
        const params = new URLSearchParams({ q: query, per_page: "20" });
        const res = await fetch(`${OPENSTATES_BASE}/bills?${params}`, { headers: authHeader });
        if (!res.ok) throw new Error(`OpenStates API ${res.status}`);
        const data = await res.json();
        setResults(prev => ({ ...prev, openstates: data.results ?? [] }));
      } else if (tab === "patents") {
        const body = JSON.stringify({
          q: { _text_any: { patent_title: query } },
          f: ["patent_id", "patent_title", "patent_date", "assignee_organization"],
          o: { per_page: 15 },
        });
        const res = await fetch(`${USPTO_BASE}/patents`, {
          method: "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body,
        });
        if (!res.ok) throw new Error(`USPTO API ${res.status}`);
        const data = await res.json();
        setResults(prev => ({ ...prev, patents: data.patents ?? [] }));
      } else {
        const ops = await searchOpinions(query, 20);
        setResults(prev => ({ ...prev, opinions: ops }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  return { searching, error, results, search };
}
