export interface ContextFitResult {
  contextFit: "high" | "medium" | "low" | "unknown";
  rationale: string[];
  matchedSignals: string[];
  missingSignals: string[];
}

const contextSignalGroups = {
  geography: ["nordic", "sweden", "swedish", "scandinavia", "europe", "nordisk", "sverige"],
  sector: ["professional services", "consulting", "knowledge work", "software", "healthcare", "manufacturing", "public sector", "konsult", "kunskapsarbete"],
  size: ["sme", "small", "medium", "50", "150", "scaleup", "large", "enterprise"],
  workMode: ["project-based", "client delivery", "matrix", "agile", "team", "remote", "hybrid", "projekt", "kund"],
  dependency: ["interdependence", "coordination", "senior expert", "expert dependency", "specialist", "coordination cost"]
};

function groupHits(text: string) {
  const lower = text.toLowerCase();
  return Object.entries(contextSignalGroups).filter(([, terms]) => terms.some((term) => lower.includes(term))).map(([group]) => group);
}

export function assessContextFit(params: {
  claim: string;
  context?: string;
  papers: Array<Record<string, unknown>>;
}): ContextFitResult {
  const context = params.context ?? "";
  if (!context.trim()) {
    return {
      contextFit: "unknown",
      rationale: ["No target context was provided."],
      matchedSignals: [],
      missingSignals: Object.keys(contextSignalGroups)
    };
  }

  const targetGroups = groupHits(context);
  const corpus = params.papers.map((p) => `${p.title ?? ""} ${p.abstract ?? ""} ${p.fullText ?? ""}`).join(" ");
  const evidenceGroups = groupHits(corpus);
  const matched = targetGroups.filter((g) => evidenceGroups.includes(g));
  const missing = targetGroups.filter((g) => !evidenceGroups.includes(g));
  const ratio = targetGroups.length ? matched.length / targetGroups.length : 0;

  const contextFit: ContextFitResult["contextFit"] = targetGroups.length === 0
    ? "unknown"
    : ratio >= 0.75
      ? "high"
      : ratio >= 0.4
        ? "medium"
        : "low";

  return {
    contextFit,
    rationale: [
      `Target context signals detected: ${targetGroups.length ? targetGroups.join(", ") : "none"}.`,
      `Evidence corpus matched: ${matched.length ? matched.join(", ") : "none"}.`,
      missing.length ? `Weak transferability signals: ${missing.join(", ")}.` : "No obvious target-context signal gaps were found by the heuristic."
    ],
    matchedSignals: matched,
    missingSignals: missing
  };
}
