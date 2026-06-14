import { rateEvidenceQuality } from "../evaluators/evidenceQuality.js";

export function rateEvidenceQualityTool(args: {
  claim: string;
  context?: string;
  papers: Array<Record<string, unknown>>;
}) {
  return rateEvidenceQuality(args);
}
