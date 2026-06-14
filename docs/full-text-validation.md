# Full-text escalation in v0.6

v0.6 adds a conservative full-text escalation layer for research validation.

## What changed

Earlier versions validated claims against retrieved research metadata and abstracts. v0.6 still starts there, but can now attempt to fetch open-access full text for the top matching papers.

The flow is:

1. Search OpenAlex and Semantic Scholar.
2. Prefer OpenAlex records with open-access metadata and PDF/landing-page URLs.
3. Fetch candidate open-access PDF/HTML/text sources.
4. Extract text locally for PDF/HTML/plain text.
5. Attach full-text status to each paper.
6. Use the full text in the heuristic evidence-quality pass when available.
7. Explicitly flag paywalled, blocked, scanned or unavailable full text.

## Modes

`critique_claim` and `search_research_evidence` support:

```json
{
  "fullTextMode": "none | open_access | required",
  "maxFullTextPapers": 3,
  "maxFullTextCharsPerPaper": 60000
}
```

- `none`: metadata/abstract-only validation.
- `open_access`: attempt open-access full-text retrieval where available.
- `required`: same as `open_access`, but returns an error warning if no usable full text is retrieved.

`critique_claim` defaults to `open_access` in v0.6.

## High-risk internal claim validation

`fetch_doings_document` and `audit_doings_document_claims` support:

```json
{
  "validateHighRiskClaims": true,
  "validationFullTextMode": "open_access",
  "validationMaxFullTextPapers": 3
}
```

This means high-risk claims from Doings documents are now validated against metadata/abstracts plus open-access full text when available.

## What this still is not

This is not a systematic literature review. It does not guarantee:

- exhaustive search coverage
- complete full-text access
- correct interpretation of every paper
- verification that a cited source supports the exact sentence in a Doings document
- manual assessment of methods, sample, construct validity and causal identification

The output should still be phrased as first-pass evidence checking, not final academic review.

## Recommended default for Doings

For normal internal review:

```json
{
  "validateHighRiskClaims": true,
  "validationRiskThreshold": "high",
  "validationFullTextMode": "open_access",
  "validationMaxFullTextPapers": 3,
  "maxValidations": 5
}
```

For client-facing or high-stakes claims, use `validationFullTextMode: "required"` and treat `no full text` as a reason for manual review.
