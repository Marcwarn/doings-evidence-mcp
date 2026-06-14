const baseUrl = process.env.MCP_BASE_URL || 'http://127.0.0.1:3000';
const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`);
const text = await response.text();
if (!response.ok) {
  console.error(text);
  process.exit(1);
}
console.log(text);
