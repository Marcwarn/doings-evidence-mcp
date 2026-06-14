import { extractDocumentText } from "../extractors/documentText.js";

export interface FullTextCandidate {
  url: string;
  source: "openalex_pdf" | "openalex_landing_page" | "semantic_scholar_url" | "doi_landing_page";
  contentType?: string;
}

export interface FullTextResult {
  status: "available" | "unavailable" | "error" | "skipped";
  source?: FullTextCandidate["source"];
  url?: string;
  text?: string;
  chars?: number;
  extractor?: string;
  warning?: string;
  errors?: string[];
}

const DEFAULT_MAX_CHARS = 60_000;
const FETCH_TIMEOUT_MS = 15_000;

function doiToUrl(doi?: unknown): string | undefined {
  if (!doi) return undefined;
  const raw = String(doi).trim();
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://doi.org/${raw.replace(/^doi:/i, "")}`;
}

function collectCandidates(paper: Record<string, unknown>): FullTextCandidate[] {
  const candidates: FullTextCandidate[] = [];
  const bestOpenAccessLocation = paper.bestOpenAccessLocation as Record<string, unknown> | undefined;
  const openAccessPdfUrl = typeof bestOpenAccessLocation?.pdfUrl === "string" ? bestOpenAccessLocation.pdfUrl : undefined;
  const openAccessLandingPageUrl = typeof bestOpenAccessLocation?.landingPageUrl === "string" ? bestOpenAccessLocation.landingPageUrl : undefined;
  const semanticScholarUrl = typeof paper.url === "string" ? paper.url : undefined;
  const doiLandingPage = doiToUrl(paper.doi);

  if (openAccessPdfUrl) candidates.push({ url: openAccessPdfUrl, source: "openalex_pdf" });
  if (openAccessLandingPageUrl) candidates.push({ url: openAccessLandingPageUrl, source: "openalex_landing_page" });
  if (semanticScholarUrl) candidates.push({ url: semanticScholarUrl, source: "semantic_scholar_url" });
  if (doiLandingPage) candidates.push({ url: doiLandingPage, source: "doi_landing_page" });

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return candidate.url.startsWith("https://") || candidate.url.startsWith("http://");
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timeout) };
}

async function fetchCandidate(candidate: FullTextCandidate, maxChars: number): Promise<FullTextResult> {
  const timeout = withTimeout(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(candidate.url, {
      signal: timeout.signal,
      headers: {
        "accept": "application/pdf,text/html,text/plain;q=0.9,*/*;q=0.5",
        "user-agent": "doings-evidence-mcp/0.6 (+local research validation)"
      },
      redirect: "follow"
    });
    if (!res.ok) {
      return { status: "error", source: candidate.source, url: candidate.url, warning: `HTTP ${res.status} ${res.statusText}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (contentType.includes("application/pdf") || candidate.url.toLowerCase().includes(".pdf")) {
      const extracted = await extractDocumentText({ buffer, mimeType: "application/pdf", title: "paper.pdf" });
      return extracted.text
        ? {
            status: "available",
            source: candidate.source,
            url: candidate.url,
            text: extracted.text.slice(0, maxChars),
            chars: Math.min(extracted.text.length, maxChars),
            extractor: extracted.extractor,
            warning: extracted.warning
          }
        : { status: "unavailable", source: candidate.source, url: candidate.url, extractor: extracted.extractor, warning: extracted.warning };
    }

    if (contentType.includes("text/html")) {
      const text = stripHtml(buffer.toString("utf8")).slice(0, maxChars);
      return text.length > 800
        ? { status: "available", source: candidate.source, url: candidate.url, text, chars: text.length, extractor: "html_text" }
        : { status: "unavailable", source: candidate.source, url: candidate.url, extractor: "html_text", warning: "Fetched HTML contained too little readable text for evidence validation." };
    }

    if (contentType.startsWith("text/")) {
      const text = buffer.toString("utf8").replace(/\s+/g, " ").trim().slice(0, maxChars);
      return text.length > 800
        ? { status: "available", source: candidate.source, url: candidate.url, text, chars: text.length, extractor: "plain_text" }
        : { status: "unavailable", source: candidate.source, url: candidate.url, extractor: "plain_text", warning: "Fetched text contained too little content for evidence validation." };
    }

    return { status: "unavailable", source: candidate.source, url: candidate.url, warning: `Unsupported full-text content type: ${contentType || "unknown"}` };
  } catch (error) {
    return { status: "error", source: candidate.source, url: candidate.url, warning: error instanceof Error ? error.message : String(error) };
  } finally {
    timeout.cancel();
  }
}

export async function fetchOpenAccessFullTextForPaper(params: {
  paper: Record<string, unknown>;
  maxChars?: number;
}): Promise<FullTextResult> {
  const candidates = collectCandidates(params.paper);
  if (!candidates.length) {
    return { status: "unavailable", warning: "No open-access full-text candidate URL was found in the paper metadata." };
  }

  const errors: string[] = [];
  for (const candidate of candidates) {
    const result = await fetchCandidate(candidate, params.maxChars ?? DEFAULT_MAX_CHARS);
    if (result.status === "available") return result;
    if (result.warning) errors.push(`${candidate.source}: ${result.warning}`);
  }

  return {
    status: "unavailable",
    warning: "No candidate produced usable full text. Paywalled, scanned, blocked, or metadata-only sources are common.",
    errors
  };
}

export async function enrichPapersWithOpenAccessFullText(params: {
  papers: Array<Record<string, unknown>>;
  maxPapers?: number;
  maxCharsPerPaper?: number;
}) {
  const maxPapers = Math.min(Math.max(params.maxPapers ?? 3, 0), params.papers.length);
  const enriched = [...params.papers];
  const fullTextResults: FullTextResult[] = [];

  for (let i = 0; i < maxPapers; i += 1) {
    const fullText = await fetchOpenAccessFullTextForPaper({
      paper: enriched[i],
      maxChars: params.maxCharsPerPaper ?? DEFAULT_MAX_CHARS
    });
    fullTextResults.push(fullText);
    enriched[i] = {
      ...enriched[i],
      fullTextStatus: fullText.status,
      fullTextSource: fullText.source,
      fullTextUrl: fullText.url,
      fullTextChars: fullText.chars,
      fullTextExtractor: fullText.extractor,
      fullTextWarning: fullText.warning,
      fullText: fullText.text
    };
  }

  return {
    papers: enriched,
    fullTextSummary: {
      attempted: maxPapers,
      available: fullTextResults.filter((r) => r.status === "available").length,
      unavailable: fullTextResults.filter((r) => r.status === "unavailable").length,
      errors: fullTextResults.filter((r) => r.status === "error").length,
      results: fullTextResults.map((r) => ({ status: r.status, source: r.source, url: r.url, chars: r.chars, warning: r.warning }))
    }
  };
}
