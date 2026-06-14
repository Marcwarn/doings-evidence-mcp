import { fetchDoingsSharePointDocument, searchDoingsSharePoint } from "../connectors/sharePoint.js";

export async function compareWithDoingsKnowledgeTool(args: {
  topic: string;
  claim?: string;
  context?: string;
  maxDocuments?: number;
}) {
  const documents = await searchDoingsSharePoint({ topic: args.topic, maxDocuments: args.maxDocuments });
  const fetchedDocuments = [];
  for (const doc of documents.slice(0, 3)) {
    fetchedDocuments.push(await fetchDoingsSharePointDocument(doc));
  }
  return {
    topic: args.topic,
    claim: args.claim ?? null,
    matchingDoingsDocuments: documents,
    fetchedDocuments,
    alignedWithResearch: [],
    potentiallyOverclaimed: [],
    needsReview: documents.map((doc) => ({
      title: doc.title,
      reason: "SharePoint material needs explicit classification as method, experience, case, or evidence before being used in client-facing claims."
    }))
  };
}
