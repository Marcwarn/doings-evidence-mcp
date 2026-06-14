import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDoingsEvidenceMcpServer } from "./mcpServer.js";

const server = createDoingsEvidenceMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
