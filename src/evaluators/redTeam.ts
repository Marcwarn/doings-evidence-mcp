export function redTeamClaim(params: {
  claim: string;
  context?: string;
  levelOfAnalysis?: string;
  contextFit?: string;
}) {
  return {
    whatWouldMakeThisFalse: [
      "The observed outcome is caused by selection effects, leadership quality, market conditions or maturity rather than the design principle itself.",
      "The claim holds at team level but fails at organization level due to coordination costs or resource-allocation bottlenecks.",
      "The target context differs materially from the contexts studied in the available evidence."
    ],
    skepticalReviewerObjections: [
      "Define the outcome precisely and avoid treating broad terms such as agility, alignment or performance as self-evident.",
      "Separate mechanism, outcome and level of analysis before claiming evidence support.",
      "Do not infer causality from cross-sectional surveys, case studies or practitioner material.",
      "Report boundary conditions and null/mixed findings, not only supportive examples."
    ],
    alternativeExplanations: [
      "Better-performing organizations may be more likely to adopt the practice, rather than the practice causing performance.",
      "Benefits may come from clearer goals, staffing quality or leadership routines rather than the named org-design intervention.",
      "Short-term perceived speed may hide long-term coordination or accountability costs."
    ],
    recommendedStressTest: `Restate '${params.claim}' as a falsifiable claim with a defined outcome, target population, mechanism and time horizon. Then check whether evidence exists at the same level of analysis (${params.levelOfAnalysis ?? "unknown"}) and in a comparable context (${params.contextFit ?? "unknown"}).`
  };
}
