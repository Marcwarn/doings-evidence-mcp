import { classifySingleClaim, decomposeClaim } from "./claimClassifier.js";
import { rateEvidenceQuality } from "./evidenceQuality.js";
import { assessContextFit } from "./contextFit.js";
import { extractEvidencePassages } from "./passageExtractor.js";
import { redTeamClaim } from "./redTeam.js";

function inferPaperLevel(paper: Record<string, unknown>): string {
  const text = `${paper.title ?? ""} ${paper.abstract ?? ""} ${paper.fullText ?? ""}`.toLowerCase();
  if (/\b(team|teams|group|squad)\b/.test(text)) return "team";
  if (/\b(employee|individual|manager|leader|motivation)\b/.test(text)) return "individual";
  if (/\b(unit|department|division|function)\b/.test(text)) return "unit";
  if (/\b(organization|organisation|firm|company|enterprise|hierarchy|matrix)\b/.test(text)) return "organization";
  if (/\b(network|ecosystem|supply chain|interorganizational)\b/.test(text)) return "ecosystem";
  return "unknown";
}

function levelAlignment(claimLevel: string, papers: Array<Record<string, unknown>>) {
  const levels = papers.map(inferPaperLevel);
  const counts = levels.reduce<Record<string, number>>((acc, level) => {
    acc[level] = (acc[level] ?? 0) + 1;
    return acc;
  }, {});
  const aligned = claimLevel !== "mixed_or_unclear" ? levels.filter((l) => l === claimLevel).length : 0;
  const ratio = papers.length ? aligned / papers.length : 0;
  return {
    claimLevel,
    evidenceLevelCounts: counts,
    alignment: claimLevel === "mixed_or_unclear" ? "unclear" : ratio >= 0.5 ? "good" : ratio > 0 ? "partial" : "weak",
    warning: claimLevel === "mixed_or_unclear"
      ? "The claim mixes or obscures levels of analysis. Split it before making evidence claims."
      : ratio < 0.5
        ? "Most retrieved evidence appears to be at a different level of analysis than the claim. Transfer cautiously."
        : "Retrieved evidence appears broadly aligned with the claim's level of analysis."
  };
}

export function critiqueClaim(params: {
  claim: string;
  context?: string;
  papers: Array<Record<string, unknown>>;
  strictness?: "low" | "medium" | "high";
  redTeamMode?: boolean;
}) {
  const classification = classifySingleClaim(params.claim);
  const decomposedClaims = decomposeClaim(params.claim);
  const quality = rateEvidenceQuality({ claim: params.claim, context: params.context, papers: params.papers });
  const contextFit = assessContextFit({ claim: params.claim, context: params.context, papers: params.papers });
  const titles = params.papers.map((p) => String(p.title ?? "")).filter(Boolean);
  const passages = extractEvidencePassages({ papers: params.papers, maxPerCategory: 2 });
  const level = levelAlignment(classification.levelOfAnalysis, params.papers);

  const verdict = quality.overallQuality === "high" && contextFit.contextFit !== "low" && level.alignment !== "weak"
    ? "plausibly_supported_but_check_boundary_conditions"
    : quality.overallQuality === "moderate" || contextFit.contextFit === "medium" || level.alignment === "partial"
      ? "mixed_or_context_dependent"
      : "insufficient_direct_evidence";

  return {
    claim: params.claim,
    context: params.context ?? "",
    claimType: classification.type,
    levelOfAnalysis: classification.levelOfAnalysis,
    decomposedClaims,
    verdict,
    supportLevel: quality.overallQuality,
    contextFit,
    levelAlignment: level,
    studyTypeProfile: {
      counts: quality.studyTypeCounts,
      strongestStudyTypes: quality.strongestStudyTypes,
      weakestStudyTypes: quality.weakestStudyTypes
    },
    strongestSupport: titles.slice(0, 5),
    evidencePassages: {
      supporting: passages.filter((p) => p.category === "supporting"),
      contradicting: passages.filter((p) => p.category === "contradicting"),
      method: passages.filter((p) => p.category === "method"),
      limitations: passages.filter((p) => p.category === "limitations")
    },
    counterEvidence: [
      "Absence of strong matching full text should be treated as uncertainty, not as proof the claim is false.",
      "Claims that move from team-level or individual-level outcomes to organization-level performance require extra evidence."
    ],
    boundaryConditions: [
      "task interdependence",
      "role clarity",
      "decision rights",
      "governance and escalation paths",
      "organization size and maturity",
      "industry and regulatory context",
      "level-of-analysis match between claim and evidence",
      "context fit between studied organizations and target client context"
    ],
    dangerousAssumptions: [
      "Assuming findings from one organizational context generalize to another.",
      "Equating employee attitudes or team-level outcomes with firm-level performance.",
      "Treating correlation, theory or consulting experience as causal evidence.",
      "Treating open-access availability as a proxy for evidence quality."
    ],
    saferFraming: `A safer formulation is: '${params.claim}' may be true under specific boundary conditions, but should be stated with context, mechanism, level of analysis and evidence limits.`,
    redTeam: params.redTeamMode ? redTeamClaim({ claim: params.claim, context: params.context, levelOfAnalysis: classification.levelOfAnalysis, contextFit: contextFit.contextFit }) : undefined,
    evidenceQuality: quality,
    statusLabel: "exploratory_evidence_scan_not_systematic_review"
  };
}
