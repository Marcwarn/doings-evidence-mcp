import { createServer, IncomingMessage, ServerResponse } from "node:http";

const name = "doings-evidence-mcp";
const version = "0.11.0";
const mcpPath = process.env.MCP_PATH || "/mcp";
const port = Number(process.env.PORT || 3000);
const requireAuth = process.env.MCP_REQUIRE_AUTH === "true";
const bearerToken = process.env.MCP_BEARER_TOKEN;

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS"
  });
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage): boolean {
  if (!requireAuth) return true;
  const expected = `Bearer ${bearerToken}`;
  return Boolean(bearerToken && req.headers.authorization === expected);
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function listTools() {
  return [
    {
      name: "think_with_evidence",
      description: "Doings thinking interface: critique, sharpen and rewrite organizational reasoning with evidence-honest, client-safe language.",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string", description: "The rough claim, client hypothesis, pitch text or question to think through." },
          context: { type: "string", description: "Optional organizational/client context." },
          mode: { type: "string", enum: ["auto", "thinking_partner", "quick_check", "rewrite_safely", "red_team", "evidence_brief"] }
        },
        required: ["input"]
      }
    },
    {
      name: "can_we_say_this",
      description: "Quickly checks whether a proposed organizational statement is too strong, too vague, or client-safe.",
      inputSchema: {
        type: "object",
        properties: {
          statement: { type: "string" },
          context: { type: "string" }
        },
        required: ["statement"]
      }
    }
  ];
}

function critique(input: string, context?: string) {
  const lower = input.toLowerCase();
  const riskyPhrases = ["unlock", "future-proof", "empower", "drive transformation", "creates alignment", "reduce the need for management", "flat", "flatter", "autonomous teams", "agility"];
  const found = riskyPhrases.filter((p) => lower.includes(p));
  const solutionFirst = ["need a flatter", "autonomous teams", "squads", "tribes", "matrix", "operating model"].some((p) => lower.includes(p));
  return {
    headline: solutionFirst ? "Start with the friction, not the organizational solution." : "This can be said, but make the mechanism and boundaries explicit.",
    criticalRead: solutionFirst
      ? "The wording appears to name a solution before the underlying friction, causal mechanism and evidence have been established."
      : "The statement may be usable if it avoids broad causal claims and specifies conditions, mechanisms and trade-offs.",
    consultingLanguageRisk: found.map((phrase) => ({ phrase, risk: "May imply broad causality or vague value creation without mechanism." })),
    weakestLink: "The likely weak point is moving from an attractive organizational idea to an organization-level performance outcome without showing the mechanism.",
    betterQuestions: [
      "Where exactly does the work get stuck: decisions, handovers, prioritization, staffing, dependencies or accountability?",
      "Which decision rights should move closer to the work, and which coordination mechanisms must remain explicit?",
      "What management work creates flow, and what management work creates delay?"
    ],
    clientSafeVersion: "We should first locate where the work actually gets stuck. Sometimes structure is part of the answer, but often the issue is decision rights, dependencies, prioritization or accountability.",
    doingsVoice: "Frågan är inte först vilken organisationsmodell vi ska införa. Frågan är var arbetet fastnar – och vilken typ av styrning som hjälper flödet snarare än bromsar det.",
    evidenceHonesty: "Treat this as an exploratory evidence scan unless the full research tools are connected. Do not present it as a systematic literature review.",
    context: context || null
  };
}

async function handleMcp(req: IncomingMessage, res: ServerResponse) {
  if (!isAuthorized(req)) return sendJson(res, 401, { error: "Unauthorized" });
  if (req.method === "GET") {
    return sendJson(res, 200, { name, version, transport: "streamable-http", mcpPath, tools: listTools().map((t) => t.name) });
  }
  if (req.method === "DELETE") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const body = await readJson(req);
  const id = body.id ?? null;
  const method = body.method;
  if (method === "initialize") {
    return sendJson(res, 200, {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2025-06-18",
        serverInfo: { name, version },
        capabilities: { tools: {} }
      }
    });
  }
  if (method === "tools/list") {
    return sendJson(res, 200, { jsonrpc: "2.0", id, result: { tools: listTools() } });
  }
  if (method === "tools/call") {
    const toolName = body.params?.name;
    const args = body.params?.arguments || {};
    const input = args.input || args.statement || "";
    const result = critique(String(input), args.context);
    return sendJson(res, 200, {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: false
      }
    });
  }
  return sendJson(res, 200, { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return sendJson(res, 204, {});
    if (req.url === "/health") {
      return sendJson(res, 200, {
        ok: true,
        name,
        version,
        transport: "streamable-http",
        mcpPath,
        authRequired: requireAuth,
        sharePointConfigured: Boolean(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID)
      });
    }
    if (req.url === mcpPath) return handleMcp(req, res);
    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`${name} ${version} listening on :${port} with MCP path ${mcpPath}`);
});
