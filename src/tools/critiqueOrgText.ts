import { classifySingleClaim, extractAndClassifyClaims } from "../evaluators/claimClassifier.js";
import { detectConsultingLanguageRisk, summarizeConsultingLanguageRisk } from "../evaluators/consultingLanguageRisk.js";
import { buildNarrativeResponse } from "../evaluators/narrativeResponse.js";
import { generateSaferPhrasing } from "../evaluators/saferPhrasing.js";
import { CritiqueMode, detectUserIntent } from "../evaluators/userIntent.js";
import { critiqueClaimTool } from "./critiqueClaim.js";

function pickPrimaryClaim(input: string) {
  const claims = extractAndClassifyClaims(input);
  const researchCheckable = claims.find((c) => c.testability !== "low") ?? claims[0];
  if (researchCheckable) return { primaryClaim: researchCheckable.claim, extractedClaims: claims };
  return { primaryClaim: input.trim(), extractedClaims: [classifySingleClaim(input.trim())] };
}

export async function critiqueOrgTextTool(args: {
  input: string;
  context?: string;
  mode?: CritiqueMode;
  strictness?: "low" | "medium" | "high";
  yearFrom?: number;
  maxPapers?: number;
  fullTextMode?: "none" | "open_access" | "required";
  maxFullTextPapers?: number;
  maxFullTextCharsPerPaper?: number;
  includeRawCritique?: boolean;
}) {
  const intent = detectUserIntent({ input: args.input, requestedMode: args.mode ?? "auto" });
  const { primaryClaim, extractedClaims } = pickPrimaryClaim(args.input);
  const risks = detectConsultingLanguageRisk(args.input);
  const primaryClassification = classifySingleClaim(primaryClaim);
  const critique = await critiqueClaimTool({
    claim: primaryClaim,
    context: args.context,
    strictness: args.strictness ?? "high",
    yearFrom: args.yearFrom ?? 2000,
    maxPapers: args.maxPapers ?? (intent.selectedMode === "quick_check" ? 6 : 10),
    fullTextMode: args.fullTextMode ?? (intent.selectedMode === "quick_check" ? "none" : "open_access"),
    maxFullTextPapers: args.maxFullTextPapers ?? (intent.selectedMode === "evidence_brief" ? 3 : 2),
    maxFullTextCharsPerPaper: args.maxFullTextCharsPerPaper ?? 60000,
    redTeamMode: intent.selectedMode === "red_team"
  });
  const saferPhrasing = generateSaferPhrasing({
    claim: primaryClaim,
    claimType: primaryClassification.type,
    levelOfAnalysis: primaryClassification.levelOfAnalysis,
    context: args.context,
    riskItems: risks
  });
  const narrative = buildNarrativeResponse({
    mode: intent.selectedMode,
    input: args.input,
    critique: critique as Record<string, unknown>,
    consultingRisks: risks,
    saferPhrasing
  });

  return {
    mode: intent.selectedMode,
    intent,
    primaryClaim,
    extractedClaims: extractedClaims.slice(0, 12),
    consultingLanguageRisk: summarizeConsultingLanguageRisk(risks),
    narrative,
    rawCritique: args.includeRawCritique ? critique : undefined,
    productWarning: "This is a user-facing critique layer over an exploratory evidence scan. It helps make organizational claims more careful; it is not a systematic literature review."
  };
}
