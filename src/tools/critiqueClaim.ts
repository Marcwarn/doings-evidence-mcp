import { searchResearchEvidence } from "./searchResearchEvidence.js";
import { critiqueClaim as critique } from "../evaluators/evidenceCritic.js";

export async function critiqueClaimTool(args: {
  claim: string;
  context?: string;
  strictness?: "low" | "medium" | "high";
  yearFrom?: number;
  maxPapers?: number;
  fullTextMode?: "none" | "open_access" | "required";
  maxFullTextPapers?: number;
  redTeamMode?: boolean;
  maxFullTextCharsPerPaper?: number;
}) {
  const research = await searchResearchEvidence({
    query: args.claim,
    context: args.context,
    yearFrom: args.yearFrom,
    maxResults: args.maxPapers ?? 10,
    includeAdjacentFields: true,
    fullTextMode: args.fullTextMode ?? "open_access",
    maxFullTextPapers: args.maxFullTextPapers ?? 3,
    maxFullTextCharsPerPaper: args.maxFullTextCharsPerPaper ?? 60000
  });

  return {
    ...critique({
      claim: args.claim,
      context: args.context,
      strictness: args.strictness,
      redTeamMode: args.redTeamMode,
      papers: research.papers
    }),
    researchSearch: {
      query: research.query,
      papersConsidered: research.papers.length,
      fullTextMode: research.fullTextMode,
      fullTextSummary: research.fullTextSummary,
      errors: research.errors
    }
  };
}
