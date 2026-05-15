import { fetchImportSource } from "./import-fetchers";
import {
  dedupeKeysForRecord,
  dedupeKeysForTool,
  mergeUniqueStrings,
  packageNameFromUrl,
  packageUrlFromName,
  recordSlug,
  sourceLabel,
} from "./import-normalization";
import { listMcpTools, normalizeToolInput, patchMcpTool, upsertMcpTools } from "./tool-store";
import type { ImportedMcpToolRecord, ImportPreviewRow, ImportResultSummary, ImportSourceProvider, McpTool, McpToolInput } from "./tool-types";

type RunImportOptions = {
  provider: ImportSourceProvider;
  limit?: number;
  query?: string;
  dryRun?: boolean;
  csvText?: string;
};

function safeLimit(value: unknown) {
  const parsed = Number(value ?? 100);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(1, Math.min(1000, Math.floor(parsed)));
}

function sourceLinkForRecord(record: ImportedMcpToolRecord) {
  return {
    provider: record.sourceProvider,
    kind: record.sourceKind,
    label: sourceLabel(record.sourceProvider),
    url: record.sourceUrl,
    externalId: record.externalId ?? "",
    lastSeenAt: new Date().toISOString(),
  };
}

function importSourcesFromTool(tool: McpTool) {
  const enrichment = tool.enrichment ?? {};
  const sources = Array.isArray(enrichment.importSources) ? enrichment.importSources : [];
  return sources.filter((source) => source && typeof source === "object") as Array<Record<string, unknown>>;
}

function sourceLinksFromTool(tool: McpTool) {
  const enrichment = tool.enrichment ?? {};
  const links = Array.isArray(enrichment.sourceLinks) ? enrichment.sourceLinks : [];
  return links.filter((link) => link && typeof link === "object") as Array<Record<string, unknown>>;
}

function mergeSourceMetadata(tool: McpTool, record: ImportedMcpToolRecord): McpToolInput {
  const now = new Date().toISOString();
  const existingImportSources = importSourcesFromTool(tool);
  const existingSourceLinks = sourceLinksFromTool(tool);
  const nextSourceLink = sourceLinkForRecord(record);
  const sourceLinkMap = new Map<string, Record<string, unknown>>();

  for (const link of existingSourceLinks) {
    const url = typeof link.url === "string" ? link.url : "";
    if (url) sourceLinkMap.set(url, link);
  }
  if (nextSourceLink.url) sourceLinkMap.set(nextSourceLink.url, nextSourceLink);

  const importSourceKey = `${record.sourceProvider}:${record.externalId || record.sourceUrl}`;
  const importSourceMap = new Map<string, Record<string, unknown>>();
  for (const source of existingImportSources) {
    const key = String(source.key || `${source.provider}:${source.externalId || source.sourceUrl || source.url}`);
    importSourceMap.set(key, source);
  }
  importSourceMap.set(importSourceKey, {
    key: importSourceKey,
    provider: record.sourceProvider,
    kind: record.sourceKind,
    sourceUrl: record.sourceUrl,
    externalId: record.externalId ?? "",
    lastSeenAt: now,
  });

  return {
    source: tool.source || sourceLabel(record.sourceProvider),
    sourceUrl: tool.sourceUrl || record.sourceUrl,
    githubUrl: tool.githubUrl || record.githubUrl || "",
    packageUrl: tool.packageUrl || record.packageUrl || packageUrlFromName(record.packageName),
    installCommand: tool.installCommand || record.installCommand || "",
    enrichment: {
      ...(tool.enrichment ?? {}),
      importedAt: (tool.enrichment?.importedAt as string | undefined) ?? now,
      lastSeenAt: now,
      sourceKind: (tool.enrichment?.sourceKind as string | undefined) ?? record.sourceKind,
      importSources: [...importSourceMap.values()],
      sourceLinks: [...sourceLinkMap.values()],
      rawImports: {
        ...((tool.enrichment?.rawImports as Record<string, unknown> | undefined) ?? {}),
        [record.sourceProvider]: record.rawMetadata ?? {},
      },
    },
  };
}

