export interface ConsultingLanguageRiskItem {
  phrase: string;
  risk: "low" | "medium" | "high";
  reason: string;
  saferPattern: string;
}

const riskyPatterns: Array<{ regex: RegExp; phrase: string; risk: ConsultingLanguageRiskItem["risk"]; reason: string; saferPattern: string }> = [
  { regex: /\b(unlocks?|frigör|låser upp)\b[^.?!]{0,80}\b(potential|agility|value|innovation|performance|potential|värde|innovation|prestanda)\b/i, phrase: "unlock(s) potential/agility/value", risk: "high", reason: "Vague causal mechanism; often implies a broad performance effect without specifying conditions.", saferPattern: "may improve [specific outcome] when [mechanism and boundary condition] are explicit" },
  { regex: /\b(drives?|driver|skapar|enables?|möjliggör)\b[^.?!]{0,80}\b(transformation|agility|alignment|growth|execution|förändring|agilitet|tillväxt)\b/i, phrase: "drives/enables transformation/agility/alignment", risk: "high", reason: "Strong causal language without evidence of mechanism, level of analysis or context fit.", saferPattern: "can support [specific behavior/process] if [decision rights, interfaces or incentives] are in place" },
  { regex: /\b(reduces?|minskar)\b[^.?!]{0,80}\b(complexity|overhead|coordination cost|management|komplexitet|samordningskostnad|styrning)\b/i, phrase: "reduces complexity/overhead/management", risk: "high", reason: "Often confuses visible hierarchy with total coordination or management work; work may shift rather than disappear.", saferPattern: "may reduce selected approval steps, while coordination work must be redesigned explicitly" },
  { regex: /\b(empowers?|stärker|ger mandat|future-proof|framtidssäkrar)\b/i, phrase: "empowers/future-proofs", risk: "medium", reason: "Common consulting phrase that needs a concrete mechanism and observable outcome.", saferPattern: "gives teams authority over [specific decisions], with accountability for [specific outcomes]" },
  { regex: /\b(always|never|alltid|aldrig|guarantees?|säkerställer)\b/i, phrase: "absolute language", risk: "high", reason: "Organizational evidence is rarely unconditional; absolute language is usually overclaiming.", saferPattern: "is more likely when / may / can under these conditions" },
  { regex: /\b(best practice|bästa praxis|proven model|bevisad modell)\b/i, phrase: "best practice / proven model", risk: "medium", reason: "Can hide context dependence and weak external validity.", saferPattern: "a practice with evidence in [specific contexts], requiring adaptation to [target context]" }
];

export function detectConsultingLanguageRisk(text: string): ConsultingLanguageRiskItem[] {
  const found: ConsultingLanguageRiskItem[] = [];
  for (const pattern of riskyPatterns) {
    if (pattern.regex.test(text)) {
      found.push({ phrase: pattern.phrase, risk: pattern.risk, reason: pattern.reason, saferPattern: pattern.saferPattern });
    }
  }
  return found;
}

export function summarizeConsultingLanguageRisk(items: ConsultingLanguageRiskItem[]) {
  const high = items.filter((i) => i.risk === "high").length;
  const medium = items.filter((i) => i.risk === "medium").length;
  return {
    overallRisk: high > 0 ? "high" : medium > 0 ? "medium" : "low",
    highRiskPhrases: high,
    mediumRiskPhrases: medium,
    items
  };
}
