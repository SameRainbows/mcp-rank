# MCP Arena

MCP Arena is a Next.js trust index and comparison surface for MCP servers. The
product ranks servers for quality, trust, safety, client compatibility, and real
usefulness so developers and AI teams can review evidence before installing an
MCP server.

## What is included

- Battle/search surface at `/`
- Public leaderboard at `/rankings`
- Search workbench at `/search`
- CSV-first admin workflow at `/admin`
- Server review pages at `/servers/[slug]`
- Weekly report pages at `/reports/weekly-best-mcp-service`
- Scoring methodology at `/methodology`
- Neon Postgres schema in `db/schema.sql`
- Vercel Cron job at `/api/cron/refresh-stars`
- Server-side Azure AI chat endpoint at `/api/chat`

## Scoring categories

Scores are weighted across install/documentation quality, maintenance activity,
auth handling, client compatibility, real usefulness, and safety signals. The
initial dataset is manual and semi-automated by design; automation should gather
signals and preserve review history, not overwrite judgment.

The canonical import table is `mcp_tools`. It separates `trust_score` from
`confidence_score`, so a promising but weakly evidenced tool can remain visible
without being promoted into high-confidence safety rankings.

## Admin import flow

1. Open `/admin`.
2. Download the CSV template from `/templates/mcp-tools-import-template.csv`.
3. Import candidate tools from the official MCP registry, Smithery, Glama,
   GitHub search, npm, or PyPI.
4. Keep new rows as `unreviewed`.
5. Manually edit `trust_score`, `confidence_score`, and `status`.
6. Use the enrichment action to fetch GitHub stars, last commit, open issues,
   README length, and license when `github_url` is available.

## Local development

```bash
npm install
npm run dev
```

Optional environment variables:

```bash
DATABASE_URL=postgres://...
GITHUB_TOKEN=github_pat_or_fine_grained_token
ADMIN_TOKEN=shared_secret_for_admin_writes
CRON_SECRET=shared_secret_for_manual_cron_calls
MCP_CHAT_ENABLED=true
AZURE_AI_TARGET_URI=https://forapikeys.services.ai.azure.com
AZURE_AI_MODEL=Kimi-K2.6
AZURE_AI_API_VERSION=2024-05-01-preview
AZURE_AI_API_KEY=rotated_server_side_key
```

If `DATABASE_URL` is not set, the app uses the local seed dataset in
`src/lib/sample-data.ts`.

The chat key must be rotated before use if it was ever pasted into a chat,
ticket, or document. Store it only in `.env.local` and Vercel environment
variables; never expose it through `NEXT_PUBLIC_` variables.

## Deployment

The app is configured for Vercel. Create a Neon database, apply `db/schema.sql`,
set `DATABASE_URL`, and deploy. Vercel Cron refreshes GitHub stars once per day.
