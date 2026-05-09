import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Header } from "@/components/header";
import { ScoreBadge } from "@/components/score-badge";
import { getServer, getWeeklyReport } from "@/lib/data";
import { overallScore } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Best MCP Service This Week | MCP Rank",
  description: "The weekly MCP Rank report on the safest and most useful MCP service to install.",
};

export default async function WeeklyBestReportPage() {
  const report = await getWeeklyReport("weekly-best-mcp-service");
  const winner = report ? await getServer(report.winnerSlug) : undefined;

  if (!report || !winner) return null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <Header />
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-emerald-700">Week of {report.weekOf}</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">{report.title}</h1>
        <p className="mt-5 text-lg leading-8 text-zinc-600">{report.summary}</p>

        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-500">Winner</p>
              <h2 className="mt-2 text-3xl font-semibold">{winner.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{winner.tagline}</p>
            </div>
            <ScoreBadge score={overallScore(winner.score)} size="lg" />
          </div>
          <Link
            href={`/servers/${winner.slug}`}
            className="mt-6 inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Open full review
          </Link>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Why it won</h2>
          <div className="mt-5 grid gap-4">
            {report.whyItWon.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-zinc-700">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Watch list</h2>
          <div className="mt-5 grid gap-4">
            {report.watchList.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-zinc-700">
                <CircleAlert className="mt-1 shrink-0 text-amber-600" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
