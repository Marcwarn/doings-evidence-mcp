import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ClassifyClaimsInput,
  CompareWithDoingsKnowledgeInput,
  CritiqueClaimInput,
  RateEvidenceQualityInput,
  SearchResearchEvidenceInput,
  SearchDoingsKnowledgeInput,
  FetchDoingsDocumentInput,
  AuditDoingsDocumentClaimsInput,
  CritiqueOrgTextInput,
  ThinkWithEvidenceInput,
  AnalyzeOrgArgumentInput,
  DetectSolutionFirstThinkingInput,
  RewriteInDoingsVoiceInput,
  MakeClientSafeInput
} from "./tools/schemas.js";
import { critiqueClaimTool } from "./tools/critiqueClaim.js";
import { searchResearchEvidence } from "./tools/searchResearchEvidence.js";
import { classifyClaimsTool } from "./tools/classifyClaims.js";
import { rateEvidenceQualityTool } from "./tools/rateEvidenceQuality.js";
import { compareWithDoingsKnowledgeTool } from "./tools/compareWithDoingsKnowledge.js";
import { searchDoingsKnowledgeTool } from "./tools/searchDoingsKnowledge.js";
import { fetchDoingsDocumentTool } from "./tools/fetchDoingsDocument.js";
import { auditDoingsDocumentClaimsTool } from "./tools/auditDoingsDocumentClaims.js";
import { critiqueOrgTextTool } from "./tools/critiqueOrgText.js";
import { thinkWithEvidenceTool } from "./tools/thinkWithEvidence.js";
import { analyzeOrgArgumentTool } from "./tools/analyzeOrgArgument.js";
import { detectSolutionFirstThinkingTool } from "./tools/detectSolutionFirstThinking.js";
import { rewriteInDoingsVoiceTool } from "./tools/rewriteInDoingsVoice.js";
import { makeClientSafeTool } from "./tools/makeClientSafe.js";

export const SERVER_NAME = "doings-evidence-mcp";
export const SERVER_VERSION = "0.11.0";

function asTextJson(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

export function createDoingsEvidenceMcpServer() {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  server.tool(
    "think_with_evidence",
    "Default user-facing thinking interface. Helps users think, phrase, challenge and make organizational arguments client-safe using evidence-aware critique, argument mapping, solution-first detection, Doings voice, and evidence-to-language translation.",
    ThinkWithEvidenceInput.shape,
    async (args) => asTextJson(await thinkWithEvidenceTool(args))
  );

  server.tool(
    "analyze_org_argument",
    "Maps organizational reasoning into symptom, diagnosis, assumed cause, proposed solution, mechanism, desired outcome, missing links and better diagnostic questions.",
    AnalyzeOrgArgumentInput.shape,
    async (args) => asTextJson(analyzeOrgArgumentTool(args))
  );

  server.tool(
    "detect_solution_first_thinking",
    "Flags when a draft jumps to an organizational solution before establishing the problem, evidence and causal mechanism.",
    DetectSolutionFirstThinkingInput.shape,
    async (args) => asTextJson(detectSolutionFirstThinkingTool(args))
  );

  server.tool(
    "rewrite_in_doings_voice",
    "Rewrites text in a plain-spoken, evidence-honest, non-hype Doings voice.",
    RewriteInDoingsVoiceInput.shape,
    async (args) => asTextJson(rewriteInDoingsVoiceTool(args))
  );

  server.tool(
    "make_client_safe",
    "Turns an internal critique or rough claim into language that can be used in client dialogue without overclaiming.",
    MakeClientSafeInput.shape,
    async (args) => asTextJson(makeClientSafeTool(args))
  );

  server.tool(
    "critique_org_text",
    "User-facing critique layer for rough consulting text, claims, pitch/RFP wording and research questions. Detects intent, chooses quick_check/rewrite_safely/red_team/evidence_brief, flags consulting-language risk and returns a narrative answer.",
    CritiqueOrgTextInput.shape,
    async (args) => asTextJson(await critiqueOrgTextTool(args))
  );

  server.tool(
    "can_we_say_this",
    "Fast practical check for whether an organizational claim or draft sentence is safe enough to say, with safer wording and caveats.",
    CritiqueOrgTextInput.shape,
    async (args) => asTextJson(await critiqueOrgTextTool({ ...args, mode: args.mode ?? "quick_check" }))
  );

  server.tool(
    "critique_claim",
    "Critically assesses an organization-design or transformation claim against available research, attempting open-access full-text escalation by default. Includes claim decomposition, level-of-analysis checks, context-fit scoring, study-type classification, passage extraction and optional red-team mode. For user-facing wording use critique_org_text.",
    CritiqueClaimInput.shape,
    async (args) => asTextJson(await critiqueClaimTool(args))
  );

  server.tool(
    "search_research_evidence",
    "Searches OpenAlex and Semantic Scholar for research relevant to a claim or topic, with optional open-access full-text escalation.",
    SearchResearchEvidenceInput.shape,
    async (args) => asTextJson(await searchResearchEvidence(args))
  );

  server.tool(
    "classify_claims",
    "Extracts and classifies claims from text as causal, normative, diagnostic, descriptive or prescriptive.",
    ClassifyClaimsInput.shape,
    async (args) => asTextJson(classifyClaimsTool(args))
  );

  server.tool(
    "rate_evidence_quality",
    "Rates evidence quality using a conservative heuristic: study type, causal strength, context fit, recency and bias risks.",
    RateEvidenceQualityInput.shape,
    async (args) => asTextJson(rateEvidenceQualityTool(args))
  );

  server.tool(
    "search_doings_knowledge",
    "Searches Doings SharePoint knowledge via Microsoft Graph. Treats internal documents as experience/IP, not academic evidence.",
    SearchDoingsKnowledgeInput.shape,
    async (args) => asTextJson(await searchDoingsKnowledgeTool(args))
  );

  server.tool(
    "compare_with_doings_knowledge",
    "Compares a topic or claim with Doings SharePoint knowledge via Microsoft Graph and flags where internal material needs research review.",
    CompareWithDoingsKnowledgeInput.shape,
    async (args) => asTextJson(await compareWithDoingsKnowledgeTool(args))
  );

  server.tool(
    "audit_doings_document_claims",
    "Audits SharePoint document text or raw text for research-checkable claims, citation markers, claims lacking explicit source support, and optionally runs research validation on high-risk claims.",
    AuditDoingsDocumentClaimsInput.shape,
    async (args) => asTextJson(await auditDoingsDocumentClaimsTool(args))
  );

  server.tool(
    "fetch_doings_document",
    "Fetches one SharePoint/OneDrive document by URL, extracts local text when possible, and optionally classifies, audits and research-validates high-risk claims.",
    FetchDoingsDocumentInput.shape,
    async (args) => asTextJson(await fetchDoingsDocumentTool(args))
  );

  return server;
}
