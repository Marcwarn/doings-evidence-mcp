import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractDocumentText } from "../extractors/documentText.js";

export interface DoingsDocumentHit {
  title: string;
  url?: string;
  snippet?: string;
  materialType?: "method" | "client_case" | "proposal" | "workshop" | "principle" | "template" | "archive" | "unknown";
  source?: "sharepoint" | "placeholder";
  lastModifiedDateTime?: string;
  id?: string;
  driveId?: string;
  mimeType?: string;
}

export interface DoingsDocumentContent extends DoingsDocumentHit {
  text?: string;
  fetchStatus: "ok" | "metadata_only" | "not_configured" | "error";
  extractor?: string;
  warning?: string;
}

interface GraphTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
  message: string;
}

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

function loadDotEnvOnce() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = join(__dirname, "../../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnvOnce();

const DEFAULT_SCOPES = ["Files.Read.All", "Sites.Read.All", "offline_access"];

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function isConfigured(): boolean {
  return Boolean(env("MS_TENANT_ID") && env("MS_CLIENT_ID"));
}

function tokenCachePath(): string {
  const configured = env("MS_TOKEN_CACHE_PATH");
  if (configured) return configured;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, "../../.cache/graph-token.json");
}

function tokenEndpoint(path: "devicecode" | "token"): string {
  const tenantId = env("MS_TENANT_ID") ?? "common";
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/${path}`;
}

function scopes(): string {
  return (env("MS_GRAPH_SCOPES")?.split(/[ ,]+/).filter(Boolean) ?? DEFAULT_SCOPES).join(" ");
}

async function postForm<T>(url: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Microsoft Graph auth failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload as T;
}

async function readCachedToken(): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const parsed = JSON.parse(await readFile(tokenCachePath(), "utf8"));
    if (parsed.accessToken && parsed.expiresAt && parsed.expiresAt > Date.now() + 60_000) {
      return parsed;
    }
  } catch {
    // Cache miss is normal.
  }
  return null;
}

async function writeCachedToken(accessToken: string, expiresInSeconds: number): Promise<void> {
  const path = tokenCachePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    JSON.stringify({ accessToken, expiresAt: Date.now() + expiresInSeconds * 1000 }, null, 2),
    "utf8"
  );
}

async function getDeviceCode(): Promise<DeviceCodeResponse> {
  return postForm<DeviceCodeResponse>(tokenEndpoint("devicecode"), {
    client_id: env("MS_CLIENT_ID")!,
    scope: scopes()
  });
}

async function pollDeviceCode(device: DeviceCodeResponse): Promise<GraphTokenResponse> {
  const started = Date.now();
  while (Date.now() - started < device.expires_in * 1000) {
    await new Promise((resolve) => setTimeout(resolve, device.interval * 1000));
    const response = await fetch(tokenEndpoint("token"), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: env("MS_CLIENT_ID")!,
        device_code: device.device_code
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload as GraphTokenResponse;
    if (payload.error === "authorization_pending" || payload.error === "slow_down") continue;
    throw new Error(`Device-code auth failed: ${JSON.stringify(payload)}`);
  }
  throw new Error("Device-code authentication expired before sign-in completed.");
}

async function getAccessToken(): Promise<string> {
  if (!isConfigured()) {
    throw new Error("SharePoint is not configured. Set MS_TENANT_ID and MS_CLIENT_ID in .env.");
  }

  const cached = await readCachedToken();
  if (cached) return cached.accessToken;

  const device = await getDeviceCode();
  console.error("\nMicrosoft Graph sign-in required for Doings Evidence MCP:");
  console.error(device.message);
  if (device.verification_uri_complete) console.error(`Direct link: ${device.verification_uri_complete}`);
  console.error("");

  const token = await pollDeviceCode(device);
  await writeCachedToken(token.access_token, token.expires_in);
  return token.access_token;
}

async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(path.startsWith("http") ? path : `${GRAPH_ROOT}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Microsoft Graph request failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
}

function inferMaterialType(title: string, snippet = ""): DoingsDocumentHit["materialType"] {
  const haystack = `${title} ${snippet}`.toLowerCase();
  if (/case|kundcase|client/.test(haystack)) return "client_case";
  if (/rfp|proposal|offert|anbud/.test(haystack)) return "proposal";
  if (/workshop|agenda|faciliter/.test(haystack)) return "workshop";
  if (/template|mall/.test(haystack)) return "template";
  if (/playbook|method|metod|framework|principle|princip/.test(haystack)) return "method";
  if (/archive|arkiv|deprecated|old|gammal/.test(haystack)) return "archive";
  return "unknown";
}

