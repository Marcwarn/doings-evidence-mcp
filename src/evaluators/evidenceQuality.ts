import { EvidenceQuality } from "../taxonomies/evidenceTypes.js";

export type StudyType =
  | "meta_analysis"
  | "systematic_review"
  | "field_experiment"
  | "experiment"
  | "longitudinal_study"
  | "cross_sectional_survey"
  | "qualitative_case_study"
  | "mixed_methods"
  | "theory_or_conceptual"
  | "practitioner_report"
  | "unknown";

export interface StudyTypeCount {
  type: StudyType;
  count: number;
}

export interface EvidenceRating {
  overallQuality: EvidenceQuality;
  causalStrength: "weak" | "limited" | "moderate" | "strong";
  externalValidity: "unclear" | "low" | "moderate" | "high";
  recencyRisk: "low" | "medium" | "high";
  publicationBiasRisk: "unknown" | "low" | "medium" | "high";
  fullTextCoverage: "none" | "low" | "moderate" | "high";
  fullTextAvailablePapers: number;
  studyTypeCounts: StudyTypeCount[];
  strongestStudyTypes: StudyType[];
  weakestStudyTypes: StudyType[];
  notes: string[];
}

export function inferStudyType(titleAbstractAndFullText: string): StudyType {
  const t = titleAbstractAndFullText.toLowerCase();
  if (t.includes("meta-analysis") || t.includes("meta analysis")) return "meta_analysis";
  if (t.includes("systematic review") || t.includes("scoping review")) return "systematic_review";
  if (t.includes("field experiment")) return "field_experiment";
  if (t.includes("experiment") || t.includes("randomized") || t.includes("randomised")) return "experiment";
  if (t.includes("longitudinal") || t.includes("panel data")) return "longitudinal_study";
  if (t.includes("survey") || t.includes("cross-sectional") || t.includes("cross sectional")) return "cross_sectional_survey";
  if (t.includes("mixed methods") || t.includes("mixed-method")) return "mixed_methods";
  if (t.includes("case study") || t.includes("interviews") || t.includes("qualitative")) return "qualitative_case_study";
  if (t.includes("practitioner") || t.includes("consulting") || t.includes("white paper") || t.includes("hbr")) return "practitioner_report";
  if (t.includes("theory") || t.includes("conceptual") || t.includes("framework")) return "theory_or_conceptual";
  return "unknown";
}

function inferFullTextCoverage(papers: Array<Record<string, unknown>>): EvidenceRating["fullTextCoverage"] {
  if (!papers.length) return "none";
  const available = papers.filter((p) => p.fullTextStatus === "available" && typeof p.fullText === "string").length;
  const ratio = available / papers.length;
  if (available === 0) return "none";
  if (ratio >= 0.6) return "high";
  if (ratio >= 0.3) return "moderate";
  return "low";
}

function countStudyTypes(studyTypes: StudyType[]): StudyTypeCount[] {
  const counts = new Map<StudyType, number>();
  for (const type of studyTypes) counts.set(type, (counts.get(type) ?? 0) + 1);
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

export function rateEvidenceQuality(params: {
  claim: string;
  context?: string;
  papers: Array<Record<string, unknown>>;
}): EvidenceRating {
  const papers = params.papers ?? [];
  const currentYear = new Date().getFullYear();
  const studyTypes = papers.map((p) => inferStudyType(`${p.title ?? ""} ${p.abstract ?? ""} ${p.fullText ?? ""}`));
  const years = papers.map((p) => Number(p.year)).filter((y) => Number.isFinite(y));
  const hasReview = studyTypes.some((t) => t === "meta_analysis" || t === "systematic_review");
  const hasStrongCausalDesign = studyTypes.some((t) => ["field_experiment", "experiment", "longitudinal_study"].includes(t));
  const hasMostlyWeakDesigns = studyTypes.length > 0 && studyTypes.every((t) => ["qualitative_case_study", "theory_or_conceptual", "practitioner_report", "unknown"].includes(t));
  const medianYear = years.length ? years.sort((a, b) => a - b)[Math.floor(years.length / 2)] : undefined;
  const fullTextCoverage = inferFullTextCoverage(papers);
  const fullTextAvailablePapers = papers.filter((p) => p.fullTextStatus === "available" && typeof p.fullText === "string").length;

  let overallQuality: EvidenceQuality = "low";
  if (hasReview && papers.length >= 5) overallQuality = "high";
  else if ((hasReview || hasStrongCausalDesign) && papers.length >= 3) overallQuality = "moderate";
  else if (papers.length < 3 || hasMostlyWeakDesigns) overallQuality = "very_low";

  // Be conservative when no full text was checked. Abstract-only validation can find relevance,
  // but should not be treated as source-level verification.
  if (fullTextCoverage === "none" && overallQuality === "high") overallQuality = "moderate";
  if (fullTextCoverage === "none" && overallQuality === "moderate") overallQuality = "low";

  const studyTypeCounts = countStudyTypes(studyTypes);
  const strongestStudyTypes = studyTypes.filter((t) => ["meta_analysis", "systematic_review", "field_experiment", "experiment", "longitudinal_study"].includes(t));
  const weakestStudyTypes = studyTypes.filter((t) => ["qualitative_case_study", "theory_or_conceptual", "practitioner_report", "unknown"].includes(t));

  return {
    overallQuality,
    causalStrength: hasReview && hasStrongCausalDesign ? "strong" : hasReview || hasStrongCausalDesign ? "moderate" : "limited",
    externalValidity: params.context ? "unclear" : "low",
    recencyRisk: medianYear && currentYear - medianYear <= 10 ? "low" : medianYear && currentYear - medianYear > 20 ? "high" : "medium",
    publicationBiasRisk: "unknown",
    fullTextCoverage,
    fullTextAvailablePapers,
    studyTypeCounts,
    strongestStudyTypes: Array.from(new Set(strongestStudyTypes)),
    weakestStudyTypes: Array.from(new Set(weakestStudyTypes)),
    notes: [
      "This is a heuristic first-pass rating, not a substitute for expert literature review.",
      "Do not treat citation counts as evidence quality.",
      fullTextCoverage === "none"
        ? "No full text was retrieved, so this is abstract/metadata-level validation only."
        : `Open-access full text was retrieved for ${fullTextAvailablePapers} paper(s); use this as stronger but still non-systematic source checking.`,
      studyTypeCounts.length ? `Detected study types: ${studyTypeCounts.map((s) => `${s.type}=${s.count}`).join(", ")}.` : "No study types could be inferred.",
      params.context ? "Context fit is separately scored; do not assume external validity from relevance alone." : "No target context was provided, so external validity is weak."
    ]
  };
}
