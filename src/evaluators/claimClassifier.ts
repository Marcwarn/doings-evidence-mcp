export interface ClassifiedClaim {
  claim: string;
  type: "causal" | "normative" | "diagnostic" | "descriptive" | "prescriptive";
  testability: "low" | "medium" | "high";
  levelOfAnalysis: "individual" | "team" | "unit" | "organization" | "ecosystem" | "mixed_or_unclear";
  suggestedSearchQueries: string[];
}

export interface DecomposedClaim extends ClassifiedClaim {
  originalClaim: string;
  decompositionReason: string;
}

const causalMarkers = ["increase", "decrease", "improve", "reduce", "lead to", "cause", "make", "drive", "enable", "ökar", "minskar", "leder till", "förbättrar", "skapar", "möjliggör"];
const normativeMarkers = ["should", "must", "best", "bör", "måste", "bäst", "ska"];
const diagnosticMarkers = ["symptom", "indicates", "because", "tecken", "beror på", "visar att"];

function inferLevelOfAnalysis(text: string): ClassifiedClaim["levelOfAnalysis"] {
  const lower = text.toLowerCase();
  const hits: ClassifiedClaim["levelOfAnalysis"][] = [];
  if (/\b(employee|individual|person|motivation|engagement|manager|leader|medarbetare|individ|chef)\b/.test(lower)) hits.push("individual");
  if (/\b(team|squad|autonomous team|self-managing|grupp|teamet|tvärfunktionell)\b/.test(lower)) hits.push("team");
  if (/\b(unit|department|function|business unit|division|avdelning|funktion)\b/.test(lower)) hits.push("unit");
  if (/\b(organization|organisation|firm|company|enterprise|hierarchy|matrix|operating model|middle management|bolag|företag)\b/.test(lower)) hits.push("organization");
  if (/\b(ecosystem|network|partners|platform|supply chain|value chain|ekosystem|partner)\b/.test(lower)) hits.push("ecosystem");
  const unique = Array.from(new Set(hits));
  return unique.length === 1 ? unique[0] : unique.length > 1 ? "mixed_or_unclear" : "mixed_or_unclear";
}

export function classifySingleClaim(claim: string): ClassifiedClaim {
  const lower = claim.toLowerCase();
  let type: ClassifiedClaim["type"] = "descriptive";
  if (causalMarkers.some((m) => lower.includes(m))) type = "causal";
  else if (normativeMarkers.some((m) => lower.includes(m))) type = "normative";
  else if (diagnosticMarkers.some((m) => lower.includes(m))) type = "diagnostic";
  else if (lower.includes("recommend") || lower.includes("rekommender")) type = "prescriptive";

  const levelOfAnalysis = inferLevelOfAnalysis(claim);
  const testability = type === "causal" || type === "diagnostic" ? "high" : type === "descriptive" ? "medium" : "low";
  return {
    claim,
    type,
    testability,
    levelOfAnalysis,
    suggestedSearchQueries: [
      claim,
      `${claim} organizational design empirical evidence`,
      `${claim} organization studies systematic review`,
      `${claim} boundary conditions level of analysis`
    ]
  };
}

function normalizeSentence(s: string) {
  return s.replace(/\s+/g, " ").replace(/^[-–—:;,.\s]+|[-–—:;,.\s]+$/g, "").trim();
}

export function decomposeClaim(claim: string): DecomposedClaim[] {
  const cleaned = normalizeSentence(claim);
  const lower = cleaned.toLowerCase();
  const hasCompoundOutcome = /\b(and|och|as well as|samt)\b/.test(lower) && causalMarkers.some((m) => lower.includes(m));
  const parts = hasCompoundOutcome
    ? cleaned.split(/\s+(?:and|och|as well as|samt)\s+/i).map(normalizeSentence).filter((p) => p.length > 12)
    : [];

  if (parts.length <= 1) {
    return [{ ...classifySingleClaim(cleaned), originalClaim: claim, decompositionReason: "single_claim_or_decomposition_unclear" }];
  }

  // Preserve the subject in later fragments when a sentence has one subject and multiple outcomes.
  const firstWords = parts[0].split(/\s+/).slice(0, 5).join(" ");
  return parts.map((part, idx) => {
    const candidate = idx === 0 || /\b(team|organization|organisation|company|management|manager|employee|autonomous|självstyrande)\b/i.test(part)
      ? part
      : `${firstWords} ${part}`;
    return {
      ...classifySingleClaim(candidate),
      originalClaim: claim,
      decompositionReason: "compound_claim_split_on_multiple_outcomes"
    };
  });
}

export function extractAndClassifyClaims(text: string): ClassifiedClaim[] {
  return text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 30)
    .flatMap((s) => decomposeClaim(s));
}
