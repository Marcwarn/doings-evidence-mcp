# GitHub setup

Suggested repository name:

```text
doings-evidence-mcp
```

Recommended branches:

```text
main      stable releases
develop   active development
```

Recommended tags:

```text
v0.9.0    Thinking Interface
v0.11.0   Remote-ready Azure MCP
```

Do not commit:

```text
.env
node_modules
dist
local token caches
customer documents
raw SharePoint exports
```

Recommended initial GitHub issues:

1. Configure Azure Container Apps deployment.
2. Decide SharePoint permission scope.
3. Verify ChatGPT remote MCP connection path.
4. Pilot with 2-3 Doings users.
5. Decide OAuth vs bearer-token auth for wider rollout.
