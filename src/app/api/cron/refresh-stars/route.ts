import { neon } from "@neondatabase/serverless";
import { servers } from "@/lib/sample-data";

export const runtime = "nodejs";

let sqlClient: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

function parseGitHubRepo(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) return null;
  return `${match[1]}/${match[2].replace(/\.git$/, "")}`;
}

async function fetchStars(repo: string) {
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });

  if (!response.ok) {
    return { repo, ok: false, stars: null, status: response.status };
  }

  const data = (await response.json()) as { stargazers_count?: number };
  return { repo, ok: true, stars: data.stargazers_count ?? 0, status: response.status };
}

export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sql = getSql();
  const rows = sql
    ? ((await sql`
        select slug, repository_url from mcp_servers where repository_url like '%github.com%'
      `) as { slug: string; repository_url: string }[])
    : servers.map((server) => ({ slug: server.slug, repository_url: server.repositoryUrl }));

  const updates = await Promise.all(
    rows.map(async (row) => {
      const repo = parseGitHubRepo(row.repository_url);
      if (!repo) return { slug: row.slug, ok: false, reason: "not-github" };

      const result = await fetchStars(repo);
      if (sql && result.ok && result.stars !== null) {
        await sql`
          update mcp_servers
          set stars = ${result.stars}, updated_at = now()
          where slug = ${row.slug}
        `;
      }

      return { slug: row.slug, ...result };
    }),
  );

  return Response.json({
    refreshedAt: new Date().toISOString(),
    persisted: Boolean(sql),
    updates,
  });
}
