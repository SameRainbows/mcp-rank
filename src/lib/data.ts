import { neon } from "@neondatabase/serverless";
import { servers, weeklyReports } from "./sample-data";
import { overallScore } from "./scoring";
import { listMcpTools, searchMcpTools } from "./tool-store";
import { packageNameFromUrl } from "./import-normalization";
import type { ConfidenceLevel, McpServer, ReviewDepth, ReviewStatus, SourceLink, WeeklyReport } from "./types";
import type { McpTool } from "./tool-types";

type ServerRow = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  source: string;
  package_name: string;
  install_command: string;
  repository_url: string;
  stars: number;
  last_reviewed: string;
  evidence_updated: string;
  source_links: SourceLink[];
  status: ReviewStatus;
  review_depth: ReviewDepth | null;
  confidence: ConfidenceLevel;
  maintainer_verified: boolean;
  maintainer_verified_at: string | null;
  transports: string[];
  clients: string[];
  risk: "low" | "medium" | "high";
  score: McpServer["score"];
  signals: string[];
  evidence: string[];
  cautions: string[];
  examples: string[];
};

let sqlClient: ReturnType<typeof neon> | null = null;
let reviewDepthSchemaReady = false;

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

async function ensureReviewDepthSchema(sql: ReturnType<typeof neon>) {
  if (reviewDepthSchemaReady) return;
  await sql`alter table mcp_servers add column if not exists review_depth text not null default 'indexed'`;
  await sql`alter table mcp_tools add column if not exists review_depth text not null default 'indexed'`;
  reviewDepthSchemaReady = true;
}

function normalizeReviewDepth(
  value: unknown,
  status: ReviewStatus,
  maintainerVerified = false,
  fallback?: ReviewDepth,
): ReviewDepth {
  if (
    value === "indexed" ||
    value === "source_reviewed" ||
    value === "install_tested" ||
    value === "deep_review" ||
    value === "maintainer_verified"
  ) {
    if (value !== "indexed" || status === "indexed") return value;
    if (fallback) return fallback;
    if (maintainerVerified || status === "maintainer_verified") return "maintainer_verified";
    return "source_reviewed";
  }

  if (maintainerVerified || status === "maintainer_verified") return "maintainer_verified";
  if (status === "reviewed") return fallback ?? "source_reviewed";
  return "indexed";
}

function mapServer(row: ServerRow, fallback?: McpServer): McpServer {
  const server = {
    slug: row.slug,
    name: row.name,
    description: row.tagline,
    category: row.category,
    tagline: row.tagline,
    source: row.source,
    sourceLinks: Array.isArray(row.source_links) && row.source_links.length
      ? row.source_links
      : row.repository_url
      ? [{ label: "GitHub repo", type: "repository" as const, url: row.repository_url }]
      : [{ label: "Official MCP registry", type: "registry" as const, url: "https://registry.modelcontextprotocol.io/" }],
    packageName: row.package_name,
    installCommand: row.install_command,
    repositoryUrl: row.repository_url,
    stars: row.stars,
    lastReviewed: row.last_reviewed,
    evidenceUpdated: row.evidence_updated || row.last_reviewed,
    status: row.status,
    reviewDepth: normalizeReviewDepth(row.review_depth, row.status, row.maintainer_verified, fallback?.reviewDepth),
    confidence: row.confidence,
    maintainerVerified: row.maintainer_verified,
    maintainerVerifiedAt: row.maintainer_verified_at ?? undefined,
    transports: row.transports,
    clients: row.clients as McpServer["clients"],
    risk: row.risk,
    score: row.score,
    signals: row.signals,
    evidence: row.evidence,
    cautions: row.cautions,
    examples: row.examples,
  };

  return { ...server, trustScore: overallScore(server.score) };
}

function sourceLinksFromTool(tool: McpTool): SourceLink[] {
  const enrichment = tool.enrichment ?? {};
  const links = Array.isArray(enrichment.sourceLinks) ? enrichment.sourceLinks : [];
  const normalizedLinks = links
    .map((link): SourceLink | null => {
      if (!link || typeof link !== "object") return null;
      const raw = link as Record<string, unknown>;
      const url = typeof raw.url === "string" ? raw.url : "";
      if (!url) return null;
      const provider = typeof raw.provider === "string" ? raw.provider : "source";
      return {
        label: typeof raw.label === "string" ? raw.label : provider,
        type:
          provider === "smithery"
            ? "smithery"
            : provider === "glama"
              ? "glama"
              : url.includes("github.com")
                ? "repository"
                : url.includes("npmjs.com") || url.includes("pypi.org")
                  ? "package"
                  : provider === "official_registry"
                    ? "registry"
                    : "source",
        url,
      };
    })
    .filter((link): link is SourceLink => Boolean(link));

  if (tool.githubUrl && !normalizedLinks.some((link) => link.url === tool.githubUrl)) {
    normalizedLinks.unshift({ label: "GitHub repo", type: "repository", url: tool.githubUrl });
  }
  if (tool.packageUrl && !normalizedLinks.some((link) => link.url === tool.packageUrl)) {
    normalizedLinks.push({ label: "Package page", type: "package", url: tool.packageUrl });
  }
  if (tool.sourceUrl && !normalizedLinks.some((link) => link.url === tool.sourceUrl)) {
    normalizedLinks.push({ label: tool.source || "Source", type: "source", url: tool.sourceUrl });
  }

  return normalizedLinks;
}

function toolStatusToServerStatus(tool: McpTool): ReviewStatus {
  if (tool.status === "reviewed") return "reviewed";
  if (tool.status === "deprecated") return "deprecated";
  if (tool.status === "blocked") return "high_risk";
  return "indexed";
}

