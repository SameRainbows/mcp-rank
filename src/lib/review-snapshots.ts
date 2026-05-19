import { neon } from "@neondatabase/serverless";
import { servers } from "./sample-data";
import { overallScore } from "./scoring";
import type { McpTool } from "./tool-types";
import type { McpServer, ReviewSnapshot, ScoreBreakdown } from "./types";

type ServerSnapshotRow = {
  id: number;
  server_slug: string;
  score: Partial<ScoreBreakdown>;
  stars: number;
  notes: string | null;
  overall_score: number | null;
  previous_overall_score: number | null;
  status: ReviewSnapshot["status"] | null;
  confidence: ReviewSnapshot["confidence"] | null;
  risk: ReviewSnapshot["risk"] | null;
  change_summary: string | null;
  source: string | null;
  captured_at: string;
};

type ToolSnapshotRow = {
  id: number;
  tool_slug: string;
  score: Partial<ScoreBreakdown>;
  overall_score: number | null;
  previous_overall_score: number | null;
  status: ReviewSnapshot["status"];
  confidence_score: ReviewSnapshot["confidence"];
  risk: ReviewSnapshot["risk"];
  change_summary: string;
  source: string;
  captured_at: string;
};

let sqlClient: ReturnType<typeof neon> | null = null;
let snapshotSchemaReady = false;
const memorySnapshots = new Map<string, ReviewSnapshot[]>();

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

function isRecoverableDatabaseError(error: unknown) {
  return error instanceof Error && /exceeded the data transfer quota|HTTP status 402|DATABASE_URL/i.test(error.message);
}

function fallbackSnapshots(slug: string, server: McpServer | undefined, limit: number) {
  const snapshots = [...(memorySnapshots.get(slug) ?? [])];
  const seedServer = server ?? servers.find((item) => item.slug === slug);
  const seedSnapshot = seedServer ? fallbackSeedSnapshot(seedServer) : null;
  return [...snapshots, ...(seedSnapshot ? [seedSnapshot] : [])].slice(0, limit);
}

async function ensureSnapshotSchema(sql: ReturnType<typeof neon>) {
  if (snapshotSchemaReady) return;

  await sql`
    create table if not exists scoring_snapshots (
      id bigserial primary key,
      server_slug text not null references mcp_servers(slug) on delete cascade,
      score jsonb not null,
      stars integer not null default 0,
      notes text,
      captured_at timestamptz not null default now()
    )
  `;
  await sql`alter table scoring_snapshots add column if not exists overall_score integer`;
  await sql`alter table scoring_snapshots add column if not exists previous_overall_score integer`;
  await sql`alter table scoring_snapshots add column if not exists status text`;
  await sql`alter table scoring_snapshots add column if not exists confidence text`;
  await sql`alter table scoring_snapshots add column if not exists risk text`;
  await sql`alter table scoring_snapshots add column if not exists change_summary text`;
  await sql`alter table scoring_snapshots add column if not exists source text not null default 'manual_review'`;

  await sql`
    create table if not exists mcp_tool_snapshots (
      id bigserial primary key,
      tool_slug text not null references mcp_tools(slug) on delete cascade,
      score jsonb not null default '{}'::jsonb,
      overall_score integer,
      previous_overall_score integer,
      status text not null,
      confidence_score text not null,
      risk text not null default 'medium' check (risk in ('low', 'medium', 'high')),
      change_summary text not null default 'Admin review metadata updated.',
      source text not null default 'admin',
      captured_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists mcp_tool_snapshots_tool_captured_idx
    on mcp_tool_snapshots(tool_slug, captured_at desc)
  `;

  snapshotSchemaReady = true;
}

function toolScore(tool: McpTool): ScoreBreakdown {
  const score = tool.trustScore ?? 0;
  return {
    installDocs: score,
    maintenance: score,
    auth: score,
    compatibility: score,
    usefulness: score,
    safety: score,
  };
}

function toolRisk(tool: McpTool): ReviewSnapshot["risk"] {
  return tool.status === "blocked" ? "high" : "medium";
}

function defaultToolSummary(before: McpTool, after: McpTool) {
  const changes: string[] = [];
  if (before.status !== after.status) changes.push(`status ${before.status} to ${after.status}`);
  if (before.confidenceScore !== after.confidenceScore) {
    changes.push(`confidence ${before.confidenceScore} to ${after.confidenceScore}`);
  }
  if (before.trustScore !== after.trustScore) changes.push(`trust score ${before.trustScore ?? "unset"} to ${after.trustScore ?? "unset"}`);
  if (before.lastReviewedAt !== after.lastReviewedAt) changes.push("review timestamp updated");

  return changes.length ? `Admin updated ${changes.join(", ")}.` : "Admin review metadata updated.";
}

