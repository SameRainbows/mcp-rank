import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GLAMA_API_URL = "https://glama.ai/api/mcp/v1/servers";
const PAGE_SIZE = 100;
const DEFAULT_DELAY_MS = 250;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultStatePath = resolve(scriptDir, ".glama-import-state.json");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

const options = {
  full: hasArg("full"),
  dryRun: hasArg("dry-run"),
  resetState: hasArg("reset-state"),
  verifyOnly: hasArg("verify-only"),
  limit: Number(argValue("limit", hasArg("full") ? "0" : "100")),
  delayMs: Number(argValue("delay", String(DEFAULT_DELAY_MS))),
  statePath: resolve(process.cwd(), argValue("state", defaultStatePath)),
};

if (!Number.isFinite(options.limit) || options.limit < 0) options.limit = 100;
if (!Number.isFinite(options.delayMs) || options.delayMs < 0) options.delayMs = DEFAULT_DELAY_MS;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
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

function packageNameFromUrl(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return "";
  const npmMatch = normalized.match(/npmjs\.com\/package\/(.+)$/i);
  if (npmMatch) return decodeURIComponent(npmMatch[1]).toLowerCase();
  const pypiMatch = normalized.match(/pypi\.org\/project\/([^/]+)/i);
  if (pypiMatch) return pypiMatch[1].toLowerCase();
  return "";
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

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function readState(path) {
  if (options.resetState || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function writeState(path, state) {
  writeFileSync(path, JSON.stringify(state, null, 2));
}

function sourceLink(record) {
  return {
    provider: "glama",
    kind: "directory",
    label: "Glama",
    url: record.externalUrl,
    externalId: record.externalId,
    lastSeenAt: record.lastSeenAt,
  };
}

function normalizeGlamaServer(server) {
  const repository = asRecord(server.repository);
  const license = asRecord(server.spdxLicense);
  const namespace = asString(server.namespace);
  const glamaSlug = asString(server.slug) || asString(server.name) || asString(server.id);
  const attributes = asArray(server.attributes).filter((attribute) => typeof attribute === "string");
  const tools = asArray(server.tools);
  const externalUrl = asString(server.url) || `https://glama.ai/mcp/servers/${asString(server.id) || glamaSlug}`;

  return {
    externalSource: "glama",
    externalId: asString(server.id) || glamaSlug,
    externalUrl,
    name: asString(server.name) || glamaSlug,
    namespace,
    slug: slugify(namespace ? `${namespace}-${glamaSlug}` : glamaSlug),
    description: asString(server.description),
    repositoryUrl: asString(repository.url),
    packageUrl: asString(server.packageUrl) || "",
    license: asString(license.name),
    licenseUrl: asString(license.url),
    attributes,
    toolsCount: tools.length,
    rawMetadata: server,
    importedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
}

function dedupeKeysForRecord(record) {
  return uniqueStrings([
    `glama:${record.externalId}`,
    normalizeGitHubUrl(record.repositoryUrl),
    packageNameFromUrl(record.packageUrl),
    normalizeUrl(record.externalUrl),
    record.slug,
    slugify(record.name),
  ]);
}

function dedupeKeysForTool(tool) {
  const enrichment = asRecord(tool.enrichment);
  const importSources = asArray(enrichment.importSources);
  const sourceLinks = asArray(enrichment.sourceLinks);
  const rawGlama = asRecord(asRecord(enrichment.rawImports).glama);

  return uniqueStrings([
    rawGlama.id ? `glama:${rawGlama.id}` : "",
    ...importSources.map((source) => {
      const item = asRecord(source);
      return item.provider === "glama" && item.externalId ? `glama:${item.externalId}` : "";
    }),
    normalizeGitHubUrl(tool.github_url),
    packageNameFromUrl(tool.package_url),
    normalizeUrl(tool.source_url),
    tool.slug,
    slugify(tool.name),
    ...sourceLinks.map((link) => normalizeUrl(asRecord(link).url)),
  ]);
}

function mergeMetadata(existing, record) {
  const enrichment = asRecord(existing.enrichment);
  const importSources = asArray(enrichment.importSources).filter((source) => source && typeof source === "object");
  const sourceLinks = asArray(enrichment.sourceLinks).filter((link) => link && typeof link === "object");
  const importKey = `glama:${record.externalId}`;

  const importSourceMap = new Map();
  for (const source of importSources) {
    const item = asRecord(source);
    const key = String(item.key || `${item.provider}:${item.externalId || item.sourceUrl || item.url}`);
    if (key) importSourceMap.set(key, item);
  }
  importSourceMap.set(importKey, {
    key: importKey,
    provider: "glama",
    kind: "directory",
    sourceUrl: record.externalUrl,
    externalId: record.externalId,
    namespace: record.namespace,
    lastSeenAt: record.lastSeenAt,
  });

  const sourceLinkMap = new Map();
  for (const link of sourceLinks) {
    const item = asRecord(link);
    const url = asString(item.url);
    if (url) sourceLinkMap.set(url, item);
  }
  sourceLinkMap.set(record.externalUrl, sourceLink(record));
  if (record.repositoryUrl) {
    sourceLinkMap.set(record.repositoryUrl, {
      provider: "glama",
      kind: "repository",
      label: "GitHub repo",
      url: record.repositoryUrl,
      externalId: record.externalId,
      lastSeenAt: record.lastSeenAt,
    });
  }
  if (record.licenseUrl) {
    sourceLinkMap.set(record.licenseUrl, {
      provider: "glama",
      kind: "license",
      label: "License",
      url: record.licenseUrl,
      externalId: record.externalId,
      lastSeenAt: record.lastSeenAt,
    });
  }

  return {
    ...enrichment,
    importedAt: typeof enrichment.importedAt === "string" ? enrichment.importedAt : record.importedAt,
    lastSeenAt: record.lastSeenAt,
    sourceKind: typeof enrichment.sourceKind === "string" ? enrichment.sourceKind : "directory",
    externalId: typeof enrichment.externalId === "string" ? enrichment.externalId : record.externalId,
    externalSource: "glama",
    namespace: record.namespace || enrichment.namespace || "",
    tags: uniqueStrings([...(Array.isArray(enrichment.tags) ? enrichment.tags : []), ...record.attributes]),
    attributes: uniqueStrings([...(Array.isArray(enrichment.attributes) ? enrichment.attributes : []), ...record.attributes]),
    toolCount: record.toolsCount,
    licenseUrl: record.licenseUrl,
    importSources: [...importSourceMap.values()],
    sourceLinks: [...sourceLinkMap.values()],
    rawImports: {
      ...asRecord(enrichment.rawImports),
      glama: record.rawMetadata,
    },
  };
}

async function ensureSchema(sql) {
  await sql`alter table mcp_tools add column if not exists review_depth text not null default 'indexed'`;
}

async function loadExistingIndex(sql) {
  const rows = await sql`
    select slug, name, source_url, github_url, package_url, license, status, review_depth,
      trust_score, confidence_score, last_reviewed_at::text, enrichment
    from mcp_tools
  `;

  const index = new Map();
  for (const row of rows) {
    for (const key of dedupeKeysForTool(row)) {
      if (!index.has(key)) index.set(key, row);
    }
  }

  const serverRows = await sql`
    select slug, name, repository_url, package_name, source_links
    from mcp_servers
  `;
  for (const row of serverRows) {
    const links = Array.isArray(row.source_links) ? row.source_links : [];
    const keys = uniqueStrings([
      normalizeGitHubUrl(row.repository_url),
      String(row.package_name || "").toLowerCase(),
      row.slug,
      slugify(row.name),
      ...links.map((link) => normalizeUrl(asRecord(link).url)),
    ]);
    for (const key of keys) {
      if (!index.has(key)) index.set(key, { ...row, table: "mcp_servers" });
    }
  }

  return index;
}

async function insertTool(sql, record) {
  const enrichment = mergeMetadata({ enrichment: {} }, record);
  await sql`
    insert into mcp_tools (
      slug, name, description, category, source, source_url, github_url, package_url,
      install_command, stars, last_commit, license, status, review_depth, trust_score,
      confidence_score, open_issues, readme_length, last_reviewed_at, enrichment, updated_at
    ) values (
      ${record.slug}, ${record.name}, ${record.description}, ${"Uncategorized"}, ${"Glama"},
      ${record.externalUrl}, ${record.repositoryUrl}, ${record.packageUrl}, ${""},
      ${null}, ${null}, ${record.license}, ${"unreviewed"}, ${"indexed"}, ${null},
      ${"low"}, ${null}, ${null}, ${null}, ${JSON.stringify(enrichment)}, now()
    )
    on conflict (slug) do nothing
  `;
}

async function updateTool(sql, existing, record) {
  const enrichment = mergeMetadata(existing, record);
  await sql`
    update mcp_tools set
      source = case when source = '' then 'Glama' else source end,
      source_url = case when source_url = '' then ${record.externalUrl} else source_url end,
      github_url = case when github_url = '' then ${record.repositoryUrl} else github_url end,
      package_url = case when package_url = '' then ${record.packageUrl} else package_url end,
      license = case when license = '' then ${record.license} else license end,
      enrichment = ${JSON.stringify(enrichment)},
      updated_at = now()
    where slug = ${existing.slug}
  `;
}

async function updateServerSourceLinks(sql, existing, record) {
  const currentLinks = Array.isArray(existing.source_links) ? existing.source_links : [];
  const linkMap = new Map();
  for (const link of currentLinks) {
    const item = asRecord(link);
    const url = asString(item.url);
    if (url) linkMap.set(url, item);
  }
  linkMap.set(record.externalUrl, { label: "Glama listing", type: "glama", url: record.externalUrl });
  if (record.repositoryUrl) linkMap.set(record.repositoryUrl, { label: "GitHub repo", type: "repository", url: record.repositoryUrl });
  await sql`
    update mcp_servers set source_links = ${JSON.stringify([...linkMap.values()])}, updated_at = now()
    where slug = ${existing.slug}
  `;
}

async function fetchGlamaPage(cursor) {
  const url = new URL(GLAMA_API_URL);
  url.searchParams.set("first", String(PAGE_SIZE));
  if (cursor) url.searchParams.set("after", cursor);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Glama returned ${response.status}`);
  const data = await response.json();
  return {
    servers: asArray(data.servers).map(normalizeGlamaServer),
    pageInfo: asRecord(data.pageInfo),
  };
}

async function verify(sql) {
  const counts = await sql`
    select
      count(*) filter (where source = 'Glama' or enrichment::text ilike '%glama%')::int as glama_total,
      count(*) filter (where (source = 'Glama' or enrichment::text ilike '%glama%') and status = 'unreviewed' and review_depth = 'indexed')::int as glama_indexed,
      count(*) filter (where review_depth in ('deep_review', 'maintainer_verified'))::int as leaderboard_depth_tools
    from mcp_tools
  `;

  const examples = ["WhisperGraph", "mcp-watermark", "Harness Engineering MCP", "Playwright MCP Server", "Fetch MCP Server"];
  const found = [];
  for (const example of examples) {
    const rows = await sql`
      select slug, name, status, review_depth, source
      from mcp_tools
      where lower(name) like ${`%${example.toLowerCase()}%`}
         or lower(slug) like ${`%${slugify(example)}%`}
      order by case when source = 'Glama' then 0 else 1 end, name asc
      limit 5
    `;
    found.push({ query: example, matches: rows });
  }

  return { counts: counts[0] ?? {}, examples: found };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Set it in the environment or .env.local before running the Glama backfill.");
  }

  const sql = neon(process.env.DATABASE_URL);
  await ensureSchema(sql);

  if (options.verifyOnly) {
    console.log(JSON.stringify(await verify(sql), null, 2));
    return;
  }

  const state = readState(options.statePath);
  let cursor = state?.cursor || "";
  let page = Number(state?.page || 0);
  const counters = {
    fetched: Number(state?.fetched || 0),
    inserted: Number(state?.inserted || 0),
    updated: Number(state?.updated || 0),
    duplicates: Number(state?.duplicates || 0),
    serverSourceMerges: Number(state?.serverSourceMerges || 0),
    errors: Number(state?.errors || 0),
  };

  const dedupeIndex = await loadExistingIndex(sql);
  console.log(`Starting Glama import. mode=${options.full ? "full" : `limit:${options.limit}`} dryRun=${options.dryRun} resumeCursor=${cursor ? "yes" : "no"}`);

  let hasNextPage = true;
  while (hasNextPage) {
    if (!options.full && options.limit > 0 && counters.fetched >= options.limit) break;

    page += 1;
    try {
      const result = await fetchGlamaPage(cursor);
      const remaining = options.full || options.limit <= 0 ? result.servers.length : Math.max(0, options.limit - counters.fetched);
      const records = result.servers.slice(0, remaining);
      let pageInserted = 0;
      let pageUpdated = 0;
      let pageDuplicates = 0;
      let pageServerMerges = 0;

      for (const record of records) {
        counters.fetched += 1;
        const duplicate = dedupeKeysForRecord(record).map((key) => dedupeIndex.get(key)).find(Boolean);

        if (!duplicate) {
          if (!options.dryRun) await insertTool(sql, record);
          const insertedRow = {
            slug: record.slug,
            name: record.name,
            source_url: record.externalUrl,
            github_url: record.repositoryUrl,
            package_url: record.packageUrl,
            enrichment: mergeMetadata({ enrichment: {} }, record),
          };
          for (const key of dedupeKeysForRecord(record)) dedupeIndex.set(key, insertedRow);
          counters.inserted += 1;
          pageInserted += 1;
          continue;
        }

        counters.duplicates += 1;
        pageDuplicates += 1;
        if (duplicate.table === "mcp_servers") {
          if (!options.dryRun) await updateServerSourceLinks(sql, duplicate, record);
          counters.serverSourceMerges += 1;
          pageServerMerges += 1;
        } else {
          if (!options.dryRun) await updateTool(sql, duplicate, record);
          counters.updated += 1;
          pageUpdated += 1;
        }
      }

      cursor = asString(result.pageInfo.endCursor);
      hasNextPage = result.pageInfo.hasNextPage === true && Boolean(cursor);
      writeState(options.statePath, {
        cursor,
        page,
        hasNextPage,
        updatedAt: new Date().toISOString(),
        ...counters,
      });

      console.log(
        `page=${page} fetched=${records.length} totalFetched=${counters.fetched} inserted=${pageInserted} updated=${pageUpdated} duplicates=${pageDuplicates} serverMerges=${pageServerMerges} errors=${counters.errors} hasNext=${hasNextPage}`,
      );

      if (!records.length || (!options.full && options.limit > 0 && counters.fetched >= options.limit)) break;
      if (hasNextPage && options.delayMs > 0) await sleep(options.delayMs);
    } catch (error) {
      counters.errors += 1;
      console.error(`page=${page} error=${error instanceof Error ? error.message : String(error)}`);
      writeState(options.statePath, {
        cursor,
        page,
        hasNextPage,
        updatedAt: new Date().toISOString(),
        ...counters,
      });
      if (counters.errors >= 5) throw error;
      await sleep(Math.max(options.delayMs, 1000));
    }
  }

  const verification = await verify(sql);
  console.log("Glama import complete.");
  console.log(JSON.stringify({ ...counters, database: verification.counts, examples: verification.examples }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
