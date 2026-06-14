export interface EvidencePassage {
  paperTitle: string;
  category: "supporting" | "contradicting" | "method" | "limitations";
  passage: string;
  locationHint?: string;
}

const supportTerms = ["support", "associated with", "positively related", "improved", "increase", "significant", "benefit", "enable", "förbättra", "öka"];
const contradictTerms = ["however", "contrary", "no significant", "mixed", "negative", "trade-off", "coordination cost", "risk", "unclear", "däremot"];
const methodTerms = ["method", "sample", "survey", "interview", "longitudinal", "experiment", "case study", "data", "participants", "metod"];
const limitationTerms = ["limitation", "future research", "caution", "generaliz", "external validity", "bias", "begräns"];

function splitSentences(text: string) {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 60 && s.length < 800);
}

function pickPassages(text: string, terms: string[], max: number) {
  const sentences = splitSentences(text);
  const picked: string[] = [];
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (terms.some((term) => lower.includes(term))) picked.push(sentence);
    if (picked.length >= max) break;
  }
  return picked;
}

export function extractEvidencePassages(params: {
  papers: Array<Record<string, unknown>>;
  maxPerCategory?: number;
}): EvidencePassage[] {
  const max = params.maxPerCategory ?? 2;
  const passages: EvidencePassage[] = [];

  for (const paper of params.papers) {
    const fullText = typeof paper.fullText === "string" ? paper.fullText : "";
    if (fullText.length < 800) continue;
    const title = String(paper.title ?? "Untitled paper");
    const add = (category: EvidencePassage["category"], terms: string[]) => {
      for (const passage of pickPassages(fullText, terms, max)) {
        passages.push({ paperTitle: title, category, passage: passage.slice(0, 700), locationHint: "open_access_fulltext_extracted_text" });
      }
    };
    add("supporting", supportTerms);
    add("contradicting", contradictTerms);
    add("method", methodTerms);
    add("limitations", limitationTerms);
  }

  return passages.slice(0, 24);
}
