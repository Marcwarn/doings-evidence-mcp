const baseUrl = process.env.MCP_BASE_URL ?? 'http://localhost:3000';
const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`);
if (!response.ok) {
  console.error(`Health check failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}
console.log(JSON.stringify(await response.json(), null, 2));