function importedRecordToToolInput(record: ImportedMcpToolRecord): McpToolInput {
  const now = new Date().toISOString();
  const packageUrl = record.packageUrl || packageUrlFromName(record.packageName);
  const packageName = record.packageName || packageNameFromUrl(packageUrl);

  return normalizeToolInput({
    name: record.name,
    slug: recordSlug(record),
    description: record.description ?? "",
    category: record.category || "Uncategorized",
    source: sourceLabel(record.sourceProvider),
    sourceUrl: record.sourceUrl,
    githubUrl: record.githubUrl ?? "",
    packageUrl,
    installCommand: record.installCommand || (packageName ? `npx -y ${packageName}` : ""),
    status: "unreviewed",
    trustScore: null,
    confidenceScore: "low",
    enrichment: {
      importedAt: now,
      lastSeenAt: now,
      sourceKind: record.sourceKind,
      externalId: record.externalId ?? "",
      importSources: [
        {
          key: `${record.sourceProvider}:${record.externalId || record.sourceUrl}`,
          provider: record.sourceProvider,
          kind: record.sourceKind,
          sourceUrl: record.sourceUrl,
          externalId: record.externalId ?? "",
          lastSeenAt: now,
        },
      ],
      sourceLinks: [sourceLinkForRecord(record)],
      rawImports: { [record.sourceProvider]: record.rawMetadata ?? {} },
    },
  });
}

function buildDedupeIndex(tools: McpTool[]) {
  const index = new Map<string, McpTool>();
  for (const tool of tools) {
    for (const key of dedupeKeysForTool(tool)) {
      if (!index.has(key)) index.set(key, tool);
    }
  }
  return index;
}

function findDuplicate(record: ImportedMcpToolRecord, dedupeIndex: Map<string, McpTool>) {
  for (const key of dedupeKeysForRecord(record)) {
    const duplicate = dedupeIndex.get(key);
    if (duplicate) return duplicate;
  }
  return null;
}

function validateRecord(record: ImportedMcpToolRecord) {
  if (!record.name?.trim()) return "Missing name.";
  if (!record.sourceUrl?.trim() && !record.githubUrl?.trim() && !record.packageUrl?.trim() && !record.homepageUrl?.trim()) {
    return "Missing source URL.";
  }
  return "";
}

export async function runMcpToolImport(options: RunImportOptions): Promise<ImportResultSummary> {
  const limit = safeLimit(options.limit);
  const dryRun = options.dryRun ?? true;
  const fetched = await fetchImportSource(options.provider, {
    limit,
    query: options.query,
    csvText: options.csvText,
  });
  const existingTools = await listMcpTools("all");
  const dedupeIndex = buildDedupeIndex(existingTools);
  const preview: ImportPreviewRow[] = [];
  let newTools = 0;
  let duplicates = 0;
  let updatedSourceLinks = 0;
  let skippedInvalid = 0;
  const createInputs: McpToolInput[] = [];
  const duplicateUpdates: Array<{ tool: McpTool; record: ImportedMcpToolRecord }> = [];

  for (const record of fetched.records.slice(0, limit)) {
    const reason = validateRecord(record);
    const slug = recordSlug(record);
    if (reason) {
      skippedInvalid += 1;
      preview.push({ record, slug, action: "skip_invalid", reason });
      continue;
    }

    const duplicate = findDuplicate(record, dedupeIndex);
    if (duplicate) {
      duplicates += 1;
      updatedSourceLinks += record.sourceUrl ? 1 : 0;
      duplicateUpdates.push({ tool: duplicate, record });
      preview.push({ record, slug, action: "update_duplicate", duplicateSlug: duplicate.slug });
      continue;
    }

    newTools += 1;
    const toolInput = importedRecordToToolInput(record);
    createInputs.push(toolInput);
    const normalized = normalizeToolInput(toolInput);
    dedupeIndex.set(normalized.slug, normalized);
    for (const key of dedupeKeysForRecord(record)) dedupeIndex.set(key, normalized);
    preview.push({ record, slug: normalized.slug, action: "create" });
  }

  if (!dryRun) {
    if (createInputs.length) await upsertMcpTools(createInputs);
    for (const { tool, record } of duplicateUpdates) {
      await patchMcpTool(tool.slug, mergeSourceMetadata(tool, record));
    }
  }

  return {
    dryRun,
    provider: fetched.provider,
    fetched: fetched.records.length,
    newTools,
    duplicates,
    updatedSourceLinks,
    skippedInvalid,
    errors: mergeUniqueStrings(fetched.errors),
    preview: preview.slice(0, 100),
  };
}
