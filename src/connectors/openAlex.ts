export interface OpenAlexWork {
  id?: string;
  doi?: string | null;
  title?: string;
  publication_year?: number;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]> | null;
  concepts?: Array<{ display_name: string; score: number }>;
  primary_location?: { source?: { display_name?: string } | null } | null;
  best_oa_location?: { pdf_url?: string | null; landing_page_url?: string | null; source?: { display_name?: string } | null } | null;
  open_access?: { is_oa?: boolean; oa_status?: string; oa_url?: string | null } | null;
  authorships?: Array<{ author?: { display_name?: string } }>;
}

function reconstructAbstract(index?: Record<string, number[]> | null): string | null {
  if (!index) return null;
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) words.push([pos, word]);
  }
  return words.sort((a, b) => a[0] - b[0]).map(([, word]) => word).join(" ");
}

export async function searchOpenAlexWorks(params: {
  query: string;
  yearFrom?: number;
  maxResults?: number;
}): Promise<Array<Record<string, unknown>>> {
  const searchParams = new URLSearchParams({
    search: params.query,
    per_page: String(params.maxResults ?? 10),
    sort: "cited_by_count:desc"
  });
  if (params.yearFrom) searchParams.set("filter", `from_publication_date:${params.yearFrom}-01-01`);

  const res = await fetch(`https://api.openalex.org/works?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`OpenAlex request failed: ${res.status} ${res.statusText}`);
  const json = await res.json() as { results?: OpenAlexWork[] };

  return (json.results ?? []).map((work) => ({
    source: "OpenAlex",
    id: work.id,
    doi: work.doi,
    title: work.title,
    year: work.publication_year,
    citedByCount: work.cited_by_count,
    venue: work.primary_location?.source?.display_name ?? null,
    isOpenAccess: work.open_access?.is_oa ?? false,
    openAccessStatus: work.open_access?.oa_status ?? null,
    bestOpenAccessLocation: work.best_oa_location
      ? {
          pdfUrl: work.best_oa_location.pdf_url ?? null,
          landingPageUrl: work.best_oa_location.landing_page_url ?? work.open_access?.oa_url ?? null,
          source: work.best_oa_location.source?.display_name ?? null
        }
      : work.open_access?.oa_url
        ? { pdfUrl: null, landingPageUrl: work.open_access.oa_url, source: null }
        : null,
    authors: work.authorships?.slice(0, 6).map((a) => a.author?.display_name).filter(Boolean),
    concepts: work.concepts?.slice(0, 8).map((c) => ({ name: c.display_name, score: c.score })),
    abstract: reconstructAbstract(work.abstract_inverted_index)
  }));
}
