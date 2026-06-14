export interface ArgumentMap {
  symptom?: string;
  diagnosis?: string;
  assumedCause?: string;
  proposedSolution?: string;
  proposedMechanism?: string;
  desiredOutcome?: string;
  missingLinks: string[];
  strongerDiagnosticQuestions: string[];
  argumentRisk: "low" | "medium" | "high";
}

const symptomMarkers = ["slow", "sluggish", "too slow", "friction", "silos", "unclear", "complex", "långsam", "trögt", "friktion", "silos", "otydlig", "komplex"];
const causeMarkers = ["because", "due to", "caused by", "problem is", "beror på", "orsakas av", "problemet är"];
const solutionMarkers = ["need", "should", "recommend", "move to", "implement", "remove", "flatten", "autonomous", "squads", "tribes", "matrix", "governance", "behöver", "bör", "rekommenderar", "införa", "ta bort", "plattare", "autonoma", "styrning"];
const outcomeMarkers = ["agility", "speed", "alignment", "execution", "performance", "efficiency", "innovation", "agilitet", "snabbare", "fart", "riktning", "genomförande", "effektivitet", "innovation"];

export function analyzeArgument(text: string): ArgumentMap {
  const sentences = splitSentences(text);
  const lower = text.toLowerCase();
  const symptom = pickSentence(sentences, symptomMarkers);
  const diagnosis = pickDiagnosticSentence(sentences);
  const assumedCause = pickCause(sentences);
  const proposedSolution = pickSentence(sentences, solutionMarkers);
  const desiredOutcome = pickSentence(sentences, outcomeMarkers);
  const proposedMechanism = inferMechanism(text);
  const missingLinks = buildMissingLinks({ text, symptom, assumedCause, proposedSolution, proposedMechanism, desiredOutcome });
  const strongerDiagnosticQuestions = buildDiagnosticQuestions(text);
  const argumentRisk = missingLinks.length >= 4 ? "high" : missingLinks.length >= 2 ? "medium" : "low";

  return {
    symptom,
    diagnosis,
    assumedCause,
    proposedSolution,
    proposedMechanism,
    desiredOutcome,
    missingLinks,
    strongerDiagnosticQuestions,
    argumentRisk
  };
}

function splitSentences(text: string) {
  return text
    .split(/[.!?\n]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 8);
}

function pickSentence(sentences: string[], markers: string[]) {
  return sentences.find((s) => markers.some((m) => s.toLowerCase().includes(m)));
}

function pickDiagnosticSentence(sentences: string[]) {
  return sentences.find((s) => /\b(problem|issue|challenge|diagnos|problemet|utmaningen|symptom)\b/i.test(s));
}

function pickCause(sentences: string[]) {
  const explicit = sentences.find((s) => causeMarkers.some((m) => s.toLowerCase().includes(m)));
  if (explicit) return explicit;
  const solution = pickSentence(sentences, solutionMarkers);
  if (solution && /\b(flat|hierarchy|middle management|matrix|governance|autonomy|platt|hierarki|mellanchef|matris|autonomi)\b/i.test(solution)) {
    return "Implicit: the named organizational form or role is treated as the cause of the problem.";
  }
  return undefined;
}

function inferMechanism(text: string) {
  const lower = text.toLowerCase();
  if (/decision|beslut|mandat|authority/.test(lower)) return "Decision latency / decision rights";
  if (/coordination|samordning|dependencies|beroenden|handover/.test(lower)) return "Coordination across dependencies";
  if (/accountability|ansvar|ownership|ägarskap/.test(lower)) return "Accountability and ownership";
  if (/management|manager|chef|middle management|mellanchef/.test(lower)) return "Management work, escalation and prioritization";
  if (/capability|kompetens|capacity|kapacitet|expert/.test(lower)) return "Capability, capacity or expert bottlenecks";
  return undefined;
}

function buildMissingLinks(params: {
  text: string;
  symptom?: string;
  assumedCause?: string;
  proposedSolution?: string;
  proposedMechanism?: string;
  desiredOutcome?: string;
}) {
  const links: string[] = [];
  if (!params.symptom) links.push("The concrete symptom is not clearly stated; the text may be solving for an implied problem.");
  if (!params.assumedCause) links.push("The cause of the problem is not established; the text may jump from symptom to preferred solution.");
  if (params.proposedSolution && !params.proposedMechanism) links.push("The mechanism is under-specified: it is not clear how the proposed design change would create the desired outcome.");
  if (!/\b(evidence|data|observed|interview|measurement|research|forskning|data|observerat|intervjuer|mätning)\b/i.test(params.text)) {
    links.push("No evidence source is named for the diagnosis or causal link.");
  }
  if (params.desiredOutcome && !/\b(metric|measure|indicator|lead time|decision time|cycle time|mät|indikator|ledtid|beslutstid)\b/i.test(params.text)) {
    links.push("The desired outcome is not operationalized; it is unclear how improvement would be observed.");
  }
  if (/\b(autonomous|autonomy|självstyr|autonom)\b/i.test(params.text) && !/\b(decision rights|mandat|interface|gränssnitt|accountability|ansvar|escalation|eskalering)\b/i.test(params.text)) {
    links.push("Autonomy is mentioned without specifying decision rights, interfaces, accountability or escalation paths.");
  }
  return links;
}

function buildDiagnosticQuestions(text: string) {
  const questions = [
    "Where exactly does the work get stuck: decisions, handovers, prioritization, staffing, dependencies or accountability?",
    "What evidence would show that the assumed cause is actually driving the symptom?",
    "Which part of the current management work creates value, and which part creates delay or ambiguity?"
  ];
  if (/\b(autonomous|autonomy|självstyr|autonom)\b/i.test(text)) {
    questions.push("Which decisions should move closer to teams, and what coordination work must remain explicit?");
  }
  if (/\b(flat|hierarchy|middle management|platt|hierarki|mellanchef)\b/i.test(text)) {
    questions.push("Is the delay caused by hierarchy itself, or by unclear decision rights, dependencies, incentives or capacity constraints?");
  }
  return questions.slice(0, 5);
}
