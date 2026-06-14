# SharePoint setup for local v0.3

This server uses Microsoft Graph delegated permissions and device-code login.
That means the local user signs in once in the browser, and the MCP server reads only SharePoint/OneDrive content the signed-in user can already access.

## 1. Create or reuse an Entra ID app registration

In Microsoft Entra admin center:

1. App registrations -> New registration.
2. Supported account types: usually single tenant for Doings.
3. Authentication -> Allow public client flows: Yes.
4. API permissions -> Microsoft Graph delegated permissions:
   - `Files.Read.All`
   - `Sites.Read.All`
   - `offline_access`
5. Grant admin consent if your tenant requires it.

Copy:

- Directory / tenant ID -> `MS_TENANT_ID`
- Application / client ID -> `MS_CLIENT_ID`

## 2. Configure local env

```bash
cp .env.example .env
```

Set:

```bash
MS_TENANT_ID=...
MS_CLIENT_ID=...
MS_GRAPH_SCOPES=Files.Read.All Sites.Read.All offline_access
```

## 3. Run

```bash
npm install
npm run dev
```

The first SharePoint query prints a device-code sign-in message to stderr.
Open the URL, enter the code, and sign in with your Doings Microsoft account.

A token cache is stored at `.cache/graph-token.json` by default.
Do not commit this file.

## 4. Tools

### `search_doings_knowledge`

Searches SharePoint/OneDrive via Microsoft Search.

Example input:

```json
{
  "query": "decision rights matrix organization",
  "maxDocuments": 10,
  "fetchTopDocuments": 2
}
```

`fetchTopDocuments` downloads the top N hits and attempts local text extraction.

### `fetch_doings_document`

Fetches a specific SharePoint/OneDrive URL, extracts text if supported, and optionally classifies research-checkable claims.

Example input:

```json
{
  "url": "https://...sharepoint.com/...",
  "classifyClaims": true
}
```

Supported local extraction:

- DOCX: main document, headers, footers and notes where present
- PPTX: slide text
- XLSX: basic shared strings and sheet XML text
- Text-like files: md, txt, csv, json, html
- PDF: basic fallback only; not reliable for production evidence work

## 5. Known limitations

- Microsoft Search snippets are useful for discovery, but not enough for evidence review.
- DOCX/PPTX extraction reads OOXML text and will not preserve layout, tables perfectly or comments.
- PDF extraction is basic and may miss most content in compressed/scanned PDFs.
- Internal Doings material is classified as method/experience/IP unless it explicitly cites research.
- The server currently does not write to SharePoint.

## PDF and citation audit notes

v0.4 uses `pdf-parse` for text PDFs downloaded from SharePoint. This improves ordinary PDF extraction, but scanned/image-only PDFs still require OCR or Azure Document Intelligence before claims can be audited reliably.

Use `audit_doings_document_claims` after fetching a document to identify claims that lack nearby citation markers. Treat the result as a triage signal, not as validation that a source truly supports the claim.
