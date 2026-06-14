import { analyzeArgument } from "../evaluators/argumentMap.js";
import { makeClientSafe } from "../evaluators/clientSafeLanguage.js";
import { detectConsultingLanguageRisk, summarizeConsultingLanguageRisk } from "../evaluators/consultingLanguageRisk.js";
import { rewriteInDoingsVoice } from "../evaluators/doingsVoice.js";
import { evidenceToLanguage } from "../evaluators/evidenceToLanguage.js";
import { buildLearningNudge } from "../evaluators/learningNudge.js";
import { detectSolutionFirstThinking } from "../evaluators/solutionFirst.js";
import { CritiqueMode, detectUserIntent } from "../evaluators/userIntent.js";
import { critiqueOrgTextTool } from "./critiqueOrgText.js";

export async function thinkWithEvidenceTool(args: {
  input: string;
  context?: string;
  mode?: CritiqueMode | "thinking_partner";
  strictness?: "low" | "medium" | "high";
  yearFrom?: number;
  maxPapers?: number;
  fullTextMode?: "none" | "open_access" | "required";
  maxFullTextPapers?: number;
  maxFullTextCharsPerPaper?: number;
  includeRawCritique?: boolean;
}) {
  const argumentMap = analyzeArgument(args.input);
  const solutionFirst = detectSolutionFirstThinking(args.input);
  const consultingRisks = detectConsultingLanguageRisk(args.input);
  const requestedMode = args.mode === "thinking_partner" ? "auto" : args.mode ?? "auto";
  const intent = detectUserIntent({ input: args.input, requestedMode });
  const critique = await critiqueOrgTextTool({
    input: args.input,
    context: args.context,
    mode: requestedMode,
    strictness: args.strictness ?? "high",
    yearFrom: args.yearFrom ?? 2000,
    maxPapers: args.maxPapers ?? 8,
    fullTextMode: args.fullTextMode ?? (intent.selectedMode === "quick_check" ? "none" : "open_access"),
    maxFullTextPapers: args.maxFullTextPapers ?? 2,
    maxFullTextCharsPerPaper: args.maxFullTextCharsPerPaper ?? 60000,
    includeRawCritique: args.includeRawCritique ?? false
  });

  const narrative = critique.narrative as Record<string, unknown>;
  const saferVersion = typeof narrative.saferVersion === "string" ? narrative.saferVersion : undefined;
  const rawCritique = critique.rawCritique as Record<string, unknown> | undefined;
  const evidenceLanguage = evidenceToLanguage({
    claim: critique.primaryClaim,
    supportLevel: rawCritique?.supportLevel ? String(rawCritique.supportLevel) : undefined,
    verdict: rawCritique?.verdict ? String(rawCritique.verdict) : undefined,
    saferVersion,
    boundaryConditions: Array.isArray(rawCritique?.boundaryConditions) ? rawCritique?.boundaryConditions.map(String) : []
  });
  const clientSafe = makeClientSafe({
    input: args.input,
    saferVersion: evidenceLanguage.canSay,
    mainRisk: argumentMap.missingLinks[0] ?? solutionFirst.explanation,
    solutionFirst: solutionFirst.detected
  });
  const doingsVoice = rewriteInDoingsVoice(args.input, args.context);
  const learningNudge = buildLearningNudge({
    consultingRisks,
    solutionFirst,
    hasMissingLinks: argumentMap.missingLinks.length > 0
  });

  return {
    productMode: "thinking_interface",
    selectedCritiqueMode: intent.selectedMode,
    answer: buildTopLevelAnswer({
      input: args.input,
      narrative,
      argumentMap,
      solutionFirst,
      clientSafe,
      doingsVoice: doingsVoice.doingsVoiceVersion,
      learningNudge
    }),
    argumentMap,
    solutionFirst,
    consultingLanguageRisk: summarizeConsultingLanguageRisk(consultingRisks),
    doingsVoice,
    clientSafeLanguage: clientSafe,
    evidenceToLanguage: evidenceLanguage,
    learningNudge,
    underlyingCritique: args.includeRawCritique ? critique : undefined,
    productWarning: "This is a thinking interface over an exploratory evidence scanner. It improves reasoning and language; it is not a systematic literature review or a substitute for client discovery."
  };
}

function buildTopLevelAnswer(params: {
  input: string;
  narrative: Record<string, unknown>;
  argumentMap: ReturnType<typeof analyzeArgument>;
  solutionFirst: ReturnType<typeof detectSolutionFirstThinking>;
  clientSafe: ReturnType<typeof makeClientSafe>;
  doingsVoice: string;
  learningNudge: ReturnType<typeof buildLearningNudge>;
}) {
  const headline = params.solutionFirst.detected
    ? "Start with the friction, not the organizational solution."
    : typeof params.narrative.headline === "string"
      ? params.narrative.headline
      : "Usable, but make the mechanism and boundaries explicit.";

  return {
    headline,
    criticalRead: params.solutionFirst.detected
      ? params.solutionFirst.explanation
      : typeof params.narrative.answer === "string"
        ? params.narrative.answer
        : "The wording is directionally plausible but should be made more specific and conditional.",
    weakestLink: params.argumentMap.missingLinks[0] ?? "The mechanism and boundary conditions need to be explicit.",
    betterQuestion: params.argumentMap.strongerDiagnosticQuestions[0] ?? params.solutionFirst.betterNextQuestion,
    doingsVoiceVersion: params.doingsVoice,
    clientSafeVersion: params.clientSafe.clientSafeVersion,
    executiveVersion: params.clientSafe.executiveVersion,
    learningNudge: params.learningNudge
  };
}
