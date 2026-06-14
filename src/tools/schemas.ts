import { z } from "zod";

export const CritiqueClaimInput = z.object({
  claim: z.string().min(5),
  context: z.string().optional().default(""),
  strictness: z.enum(["low", "medium", "high"]).optional().default("high"),
  yearFrom: z.number().int().min(1900).max(2100).optional().default(2000),
  maxPapers: z.number().int().min(1).max(25).optional().default(10),
  fullTextMode: z.enum(["none", "open_access", "required"]).optional().default("open_access"),
  maxFullTextPapers: z.number().int().min(0).max(8).optional().default(3),
  maxFullTextCharsPerPaper: z.number().int().min(2000).max(120000).optional().default(60000),
  redTeamMode: z.boolean().optional().default(false)
});


export const CritiqueOrgTextInput = z.object({
  input: z.string().min(5),
  context: z.string().optional().default(""),
  mode: z.enum(["auto", "quick_check", "rewrite_safely", "red_team", "evidence_brief"]).optional().default("auto"),
  strictness: z.enum(["low", "medium", "high"]).optional().default("high"),
  yearFrom: z.number().int().min(1900).max(2100).optional().default(2000),
  maxPapers: z.number().int().min(1).max(25).optional().default(10),
  fullTextMode: z.enum(["none", "open_access", "required"]).optional().default("open_access"),
  maxFullTextPapers: z.number().int().min(0).max(8).optional().default(3),
  maxFullTextCharsPerPaper: z.number().int().min(2000).max(120000).optional().default(60000),
  includeRawCritique: z.boolean().optional().default(false)
});


export const ThinkWithEvidenceInput = z.object({
  input: z.string().min(5),
  context: z.string().optional().default(""),
  mode: z.enum(["auto", "thinking_partner", "quick_check", "rewrite_safely", "red_team", "evidence_brief"]).optional().default("thinking_partner"),
  strictness: z.enum(["low", "medium", "high"]).optional().default("high"),
  yearFrom: z.number().int().min(1900).max(2100).optional().default(2000),
  maxPapers: z.number().int().min(1).max(25).optional().default(8),
  fullTextMode: z.enum(["none", "open_access", "required"]).optional().default("open_access"),
  maxFullTextPapers: z.number().int().min(0).max(8).optional().default(2),
  maxFullTextCharsPerPaper: z.number().int().min(2000).max(120000).optional().default(60000),
  includeRawCritique: z.boolean().optional().default(false)
});

export const AnalyzeOrgArgumentInput = z.object({
  input: z.string().min(5)
});

export const DetectSolutionFirstThinkingInput = z.object({
  input: z.string().min(5)
});

export const RewriteInDoingsVoiceInput = z.object({
  input: z.string().min(5),
  context: z.string().optional().default("")
});

export const MakeClientSafeInput = z.object({
  input: z.string().min(5),
  saferVersion: z.string().optional(),
  mainRisk: z.string().optional(),
  solutionFirst: z.boolean().optional().default(false)
});

export const SearchResearchEvidenceInput = z.object({
  query: z.string().min(2),
  context: z.string().optional().default(""),
  yearFrom: z.number().int().min(1900).max(2100).optional().default(2000),
  maxResults: z.number().int().min(1).max(25).optional().default(10),
  includeAdjacentFields: z.boolean().optional().default(true),
  fullTextMode: z.enum(["none", "open_access", "required"]).optional().default("none"),
  maxFullTextPapers: z.number().int().min(0).max(8).optional().default(3),
  maxFullTextCharsPerPaper: z.number().int().min(2000).max(120000).optional().default(60000)
});

export const ClassifyClaimsInput = z.object({
  text: z.string().min(20),
  claimTypes: z.array(z.enum(["causal", "normative", "diagnostic", "descriptive", "prescriptive"])).optional()
});

export const RateEvidenceQualityInput = z.object({
  claim: z.string().min(5),
  context: z.string().optional().default(""),
  papers: z.array(z.record(z.unknown())).default([])
});

export const CompareWithDoingsKnowledgeInput = z.object({
  topic: z.string().min(2),
  claim: z.string().optional(),
  context: z.string().optional().default(""),
  maxDocuments: z.number().int().min(1).max(20).optional().default(10)
});


export const SearchDoingsKnowledgeInput = z.object({
  query: z.string().min(2),
  maxDocuments: z.number().int().min(1).max(25).optional().default(10),
  fetchTopDocuments: z.number().int().min(0).max(5).optional().default(0)
});


export const FetchDoingsDocumentInput = z.object({
  url: z.string().url(),
  classifyClaims: z.boolean().optional().default(true),
  auditCitations: z.boolean().optional().default(true),
  validateHighRiskClaims: z.boolean().optional().default(false),
  validationContext: z.string().optional().default(""),
  validationRiskThreshold: z.enum(["high", "medium"]).optional().default("high"),
  maxClaims: z.number().int().min(1).max(100).optional().default(40),
  maxValidations: z.number().int().min(1).max(10).optional().default(5),
  validationYearFrom: z.number().int().min(1900).max(2100).optional().default(2000),
  validationMaxPapers: z.number().int().min(1).max(15).optional().default(8),
  validationFullTextMode: z.enum(["none", "open_access", "required"]).optional().default("open_access"),
  validationMaxFullTextPapers: z.number().int().min(0).max(8).optional().default(3),
  validationRedTeamMode: z.boolean().optional().default(false)
});

export const AuditDoingsDocumentClaimsInput = z.object({
  url: z.string().url().optional(),
  text: z.string().min(20).optional(),
  maxClaims: z.number().int().min(1).max(100).optional().default(40),
  claimTypes: z.array(z.enum(["causal", "normative", "diagnostic", "descriptive", "prescriptive"])).optional(),
  validateHighRiskClaims: z.boolean().optional().default(false),
  validationContext: z.string().optional().default(""),
  validationRiskThreshold: z.enum(["high", "medium"]).optional().default("high"),
  maxValidations: z.number().int().min(1).max(10).optional().default(5),
  validationYearFrom: z.number().int().min(1900).max(2100).optional().default(2000),
  validationMaxPapers: z.number().int().min(1).max(15).optional().default(8),
  validationFullTextMode: z.enum(["none", "open_access", "required"]).optional().default("open_access"),
  validationMaxFullTextPapers: z.number().int().min(0).max(8).optional().default(3),
  validationRedTeamMode: z.boolean().optional().default(false)
});
