import { neon } from "@neondatabase/serverless";
import { createMcpToolSnapshot } from "./review-snapshots";
import { servers } from "./sample-data";
import { isTrustedRankable, packageUrlFor } from "./server-derived";
import type { ConfidenceScore, McpTool, McpToolInput, ToolStatus } from "./tool-types";

type ToolRow = {
  name: string;
  slug: string;
  description: string;
  category: string;
  source: string;
  source_url: string;
  github_url: string;
  package_url: string;
  install_command: string;
  stars: number | null;
  last_commit: string | null;
  license: string;
  status: ToolStatus;
  trust_score: number | null;
  confidence_score: ConfidenceScore;
  open_issues: number | null;
  readme_length: number | null;
  last_reviewed_at: string | null;
  enrichment: Record<string, unknown>;
};

let sqlClient: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeConfidence(value: unknown): ConfidenceScore {
  const normalized = String(value ?? "unreviewed").toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") return normalized;
  return "unreviewed";
}

function normalizeStatus(value: unknown): ToolStatus {
  const normalized = String(value ?? "unreviewed").toLowerCase();
  if (normalized === "reviewed" || normalized === "deprecated" || normalized === "blocked") return normalized;
  return "unreviewed";
}

function rowToTool(row: ToolRow): McpTool {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    source: row.source,
    sourceUrl: row.source_url,
    githubUrl: row.github_url,
    packageUrl: row.package_url,
    installCommand: row.install_command,
    stars: row.stars,
    lastCommit: row.last_commit,
    license: row.license,
    status: row.status,
    trustScore: row.trust_score,
    confidenceScore: row.confidence_score,
    openIssues: row.open_issues,
    readmeLength: row.readme_length,
    lastReviewedAt: row.last_reviewed_at,
    enrichment: row.enrichment,
  };
}

export function normalizeToolInput(input: McpToolInput): McpTool {
  const name = String(input.name ?? "").trim();
  const slug = slugify(String(input.slug || name || input.githubUrl || input.github_url || "mcp-tool"));
  const trustScore = toNumber(input.trust_score ?? input.trustScore);

  return {
    name: name || slug,
    slug,
    description: String(input.description ?? "").trim(),
    category: String(input.category ?? "Uncategorized").trim() || "Uncategorized",
    source: String(input.source ?? "").trim(),
    sourceUrl: String(input.sourceUrl ?? input.source_url ?? "").trim(),
    githubUrl: String(input.githubUrl ?? input.github_url ?? "").trim(),
    packageUrl: String(input.packageUrl ?? input.package_url ?? "").trim(),
    installCommand: String(input.installCommand ?? input.install_command ?? "").trim(),
    stars: toNumber(input.stars),
    lastCommit: String(input.lastCommit ?? input.last_commit ?? "") || null,
    license: String(input.license ?? "").trim(),
    status: normalizeStatus(input.status),
    trustScore,
    confidenceScore: normalizeConfidence(input.confidenceScore ?? input.confidence_score),
    openIssues: toNumber(input.openIssues ?? input.open_issues),
    readmeLength: toNumber(input.readmeLength ?? input.readme_length),
    lastReviewedAt: String(input.lastReviewedAt ?? input.last_reviewed_at ?? "") || null,
    enrichment: input.enrichment ?? {},
  };
}

function hasReviewChange(before: McpTool, after: McpTool) {
  return (
    before.status !== after.status ||
    before.trustScore !== after.trustScore ||
    before.confidenceScore !== after.confidenceScore ||
    before.lastReviewedAt !== after.lastReviewedAt
  );
}

