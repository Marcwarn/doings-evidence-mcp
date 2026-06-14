# Azure CLI setup for Doings Evidence MCP

This document explains the Azure setup needed before the GitHub Actions deployment can run.

## Why this is needed

The GitHub workflow needs to authenticate to Azure and deploy Azure Container Apps. The GitHub repository cannot invent these values by itself; they come from your Azure tenant/subscription.

You need:

- An Azure subscription
- A resource group
- An Azure Container Registry name
- A Container Apps environment name
- An Entra app registration with a federated credential for GitHub Actions OIDC
- A bearer token for protecting the MCP endpoint

## Fast path: bootstrap script

From a local checkout of the repository:

```bash
az login
az account set --subscription "<your-subscription-id-or-name>"
chmod +x scripts/bootstrap-azure.sh
./scripts/bootstrap-azure.sh
```

The script will:

1. Register required Azure providers.
2. Create the resource group.
3. Create an Entra app registration for GitHub Actions.
4. Create a service principal.
5. Assign Contributor on the resource group.
6. Create a federated credential for this GitHub repo's `main` branch.
7. Create an Azure Container Registry.
8. Generate a random `MCP_BEARER_TOKEN`.
9. Print the GitHub variables and secrets you need to paste into the repo.

## Default names

The script defaults to:

```text
AZURE_LOCATION=swedencentral
AZURE_RESOURCE_GROUP=rg-doings-evidence-mcp
AZURE_CONTAINER_APP_NAME=doings-evidence-mcp
AZURE_CONTAINER_ENVIRONMENT=doings-evidence-env
GITHUB_REPO=Marcwarn/doings-evidence-mcp
```

The container registry name must be globally unique. If you do not set `AZURE_CONTAINER_REGISTRY`, the script generates a name such as:

```text
doingsevidencemcp8x7a2kq1
```

## GitHub repository variables

After the script completes, add these under:

```text
GitHub -> repo -> Settings -> Secrets and variables -> Actions -> Variables
```

```text
AZURE_RESOURCE_GROUP
AZURE_LOCATION
AZURE_CONTAINER_APP_NAME
AZURE_CONTAINER_ENVIRONMENT
AZURE_CONTAINER_REGISTRY
```

## GitHub repository secrets

Add these under:

```text
GitHub -> repo -> Settings -> Secrets and variables -> Actions -> Secrets
```

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
MCP_BEARER_TOKEN
MS_TENANT_ID
MS_CLIENT_ID
```

For the first deploy, SharePoint can be a placeholder:

```text
MS_TENANT_ID=<same as AZURE_TENANT_ID>
MS_CLIENT_ID=<same as AZURE_CLIENT_ID>
```

This lets the server deploy and expose `/health` and `/mcp` before Microsoft Graph / SharePoint is fully configured.

Later, replace `MS_CLIENT_ID` with the proper Microsoft Graph / SharePoint app client ID and grant it the intended SharePoint permissions.

## Then deploy

Run:

```text
GitHub -> Actions -> Deploy Doings Evidence MCP to Azure Container Apps -> Run workflow
```

After deployment, the workflow prints:

```text
https://<fqdn>/health
https://<fqdn>/mcp
```

Test locally:

```bash
MCP_BASE_URL=https://<fqdn> npm run smoke:health
MCP_BASE_URL=https://<fqdn> MCP_BEARER_TOKEN=<token> npm run smoke:remote
```

## Security note

Do not give the MCP broad SharePoint access initially. First deploy without SharePoint. Then create a narrow, approved SharePoint site or document library for Doings Evidence material.
