# Doings Evidence MCP

## v0.9 Thinking Interface

The default user-facing tool is now `think_with_evidence`. It helps Doings users think, phrase, challenge and make organizational arguments client-safe. It builds on the evidence engine, but adds:

- argument mapping,
- solution-first detection,
- Doings voice rewriting,
- client-safe language,
- evidence-to-language translation,
- learning nudges that teach better reasoning patterns.

Example:

```json
{
  "input": "We think the client needs a flatter organization to become faster.",
  "context": "Nordic professional-services company, 50-150 employees, project-based client delivery",
  "mode": "thinking_partner"
}
```

The tool should respond by mapping the reasoning, flagging solution-first risk, asking where speed is actually lost, and producing Doings-voice and client-safe language.

See `docs/v0.9-thinking-interface.md`.

Local MCP server for critical evidence assessment of organization-design, leadership and transformation claims.

Current version: **0.11.0**


## v0.11 deployment chain

v0.11 adds a GitHub -> Azure -> remote MCP deployment chain:

- GitHub Actions workflow for Azure Container Apps
- Bicep infrastructure template
- remote MCP smoke test
- deployment runbook

Start with `docs/deploy-chain-runbook.md`.

## Purpose

Doings Evidence MCP is a critical evidence editor for organizational thinking. It helps Doings distinguish between:

- academic research
- internal experience / IP
- practical heuristics
- unsupported consulting claims
- claims that are plausible but overstated
- text that is usable only with caveats and safer wording

It is not a recommendation generator and it is not a systematic literature review engine.

## v0.9 highlights

v0.9 adds a user-facing critique layer on top of the v0.7 evidence engine:

- intent detection for rough user questions and draft text
- critique modes: `quick_check`, `rewrite_safely`, `red_team`, `evidence_brief`
- `critique_org_text` tool for day-to-day consulting text
- `can_we_say_this` fast check alias
- consulting-language risk detector
- safer-phrasing generator
- narrative response layer that explains what to say, what to avoid and why

## Core tools

### `critique_org_text`

Best default tool for human questions, pitch/RFP sentences, rough consulting text and “can we say this?” prompts.

Example:

```json
{
  "input": "Autonomous teams unlock agility and reduce the need for middle management.",
  "context": "Nordic professional-services company, 50-150 employees, project-based client delivery, senior expert dependency.",
  "mode": "auto",
  "includeRawCritique": false
}
```

Output includes:

- detected user intent
- selected critique mode
- primary claim extracted from the text
- consulting-language risk
- narrative answer
- safer version
- caveats and warnings

### `can_we_say_this`

Fast practical check for whether a claim or draft sentence is safe enough to say. It uses the same schema as `critique_org_text` but defaults to practical quick-check behavior.

### `critique_claim`

Research-heavy tool for a specific explicit claim.

Example:

```json
{
  "claim": "Autonomous teams make organizations more agile and reduce the need for middle management.",
  "context": "Nordic professional-services company, 50-150 employees, project-based client delivery, senior expert dependency.",
  "strictness": "high",
  "yearFrom": 2000,
  "maxPapers": 10,
  "fullTextMode": "open_access",
  "maxFullTextPapers": 3,
  "redTeamMode": true
}
```

Output includes:

- `decomposedClaims`
- `levelOfAnalysis`
- `levelAlignment`
- `contextFit`
- `studyTypeProfile`
- `evidencePassages`
- `redTeam`
- `statusLabel: exploratory_evidence_scan_not_systematic_review`

### `search_research_evidence`

Searches OpenAlex and Semantic Scholar, optionally escalating to open-access full text.

### `fetch_doings_document`

Fetches one SharePoint/OneDrive document, extracts local text when possible, and can classify, audit and validate high-risk claims.

### `audit_doings_document_claims`

Audits raw text or SharePoint document text for research-checkable claims, nearby citation markers and high-risk unsupported claims.

Use:

```json
{
  "validateHighRiskClaims": true,
  "validationFullTextMode": "open_access",
  "validationRedTeamMode": true
}
```

### `rate_evidence_quality`

Returns a conservative heuristic rating with study-type profile and full-text coverage.

## Critique modes

### `quick_check`

For “kan vi säga detta?” or one rough claim.

Returns a short verdict, why it is risky or usable, safer wording and use-with-caution notes.

### `rewrite_safely`

For pitch/RFP/report wording.

Returns a research-honest rewrite, what changed and what not to imply.

### `red_team`

For finding the weak points.

Returns the most vulnerable assumption, likely skeptical objections, alternative explanations and a stress test.

### `evidence_brief`

For “vad säger forskningen?”

Returns an evidence status, what is better supported, cautions, boundary conditions and safer formulation.

## Run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm start
```

## Environment

Copy `.env.example` to `.env` and configure Microsoft Graph if using SharePoint tools.

```bash
cp .env.example .env
```

Minimum SharePoint variables:

```bash
MS_TENANT_ID=...
MS_CLIENT_ID=...
MS_GRAPH_SCOPES=Files.Read.All Sites.Read.All offline_access
```

## Research sources

- OpenAlex for broad scholarly metadata and open-access locations
- Semantic Scholar for additional academic search and abstracts
- Open-access PDF/HTML/text fetching when available

## Important limitations

This is an exploratory evidence scan, not a systematic literature review. It does not perform formal inclusion/exclusion coding, PRISMA-style review, quality appraisal by multiple reviewers or exhaustive full-text search. Treat outputs as a critical first-pass assessment.

## v0.10 remote-ready deployment

v0.10 can run in two modes:

```bash
# Local MCP / STDIO
npm run build
npm run start

# Hosted MCP / Streamable HTTP
MCP_REQUIRE_AUTH=true MCP_BEARER_TOKEN=<token> npm run start:http
```

Hosted endpoints:

```text
GET  /health
POST /mcp
GET  /mcp
DELETE /mcp
```

See:

```text
docs/remote-mcp-azure.md
docs/github-setup.md
docs/v0.10-remote-ready.md
deployment/example-client-config.local.json
deployment/example-client-config.remote.json
```

Recommended path:

```text
GitHub repo -> Azure Container Apps -> remote MCP URL -> ChatGPT / MCP-compatible client
```
