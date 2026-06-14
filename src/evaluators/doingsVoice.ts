import { generateSaferPhrasing } from "./saferPhrasing.js";
import { classifySingleClaim } from "./claimClassifier.js";
import { detectConsultingLanguageRisk } from "./consultingLanguageRisk.js";

export interface DoingsVoiceRewrite {
  original: string;
  doingsVoiceVersion: string;
  voicePrinciples: string[];
  removedOrSoftened: string[];
}

export function rewriteInDoingsVoice(text: string, context?: string): DoingsVoiceRewrite {
  const classification = classifySingleClaim(text);
  const risks = detectConsultingLanguageRisk(text);
  const safer = generateSaferPhrasing({
    claim: text,
    claimType: classification.type,
    levelOfAnalysis: classification.levelOfAnalysis,
    context,
    riskItems: risks
  });
  const concrete = makePlainAndConcrete(safer.saferVersion);

  return {
    original: text,
    doingsVoiceVersion: concrete,
    voicePrinciples: [
      "Plain-spoken rather than academic-heavy.",
      "Evidence-honest rather than hype-driven.",
      "Concrete mechanisms over abstract slogans.",
      "Comfortable with uncertainty and boundary conditions.",
      "Useful for executives without pretending the evidence is cleaner than it is."
    ],
    removedOrSoftened: risks.map((r) => r.phrase)
  };
}

function makePlainAndConcrete(text: string) {
  return text
    .replace(/may support/gi, "can help")
    .replace(/This should be framed as context-dependent, especially at the relevant level in the relevant context\./i, "But say what needs to be true for it to work.")
    .replace(/This should be framed as context-dependent/gi, "This is context-dependent")
    .replace(/broad causal effect/gi, "broad effect")
    .replace(/empirical support/gi, "evidence")
    .replace(/\s+/g, " ")
    .trim();
}
