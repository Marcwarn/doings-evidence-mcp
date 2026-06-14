import { CritiqueMode } from "./userIntent.js";
import { ConsultingLanguageRiskItem } from "./consultingLanguageRisk.js";

export interface NarrativeResponseParams {
  mode: Exclude<CritiqueMode, "auto">;
  input: string;
  critique: Record<string, unknown>;
  consultingRisks: ConsultingLanguageRiskItem[];
  saferPhrasing: { saferVersion: string; strongerPattern: string; riskNote: string; mechanismPrompt: string };
}

export function buildNarrativeResponse(params: NarrativeResponseParams) {
  const verdict = String(params.critique.verdict ?? "mixed_or_context_dependent");
  const support = String(params.critique.supportLevel ?? "unknown");
  const contextFitValue = readNested(params.critique, ["contextFit", "contextFit"]) ?? "unknown";
  const levelWarning = readNested(params.critique, ["levelAlignment", "warning"]);
  const redTeam = params.critique.redTeam as Record<string, unknown> | undefined;

  switch (params.mode) {
    case "quick_check":
      return {
        headline: headlineFromVerdict(verdict),
        answer: `My read: this is ${humanizeVerdict(verdict)}. Evidence support looks ${support}; context fit looks ${contextFitValue}.`,
        why: compactList([
          levelWarning ? String(levelWarning) : undefined,
          params.consultingRisks.length ? `The wording contains consulting-language risk: ${params.consultingRisks.map((r) => r.phrase).slice(0, 3).join(", ")}.` : undefined,
          "Do not move from adjacent/team-level evidence to broad organizational performance claims without saying so."
        ]),
        saferVersion: params.saferPhrasing.saferVersion,
        useWithCaution: params.saferPhrasing.riskNote
      };
    case "rewrite_safely":
      return {
        headline: "Safer research-honest wording",
        saferVersion: params.saferPhrasing.saferVersion,
        strongerPattern: params.saferPhrasing.strongerPattern,
        changedBecause: compactList([
          `The original claim was assessed as ${humanizeVerdict(verdict)}.`,
          params.consultingRisks.length ? "It used broad consulting language that can imply stronger evidence than is available." : undefined,
          levelWarning ? String(levelWarning) : undefined
        ]),
        keepOut: ["unconditional causal language", "claims that management work disappears", "organization-wide performance claims from team-level evidence"]
      };
    case "red_team":
      return {
        headline: "Red-team critique",
        weakestPoint: pickString(redTeam, "mostVulnerableAssumption") ?? "The claim may be broader than the evidence and may depend on unspoken boundary conditions.",
        skepticalReviewerObjection: pickString(redTeam, "skepticalReviewerObjection") ?? levelWarning ?? "The evidence may not match the claim's level of analysis or target context.",
        alternativeExplanations: Array.isArray(redTeam?.alternativeExplanations) ? redTeam?.alternativeExplanations : ["Observed improvement may come from leadership quality, selection effects, market context, clearer goals or better resourcing rather than the design choice itself."],
        stressTest: pickString(redTeam, "recommendedStressTest") ?? "Ask what evidence would change our mind, and what boundary conditions would make the claim fail.",
        saferVersion: params.saferPhrasing.saferVersion
      };
    case "evidence_brief":
      return {
        headline: "Evidence brief",
        evidenceStatus: humanizeVerdict(verdict),
        supportLevel: support,
        contextFit: contextFitValue,
        whatSeemsBetterSupported: readArray(params.critique, "strongestSupport").slice(0, 5),
        mainCautions: compactList([
          levelWarning ? String(levelWarning) : undefined,
          ...(readArray(params.critique, "dangerousAssumptions").slice(0, 4))
        ]),
        boundaryConditions: readArray(params.critique, "boundaryConditions").slice(0, 8),
        saferVersion: params.saferPhrasing.saferVersion,
        evidenceStatusLabel: params.critique.statusLabel ?? "exploratory_evidence_scan_not_systematic_review"
      };
  }
}

function readNested(obj: Record<string, unknown>, path: string[]) {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object" || !(key in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function readArray(obj: Record<string, unknown>, key: string): string[] {
  const value = obj[key];
  return Array.isArray(value) ? value.map(String) : [];
}

function pickString(obj: Record<string, unknown> | undefined, key: string) {
  const value = obj?.[key];
  return typeof value === "string" ? value : undefined;
}

function compactList(items: Array<string | undefined>) {
  return items.filter((x): x is string => Boolean(x));
}

function headlineFromVerdict(verdict: string) {
  if (verdict.includes("insufficient")) return "Probably too strong as written";
  if (verdict.includes("mixed")) return "Usable, but only with caveats";
  return "Plausible, but still state boundary conditions";
}

function humanizeVerdict(verdict: string) {
  return verdict.replace(/_/g, " ");
}
