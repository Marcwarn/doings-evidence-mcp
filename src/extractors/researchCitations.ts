import { ClassifiedClaim, classifySingleClaim } from "../evaluators/claimClassifier.js";

export interface CitationCandidate {
  marker: string;
  type: "doi" | "url" | "numeric" | "author_year" | "reference_section";
  context: string;
  position: number;
}

export interface ClaimCitationAudit {
  claim: ClassifiedClaim;
  citationStatus: "explicit_support_nearby" | "citation_elsewhere" | "no_explicit_source" | "not_research_checkable";
  supportRisk: "low" | "medium" | "high" | "not_applicable";
  nearbyCitations: CitationCandidate[];
  notes: string[];
  suggestedSearchQueries: string[];
}

export interface DocumentCitationAudit {
  summary: {
    totalClaims: number;
    researchCheckableClaims: number;
    claimsWithNearbyCitations: number;
    claimsWithNoExplicitSource: number;
    citationCandidates: number;
    hasReferenceSection: boolean;
  };
  citationCandidates: CitationCandidate[];
  auditedClaims: ClaimCitationAudit[];
  warnings: string[];
}

const citationPatterns: Array<{ type: CitationCandidate["type"]; regex: RegExp }> = [
  { type: "doi", regex: /\b10\.\d{4,9}\/[\w.()/:;\-]+/gi },
  { type: "url", regex: /https?:\/\/[^\s)\]]+/gi },
  { type: "numeric", regex: /\[(?:\d{1,3})(?:\s*[,;]\s*\d{1,3})*\]/g },
  { type: "author_year", regex: /\(([A-ZÅÄÖ][A-Za-zÅÄÖåäö'\-]+(?:\s+(?:et\s+al\.?|&|and)\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'\-]+)?(?:,\s*)?\s*(?:19|20)\d{2}[a-z]?(?:;\s*[A-ZÅÄÖ][A-Za-zÅÄÖåäö'\-]+(?:,\s*)?\s*(?:19|20)\d{2}[a-z]?)*\))/g },
  { type: "author_year", regex: /\b[A-ZÅÄÖ][A-Za-zÅÄÖåäö'\-]+\s+\((?:19|20)\d{2}[a-z]?\)/g }
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function contextAround(text: string, index: number, radius = 180): string {
  return normalizeWhitespace(text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius)));
}

export function extractCitationCandidates(text: string): CitationCandidate[] {
  const candidates: CitationCandidate[] = [];
  for (const pattern of citationPatterns) {
    for (const match of text.matchAll(pattern.regex)) {
      if (match.index === undefined) continue;
      candidates.push({
        marker: match[0],
        type: pattern.type,
        context: contextAround(text, match.index),
        position: match.index
      });
    }
  }

  const referenceMatch = text.match(/\n\s*(references|bibliography|referenser|källor|sources)\s*\n/i);
  if (referenceMatch?.index !== undefined) {
    candidates.push({
      marker: referenceMatch[1],
      type: "reference_section",
      context: contextAround(text, referenceMatch.index, 250),
      position: referenceMatch.index
    });
  }

  return candidates.sort((a, b) => a.position - b.position);
}

interface SentenceSpan {
  sentence: string;
  start: number;
  end: number;
}

function sentenceSpans(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const regex = /[^.!?\n]+(?:[.!?]+|\n|$)/g;
  for (const match of text.matchAll(regex)) {
    if (match.index === undefined) continue;
    const sentence = normalizeWhitespace(match[0]);
    if (sentence.length < 20) continue;
    spans.push({ sentence, start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

function isResearchCheckable(type: ClassifiedClaim["type"]): boolean {
  return type === "causal" || type === "diagnostic" || type === "descriptive";
}

function nearby(citations: CitationCandidate[], start: number, end: number, radius = 350): CitationCandidate[] {
  return citations.filter((citation) => citation.position >= start - radius && citation.position <= end + radius);
}

export function auditResearchCitations(params: {
  text: string;
  maxClaims?: number;
  claimTypes?: ClassifiedClaim["type"][];
}): DocumentCitationAudit {
  const text = params.text;
  const citations = extractCitationCandidates(text);
  const spans = sentenceSpans(text);
  const maxClaims = Math.min(Math.max(params.maxClaims ?? 40, 1), 100);
  const requestedTypes = params.claimTypes;

  const auditedClaims: ClaimCitationAudit[] = [];
  for (const span of spans) {
    if (auditedClaims.length >= maxClaims) break;
    const claim = classifySingleClaim(span.sentence);
    if (requestedTypes?.length && !requestedTypes.includes(claim.type)) continue;
    if (claim.testability === "low" && claim.type !== "normative") continue;

    const checkable = isResearchCheckable(claim.type);
    const nearbyCitations = nearby(citations, span.start, span.end);
    const hasAnyCitation = citations.some((candidate) => candidate.type !== "reference_section");
    const citationStatus: ClaimCitationAudit["citationStatus"] = !checkable
      ? "not_research_checkable"
      : nearbyCitations.some((c) => c.type !== "reference_section")
        ? "explicit_support_nearby"
        : hasAnyCitation
          ? "citation_elsewhere"
          : "no_explicit_source";

    const supportRisk: ClaimCitationAudit["supportRisk"] = citationStatus === "explicit_support_nearby"
      ? "medium"
      : citationStatus === "citation_elsewhere"
        ? "medium"
        : citationStatus === "no_explicit_source"
          ? "high"
          : "not_applicable";

    const notes = [];
    if (citationStatus === "explicit_support_nearby") {
      notes.push("A source marker appears near the claim, but the tool has not verified that the cited source actually supports it.");
    } else if (citationStatus === "citation_elsewhere") {
      notes.push("The document contains citation markers, but none are close to this claim. Treat as insufficiently sourced until manually checked.");
    } else if (citationStatus === "no_explicit_source") {
      notes.push("No explicit citation marker was found for this research-checkable claim.");
    } else {
      notes.push("This looks more like a normative/prescriptive statement than a directly research-checkable empirical claim.");
    }

    auditedClaims.push({
      claim,
      citationStatus,
      supportRisk,
      nearbyCitations: nearbyCitations.slice(0, 5),
      notes,
      suggestedSearchQueries: claim.suggestedSearchQueries
    });
  }

  const researchCheckableClaims = auditedClaims.filter((item) => isResearchCheckable(item.claim.type));
  const claimsWithNearbyCitations = auditedClaims.filter((item) => item.citationStatus === "explicit_support_nearby").length;
  const claimsWithNoExplicitSource = auditedClaims.filter((item) => item.citationStatus === "no_explicit_source").length;
  const hasReferenceSection = citations.some((item) => item.type === "reference_section");
  const warnings = [
    "Citation extraction is heuristic. It detects markers such as DOI, URLs, numeric references and author-year citations, but does not verify source relevance or correctness.",
    "A nearby citation means 'possibly sourced', not 'evidence-supported'. Use search_research_evidence or critique_claim to validate important claims."
  ];
  if (!hasReferenceSection && citations.length === 0) warnings.push("No references or citation markers were detected in the document text.");

  return {
    summary: {
      totalClaims: auditedClaims.length,
      researchCheckableClaims: researchCheckableClaims.length,
      claimsWithNearbyCitations,
      claimsWithNoExplicitSource,
      citationCandidates: citations.length,
      hasReferenceSection
    },
    citationCandidates: citations.slice(0, 50),
    auditedClaims,
    warnings
  };
}
