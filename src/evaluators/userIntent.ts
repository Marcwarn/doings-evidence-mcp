export type CritiqueMode = "auto" | "quick_check" | "rewrite_safely" | "red_team" | "evidence_brief";
export type DetectedIntent = "can_we_say_this" | "rewrite_safely" | "find_weaknesses" | "what_does_research_say" | "audit_text";

export interface IntentDetectionResult {
  requestedMode: CritiqueMode;
  detectedIntent: DetectedIntent;
  selectedMode: Exclude<CritiqueMode, "auto">;
  confidence: "low" | "medium" | "high";
  reason: string;
}

export function detectUserIntent(params: { input: string; requestedMode?: CritiqueMode }): IntentDetectionResult {
  const requestedMode = params.requestedMode ?? "auto";
  if (requestedMode !== "auto") {
    return {
      requestedMode,
      detectedIntent: modeToIntent(requestedMode),
      selectedMode: requestedMode,
      confidence: "high",
      reason: "Mode was explicitly provided by the caller."
    };
  }

  const lower = params.input.toLowerCase();
  const isQuestionAboutResearch = /(what does .*research|evidence|forskning|forskningsstöd|stöd för|belägg|studier|papers|litteratur)/i.test(lower);
  const isRewrite = /(rewrite|formulat|formulera|skriv om|ton(a|e) ner|safer|hederlig|mer trovärdig|pitch|rfp|rapporttext|stycke)/i.test(lower);
  const isWeakness = /(weak|svag|kritik|invänd|red.?team|attack|stress.?test|risk|var kan.*falla|håller.*inte)/i.test(lower);
  const isCanWeSay = /(kan vi säga|can we say|håller detta|är detta sant|too strong|överdriv|låter.*konsult|claim|påstående)/i.test(lower);
  const looksLikeLongText = params.input.length > 450 || params.input.split(/[.!?\n]+/).filter((s) => s.trim().length > 30).length >= 4;

  if (isWeakness) {
    return { requestedMode, detectedIntent: "find_weaknesses", selectedMode: "red_team", confidence: "high", reason: "The input asks for weaknesses, objections, risk or stress testing." };
  }
  if (isRewrite) {
    return { requestedMode, detectedIntent: "rewrite_safely", selectedMode: "rewrite_safely", confidence: "high", reason: "The input asks for safer or more credible wording." };
  }
  if (isQuestionAboutResearch) {
    return { requestedMode, detectedIntent: "what_does_research_say", selectedMode: "evidence_brief", confidence: "high", reason: "The input asks what research or evidence says." };
  }
  if (looksLikeLongText) {
    return { requestedMode, detectedIntent: "audit_text", selectedMode: "quick_check", confidence: "medium", reason: "The input looks like a passage that needs a practical critique rather than a single research brief." };
  }
  if (isCanWeSay) {
    return { requestedMode, detectedIntent: "can_we_say_this", selectedMode: "quick_check", confidence: "high", reason: "The input asks whether a claim is safe enough to say." };
  }

  return { requestedMode, detectedIntent: "can_we_say_this", selectedMode: "quick_check", confidence: "medium", reason: "Defaulting to quick_check because most day-to-day consulting usage starts with a rough claim or sentence." };
}

function modeToIntent(mode: Exclude<CritiqueMode, "auto">): DetectedIntent {
  switch (mode) {
    case "rewrite_safely": return "rewrite_safely";
    case "red_team": return "find_weaknesses";
    case "evidence_brief": return "what_does_research_say";
    case "quick_check": return "can_we_say_this";
  }
}
