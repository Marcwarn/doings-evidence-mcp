const baseUrl = process.env.MCP_BASE_URL;
const token = process.env.MCP_BEARER_TOKEN;
const mcpPath = process.env.MCP_PATH || '/mcp';

if (!baseUrl) {
  console.error('Set MCP_BASE_URL, e.g. https://doings-evidence.example.com');
  process.exit(1);
}
if (!token) {
  console.error('Set MCP_BEARER_TOKEN for authenticated remote smoke test.');
  process.exit(1);
}

const endpoint = new URL(mcpPath, baseUrl).toString();
const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'authorization': `Bearer ${token}`,
    'accept': 'application/json, text/event-stream'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'doings-evidence-smoke-test', version: '0.11.0' }
    }
  })
});

const text = await res.text();
if (!res.ok) {
  console.error(`Remote MCP smoke test failed: HTTP ${res.status}`);
  console.error(text);
  process.exit(1);
}
console.log(`Remote MCP smoke test OK: HTTP ${res.status}`);
console.log(text.slice(0, 1200));
