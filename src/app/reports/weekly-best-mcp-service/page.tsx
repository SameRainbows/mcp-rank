import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { ScoreBadge } from "@/components/score-badge";
import { getServer, getWeeklyReport } from "@/lib/data";
import { overallScore } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Best MCP Server This Week",
  description: "The weekly MCP Arena report on the safest and most useful MCP server to install.",
};

export default async function WeeklyBestReportPage() {
  const report = await getWeeklyReport("weekly-best-mcp-service");
  const winner = report ? await getServer(report.winnerSlug) : undefined;

  if (!report || !winner) return null;

  return (
    <ArenaShell mode="Reports">
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[var(--arena-green)]">Week of {report.weekOf}</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">{report.title}</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--arena-muted)]">{report.summary}</p>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-500">Winner</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold">{winner.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--arena-muted)]">{winner.tagline}</p>
            </div>
            <ScoreBadge score={overallScore(winner.score)} size="lg" />
          </div>
          <Link
            href={`/servers/${winner.slug}`}
            className="mt-6 inline-flex rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
          >
            Open full review
          </Link>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Why it won</h2>
          <div className="mt-5 grid gap-4">
            {report.whyItWon.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                <CheckCircle2 className="mt-1 shrink-0 text-[var(--arena-green)]" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Watch list</h2>
          <div className="mt-5 grid gap-4">
            {report.watchList.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                <CircleAlert className="mt-1 shrink-0 text-[var(--arena-amber)]" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </article>
    </ArenaShell>
  );
}
