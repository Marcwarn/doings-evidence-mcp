export interface EvidenceToLanguageOutput {
  evidenceFinding: string;
  doNotSay: string[];
  canSay: string;
  executiveFraming: string;
  rfpVersion: string;
}

export function evidenceToLanguage(params: {
  claim: string;
  supportLevel?: string;
  verdict?: string;
  saferVersion?: string;
  boundaryConditions?: string[];
}) : EvidenceToLanguageOutput {
  const support = params.supportLevel ?? "mixed_or_unknown";
  const verdict = params.verdict ?? "context_dependent";
  const boundary = (params.boundaryConditions ?? []).slice(0, 3).join(", ");
  const canSay = params.saferVersion ?? `${params.claim} may be reasonable only when the mechanism and boundary conditions are made explicit.`;
  return {
    evidenceFinding: `The evidence status appears ${support}; the safest reading is ${verdict}.`,
    doNotSay: [
      params.claim,
      "This is a proven best practice.",
      "This will make the organization faster by itself."
    ],
    canSay,
    executiveFraming: boundary
      ? `The question is not whether the concept is attractive, but whether ${boundary} are present enough for it to work.`
      : "The question is not the label of the model, but the management work, decision rights and coordination mechanisms it changes.",
    rfpVersion: `${canSay} We would therefore treat this as a design hypothesis to test against the client's decision flows, dependencies and accountability model, rather than as a generic prescription.`
  };
}
