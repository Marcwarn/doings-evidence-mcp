#!/usr/bin/env bash
set -euo pipefail

# Bootstrap Azure resources and GitHub OIDC for Doings Evidence MCP.
# Run locally after `az login` with an account that can create resource groups,
# app registrations, federated credentials and role assignments.
#
# Usage:
#   chmod +x scripts/bootstrap-azure.sh
#   ./scripts/bootstrap-azure.sh
#
# Optional env overrides:
#   AZURE_LOCATION=swedencentral
#   AZURE_RESOURCE_GROUP=rg-doings-evidence-mcp
#   AZURE_CONTAINER_APP_NAME=doings-evidence-mcp
#   AZURE_CONTAINER_ENVIRONMENT=doings-evidence-env
#   AZURE_CONTAINER_REGISTRY=<globally unique lowercase name>
#   GITHUB_REPO=Marcwarn/doings-evidence-mcp

LOCATION="${AZURE_LOCATION:-swedencentral}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-doings-evidence-mcp}"
CONTAINER_APP_NAME="${AZURE_CONTAINER_APP_NAME:-doings-evidence-mcp}"
CONTAINER_ENVIRONMENT="${AZURE_CONTAINER_ENVIRONMENT:-doings-evidence-env}"
GITHUB_REPO="${GITHUB_REPO:-Marcwarn/doings-evidence-mcp}"

if [[ -z "${AZURE_CONTAINER_REGISTRY:-}" ]]; then
  RAND_SUFFIX=$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 8 || true)
  AZURE_CONTAINER_REGISTRY="doingsevidencemcp${RAND_SUFFIX}"
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

if [[ -z "$SUBSCRIPTION_ID" || -z "$TENANT_ID" ]]; then
  echo "Could not read Azure subscription/tenant. Run: az login" >&2
  exit 1
fi

APP_DISPLAY_NAME="github-actions-${CONTAINER_APP_NAME}"

cat <<EOF
Using configuration:
  subscription:              $SUBSCRIPTION_ID
  tenant:                    $TENANT_ID
  location:                  $LOCATION
  resource group:            $RESOURCE_GROUP
  container registry:        $AZURE_CONTAINER_REGISTRY
  container app environment: $CONTAINER_ENVIRONMENT
  container app:             $CONTAINER_APP_NAME
  github repo:               $GITHUB_REPO
EOF

az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.ContainerRegistry --wait
az provider register --namespace Microsoft.OperationalInsights --wait

az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# Create an Entra app registration for GitHub Actions OIDC.
APP_ID=$(az ad app create \
  --display-name "$APP_DISPLAY_NAME" \
  --query appId \
  -o tsv)

# Create service principal for the app.
az ad sp create --id "$APP_ID" --output none

# Assign Contributor on the resource group so the workflow can deploy resources.
az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --output none

# Federated credential for GitHub Actions on main branch.
az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters "{\"name\":\"github-main\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:${GITHUB_REPO}:ref:refs/heads/main\",\"audiences\":[\"api://AzureADTokenExchange\"]}" \
  --output none

# Create ACR now so the variable exists. The Bicep deployment can update/reference it later.
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AZURE_CONTAINER_REGISTRY" \
  --sku Basic \
  --admin-enabled true \
  --output none

MCP_BEARER_TOKEN=$(openssl rand -base64 48 | tr -d '\n')

cat <<EOF

Azure bootstrap complete.

Add these GitHub repository VARIABLES:

AZURE_RESOURCE_GROUP=$RESOURCE_GROUP
AZURE_LOCATION=$LOCATION
AZURE_CONTAINER_APP_NAME=$CONTAINER_APP_NAME
AZURE_CONTAINER_ENVIRONMENT=$CONTAINER_ENVIRONMENT
AZURE_CONTAINER_REGISTRY=$AZURE_CONTAINER_REGISTRY

Add these GitHub repository SECRETS:

AZURE_CLIENT_ID=$APP_ID
AZURE_TENANT_ID=$TENANT_ID
AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
MCP_BEARER_TOKEN=$MCP_BEARER_TOKEN

For first deploy without SharePoint, set these placeholder SECRETS:

MS_TENANT_ID=$TENANT_ID
MS_CLIENT_ID=$APP_ID

Later, replace MS_CLIENT_ID with the Microsoft Graph / SharePoint app client ID.

Then run:
  GitHub -> Actions -> Deploy Doings Evidence MCP to Azure Container Apps -> Run workflow
EOF
