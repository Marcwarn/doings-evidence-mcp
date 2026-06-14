import { rewriteInDoingsVoice } from "../evaluators/doingsVoice.js";
export function rewriteInDoingsVoiceTool(args: { input: string; context?: string }) { return rewriteInDoingsVoice(args.input, args.context); }
