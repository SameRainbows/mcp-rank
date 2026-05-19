import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const GLAMA_API_URL = "https://glama.ai/api/mcp/v1/servers";
const PAGE_SIZE = 100;
const DEFAULT_DELAY_MS = 250;
const outputDir = resolve(process.cwd(), "public/indexes/glama");

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

const options = {
  limit: Number(argValue("limit", hasArg("full") ? "0" : "0")),
  delayMs: Number(argValue("delay", String(DEFAULT_DELAY_MS))),
};

if (!Number.isFinite(options.limit) || options.limit < 0) options.limit = 0;
if (!Number.isFinite(options.delayMs) || options.delayMs < 0) options.delayMs = DEFAULT_DELAY_MS;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function asRecord(value) {
  return value && typeof value === "object" ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function compactText(value, maxLength = 640) {
  return asString(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value).trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.endsWith("/") && url.pathname !== "/") url.pathname = url.pathname.slice(0, -1);
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value).trim().replace(/\/$/, "");
  }
}

function normalizeGitHubUrl(value) {
  const normalized = normalizeUrl(value);
  const match = normalized.match(/github\.com\/([^/?#]+)\/([^/?#]+)/i);
  if (!match) return "";
  return `https://github.com/${match[1].toLowerCase()}/${match[2].replace(/\.git$/i, "").toLowerCase()}`;
}

function slugify(value) {
  return String(value || "mcp-server")
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => asString(value).trim()).filter(Boolean))];
}

function normalizeServer(server, generatedAt) {
  const repository = asRecord(server.repository);
  const license = asRecord(server.spdxLicense);
  const namespace = compactText(server.namespace, 120);
  const externalId = compactText(server.id || server.slug || server.name, 140);
  const glamaSlug = compactText(server.slug || server.name || externalId, 140);
  const name = compactText(server.name || glamaSlug, 180);
  const sourceUrl = normalizeUrl(server.url) || `https://glama.ai/mcp/servers/${externalId || glamaSlug}`;
  const repositoryUrl = normalizeUrl(repository.url);
  const attributes = uniqueStrings(asArray(server.attributes)).slice(0, 24);
  const tools = asArray(server.tools);

  return {
    slug: slugify(namespace ? `${namespace}-${glamaSlug}` : glamaSlug),
    name,
    description: compactText(server.description, 700),
    source: "Glama",
    sourceUrl,
    repositoryUrl,
    namespace,
    license: compactText(license.name, 160),
    licenseUrl: normalizeUrl(license.url),
    attributes,
    toolsCount: tools.length,
    externalId,
    importedAt: generatedAt,
    lastSeenAt: generatedAt,
  };
}

function dedupeKeys(record) {
  return uniqueStrings([
    record.externalId ? `glama:${record.externalId}` : "",
    normalizeGitHubUrl(record.repositoryUrl),
    record.slug,
    slugify(record.name),
  ]);
}

function evidenceScore(record) {
  return (
    (record.repositoryUrl ? 10_000 : 0) +
    Math.min(record.description.length, 2_000) +
    record.attributes.length * 25 +
    record.toolsCount * 10 +
    (record.license ? 50 : 0)
  );
}

function shardKey(record) {
  const first = (record.slug || record.name || "").charAt(0).toLowerCase();
  if (/^[a-z]$/.test(first)) return first;
  if (/^[0-9]$/.test(first)) return "0-9";
  return "other";
}

async function fetchPage(cursor) {
  const url = new URL(GLAMA_API_URL);
  url.searchParams.set("first", String(PAGE_SIZE));
  if (cursor) url.searchParams.set("after", cursor);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Glama returned ${response.status}`);
  const data = asRecord(await response.json());
  return {
    servers: asArray(data.servers),
    pageInfo: asRecord(data.pageInfo),
  };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

async function main() {
  const generatedAt = new Date().toISOString();
  const byKey = new Map();
  const records = [];
  let cursor = "";
  let page = 0;
  let fetched = 0;
  let duplicates = 0;
  let hasNextPage = true;

  while (hasNextPage) {
    if (options.limit > 0 && fetched >= options.limit) break;
    page += 1;
    const result = await fetchPage(cursor);
    const remaining = options.limit > 0 ? Math.max(0, options.limit - fetched) : result.servers.length;
    const pageRecords = result.servers.slice(0, remaining).map((server) => normalizeServer(server, generatedAt));
    let pageInserted = 0;
    let pageDuplicates = 0;

    for (const record of pageRecords) {
      fetched += 1;
      const keys = dedupeKeys(record);
      const duplicateIndex = keys.map((key) => byKey.get(key)).find((index) => index !== undefined);
      if (duplicateIndex === undefined) {
        const index = records.push(record) - 1;
        for (const key of keys) byKey.set(key, index);
        pageInserted += 1;
        continue;
      }

      duplicates += 1;
      pageDuplicates += 1;
      if (evidenceScore(record) > evidenceScore(records[duplicateIndex])) {
        records[duplicateIndex] = record;
        for (const key of keys) byKey.set(key, duplicateIndex);
      }
    }

    cursor = asString(result.pageInfo.endCursor);
    hasNextPage = result.pageInfo.hasNextPage === true && Boolean(cursor);
    console.log(
      `page=${page} fetched=${pageRecords.length} totalFetched=${fetched} unique=${records.length} duplicates=${duplicates} pageInserted=${pageInserted} pageDuplicates=${pageDuplicates} hasNext=${hasNextPage}`,
    );

    if (!pageRecords.length || (options.limit > 0 && fetched >= options.limit)) break;
    if (hasNextPage && options.delayMs > 0) await sleep(options.delayMs);
  }

  if (existsSync(outputDir)) rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const shardMap = new Map();
  for (const record of records.sort((a, b) => a.name.localeCompare(b.name))) {
    const key = shardKey(record);
    const shard = shardMap.get(key) ?? [];
    shard.push(record);
    shardMap.set(key, shard);
  }

  const shardOrder = [..."abcdefghijklmnopqrstuvwxyz".split(""), "0-9", "other"];
  const shards = [];
  for (const key of shardOrder) {
    const shard = shardMap.get(key) ?? [];
    if (!shard.length) continue;
    const file = `${key}.json`;
    writeJson(resolve(outputDir, file), shard);
    shards.push({ key, file, count: shard.length });
  }

  writeJson(resolve(outputDir, "manifest.json"), {
    version: 1,
    provider: "glama",
    generatedAt,
    fetched,
    count: records.length,
    duplicates,
    pageSize: PAGE_SIZE,
    shards,
  });

  console.log(`Wrote ${records.length} unique Glama indexed records to ${outputDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
