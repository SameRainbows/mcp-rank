import { packageNameFromUrl, packageUrlFromName, providerKind, sourceLabel } from "./import-normalization";
import type { ImportedMcpToolRecord, ImportSourceProvider } from "./tool-types";

type FetchOptions = {
  limit: number;
  query?: string;
  csvText?: string;
};

type FetchResult = {
  provider: ImportSourceProvider;
  records: ImportedMcpToolRecord[];
  errors: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sourceUrlFromRecord(record: Record<string, unknown>) {
  return (
    asString(record.url) ||
    asString(record.homepage) ||
    asString(record.repository?.toString()) ||
    asString(record.sourceUrl) ||
    ""
  );
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });
}

function officialRecordToImport(server: Record<string, unknown>): ImportedMcpToolRecord {
  const packages = Array.isArray(server.packages) ? server.packages.map(asRecord) : [];
  const firstPackage = packages[0] ?? {};
  const repository = asRecord(server.repository);
  const name = asString(server.title) || asString(server.name);
  const packageName = asString(firstPackage.identifier);
  const sourceUrl = `https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(asString(server.name))}`;

  return {
    name,
    description: asString(server.description),
    category: "Uncategorized",
    sourceProvider: "official_registry",
    sourceKind: "official",
    sourceUrl,
    externalId: asString(server.name),
    githubUrl: asString(repository.url),
    packageName,
    packageUrl: packageUrlFromName(packageName),
    installCommand: packageName ? `npx -y ${packageName}` : "",
    rawMetadata: server,
  };
}

async function fetchOfficialRegistry({ limit }: FetchOptions): Promise<FetchResult> {
  const provider: ImportSourceProvider = "official_registry";
  const records: ImportedMcpToolRecord[] = [];
  const errors: string[] = [];
  let cursor = "";

  try {
    while (records.length < limit) {
      const url = new URL("https://registry.modelcontextprotocol.io/v0.1/servers");
      url.searchParams.set("limit", String(Math.min(100, limit - records.length)));
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        errors.push(`${sourceLabel(provider)} returned ${response.status}.`);
        break;
      }

      const data = asRecord(await response.json());
      const servers = Array.isArray(data.servers) ? data.servers.map(asRecord) : [];
      records.push(...servers.map(officialRecordToImport).filter((record) => record.name));
      const metadata = asRecord(data.metadata);
      cursor = asString(metadata.nextCursor);
      if (!cursor || !servers.length) break;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Official registry fetch failed.");
  }

  return { provider, records: records.slice(0, limit), errors };
}

async function fetchSmithery({ limit, query }: FetchOptions): Promise<FetchResult> {
  const provider: ImportSourceProvider = "smithery";
  const records: ImportedMcpToolRecord[] = [];
  const errors: string[] = [];
  const apiKey = process.env.SMITHERY_API_KEY;

  if (!apiKey) {
    return { provider, records, errors: ["Smithery import skipped because no server-side API key is configured."] };
  }

  try {
    let page = 1;
    while (records.length < limit) {
      const url = new URL("https://registry.smithery.ai/servers");
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(Math.min(100, limit - records.length)));
      url.searchParams.set("seed", "20260516");
      if (query) url.searchParams.set("q", query);

      const response = await fetch(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        errors.push(`Smithery returned ${response.status}.`);
        break;
      }

      const data = asRecord(await response.json());
      const servers = Array.isArray(data.servers) ? data.servers.map(asRecord) : [];
      records.push(
        ...servers.map((server) => {
          const homepage = asString(server.homepage);
          return {
            name: asString(server.displayName) || asString(server.qualifiedName) || asString(server.slug),
            description: asString(server.description),
            category: "Uncategorized",
            sourceProvider: provider,
            sourceKind: providerKind(provider),
            sourceUrl: homepage || `https://smithery.ai/server/${asString(server.qualifiedName)}`,
            externalId: asString(server.id) || asString(server.qualifiedName),
            homepageUrl: homepage,
            rawMetadata: server,
          } satisfies ImportedMcpToolRecord;
        }),
      );

      const pagination = asRecord(data.pagination);
      const totalPages = Number(pagination.totalPages ?? page);
      if (!servers.length || page >= totalPages) break;
      page += 1;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Smithery fetch failed.");
  }

  return { provider, records: records.slice(0, limit), errors };
}

