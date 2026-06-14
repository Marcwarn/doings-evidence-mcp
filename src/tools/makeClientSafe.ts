import { makeClientSafe } from "../evaluators/clientSafeLanguage.js";
export function makeClientSafeTool(args: { input: string; saferVersion?: string; mainRisk?: string; solutionFirst?: boolean }) { return makeClientSafe(args); }