const seedTools: McpTool[] = servers.map((server) =>
  normalizeToolInput({
    name: server.name,
    slug: server.slug,
    description: server.tagline,
    category: server.category,
    source: server.source,
    sourceUrl: server.sourceLinks[0]?.url ?? server.repositoryUrl,
    githubUrl: server.repositoryUrl,
    packageUrl: packageUrlFor(server),
    installCommand: server.installCommand,
    stars: server.stars,
    license: "",
    status:
      server.status === "deprecated"
        ? "deprecated"
        : server.status === "indexed"
          ? "unreviewed"
          : server.status === "high_risk"
            ? "blocked"
            : "reviewed",
    trustScore: Math.round(
      (server.score.installDocs +
        server.score.maintenance +
        server.score.auth +
        server.score.compatibility +
        server.score.usefulness +
        server.score.safety) /
        6,
    ),
    confidenceScore: server.status === "indexed" ? "unreviewed" : server.confidence,
    lastReviewedAt: server.lastReviewed,
  }),
);

const memoryTools = new Map<string, McpTool>(seedTools.map((tool) => [tool.slug, tool]));

export async function listMcpTools(status?: "reviewed" | "unreviewed" | "all") {
  const sql = getSql();
  if (!sql) {
    const tools = [...memoryTools.values()];
    return status && status !== "all" ? tools.filter((tool) => tool.status === status) : tools;
  }

  const rows =
    status && status !== "all"
      ? ((await sql`
          select name, slug, description, category, source, source_url, github_url, package_url,
            install_command, stars, last_commit::text, license, status, trust_score,
            confidence_score, open_issues, readme_length, last_reviewed_at::text, enrichment
          from mcp_tools
          where status = ${status}
          order by coalesce(trust_score, -1) desc, name asc
        `) as ToolRow[])
      : ((await sql`
          select name, slug, description, category, source, source_url, github_url, package_url,
            install_command, stars, last_commit::text, license, status, trust_score,
            confidence_score, open_issues, readme_length, last_reviewed_at::text, enrichment
          from mcp_tools
          order by coalesce(trust_score, -1) desc, name asc
        `) as ToolRow[]);

  return rows.map(rowToTool);
}

export async function listTopSafeMcpTools(limit = 10) {
  const sql = getSql();
  if (!sql) {
    return [...memoryTools.values()]
      .filter(
        (tool) =>
          tool.status === "reviewed" &&
          tool.trustScore !== null &&
          (tool.confidenceScore === "medium" || tool.confidenceScore === "high"),
      )
      .filter((tool) => {
        const server = servers.find((item) => item.slug === tool.slug);
        return server ? isTrustedRankable(server) : true;
      })
      .sort((a, b) => (b.trustScore ?? -1) - (a.trustScore ?? -1))
      .slice(0, limit);
  }

  const rows = (await sql`
    select name, slug, description, category, source, source_url, github_url, package_url,
      install_command, stars, last_commit::text, license, status, trust_score,
      confidence_score, open_issues, readme_length, last_reviewed_at::text, enrichment
    from mcp_tools
    where status = 'reviewed'
      and trust_score is not null
      and confidence_score in ('medium', 'high')
    order by trust_score desc, name asc
    limit ${limit}
  `) as ToolRow[];

  return rows.map(rowToTool);
}

