# MCP Rank

MCP Rank is a Next.js trust index for MCP servers. The product ranks servers for
quality, trust, safety, client compatibility, and real usefulness so developers
and AI teams can review evidence before installing an MCP server.

## What is included

- Public rankings at `/rankings`
- Server review pages at `/servers/[slug]`
- Weekly report pages at `/reports/weekly-best-mcp-service`
- Scoring methodology at `/methodology`
- Neon Postgres schema in `db/schema.sql`
- Vercel Cron job at `/api/cron/refresh-stars`

## Scoring categories

Scores are weighted across install/documentation quality, maintenance activity,
auth handling, client compatibility, real usefulness, and safety signals. The
initial dataset is manual and semi-automated by design; automation should gather
signals and preserve review history, not overwrite judgment.

## Local development

```bash
npm install
npm run dev
```

Optional environment variables:

```bash
DATABASE_URL=postgres://...
GITHUB_TOKEN=github_pat_or_fine_grained_token
CRON_SECRET=shared_secret_for_manual_cron_calls
```

If `DATABASE_URL` is not set, the app uses the local seed dataset in
`src/lib/sample-data.ts`.

## Deployment

The app is configured for Vercel. Create a Neon database, apply `db/schema.sql`,
set `DATABASE_URL`, and deploy. Vercel Cron refreshes GitHub stars once per day.
