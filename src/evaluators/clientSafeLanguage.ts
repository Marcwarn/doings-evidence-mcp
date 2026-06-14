export interface ClientSafeLanguage {
  internalCritique: string;
  clientSafeVersion: string;
  executiveVersion: string;
  phrasesToAvoid: string[];
}

export function makeClientSafe(params: {
  input: string;
  saferVersion?: string;
  mainRisk?: string;
  solutionFirst?: boolean;
}) : ClientSafeLanguage {
  const mainRisk = params.mainRisk ?? "The wording may imply stronger causal evidence than we have.";
  const base = params.saferVersion ?? soften(params.input);
  return {
    internalCritique: mainRisk,
    clientSafeVersion: params.solutionFirst
      ? "We should first locate where the work actually gets stuck. Sometimes structure is part of the answer, but often the issue is decision rights, dependencies, prioritization or accountability."
      : base,
    executiveVersion: params.solutionFirst
      ? "The first question is not which model to implement, but where the organization loses speed and what kind of management work would improve flow rather than slow it down."
      : "The useful question is not whether the idea is good in general, but where it creates better decisions, clearer accountability or faster flow in this context.",
    phrasesToAvoid: [
      "unlock agility",
      "future-proof the organization",
      "remove management overhead",
      "proven best practice",
      "guarantees alignment"
    ]
  };
}

function soften(text: string) {
  return text
    .replace(/\b(unlocks?|drives?|enables?|guarantees?)\b/gi, "can support")
    .replace(/\b(reduces?|removes?)\b/gi, "may reduce parts of")
    .replace(/\s+/g, " ")
    .trim();
}
