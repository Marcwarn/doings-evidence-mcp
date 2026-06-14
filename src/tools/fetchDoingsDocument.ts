import { fetchDoingsSharePointDocumentByUrl } from "../connectors/sharePoint.js";
import { extractAndClassifyClaims } from "../evaluators/claimClassifier.js";
import { auditResearchCitations } from "../extractors/researchCitations.js";
import { validateHighRiskClaims } from "./validateHighRiskClaims.js";

export async function fetchDoingsDocumentTool(args: {
  url: string;
  classifyClaims?: boolean;
  auditCitations?: boolean;
  validateHighRiskClaims?: boolean;
  validationContext?: string;
  validationRiskThreshold?: "high" | "medium";
  maxClaims?: number;
  maxValidations?: number;
  validationYearFrom?: number;
  validationMaxPapers?: number;
  validationFullTextMode?: "none" | "open_access" | "required";
  validationMaxFullTextPapers?: number;
  validationRedTeamMode?: boolean;
}) {
  const document = await fetchDoingsSharePointDocumentByUrl(args.url);
  const claims = args.classifyClaims && document.text
    ? extractAndClassifyClaims(document.text).slice(0, args.maxClaims ?? 40)
    : [];
  const citationAudit = args.auditCitations && document.text
    ? auditResearchCitations({ text: document.text, maxClaims: args.maxClaims ?? 40 })
    : undefined;
  const researchValidation = args.validateHighRiskClaims && citationAudit
    ? await validateHighRiskClaims({
        audit: citationAudit,
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
    document,
    extractedClaims: claims,
    citationAudit,
    researchValidation,
    interpretationWarning:
      args.validateHighRiskClaims
        ? "Fetched SharePoint content is internal Doings material. High-risk claims were research-validated against retrieved academic metadata/abstracts, but this is still not full systematic-review evidence; unavailable/paywalled full text is flagged."
        : "Fetched SharePoint content is internal Doings material. Treat extracted claims as claims to be checked, not as research evidence. Set validateHighRiskClaims=true to validate high-risk claims."
  };
}
