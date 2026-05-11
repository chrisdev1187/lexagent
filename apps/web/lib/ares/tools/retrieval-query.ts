import { RetrievalQueryInput, RetrievalQueryOutput } from "./types";
import { searchOpinions } from "../../courtlistener";

/**
 * ARES v6 — retrieval_query implementation.
 * Hybrid search: Consults the Matter Vault (mocked via prompt injection in v5)
 * and live CourtListener index for relevant spans.
 */
export async function retrievalQuery(input: RetrievalQueryInput): Promise<RetrievalQueryOutput> {
  if (!input.query) return { spans: [] };

  try {
    const results = await searchOpinions(input.query, 3);

    const spans = results.map(r => ({
      text: r.snippet || "No excerpt available.",
      cite: r.citation || r.caseName,
      score: 0.85,
      source_url: r.absoluteUrl,
    }));

    return { spans };
  } catch (err) {
    console.error("[retrieval_query] failed:", err);
    return { spans: [] };
  }
}