export async function upsertMcpTools(inputs: McpToolInput[]) {
  const tools = inputs.map(normalizeToolInput).filter((tool) => tool.name && tool.slug);
  const sql = getSql();

  if (!sql) {
    for (const tool of tools) {
      const existing = memoryTools.get(tool.slug);
      if (existing?.status === "reviewed" && tool.status === "unreviewed") {
        memoryTools.set(tool.slug, {
          ...tool,
          status: existing.status,
          trustScore: existing.trustScore,
          confidenceScore: existing.confidenceScore,
          lastReviewedAt: existing.lastReviewedAt,
        });
      } else {
        memoryTools.set(tool.slug, tool);
      }
    }
    return { persisted: false, count: tools.length, tools };
  }

  for (const tool of tools) {
    await sql`
      insert into mcp_tools (
        name, slug, description, category, source, source_url, github_url, package_url,
        install_command, stars, last_commit, license, status, trust_score, confidence_score,
        open_issues, readme_length, last_reviewed_at, enrichment, updated_at
      ) values (
        ${tool.name}, ${tool.slug}, ${tool.description}, ${tool.category}, ${tool.source},
        ${tool.sourceUrl}, ${tool.githubUrl}, ${tool.packageUrl}, ${tool.installCommand},
        ${tool.stars}, ${tool.lastCommit}, ${tool.license}, ${tool.status}, ${tool.trustScore},
        ${tool.confidenceScore}, ${tool.openIssues}, ${tool.readmeLength}, ${tool.lastReviewedAt},
        ${JSON.stringify(tool.enrichment ?? {})}, now()
      )
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        source = excluded.source,
        source_url = excluded.source_url,
        github_url = excluded.github_url,
        package_url = excluded.package_url,
        install_command = excluded.install_command,
        stars = excluded.stars,
        last_commit = excluded.last_commit,
        license = excluded.license,
        status = case
          when mcp_tools.status = 'reviewed' and excluded.status = 'unreviewed' then mcp_tools.status
          else excluded.status
        end,
        trust_score = case
          when mcp_tools.status = 'reviewed' and excluded.status = 'unreviewed' then mcp_tools.trust_score
          else excluded.trust_score
        end,
        confidence_score = case
          when mcp_tools.status = 'reviewed' and excluded.status = 'unreviewed' then mcp_tools.confidence_score
          else excluded.confidence_score
        end,
        open_issues = excluded.open_issues,
        readme_length = excluded.readme_length,
        last_reviewed_at = case
          when mcp_tools.status = 'reviewed' and excluded.status = 'unreviewed' then mcp_tools.last_reviewed_at
          else excluded.last_reviewed_at
        end,
        enrichment = excluded.enrichment,
        updated_at = now()
    `;
  }

  return { persisted: true, count: tools.length, tools };
}

export async function patchMcpTool(
  slug: string,
  input: McpToolInput,
  options: { changeSummary?: string; source?: string } = {},
) {
  const existing = (await listMcpTools("all")).find((tool) => tool.slug === slug);
  if (!existing) return null;
  const merged = normalizeToolInput({ ...existing, ...input, slug });
  await upsertMcpTools([merged]);
  if (hasReviewChange(existing, merged)) {
    await createMcpToolSnapshot(existing, merged, {
      changeSummary: options.changeSummary,
      source: options.source ?? "admin",
    });
  }
  return merged;
}

function parseGitHubRepo(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) return null;
  return `${match[1]}/${match[2].replace(/\.git$/, "")}`;
}

export async function enrichMcpTool(slug: string) {
  const tool = (await listMcpTools("all")).find((item) => item.slug === slug);
  if (!tool?.githubUrl) return null;

  const repo = parseGitHubRepo(tool.githubUrl);
  if (!repo) return null;

  const headers = {
    Accept: "application/vnd.github+json",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };

  const [repoResponse, commitsResponse, readmeResponse] = await Promise.all([
    fetch(`https://api.github.com/repos/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, { headers }),
    fetch(`https://api.github.com/repos/${repo}/readme`, { headers }),
  ]);

  if (!repoResponse.ok) throw new Error(`GitHub repo fetch failed: ${repoResponse.status}`);

  const repoData = (await repoResponse.json()) as {
    stargazers_count?: number;
    open_issues_count?: number;
    license?: { spdx_id?: string; name?: string } | null;
  };
  const commits = commitsResponse.ok
    ? ((await commitsResponse.json()) as Array<{ commit?: { committer?: { date?: string } } }>)
    : [];
  const readme = readmeResponse.ok ? ((await readmeResponse.json()) as { size?: number }) : null;

  const enriched = await patchMcpTool(slug, {
    stars: repoData.stargazers_count ?? tool.stars,
    openIssues: repoData.open_issues_count ?? tool.openIssues,
    license: repoData.license?.spdx_id || repoData.license?.name || tool.license,
    lastCommit: commits[0]?.commit?.committer?.date ?? tool.lastCommit,
    readmeLength: readme?.size ?? tool.readmeLength,
    enrichment: {
      ...(tool.enrichment ?? {}),
      githubRepo: repo,
      enrichedAt: new Date().toISOString(),
    },
  });

  return enriched;
}
