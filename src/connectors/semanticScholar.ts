export async function searchSemanticScholar(params: {
  query: string;
  yearFrom?: number;
  maxResults?: number;
}): Promise<Array<Record<string, unknown>>> {
  const fields = [
    "paperId",
    "title",
    "abstract",
    "year",
    "citationCount",
    "influentialCitationCount",
    "authors",
    "venue",
    "publicationTypes",
    "url"
  ].join(",");

  const searchParams = new URLSearchParams({
    query: params.query,
    limit: String(params.maxResults ?? 10),
    fields
  });
  if (params.yearFrom) searchParams.set("year", `${params.yearFrom}-`);

  const headers: Record<string, string> = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${searchParams.toString()}`, { headers });
  if (!res.ok) throw new Error(`Semantic Scholar request failed: ${res.status} ${res.statusText}`);
  const json = await res.json() as { data?: Array<Record<string, unknown>> };

  return (json.data ?? []).map((paper) => ({
    source: "Semantic Scholar",
    id: paper.paperId,
    title: paper.title,
    abstract: paper.abstract,
    year: paper.year,
    citationCount: paper.citationCount,
    influentialCitationCount: paper.influentialCitationCount,
    authors: Array.isArray(paper.authors) ? paper.authors : [],
    venue: paper.venue,
    publicationTypes: paper.publicationTypes,
    url: paper.url
  }));
}
