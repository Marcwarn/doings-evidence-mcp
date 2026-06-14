export type EvidenceQuality = "very_low" | "low" | "moderate" | "high";

export type EvidenceType =
  | "meta_analysis"
  | "systematic_review"
  | "longitudinal_study"
  | "field_experiment"
  | "quasi_experiment"
  | "cross_sectional_study"
  | "case_study"
  | "theory"
  | "consulting_report"
  | "practical_heuristic"
  | "unknown";

export const evidenceTypeWeights: Record<EvidenceType, number> = {
  meta_analysis: 5,
  systematic_review: 5,
  longitudinal_study: 4,
  field_experiment: 4,
  quasi_experiment: 4,
  cross_sectional_study: 3,
  case_study: 2,
  theory: 2,
  consulting_report: 1,
  practical_heuristic: 1,
  unknown: 0
};
