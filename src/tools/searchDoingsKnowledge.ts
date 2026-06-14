import { fetchDoingsSharePointDocument, searchDoingsSharePoint } from "../connectors/sharePoint.js";

export async function searchDoingsKnowledgeTool(args: {
  query: string;
  maxDocuments?: number;
  fetchTopDocuments?: number;
}) {
  const documents = await searchDoingsSharePoint({ topic: args.query, maxDocuments: args.maxDocuments });
  const fetchCount = Math.min(args.fetchTopDocuments ?? 0, documents.length);
  const fetched = [];
  for (const doc of documents.slice(0, fetchCount)) {
    fetched.push(await fetchDoingsSharePointDocument(doc));
  }

  return {
    query: args.query,
    documents,
    fetchedDocuments: fetched,
    interpretationWarning:
      "SharePoint hits are Doings knowledge, experience or IP. Treat them as internal material, not academic evidence, unless the source document explicitly cites research."
  };
}
