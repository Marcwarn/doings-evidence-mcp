import { fetchDoingsSharePointDocumentByUrl } from "../connectors/sharePoint.js";
import { auditResearchCitations } from "../extractors/researchCitations.js";
import { ClassifiedClaim } from "../evaluators/claimClassifier.js";
import { validateHighRiskClaims } from "./validateHighRiskClaims.js";

export async function auditDoingsDocumentClaimsTool(args: {
  url?: string;
  text?: string;
  maxClaims?: number;
  claimTypes?: ClassifiedClaim["type"][];
  validateHighRiskClaims?: boolean;
  validationContext?: string;
  validationRiskThreshold?: "high" | "medium";
  maxValidations?: number;
  validationYearFrom?: number;
  validationMaxPapers?: number;
  validationFullTextMode?: "none" | "open_access" | "required";
  validationMaxFullTextPapers?: number;
  validationRedTeamMode?: boolean;
}) {
  if (!args.url && !args.text) {
    throw new Error("Provide either a SharePoint/OneDrive url or raw text.");
  }

  const document = args.url ? await fetchDoingsSharePointDocumentByUrl(args.url) : undefined;
  const text = args.text ?? document?.text;
  if (!text) {
    return {
      document,
      auditStatus: "no_text",
      warning: "No extractable text was available. For scanned PDFs, use OCR/Azure Document Intelligence before claim auditing."
    };
  }

  const audit = auditResearchCitations({ text, maxClaims: args.maxClaims, claimTypes: args.claimTypes });
  const researchValidation = args.validateHighRiskClaims
    ? await validateHighRiskClaims({
        audit,
        context: args.validationContext,
        riskThreshold: args.validationRiskThreshold,
        maxValidations: args.maxValidations,
        yearFrom: args.validationYearFrom,
        maxPapers: args.validationMaxPapers,
        fullTextMode: args.validationFullTextMode,
        maxFullTextPapers: args.validationMaxFullTextPapers,
        redTeamMode: args.validationRedTeamMode
      })
    : undefined;

  return {
    document: document
      ? {
          title: document.title,
          url: document.url,
          mimeType: document.mimeType,
          fetchStatus: document.fetchStatus,
          extractor: document.extractor,
          warning: document.warning
        }
      : undefined,
    auditStatus: "ok",
    audit,
    researchValidation,
    interpretationWarning:
      args.validateHighRiskClaims
        ? "This result includes risk-triggered research validation for selected high-risk claims. It still does not prove every cited source supports every claim; it checks whether the claim itself is plausible against retrieved research metadata/abstracts and open-access full text when available."
        : "This tool flags whether claims have nearby source markers. It does not prove that a cited source actually supports the claim; set validateHighRiskClaims=true to run research validation on high-risk claims."
  };
}