function fallbackSeedSnapshot(server: McpServer): ReviewSnapshot | null {
  if (server.status === "indexed") return null;

  return {
    id: `seed-${server.slug}`,
    slug: server.slug,
    subjectType: "seed",
    score: server.score,
    overallScore: overallScore(server.score),
    previousOverallScore: null,
    status: server.status,
    confidence: server.confidence,
    risk: server.risk,
    changeSummary: server.maintainerVerified && server.maintainerVerifiedAt
      ? "Seed review includes maintainer verification and source-backed evidence."
      : "Initial MCP Rank review captured from the curated seed dataset.",
    source: "seed_review",
    notes: server.evidence[0],
    capturedAt: server.lastReviewed || server.evidenceUpdated || new Date().toISOString(),
  };
}

function mapServerSnapshot(row: ServerSnapshotRow, server?: McpServer): ReviewSnapshot {
  return {
    id: `server-${row.id}`,
    slug: row.server_slug,
    subjectType: "server",
    score: row.score ?? {},
    overallScore: row.overall_score ?? (row.score ? overallScore(row.score as ScoreBreakdown) : null),
    previousOverallScore: row.previous_overall_score,
    status: row.status ?? server?.status ?? "reviewed",
    confidence: row.confidence ?? server?.confidence ?? "low",
    risk: row.risk ?? server?.risk ?? "medium",
    changeSummary: row.change_summary || row.notes || "Score evidence snapshot captured.",
    source: row.source || "manual_review",
    notes: row.notes ?? undefined,
    capturedAt: row.captured_at,
  };
}

function mapToolSnapshot(row: ToolSnapshotRow): ReviewSnapshot {
  return {
    id: `tool-${row.id}`,
    slug: row.tool_slug,
    subjectType: "tool",
    score: row.score ?? {},
    overallScore: row.overall_score,
    previousOverallScore: row.previous_overall_score,
    status: row.status,
    confidence: row.confidence_score,
    risk: row.risk,
    changeSummary: row.change_summary,
    source: row.source,
    capturedAt: row.captured_at,
  };
}

export async function createMcpToolSnapshot(
  before: McpTool,
  after: McpTool,
  options: { changeSummary?: string; source?: string } = {},
) {
  const snapshot: ReviewSnapshot = {
    id: `memory-${after.slug}-${Date.now()}`,
    slug: after.slug,
    subjectType: "tool",
    score: toolScore(after),
    overallScore: after.trustScore,
    previousOverallScore: before.trustScore,
    status: after.status === "blocked" ? "blocked" : after.status,
    confidence: after.confidenceScore,
    risk: toolRisk(after),
    changeSummary: options.changeSummary?.trim() || defaultToolSummary(before, after),
    source: options.source ?? "admin",
    capturedAt: new Date().toISOString(),
  };

  const sql = getSql();
  if (!sql) {
    const existing = memorySnapshots.get(after.slug) ?? [];
    memorySnapshots.set(after.slug, [snapshot, ...existing].slice(0, 25));
    return snapshot;
  }

  try {
    await ensureSnapshotSchema(sql);
    await sql`
      insert into mcp_tool_snapshots (
        tool_slug, score, overall_score, previous_overall_score, status,
        confidence_score, risk, change_summary, source
      ) values (
        ${after.slug}, ${JSON.stringify(snapshot.score)}, ${snapshot.overallScore},
        ${snapshot.previousOverallScore}, ${snapshot.status}, ${snapshot.confidence},
        ${snapshot.risk}, ${snapshot.changeSummary}, ${snapshot.source}
      )
    `;
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) throw error;
    const existing = memorySnapshots.get(after.slug) ?? [];
    memorySnapshots.set(after.slug, [snapshot, ...existing].slice(0, 25));
  }

  return snapshot;
}

export async function listReviewSnapshots(slug: string, server?: McpServer, limit = 6): Promise<ReviewSnapshot[]> {
  const sql = getSql();
  if (!sql) {
    return fallbackSnapshots(slug, server, limit);
  }

  try {
    await ensureSnapshotSchema(sql);

    const serverRowsPromise = sql`
      select id, server_slug, score, stars, notes, overall_score, previous_overall_score,
        status, confidence, risk, change_summary, source, captured_at::text
      from scoring_snapshots
      where server_slug = ${slug}
      order by captured_at desc
      limit ${limit}
    ` as unknown as Promise<ServerSnapshotRow[]>;
    const toolRowsPromise = sql`
      select id, tool_slug, score, overall_score, previous_overall_score, status,
        confidence_score, risk, change_summary, source, captured_at::text
      from mcp_tool_snapshots
      where tool_slug = ${slug}
      order by captured_at desc
      limit ${limit}
    ` as unknown as Promise<ToolSnapshotRow[]>;

    const [serverRows, toolRows] = await Promise.all([serverRowsPromise, toolRowsPromise]);

    const snapshots = [
      ...serverRows.map((row) => mapServerSnapshot(row, server)),
      ...toolRows.map(mapToolSnapshot),
    ].sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));

    if (snapshots.length) return snapshots.slice(0, limit);

    return fallbackSnapshots(slug, server, limit);
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) throw error;
    return fallbackSnapshots(slug, server, limit);
  }
}
