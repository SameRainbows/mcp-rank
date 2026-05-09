import { neon } from "@neondatabase/serverless";
import { servers, weeklyReports } from "./sample-data";
import type { McpServer, WeeklyReport } from "./types";

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

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

function mapServer(row: ServerRow): McpServer {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    tagline: row.tagline,
    source: row.source,
    packageName: row.package_name,
    installCommand: row.install_command,
    repositoryUrl: row.repository_url,
    stars: row.stars,
    lastReviewed: row.last_reviewed,
    transports: row.transports,
    clients: row.clients as McpServer["clients"],
    risk: row.risk,
    score: row.score,
    signals: row.signals,
    evidence: row.evidence,
    cautions: row.cautions,
    examples: row.examples,
  };
}

export async function getServers(): Promise<McpServer[]> {
  const sql = getSql();
  if (!sql) return servers;

  const rows = (await sql`
    select slug, name, category, tagline, source, package_name, install_command,
      repository_url, stars, to_char(last_reviewed, 'YYYY-MM-DD') as last_reviewed,
      transports, clients, risk, score, signals, evidence, cautions, examples
    from mcp_servers
    order by (score->>'usefulness')::int desc, name asc
  `) as ServerRow[];

  return rows.map(mapServer);
}

export async function getServer(slug: string) {
  const allServers = await getServers();
  return allServers.find((server) => server.slug === slug);
}

export async function getWeeklyReports(): Promise<WeeklyReport[]> {
  return weeklyReports;
}

export async function getWeeklyReport(slug: string) {
  return weeklyReports.find((report) => report.slug === slug);
}
