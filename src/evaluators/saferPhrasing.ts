import { ClassifiedClaim } from "./claimClassifier.js";
import { ConsultingLanguageRiskItem } from "./consultingLanguageRisk.js";

export function generateSaferPhrasing(params: {
  claim: string;
  claimType?: ClassifiedClaim["type"];
  levelOfAnalysis?: ClassifiedClaim["levelOfAnalysis"];
  context?: string;
  riskItems?: ConsultingLanguageRiskItem[];
}) {
  const claim = params.claim.trim().replace(/["“”]/g, "");
  const level = params.levelOfAnalysis && params.levelOfAnalysis !== "mixed_or_unclear" ? params.levelOfAnalysis : "relevant";
  const contextClause = params.context ? ` in contexts like ${params.context}` : " in the relevant context";

  const base = params.claimType === "causal"
    ? `${softenCausalLanguage(claim)} This should be framed as context-dependent, especially at the ${level} level${contextClause}.`
    : params.claimType === "diagnostic"
      ? `${claim} can be treated as a diagnostic hypothesis, not as a settled conclusion. Test whether alternative explanations fit the evidence.`
      : `${claim} should be presented as a perspective or design hypothesis unless stronger empirical support is provided.`;

  const mechanism = "A stronger version names the mechanism, the level of analysis, and the boundary conditions: what changes, for whom, under which conditions, and compared with what alternative.";
  const riskNote = params.riskItems && params.riskItems.length
    ? `Avoid vague phrases such as ${params.riskItems.slice(0, 3).map((i) => `'${i.phrase}'`).join(", ")}; replace them with specific mechanisms and observable outcomes.`
    : "Avoid implying a broad causal effect unless the supporting evidence is direct and context-matched.";

  return {
    saferVersion: base,
    strongerPattern: "[Intervention/design choice] may improve [specific outcome] at [level of analysis] when [boundary conditions] are present, but may fail when [main risk] applies.",
    riskNote,
    mechanismPrompt: mechanism
  };
}

function softenCausalLanguage(text: string) {
  let out = text;
  out = out.replace(/\b(makes?|make|causes?|drives?|enables?|guarantees?)\b/gi, "may support");
  out = out.replace(/\b(reduces?|increases?|improves?)\b/gi, (m) => `may ${m.toLowerCase().replace(/s$/, "")}`);
  out = out.replace(/\b(skapa[rt]?|möjliggör|driver|säkerställer)\b/gi, "kan stödja");
  out = out.replace(/\b(minskar|ökar|förbättrar)\b/gi, (m) => `kan ${m.toLowerCase()}`);
  if (!/\bmay\b|\bkan\b/i.test(out)) out = `It may be reasonable to say that ${out}`;
  return out;
}
