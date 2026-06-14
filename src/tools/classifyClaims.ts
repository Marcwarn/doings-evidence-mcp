import { extractAndClassifyClaims } from "../evaluators/claimClassifier.js";

export function classifyClaimsTool(args: { text: string }) {
  return {
    claims: extractAndClassifyClaims(args.text)
  };
}
