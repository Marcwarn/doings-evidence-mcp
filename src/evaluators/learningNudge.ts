import { ConsultingLanguageRiskItem } from "./consultingLanguageRisk.js";
import { SolutionFirstFinding } from "./solutionFirst.js";

export interface LearningNudge {
  thinkingPattern: string;
  whyItMatters: string;
  betterMentalModel: string;
}

export function buildLearningNudge(params: {
  consultingRisks: ConsultingLanguageRiskItem[];
  solutionFirst: SolutionFirstFinding;
  hasMissingLinks: boolean;
}): LearningNudge {
  if (params.solutionFirst.detected) {
    return {
      thinkingPattern: "solution-first framing",
      whyItMatters: "It can make us sell an organizational model before we have understood the actual friction in the client's system.",
      betterMentalModel: "Start with the friction: decision latency, dependency load, unclear accountability, prioritization, handovers, capability bottlenecks or incentives. Only then discuss design options."
    };
  }
  if (params.consultingRisks.some((r) => r.risk === "high")) {
    return {
      thinkingPattern: "vague causal consulting claim",
      whyItMatters: "It names a desirable outcome but hides the mechanism, level of analysis and boundary conditions.",
      betterMentalModel: "State what changes, for whom, at what level, under which conditions, and compared with what alternative."
    };
  }
  if (params.hasMissingLinks) {
    return {
      thinkingPattern: "under-specified causal chain",
      whyItMatters: "The reasoning may be directionally plausible but hard to defend because the links between symptom, cause, intervention and outcome are incomplete.",
      betterMentalModel: "Map the chain explicitly: symptom -> evidence -> likely cause -> mechanism -> design choice -> expected outcome -> trade-off."
    };
  }
  return {
    thinkingPattern: "reasonable but still needs boundary conditions",
    whyItMatters: "Organizational evidence is usually context-dependent, so even plausible claims should avoid universal language.",
    betterMentalModel: "Keep the claim conditional and name the context in which it is likely to hold."
  };
}
