import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/header";
import { RankingExplorer } from "@/components/ranking-explorer";
import { ServerSummary } from "@/components/server-summary";
import { getServer, getServers, getWeeklyReport } from "@/lib/data";

export default async function Home() {
  const [serverList, report] = await Promise.all([
    getServers(),
    getWeeklyReport("weekly-best-mcp-service"),
  ]);
  const leader = await getServer(report?.winnerSlug ?? serverList[0].slug);

  if (!report || !leader) return null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <Header />
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-16">
          <div>
            <div className="flex items-center gap-3 text-sm font-semibold text-emerald-700">
              <ShieldCheck size={18} aria-hidden="true" />
              Quality, trust, and safety scoring for MCP installs
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-zinc-950 sm:text-6xl">
              The page teams check before installing an MCP server.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
              MCP Rank combines install tests, documentation review, maintenance signals,
              auth handling, client compatibility, and real-world usefulness into one
              reviewable score.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/rankings"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Browse rankings
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50"
              >
                See scoring method
              </Link>
            </div>
            <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                ["5", "seed servers reviewed"],
                ["6", "weighted score categories"],
                ["24h", "GitHub star refresh cadence"],
              ].map(([value, label]) => (
                <div key={label} className="border-l-2 border-zinc-200 pl-4">
                  <div className="text-2xl font-semibold text-zinc-950">{value}</div>
                  <div className="text-sm leading-6 text-zinc-600">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <ServerSummary server={leader} report={report} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <RankingExplorer servers={serverList} compact />
        <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
            <Sparkles size={16} aria-hidden="true" />
            Build plan
          </div>
          <ol className="mt-4 grid gap-4 text-sm leading-6 text-zinc-700">
            {[
              "Start manual reviews with reproducible install notes.",
              "Store scoring snapshots in Neon Postgres.",
              "Refresh public signals daily from GitHub, npm, PyPI, and registries.",
              "Add evidence links and review history to every server page.",
            ].map((step) => (
              <li key={step} className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
