# High-risk claim validation

v0.6 adds risk-triggered research validation with optional open-access full-text escalation.

The citation audit still does only one thing: it checks whether a research-checkable claim has a nearby source marker. A nearby DOI, URL or author-year citation is not proof that the source supports the claim.

The validation layer adds a second pass:

1. Extract research-checkable claims from a Doings document or raw text.
2. Detect citation markers near each claim.
3. Mark unsupported or weakly sourced claims as `supportRisk: high` or `supportRisk: medium`.
4. Send selected high-risk claims into `critique_claim`.
5. `critique_claim` runs OpenAlex and Semantic Scholar search.
6. When enabled, it attempts to fetch open-access full text for the top matching papers.
7. It rates evidence quality and returns a skeptical verdict with explicit full-text coverage warnings.

## Tools that can trigger validation

Both of these tools accept `validateHighRiskClaims: true`:

- `audit_doings_document_claims`
- `fetch_doings_document`

Example:

```json
{
  "url": "https://...sharepoint.com/...",
  "maxClaims": 50,
  "validateHighRiskClaims": true,
  "validationContext": "Nordic professional-services company, 50-150 employees, project-based client delivery",
  "validationRiskThreshold": "high",
  "maxValidations": 5,
  "validationYearFrom": 2000,
  "validationMaxPapers": 8,
  "validationFullTextMode": "open_access",
  "validationMaxFullTextPapers": 3
}
```

## Risk thresholds

`validationRiskThreshold: "high"` validates only claims with no explicit source marker.

`validationRiskThreshold: "medium"` validates both claims with no source marker and claims where the document contains citations but none are close to the specific claim. This is stricter and slower.

## Full-text modes

- `validationFullTextMode: "none"` uses metadata/abstracts only.
- `validationFullTextMode: "open_access"` attempts open-access full-text retrieval.
- `validationFullTextMode: "required"` flags validation as insufficient if no usable full text is retrieved.

## Interpretation

The output should be read as:

- citation audit: does the document visibly source the claim?
- research validation: does retrieved academic research appear to support, weaken or complicate the claim?
- full-text coverage: did the server actually inspect open-access full text, or only metadata/abstracts?

It is still not a systematic literature review. For high-stakes use, manually inspect the most relevant papers, methods, samples and original Doings document context.
