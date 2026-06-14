# Tool Spec

## `critique_org_text`

User-facing critique layer for rough consulting text, pitch/RFP wording, unclear user questions and “can we say this?” prompts.

Input fields:

```json
{
  "input": "string",
  "context": "string optional",
  "mode": "auto | quick_check | rewrite_safely | red_team | evidence_brief",
  "strictness": "low | medium | high",
  "yearFrom": 2000,
  "maxPapers": 10,
  "fullTextMode": "none | open_access | required",
  "maxFullTextPapers": 3,
  "maxFullTextCharsPerPaper": 60000,
  "includeRawCritique": false
}
```

Output fields:

- `mode`: selected critique mode
- `intent`: detected user intent and confidence
- `primaryClaim`: the main claim selected for evidence critique
- `extractedClaims`: extracted/decomposed claims from the input
- `consultingLanguageRisk`: detected vague or over-strong consulting wording
- `narrative`: user-facing answer shaped by the selected mode
- `rawCritique`: optional full `critique_claim` result
- `productWarning`: reminder that this is not a systematic review

## `can_we_say_this`

Fast alias around `critique_org_text` for practical claim checking. Uses the same input fields. Intended for prompts such as:

- “Kan vi säga detta?”
- “Håller den här meningen?”
- “Är detta för starkt?”
- “Låter detta för konsultigt?”

## Critique modes

### `quick_check`

Practical short answer.

Narrative output includes:

- `headline`
- `answer`
- `why`
- `saferVersion`
- `useWithCaution`

### `rewrite_safely`

For improving wording.

Narrative output includes:

- `saferVersion`
- `strongerPattern`
- `changedBecause`
- `keepOut`

### `red_team`

For skeptical review.

Narrative output includes:

- `weakestPoint`
- `skepticalReviewerObjection`
- `alternativeExplanations`
- `stressTest`
- `saferVersion`

### `evidence_brief`

For a fuller evidence-oriented answer.

Narrative output includes:

- `evidenceStatus`
- `supportLevel`
- `contextFit`
- `whatSeemsBetterSupported`
- `mainCautions`
- `boundaryConditions`
- `saferVersion`
- `evidenceStatusLabel`

## `critique_claim`

Critically assesses an organizational claim against available research.

Input fields:

```json
{
  "claim": "string",
  "context": "string optional",
  "strictness": "low | medium | high",
  "yearFrom": 2000,
  "maxPapers": 10,
  "fullTextMode": "none | open_access | required",
  "maxFullTextPapers": 3,
  "maxFullTextCharsPerPaper": 60000,
  "redTeamMode": false
}
```

Output includes:

- `decomposedClaims`: splits compound claims into subclaims where possible
- `levelOfAnalysis`: individual, team, unit, organization, ecosystem or mixed/unclear
- `levelAlignment`: compares claim level with retrieved evidence level
- `contextFit`: high/medium/low/unknown with rationale and missing signals
- `studyTypeProfile`: distribution of inferred study types
- `evidencePassages`: supporting, contradicting, method and limitations passages from open-access full text where available
- `redTeam`: optional skeptical review section
- `statusLabel`: `exploratory_evidence_scan_not_systematic_review`

## `search_research_evidence`

Searches OpenAlex and Semantic Scholar. Optional full-text escalation retrieves open-access PDF/HTML/text when exposed in metadata.

Input fields:

```json
{
  "query": "string",
  "context": "string optional",
  "yearFrom": 2000,
  "maxResults": 10,
  "includeAdjacentFields": true,
  "fullTextMode": "none | open_access | required",
  "maxFullTextPapers": 3,
  "maxFullTextCharsPerPaper": 60000
}
```

## `audit_doings_document_claims`

Audits SharePoint document text or raw text for research-checkable claims, citation markers and unsupported high-risk claims.

Input fields:

```json
{
  "url": "SharePoint/OneDrive URL optional",
  "text": "raw text optional",
  "maxClaims": 40,
  "validateHighRiskClaims": false,
  "validationContext": "string optional",
  "validationRiskThreshold": "high | medium",
  "maxValidations": 5,
  "validationFullTextMode": "none | open_access | required",
  "validationMaxFullTextPapers": 3,
  "validationRedTeamMode": false
}
```

## `fetch_doings_document`

Fetches a SharePoint/OneDrive file, extracts text and can run claim classification, citation audit and high-risk validation.

Input fields mirror `audit_doings_document_claims`, with required `url`.

## `rate_evidence_quality`

Rates evidence quality using a conservative heuristic.

Returns:

- `overallQuality`
- `causalStrength`
- `externalValidity`
- `recencyRisk`
- `publicationBiasRisk`
- `fullTextCoverage`
- `studyTypeCounts`
- `strongestStudyTypes`
- `weakestStudyTypes`
- explanatory notes

## `classify_claims`

Extracts and classifies claims. Includes level of analysis and may decompose compound claims.

## `search_doings_knowledge`

Searches Doings SharePoint knowledge via Microsoft Graph.

## `compare_with_doings_knowledge`

Compares a topic or claim with SharePoint knowledge and flags internal knowledge as experience/IP, not academic evidence.


## v0.9 Thinking Interface tools

### `think_with_evidence`

Default entry point for practical Doings usage. It accepts rough thinking, pitch language, client hypotheses or draft text and returns:

- top-level answer,
- argument map,
- solution-first diagnosis,
- consulting-language risk,
- Doings voice rewrite,
- client-safe and executive language,
- evidence-to-language bridge,
- learning nudge,
- optional raw critique.

Input:

```json
{
  "input": "We think the client needs a flatter organization to become faster.",
  "context": "Nordic professional-services company",
  "mode": "thinking_partner",
  "includeRawCritique": false
}
```

### `analyze_org_argument`

Maps diagnosis, assumed cause, proposed solution, mechanism, desired outcome and missing links.

### `detect_solution_first_thinking`

Flags when a draft jumps to an organizational solution before the problem has been evidenced.

### `rewrite_in_doings_voice`

Rewrites text to be plain-spoken, evidence-honest and non-hype.

### `make_client_safe`

Turns rough or internally critical language into client-safe and executive versions.