async function fetchGlama({ limit, query }: FetchOptions): Promise<FetchResult> {
  const provider: ImportSourceProvider = "glama";
  const records: ImportedMcpToolRecord[] = [];
  const errors: string[] = [];

  try {
    const url = new URL("https://glama.ai/api/mcp/v1/servers");
    url.searchParams.set("limit", String(Math.min(limit, 100)));
    if (query) url.searchParams.set("q", query);

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return { provider, records, errors: [`Glama returned ${response.status}; no HTML scraping attempted.`] };
    }

    const data = await response.json();
    const maybeRecords = Array.isArray(data)
      ? data.map(asRecord)
      : Array.isArray(asRecord(data).servers)
        ? (asRecord(data).servers as unknown[]).map(asRecord)
        : [];

    records.push(
      ...maybeRecords.map((server) => {
        const repositoryUrl = asString(server.repositoryUrl) || asString(server.repository_url) || asString(server.githubUrl);
        const sourceUrl = sourceUrlFromRecord(server) || (repositoryUrl ? repositoryUrl : "");
        const packageUrl = asString(server.packageUrl) || asString(server.package_url);
        return {
          name: asString(server.name) || asString(server.title) || asString(server.slug),
          description: asString(server.description) || asString(server.tagline),
          category: asString(server.category) || "Uncategorized",
          sourceProvider: provider,
          sourceKind: providerKind(provider),
          sourceUrl: sourceUrl || `https://glama.ai/mcp/servers/${asString(server.slug)}`,
          externalId: asString(server.id) || asString(server.slug),
          githubUrl: repositoryUrl,
          packageName: asString(server.packageName) || packageNameFromUrl(packageUrl),
          packageUrl,
          homepageUrl: asString(server.homepage),
          rawMetadata: server,
        } satisfies ImportedMcpToolRecord;
      }),
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Glama fetch failed.");
  }

  return { provider, records: records.slice(0, limit), errors };
}

async function fetchGitHubSearch({ limit, query }: FetchOptions): Promise<FetchResult> {
  const provider: ImportSourceProvider = "github_search";
  const records: ImportedMcpToolRecord[] = [];
  const errors: string[] = [];

  try {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", query || '("mcp server" OR modelcontextprotocol OR "@modelcontextprotocol")');
    url.searchParams.set("per_page", String(Math.min(100, limit)));
    url.searchParams.set("sort", "stars");
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!response.ok) {
      return { provider, records, errors: [`GitHub search returned ${response.status}.`] };
    }

    const data = asRecord(await response.json());
    const items = Array.isArray(data.items) ? data.items.map(asRecord) : [];
    records.push(
      ...items.map((repo) => ({
        name: asString(repo.name) || asString(repo.full_name),
        description: asString(repo.description),
        category: "Uncategorized",
        sourceProvider: provider,
        sourceKind: providerKind(provider),
        sourceUrl: asString(repo.html_url),
        externalId: String(repo.id ?? asString(repo.full_name)),
        githubUrl: asString(repo.html_url),
        homepageUrl: asString(repo.homepage),
        rawMetadata: repo,
      })),
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "GitHub search failed.");
  }

  return { provider, records: records.slice(0, limit), errors };
}

function importManualCsv({ csvText, limit }: FetchOptions): FetchResult {
  const provider: ImportSourceProvider = "manual_csv";
  const rows = parseCsv(csvText ?? "").slice(0, limit);
  const records = rows.map((row) => ({
    name: row.name || row.title || row.slug || row.github_url || row.source_url,
    description: row.description,
    category: row.category || "Uncategorized",
    sourceProvider: provider,
    sourceKind: row.source_kind ? (row.source_kind as ImportedMcpToolRecord["sourceKind"]) : "manual",
    sourceUrl: row.source_url || row.sourceUrl || row.github_url || row.githubUrl || row.homepage_url || row.homepageUrl,
    externalId: row.external_id || row.externalId,
    githubUrl: row.github_url || row.githubUrl,
    packageName: row.package_name || row.packageName || packageNameFromUrl(row.package_url || row.packageUrl),
    packageUrl: row.package_url || row.packageUrl,
    homepageUrl: row.homepage_url || row.homepageUrl,
    installCommand: row.install_command || row.installCommand,
    rawMetadata: row,
  }));

  return { provider, records, errors: [] };
}

export async function fetchImportSource(provider: ImportSourceProvider, options: FetchOptions): Promise<FetchResult> {
  if (provider === "official_registry") return fetchOfficialRegistry(options);
  if (provider === "smithery") return fetchSmithery(options);
  if (provider === "glama") return fetchGlama(options);
  if (provider === "github_search") return fetchGitHubSearch(options);
  return importManualCsv(options);
}