function fromSearchHit(hit: any): DoingsDocumentHit {
  const resource = hit.resource ?? {};
  const title = resource.name ?? hit.title ?? "Untitled SharePoint document";
  const snippet = hit.summary ?? resource.summary ?? "";
  return {
    title,
    url: resource.webUrl ?? hit.webUrl,
    snippet,
    materialType: inferMaterialType(title, snippet),
    source: "sharepoint",
    lastModifiedDateTime: resource.lastModifiedDateTime,
    id: resource.id,
    driveId: resource.parentReference?.driveId,
    mimeType: resource.file?.mimeType
  };
}

export async function searchDoingsSharePoint(params: {
  topic: string;
  maxDocuments?: number;
}): Promise<DoingsDocumentHit[]> {
  if (!isConfigured()) {
    return [
      {
        title: "SharePoint connector not configured",
        snippet: "Set MS_TENANT_ID and MS_CLIENT_ID, then run the MCP server. The first query will trigger Microsoft device-code sign-in.",
        materialType: "unknown",
        source: "placeholder"
      }
    ];
  }

  const size = Math.min(Math.max(params.maxDocuments ?? 10, 1), 25);
  const siteId = env("MS_SHAREPOINT_SITE_ID");
  const body: any = {
    requests: [
      {
        entityTypes: ["driveItem"],
        query: { queryString: params.topic },
        from: 0,
        size,
        fields: ["name", "webUrl", "summary", "lastModifiedDateTime", "file", "parentReference"]
      }
    ]
  };
  if (siteId) body.requests[0].sharePointOneDriveOptions = { includeContent: "sharedContent" };

  const result = await graph<any>("/search/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const containers = result.value?.[0]?.hitsContainers ?? [];
  const hits = containers.flatMap((container: any) => container.hits ?? []);
  return hits.map(fromSearchHit);
}

function shareIdFromUrl(url: string): string {
  const encoded = Buffer.from(url, "utf8").toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `u!${encoded}`;
}

async function resolveDriveItemByUrl(url: string): Promise<{ id: string; driveId: string; name?: string; webUrl?: string; file?: { mimeType?: string } }> {
  const item = await graph<any>(`/shares/${shareIdFromUrl(url)}/driveItem`);
  return {
    id: item.id,
    driveId: item.parentReference?.driveId,
    name: item.name,
    webUrl: item.webUrl,
    file: item.file
  };
}

export async function fetchDoingsSharePointDocument(hit: DoingsDocumentHit): Promise<DoingsDocumentContent> {
  if (!isConfigured()) {
    return { ...hit, fetchStatus: "not_configured", warning: "SharePoint connector is not configured." };
  }

  try {
    let driveId = hit.driveId;
    let itemId = hit.id;
    let title = hit.title;
    let mimeType = hit.mimeType;

    if ((!driveId || !itemId) && hit.url) {
      const resolved = await resolveDriveItemByUrl(hit.url);
      driveId = resolved.driveId;
      itemId = resolved.id;
      title = resolved.name ?? title;
      mimeType = resolved.file?.mimeType ?? mimeType;
    }

    if (!driveId || !itemId) {
      return { ...hit, fetchStatus: "metadata_only", warning: "Could not resolve driveId/itemId for document content fetch." };
    }

    const accessToken = await getAccessToken();
    const response = await fetch(`${GRAPH_ROOT}/drives/${driveId}/items/${itemId}/content`, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error(`Content fetch failed (${response.status})`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const extracted = await extractDocumentText({ buffer, mimeType, title });

    if (extracted.extractionStatus === "ok") {
      return {
        ...hit,
        title,
        mimeType,
        text: extracted.text,
        fetchStatus: "ok",
        extractor: extracted.extractor,
        warning: extracted.warning
      };
    }

    return {
      ...hit,
      title,
      mimeType,
      fetchStatus: "metadata_only",
      extractor: extracted.extractor,
      warning: extracted.warning ?? "Document content was fetched, but local text extraction did not produce usable text."
    };
  } catch (error) {
    return { ...hit, fetchStatus: "error", warning: error instanceof Error ? error.message : String(error) };
  }
}


export async function fetchDoingsSharePointDocumentByUrl(url: string): Promise<DoingsDocumentContent> {
  return fetchDoingsSharePointDocument({ title: "SharePoint document", url, source: "sharepoint", materialType: "unknown" });
}