function toolConfidenceToServerConfidence(tool: McpTool): ConfidenceLevel {
  if (tool.confidenceScore === "high" || tool.confidenceScore === "medium") return tool.confidenceScore;
  return "low";
}

export function mapToolToServer(tool: McpTool): McpServer {
  const importedAt = typeof tool.enrichment?.importedAt === "string" ? tool.enrichment.importedAt.slice(0, 10) : "";
  const lastSeenAt = typeof tool.enrichment?.lastSeenAt === "string" ? tool.enrichment.lastSeenAt.slice(0, 10) : importedAt;
  const sourceKind = typeof tool.enrichment?.sourceKind === "string" ? tool.enrichment.sourceKind : "public source";
  const status = toolStatusToServerStatus(tool);
  const reviewDepth: ReviewDepth = tool.reviewDepth === "indexed" && status === "reviewed" ? "source_reviewed" : tool.reviewDepth;
  const confidence = toolConfidenceToServerConfidence(tool);
  const packageName = packageNameFromUrl(tool.packageUrl);
  const trustScore = tool.trustScore ?? 0;
  const score = {
    installDocs: trustScore,
    maintenance: trustScore,
    auth: trustScore,
    compatibility: trustScore,
    usefulness: trustScore,
    safety: trustScore,
  };

  return {
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    category: tool.category || "Uncategorized",
    tagline: tool.description || "Indexed from a public MCP source; not yet reviewed by MCP Rank.",
    source: tool.source || "Imported public MCP source",
    sourceLinks: sourceLinksFromTool(tool),
    packageName,
    installCommand: tool.installCommand,
    repositoryUrl: tool.githubUrl,
    stars: tool.stars ?? 0,
    lastReviewed: tool.lastReviewedAt?.slice(0, 10) ?? "",
    evidenceUpdated: lastSeenAt,
    importedAt,
    sourceProvider: tool.source,
    sourceKind,
    status,
    reviewDepth,
    confidence,
    maintainerVerified: false,
    transports: [],
    clients: ["claude", "cursor", "codex", "vscode"],
    risk: status === "high_risk" ? "high" : "medium",
    score,
    signals:
      status === "indexed"
        ? [
            `Indexed from ${tool.source || "public source"}`,
            `Source kind: ${sourceKind}`,
            "Not yet manually reviewed by MCP Rank",
          ]
        : ["Admin-reviewed MCP tool record"],
    evidence:
      status === "indexed"
        ? [
            "MCP Rank has indexed this tool from public source metadata.",
            "Rankings and trust labels are assigned only after MCP Rank review.",
          ]
        : ["Admin review metadata is available; detailed evidence notes may still need migration."],
    cautions:
      status === "indexed"
        ? [
            "Do not treat this indexed listing as a recommendation.",
            "Verify source provenance, install behavior, auth scopes, and maintainer identity before rollout.",
          ]
        : ["Review score details before production rollout."],
    examples: ["Review source links.", "Check maintainer identity.", "Verify install and auth behavior before rollout."],
  };
}

export async function getServers(): Promise<McpServer[]> {
  const sql = getSql();
  if (!sql) {
    const adminTools = await listMcpTools("all");
    const merged = new Map(servers.map((server) => [server.slug, server]));
    for (const tool of adminTools) {
      if (!merged.has(tool.slug)) merged.set(tool.slug, mapToolToServer(tool));
    }
    return [...merged.values()];
  }

  await ensureReviewDepthSchema(sql);

  const rows = (await sql`
    select slug, name, category, tagline, source, package_name, install_command,
      repository_url, stars, to_char(last_reviewed, 'YYYY-MM-DD') as last_reviewed,
      to_char(evidence_updated, 'YYYY-MM-DD') as evidence_updated, source_links,
      status, review_depth, confidence, maintainer_verified, maintainer_verified_at::text,
      transports, clients, risk, score, signals, evidence, cautions, examples
    from mcp_servers
    order by (score->>'usefulness')::int desc, name asc
  `) as ServerRow[];

  const merged = new Map(servers.map((server) => [server.slug, server]));
  for (const row of rows) {
    const mapped = mapServer(row, merged.get(row.slug));
    merged.set(mapped.slug, { ...(merged.get(mapped.slug) ?? mapped), ...mapped });
  }
  const adminTools = await listMcpTools("all");
  for (const tool of adminTools) {
    if (!merged.has(tool.slug)) merged.set(tool.slug, mapToolToServer(tool));
  }

  return [...merged.values()];
}

export async function getServer(slug: string) {
  const allServers = await getServers();
  return allServers.find((server) => server.slug === slug);
}

export async function getSearchServers(query = "", limit = 200): Promise<McpServer[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const seedMatches = servers.filter((server) => {
    if (!normalizedQuery) return true;
    return `${server.name} ${server.category} ${server.tagline} ${server.signals.join(" ")}`.toLowerCase().includes(normalizedQuery);
  });
  const toolMatches = await searchMcpTools(query, limit);
  const merged = new Map(seedMatches.map((server) => [server.slug, server]));

  for (const tool of toolMatches) {
    if (!merged.has(tool.slug)) merged.set(tool.slug, mapToolToServer(tool));
  }

  return [...merged.values()].slice(0, limit);
}

export async function getWeeklyReports(): Promise<WeeklyReport[]> {
  return weeklyReports;
}

export async function getWeeklyReport(slug: string) {
  return weeklyReports.find((report) => report.slug === slug);
}
