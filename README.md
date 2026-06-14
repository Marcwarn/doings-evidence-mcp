# Doings Evidence MCP

Doings Evidence MCP is a critical evidence and thinking interface for organizational, leadership and transformation claims.

This repository was initialized from the v0.11 Deployment Chain Package. The full source package is currently available as a ZIP in the ChatGPT workspace while the GitHub repository is being prepared for full import.

## Purpose

Help Doings consultants:

- test whether organizational claims are over-stated
- rewrite claims in a more evidence-honest Doings voice
- detect solution-first thinking
- map weak links in organizational arguments
- produce client-safe language
- use SharePoint and research sources through a remote MCP server

## Deployment target

Planned architecture:

```text
GitHub repo
  -> Azure Container Apps
  -> Remote MCP endpoint
  -> ChatGPT / MCP client
```

## Next setup steps

1. Import the full v0.11 package into this repository.
2. Configure GitHub Actions secrets and variables.
3. Deploy to Azure Container Apps.
4. Test `/health` and `/mcp`.
5. Connect the remote MCP endpoint to ChatGPT or another MCP-compatible client.

See the deployment runbook once the full package is imported.
