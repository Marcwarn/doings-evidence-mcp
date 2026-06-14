import { ClaimCitationAudit, DocumentCitationAudit } from "../extractors/researchCitations.js";
import { critiqueClaimTool } from "./critiqueClaim.js";

export interface HighRiskClaimValidationArgs {
  audit: DocumentCitationAudit;
  context?: string;
  maxValidations?: number;
  yearFrom?: number;
  maxPapers?: number;
  riskThreshold?: "high" | "medium";
  fullTextMode?: "none" | "open_access" | "required";
  maxFullTextPapers?: number;
  redTeamMode?: boolean;
}

export interface ClaimResearchValidation {
  claim: string;
  claimType: ClaimCitationAudit["claim"]["type"];
  citationStatus: ClaimCitationAudit["citationStatus"];
  supportRisk: ClaimCitationAudit["supportRisk"];
  suggestedSearchQueries: string[];
  researchValidation: unknown;
}

function isEligibleForValidation(item: ClaimCitationAudit, riskThreshold: "high" | "medium") {
  if (item.citationStatus === "not_research_checkable") return false;
  if (item.claim.testability === "low") return false;

  if (riskThreshold === "high") {
    return item.supportRisk === "high";
  }

  return item.supportRisk === "high" || item.supportRisk === "medium";
}

export async function validateHighRiskClaims(args: HighRiskClaimValidationArgs) {
  const riskThreshold = args.riskThreshold ?? "high";
  const eligibleClaims = args.audit.auditedClaims.filter((item) => isEligibleForValidation(item, riskThreshold));
  const maxValidations = Math.min(Math.max(args.maxValidations ?? 5, 1), 10);
  const claimsToValidate = eligibleClaims.slice(0, maxValidations);

  const validations: ClaimResearchValidation[] = [];
  for (const item of claimsToValidate) {
    const researchValidation = await critiqueClaimTool({
      claim: item.claim.claim,
      context: args.context,
      strictness: "high",
      yearFrom: args.yearFrom ?? 2000,
      maxPapers: args.maxPapers ?? 8,
      fullTextMode: args.fullTextMode ?? "open_access",
      maxFullTextPapers: args.maxFullTextPapers ?? 3,
      redTeamMode: args.redTeamMode
    });

    validations.push({
      claim: item.claim.claim,
      claimType: item.claim.type,
      citationStatus: item.citationStatus,
      supportRisk: item.supportRisk,
      suggestedSearchQueries: item.suggestedSearchQueries,
      researchValidation
    });
  }

  return {
    mode: "risk_triggered_research_validation",
    riskThreshold,
    eligibleClaims: eligibleClaims.length,
    validatedClaims: validations.length,
    skippedEligibleClaims: Math.max(eligibleClaims.length - validations.length, 0),
    validations,
    interpretationWarning:
      args.fullTextMode === "none"
        ? "This validates high-risk claims against retrieved research metadata and abstracts only. It is stronger than citation-marker auditing, but not source-level verification."
        : "This validates high-risk claims against retrieved research and attempts open-access full-text escalation. Paywalled/missing full text is explicitly flagged; this is still not a full systematic review."
  };
}
