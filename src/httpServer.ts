import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createDoingsEvidenceMcpServer, SERVER_NAME, SERVER_VERSION } from "./mcpServer.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const MCP_PATH = process.env.MCP_PATH ?? "/mcp";
const REQUIRE_AUTH = (process.env.MCP_REQUIRE_AUTH ?? "true").toLowerCase() !== "false";
const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN;
const ALLOWED_HOSTS = (process.env.MCP_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

function validateEnvironment() {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (REQUIRE_AUTH && !BEARER_TOKEN) {
    errors.push("MCP_REQUIRE_AUTH is enabled but MCP_BEARER_TOKEN is not set.");
  }

  if (!process.env.MS_TENANT_ID) warnings.push("MS_TENANT_ID is not set. SharePoint tools will not work until configured.");
  if (!process.env.MS_CLIENT_ID) warnings.push("MS_CLIENT_ID is not set. SharePoint tools will not work until configured.");

  for (const warning of warnings) console.warn(`[startup warning] ${warning}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`[startup error] ${error}`);
    process.exit(1);
  }
}

function isAuthorized(authorizationHeader: string | undefined) {
  if (!REQUIRE_AUTH) return true;
  if (!BEARER_TOKEN) return false;
  return authorizationHeader === `Bearer ${BEARER_TOKEN}`;
}

validateEnvironment();

const app = createMcpExpressApp({
  host: HOST,
  allowedHosts: ALLOWED_HOSTS.length > 0 ? ALLOWED_HOSTS : undefined
});

app.get("/health", (_req: any, res: any) => {
  res.status(200).json({
    ok: true,
    name: SERVER_NAME,
    version: SERVER_VERSION,
    transport: "streamable-http",
    mcpPath: MCP_PATH,
    sharePointConfigured: Boolean(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID)
  });
});

app.use(MCP_PATH, (req: any, res: any, next: any) => {
  if (!isAuthorized(req.header("authorization"))) {
    res.status(401).json({ error: "Unauthorized. Provide Authorization: Bearer <token>." });
    return;
  }
  next();
});

async function handleMcpRequest(req: any, res: any) {
  const server = createDoingsEvidenceMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error"
        },
        id: null
      });
    }
  }
}

app.post(MCP_PATH, handleMcpRequest);
app.get(MCP_PATH, handleMcpRequest);
app.delete(MCP_PATH, handleMcpRequest);

app.listen(PORT, HOST, (error?: Error) => {
  if (error) {
    console.error("Failed to start Doings Evidence MCP HTTP server:", error);
    process.exit(1);
  }
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on http://${HOST}:${PORT}${MCP_PATH}`);
});
