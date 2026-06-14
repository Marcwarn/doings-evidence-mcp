# Remote MCP on Azure

This document describes how to run Doings Evidence MCP as a hosted Streamable HTTP MCP server.

## Mental model

- GitHub stores the code.
- Azure runs the server.
- ChatGPT or another MCP-compatible client connects to the remote MCP URL.
- SharePoint and research sources remain downstream data sources.

Recommended URL shape:

```text
https://<your-host>/mcp
```

Health check:

```text
https://<your-host>/health
```

## Runtime modes

### Local STDIO

Used for local MCP clients that start the server process:

```bash
npm install
npm run build
node dist/server.js
```

### Hosted Streamable HTTP

Used for remote MCP clients:

```bash
npm install
npm run build
MCP_REQUIRE_AUTH=true MCP_BEARER_TOKEN=... npm run start:http
```

## Required environment variables for hosted mode

```bash
PORT=3000
HOST=0.0.0.0
MCP_PATH=/mcp
MCP_REQUIRE_AUTH=true
MCP_BEARER_TOKEN=<long-random-token>
```

For SharePoint tools:

```bash
MS_TENANT_ID=<tenant-id>
MS_CLIENT_ID=<entra-app-client-id>
MS_GRAPH_SCOPES="Files.Read.All Sites.Read.All offline_access"
```

Optional:

```bash
MCP_ALLOWED_HOSTS=<comma-separated-hosts>
OPENALEX_EMAIL=research@doings.se
```

## Docker

Build locally:

```bash
docker build -t doings-evidence-mcp:0.11.0 .
```

Run locally:

```bash
docker run --rm -p 3000:3000 \
  -e MCP_REQUIRE_AUTH=true \
  -e MCP_BEARER_TOKEN=local-test-token \
  doings-evidence-mcp:0.11.0
```

Smoke test:

```bash
curl http://localhost:3000/health
```

## Azure deployment options

Recommended first option: Azure Container Apps.

Why:

- Works naturally with Docker.
- Better fit for a long-running Node service than serverless-only deployment.
- Fits Microsoft Graph / Entra governance better than a generic serverless setup.

Alternative: Azure App Service for Containers.

## Minimal Azure Container Apps flow

1. Create an Azure Container Registry.
2. Build and push the Docker image.
3. Create an Azure Container App from the image.
4. Set environment variables from `deployment/azure-container-app.env.example`.
5. Restrict ingress and configure HTTPS/custom domain.
6. Verify `/health`.
7. Add the remote MCP URL to a compatible MCP client.

## Auth model

v0.10 uses bearer-token protection at the MCP HTTP boundary:

```http
Authorization: Bearer <token>
```

This is good enough for a controlled pilot. Before broad rollout, evaluate OAuth or a gateway that enforces Doings identity and group membership.

## SharePoint permission model

For the first hosted pilot, do not grant the MCP app access to all SharePoint content.

Recommended first scope:

```text
SharePoint site: Doings Evidence Knowledge
Allowed content:
- approved playbooks
- Doings voice guide
- approved case snippets
- RFP snippets
- org-design principles
```

Avoid initially:

```text
- all customer folders
- private OneDrive locations
- entire tenant-wide search
```

## ChatGPT connection

Once hosted, the server should be connected as a remote MCP endpoint if the Doings ChatGPT workspace supports remote MCP configuration.

Typical fields:

```text
Name: Doings Evidence & Thinking
URL: https://<your-host>/mcp
Auth: Bearer token or OAuth, depending on client support
```

Exact UI and admin availability depends on the ChatGPT workspace and MCP connector support.
