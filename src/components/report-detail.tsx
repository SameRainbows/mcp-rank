import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { ScoreBadge } from "@/components/score-badge";
import { SubmitServerLink } from "@/components/submit-server-link";
import { getServer, getServers, getWeeklyReport } from "@/lib/data";
import { overallScore } from "@/lib/scoring";
import { isRankable } from "@/lib/server-derived";

type ReportDetailProps = {
  slug: string;
};

export async function ReportDetail({ slug }: ReportDetailProps) {
  const report = await getWeeklyReport(slug);
  if (!report) notFound();

  const [winner, servers] = await Promise.all([
    getServer(report.winnerSlug),
    getServers(),
  ]);
  if (!winner) notFound();

  const reviewed = servers.filter(isRankable).sort((a, b) => overallScore(b.score) - overallScore(a.score));

  return (
    <ArenaShell mode="Reports">
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[var(--arena-green)]">Week of {report.weekOf}</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">{report.title}</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--arena-muted)]">{report.summary}</p>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-500">Lead signal</p>
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
          <h2 className="font-serif text-2xl font-semibold">Top 3 reviewed servers</h2>
          <div className="mt-5 divide-y divide-[var(--arena-line)]">
            {reviewed.slice(0, 3).map((server, index) => (
              <Link
                key={server.slug}
                href={`/servers/${server.slug}`}
                className="flex items-center justify-between gap-4 py-3 text-sm hover:text-[var(--arena-green)]"
              >
                <span>
                  <span className="font-semibold">{index + 1}. {server.name}</span>
                  <span className="block text-[var(--arena-muted)]">{server.category} · {server.risk} risk · {server.confidence} confidence</span>
                </span>
                <span className="font-mono text-lg font-semibold">{overallScore(server.score)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Why this matters</h2>
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

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <h2 className="font-serif text-2xl font-semibold">Biggest risk note</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--arena-muted)]">{report.biggestRiskNote}</p>
          </div>
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <h2 className="font-serif text-2xl font-semibold">Needs maintainer verification</h2>
            <div className="mt-4 grid gap-2 text-sm text-[var(--arena-muted)]">
              {report.needsVerification?.map((item) => <p key={item}>{item}</p>)}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <h2 className="font-serif text-2xl font-semibold">Newly indexed</h2>
            <div className="mt-4 grid gap-2 text-sm text-[var(--arena-muted)]">
              {report.newlyIndexed?.map((item) => <p key={item}>{item}</p>)}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <h2 className="font-serif text-2xl font-semibold">What changed</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--arena-muted)]">
              {report.changes?.map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-1 shrink-0 text-[var(--arena-green)]" size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8">
          <NewsletterSignup context="weekly-report" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <SubmitServerLink className="rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white">
            Submit an MCP server
          </SubmitServerLink>
          <Link href="/rankings" className="rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold">
            View leaderboard
          </Link>
        </div>
      </article>
    </ArenaShell>
  );
}
