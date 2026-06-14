export interface SolutionFirstFinding {
  detected: boolean;
  risk: "low" | "medium" | "high";
  solutionTerms: string[];
  explanation: string;
  betterNextQuestion: string;
}

const solutionTerms = [
  "autonomous teams", "autonomy", "self-managing", "squads", "tribes", "flat organization", "flatter organization", "matrix", "operating model", "governance", "OKRs", "decision rights", "middle management",
  "autonoma team", "autonomi", "självstyrande", "plattare organisation", "matris", "verksamhetsmodell", "styrmodell", "beslutsrätter", "mellanchefer"
];

const diagnosisTerms = ["because", "data", "observed", "measured", "interviews", "root cause", "diagnosis", "evidence", "beror", "data", "observerat", "mätt", "intervjuer", "rotorsak", "diagnos", "evidens"];

export function detectSolutionFirstThinking(text: string): SolutionFirstFinding {
  const lower = text.toLowerCase();
  const hits = solutionTerms.filter((term) => lower.includes(term.toLowerCase()));
  const hasDiagnosis = diagnosisTerms.some((term) => lower.includes(term));
  const hasProblem = /\b(problem|challenge|issue|slow|friction|silo|unclear|problem|utmaning|långsam|friktion|otydlig|silo)\b/i.test(text);
  const detected = hits.length > 0 && (!hasDiagnosis || !hasProblem);
  const risk = detected ? (hits.length > 1 ? "high" : "medium") : "low";

  return {
    detected,
    risk,
    solutionTerms: hits,
    explanation: detected
      ? "The wording names an organizational solution before the underlying friction, evidence and causal mechanism are sufficiently established."
      : "No strong solution-first pattern detected, though the diagnosis and mechanism should still be made explicit.",
    betterNextQuestion: "What type of friction are we actually trying to reduce: decision latency, unclear accountability, handovers, dependency management, prioritization, staffing or capability bottlenecks?"
  };
}
