import type { ImportedMcpToolRecord, ImportSourceKind, ImportSourceProvider, McpTool } from "./tool-types";

export function slugifyImportValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function normalizeUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value.trim());
    url.hash = "";
    if (url.pathname.endsWith("/") && url.pathname !== "/") url.pathname = url.pathname.slice(0, -1);
    url.hostname = url.hostname.toLowerCase();
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

export function normalizeGitHubUrl(value?: string) {
  const normalized = normalizeUrl(value);
  const match = normalized.match(/github\.com\/([^/?#]+)\/([^/?#]+)/i);
  if (!match) return "";
  return `https://github.com/${match[1].toLowerCase()}/${match[2].replace(/\.git$/i, "").toLowerCase()}`;
}

export function packageNameFromUrl(value?: string) {
  const normalized = normalizeUrl(value);
  if (!normalized) return "";
  const npmMatch = normalized.match(/npmjs\.com\/package\/(.+)$/i);
  if (npmMatch) return decodeURIComponent(npmMatch[1]);
  const pypiMatch = normalized.match(/pypi\.org\/project\/([^/]+)/i);
  if (pypiMatch) return pypiMatch[1];
  return "";
}

export function packageUrlFromName(packageName?: string) {
  if (!packageName) return "";
  if (packageName.startsWith("@") || /^[a-z0-9._-]+$/i.test(packageName)) {
    return `https://www.npmjs.com/package/${encodeURIComponent(packageName).replace("%40", "@").replace("%2F", "/")}`;
  }
  return "";
}

export function sourceLabel(provider: ImportSourceProvider) {
  if (provider === "official_registry") return "Official MCP Registry";
  if (provider === "smithery") return "Smithery";
  if (provider === "glama") return "Glama";
  if (provider === "github_search") return "GitHub search";
  return "Manual CSV";
}

export function providerKind(provider: ImportSourceProvider): ImportSourceKind {
  if (provider === "official_registry") return "official";
  if (provider === "github_search") return "community";
  if (provider === "manual_csv") return "manual";
  return "directory";
}

export function recordSlug(record: ImportedMcpToolRecord) {
  return slugifyImportValue(record.name || record.externalId || record.sourceUrl || "mcp-tool");
}

export function dedupeKeysForRecord(record: ImportedMcpToolRecord) {
  const packageName = record.packageName || packageNameFromUrl(record.packageUrl);
  return [
    normalizeGitHubUrl(record.githubUrl),
    packageName.toLowerCase(),
    normalizeUrl(record.homepageUrl),
    normalizeUrl(record.docsUrl),
    normalizeUrl(record.sourceUrl),
    recordSlug(record),
    slugifyImportValue(record.name),
  ].filter(Boolean);
}

export function dedupeKeysForTool(tool: McpTool) {
  const enrichment = tool.enrichment ?? {};
  const sourceLinks = Array.isArray(enrichment.sourceLinks) ? enrichment.sourceLinks : [];
  const extraUrls = sourceLinks
    .map((link) => (typeof link === "object" && link && "url" in link ? String(link.url) : ""))
    .filter(Boolean);

  return [
    normalizeGitHubUrl(tool.githubUrl),
    packageNameFromUrl(tool.packageUrl).toLowerCase(),
    normalizeUrl(tool.sourceUrl),
    tool.slug,
    slugifyImportValue(tool.name),
    ...extraUrls.map(normalizeUrl),
  ].filter(Boolean);
}

export function mergeUniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
