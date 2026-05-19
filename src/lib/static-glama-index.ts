import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { McpServer, SourceLink } from "./types";

export type StaticGlamaRecord = {
  slug: string;
  name: string;
  description: string;
  source: "Glama";
  sourceUrl: string;
  repositoryUrl: string;
  namespace: string;
  license: string;
  licenseUrl: string;
  attributes: string[];
  toolsCount: number;
  externalId: string;
  importedAt: string;
  lastSeenAt: string;
};

type StaticGlamaManifest = {
  version: number;
  provider: "glama";
  generatedAt: string;
  fetched: number;
  count: number;
  duplicates: number;
  shards: { key: string; file: string; count: number }[];
};

const emptyScore = {
  installDocs: 0,
  maintenance: 0,
  auth: 0,
  compatibility: 0,
  usefulness: 0,
  safety: 0,
};

let cachedManifest: StaticGlamaManifest | null | undefined;
let cachedRecords: StaticGlamaRecord[] | null | undefined;
let cachedBySlug: Map<string, StaticGlamaRecord> | null | undefined;

function indexDir() {
  return resolve(process.cwd(), "public/indexes/glama");
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

export function getStaticGlamaManifest() {
  if (cachedManifest !== undefined) return cachedManifest;
  cachedManifest = readJson<StaticGlamaManifest>(resolve(indexDir(), "manifest.json"));
  return cachedManifest;
}

function allStaticGlamaRecords() {
  if (cachedRecords !== undefined) return cachedRecords;

  const manifest = getStaticGlamaManifest();
  if (!manifest) {
    cachedRecords = null;
    cachedBySlug = new Map();
    return cachedRecords;
  }

  const records: StaticGlamaRecord[] = [];
  for (const shard of manifest.shards) {
    const shardRecords = readJson<StaticGlamaRecord[]>(resolve(indexDir(), shard.file));
    if (Array.isArray(shardRecords)) records.push(...shardRecords);
  }

  cachedRecords = records;
  cachedBySlug = new Map(records.map((record) => [record.slug, record]));
  return cachedRecords;
}

function textFor(record: StaticGlamaRecord) {
  return `${record.name} ${record.slug} ${record.description} ${record.namespace} ${record.attributes.join(" ")}`.toLowerCase();
}

function scoreRecord(record: StaticGlamaRecord, query: string) {
  if (!query) return 0;
  const normalizedName = record.name.toLowerCase();
  const normalizedSlug = record.slug.toLowerCase();
  let score = 0;
  if (normalizedName === query) score += 1000;
  if (normalizedSlug === query) score += 900;
  if (normalizedName.includes(query)) score += 400;
  if (normalizedSlug.includes(query)) score += 300;
  if (record.namespace.toLowerCase().includes(query)) score += 150;
  if (record.attributes.some((attribute) => attribute.toLowerCase().includes(query))) score += 100;
  if (record.description.toLowerCase().includes(query)) score += 50;
  if (record.repositoryUrl) score += 10;
  return score;
}

export function searchStaticGlamaRecords(query = "", limit = 100) {
  const records = allStaticGlamaRecords();
  if (!records?.length) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const safeLimit = Math.max(1, Math.min(limit, 300));
  const matches = normalizedQuery
    ? records.filter((record) => textFor(record).includes(normalizedQuery))
    : records;

  return matches
    .sort((a, b) => scoreRecord(b, normalizedQuery) - scoreRecord(a, normalizedQuery) || a.name.localeCompare(b.name))
    .slice(0, safeLimit);
}

export function getStaticGlamaRecord(slug: string) {
  allStaticGlamaRecords();
  return cachedBySlug?.get(slug) ?? null;
}

export function staticGlamaRecordToServer(record: StaticGlamaRecord): McpServer {
  const sourceLinks: SourceLink[] = [
    { label: "Glama listing", type: "glama", url: record.sourceUrl },
  ];
  if (record.repositoryUrl) sourceLinks.push({ label: "Repository", type: "repository", url: record.repositoryUrl });
  if (record.licenseUrl) sourceLinks.push({ label: "License", type: "source", url: record.licenseUrl });

  return {
    slug: record.slug,
    name: record.name,
    description: record.description,
    category: "Uncategorized",
    tagline: record.description || "Indexed from Glama/public MCP source. Not yet reviewed by MCP Rank.",
    source: "Glama",
    sourceLinks,
    packageName: "",
    installCommand: "",
    repositoryUrl: record.repositoryUrl,
    stars: 0,
    lastReviewed: "",
    evidenceUpdated: record.lastSeenAt.slice(0, 10),
    importedAt: record.importedAt.slice(0, 10),
    sourceProvider: "Glama",
    sourceKind: "directory",
    status: "indexed",
    reviewDepth: "indexed",
    confidence: "low",
    maintainerVerified: false,
    transports: [],
    clients: ["claude", "cursor", "codex", "vscode"],
    risk: "medium",
    score: emptyScore,
    signals: [
      "Indexed from Glama/public MCP source",
      "Not yet reviewed by MCP Rank",
      ...(record.license ? [`License: ${record.license}`] : []),
      ...(record.attributes.length ? [`External attributes: ${record.attributes.slice(0, 5).join(", ")}`] : []),
      ...(record.toolsCount ? [`Glama tool count: ${record.toolsCount}`] : []),
    ],
    evidence: [
      "This is a static discovery record generated from Glama public MCP metadata.",
      "MCP Rank has not reviewed this listing for trust, safety, install behavior, or maintainer provenance.",
    ],
    cautions: [
      "Do not treat this indexed listing as a recommendation.",
      "Verify source provenance, install behavior, auth scopes, and maintainer identity before rollout.",
    ],
    examples: ["Review source links.", "Check maintainer identity.", "Verify install and auth behavior before rollout."],
  };
}

export function searchStaticGlamaServers(query = "", limit = 100) {
  return searchStaticGlamaRecords(query, limit).map(staticGlamaRecordToServer);
}

export function getStaticGlamaServer(slug: string) {
  const record = getStaticGlamaRecord(slug);
  return record ? staticGlamaRecordToServer(record) : null;
}
