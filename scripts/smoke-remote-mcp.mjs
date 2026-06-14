const baseUrl = (process.env.MCP_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const token = process.env.MCP_BEARER_TOKEN;
const headers = { 'content-type': 'application/json' };
if (token) headers.authorization = `Bearer ${token}`;
const response = await fetch(`${baseUrl}/mcp`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'doings-evidence-smoke', version: '0.1.0' }
    }
  })
});
const text = await response.text();
if (!response.ok) {
  console.error(text);
  process.exit(1);
}
const payload = JSON.parse(text);
console.log(`Remote MCP smoke test OK: HTTP ${response.status}`);
console.log(`serverInfo: ${payload.result?.serverInfo?.name} v${payload.result?.serverInfo?.version}`);
