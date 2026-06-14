import { searchOpenAlexWorks } from "../connectors/openAlex.js";
import { searchSemanticScholar } from "../connectors/semanticScholar.js";
import { enrichPapersWithOpenAccessFullText } from "../connectors/openAccessFullText.js";

export type FullTextMode = "none" | "open_access" | "required";

export async function searchResearchEvidence(args: {
  query: string;
  context?: string;
  yearFrom?: number;
  maxResults?: number;
  includeAdjacentFields?: boolean;
  fullTextMode?: FullTextMode;
  maxFullTextPapers?: number;
  maxFullTextCharsPerPaper?: number;
}) {
  const query = args.context ? `${args.query} ${args.context}` : args.query;
  const maxEach = Math.max(1, Math.ceil((args.maxResults ?? 10) / 2));

  const results = await Promise.allSettled([
    searchOpenAlexWorks({ query, yearFrom: args.yearFrom, maxResults: maxEach }),
    searchSemanticScholar({ query, yearFrom: args.yearFrom, maxResults: maxEach })
  ]);

  let papers = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const errors = results.flatMap((result) => result.status === "rejected" ? [String(result.reason)] : []);
  let fullTextSummary: unknown = undefined;

  if ((args.fullTextMode ?? "none") !== "none") {
    const enriched = await enrichPapersWithOpenAccessFullText({
      papers,
      maxPapers: args.maxFullTextPapers ?? 3,
      maxCharsPerPaper: args.maxFullTextCharsPerPaper ?? 60_000
    });
    papers = enriched.papers;
    fullTextSummary = enriched.fullTextSummary;

    if (args.fullTextMode === "required" && enriched.fullTextSummary.available === 0) {
      errors.push("fullTextMode=required but no usable open-access full text was retrieved.");
    }
  }

  return {
    query,
    papers,
    fullTextMode: args.fullTextMode ?? "none",
    fullTextSummary,
    evidenceClusters: clusterPapers(papers),
    knownLimitations: [
      "Automated search can miss relevant organization studies vocabulary and older canonical work.",
      (args.fullTextMode ?? "none") === "none"
        ? "This result uses metadata/abstracts only. Enable fullTextMode=open_access for open-access full-text escalation."
        : "Open-access full text is attempted only when metadata exposes usable URLs; paywalled or blocked sources remain unavailable.",
      "Citation counts reflect influence, not necessarily validity or applicability."
    ],
    missingContexts: [
      "Nordic SMEs",
      "professional services firms",
      "project-based client delivery",
      "senior-expert dependency"
    ],
    errors
  };
}

function clusterPapers(papers: Array<Record<string, unknown>>) {
  const clusters = new Map<string, number>();
  for (const paper of papers) {
    const text = `${paper.title ?? ""} ${paper.abstract ?? ""} ${paper.fullText ? String(paper.fullText).slice(0, 5000) : ""}`.toLowerCase();
    const key = text.includes("team") ? "team-level evidence"
      : text.includes("leadership") || text.includes("management") ? "leadership / management evidence"
      : text.includes("performance") ? "performance evidence"
      : "adjacent or theoretical evidence";
    clusters.set(key, (clusters.get(key) ?? 0) + 1);
  }
  return Array.from(clusters.entries()).map(([name, count]) => ({ name, count }));
}
