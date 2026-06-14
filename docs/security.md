# Security notes

Doings Evidence MCP is designed for local-first use with delegated access.

## SharePoint access

- The server uses Microsoft Graph delegated login.
- It reads only files the signed-in user can already access.
- Do not run the server with a broadly privileged service account in v0.x.
- Treat fetched SharePoint material as confidential Doings/client material.

## Research fetching

v0.6 can fetch open-access paper PDFs/HTML/text from metadata-provided URLs.

Operational cautions:

- Fetch only public/open-access URLs returned by research metadata.
- Do not bypass paywalls, authentication gates or publisher access controls.
- Do not treat a successful fetch as license clearance for redistribution.
- Keep extracted full text inside the local analysis flow; avoid copying full paper text into client deliverables.
- Cache cautiously, or do not cache at all, unless rights and retention are clear.

## Output cautions

- Internal Doings documents are method/experience/IP, not academic evidence.
- Citation markers near a claim are not proof that the source supports the claim.
- Open-access full-text escalation improves validation, but is not a systematic review.
- High-stakes or client-facing claims should still be reviewed by a human.

## Recommended local-only defaults

- Use device-code auth for SharePoint.
- Keep `.env` out of git.
- Do not log SharePoint document text by default.
- Limit full-text paper retrieval with `maxFullTextPapers`.
- Use `fullTextMode: "required"` only when manual review will inspect unavailable-source warnings.

## v0.7 evidence-governance notes

- Red-team mode can produce sensitive criticism of internal Doings material. Use it for review, not for direct client-facing copy without human judgment.
- Passage extraction is heuristic. Do not present extracted passages as exact academic quotations unless manually verified against the source PDF/HTML.
- Context-fit scoring is a transferability warning, not a final judgment of applicability.
- Study-type classification is inferred from titles, abstracts and available full text; it can misclassify papers and should be checked for high-stakes claims.

## v0.8 user-facing critique layer

The narrative layer can make outputs feel more authoritative because they are easier to read than raw JSON. Keep these safeguards:

- Always preserve the `productWarning` and `statusLabel` language that this is an exploratory evidence scan, not a systematic review.
- Do not let safer wording become stronger than the underlying evidence.
- Do not present internal SharePoint material as academic evidence.
- Do not use `rewrite_safely` to launder unsupported claims into polished but still misleading prose.
- For high-stakes client claims, prefer `evidence_brief` or `red_team` with `includeRawCritique=true` before publishing.


## v0.9 language-layer safety

The Thinking Interface can make text more client-safe, but it must not be used to hide weak evidence. Client-safe language should preserve uncertainty, boundary conditions and limitations.

Do not use `rewrite_in_doings_voice` or `make_client_safe` to turn unsupported claims into confident sales language. When evidence is weak, the safer version should remain conditional and should say what needs to be tested.
