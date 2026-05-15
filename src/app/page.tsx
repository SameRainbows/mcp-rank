import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { ArenaPrompt } from "@/components/arena-prompt";
import { ArenaShell } from "@/components/arena-shell";
import { HomeEvidenceNotice } from "@/components/home-evidence-notice";
import { LeaderboardOverview } from "@/components/leaderboard-overview";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SubmitServerLink } from "@/components/submit-server-link";
import { getServer, getServers, getWeeklyReport } from "@/lib/data";
import { confidenceLabel, isTrustedRankable, reviewStatusLabel } from "@/lib/server-derived";
import { overallScore } from "@/lib/scoring";

export default async function Home() {
  const [serverList, report] = await Promise.all([
    getServers(),
    getWeeklyReport("weekly-best-mcp-service"),
  ]);
  const leader = await getServer(report?.winnerSlug ?? serverList[0].slug);
  const topServers = [...serverList]
    .filter(isTrustedRankable)
    .sort((a, b) => overallScore(b.score) - overallScore(a.score))
    .slice(0, 3);

  if (!report || !leader) return null;

  return (
    <ArenaShell>
      <main>
        <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <HomeEvidenceNotice />

          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <h1 className="max-w-4xl font-serif text-5xl leading-tight text-[var(--arena-muted)] sm:text-7xl">
              Evaluate the{" "}
              <span className="inline-block bg-[var(--arena-highlight)] px-3 italic text-[var(--arena-ink)] shadow-[8px_8px_0_#dff3fb]">
                frontier
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--arena-muted)] sm:text-lg">
              Compare reviewed MCP servers by trust score, risk, confidence, and source evidence
              before they touch your tools, repos, databases, workspaces, or customer systems.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/rankings"
                className="rounded-md bg-[var(--arena-ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
              >
                View Leaderboard
              </Link>
              <SubmitServerLink className="rounded-md border border-[var(--arena-line)] bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[var(--arena-blue-soft)]">
                Submit MCP Server
              </SubmitServerLink>
            </div>
            <div className="mt-10 w-full">
              <ArenaPrompt />
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--arena-line)] bg-[color-mix(in_srgb,var(--arena-bg)_82%,white)]">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
            <LeaderboardOverview servers={serverList} />
            <aside className="grid content-start gap-4">
              <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--arena-green)]">Ranked this week</p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold">{leader.name}</h2>
                  </div>
                  <span className="font-mono text-3xl font-semibold">{overallScore(leader.score)}</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--arena-muted)]">{report.summary}</p>
                <Link
                  href={`/servers/${leader.slug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
                >
                  Open full review
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </section>

              <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
                <h2 className="font-serif text-2xl font-semibold">Why this product can matter</h2>
                <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                  {[
                    "MCP install decisions are security decisions, not directory browsing.",
                    "Every score needs evidence, history, and a reproducible review path.",
                    "Teams need client-specific compatibility notes before rollout.",
                  ].map((item) => (
                    <div key={item} className="flex gap-3">
                      <CheckCircle2 className="mt-1 shrink-0 text-[var(--arena-green)]" size={16} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
                <h2 className="font-serif text-2xl font-semibold">Top servers</h2>
                <div className="mt-4 divide-y divide-[var(--arena-line)]">
                  {topServers.map((server, index) => (
                    <Link
                      key={server.slug}
                      href={`/servers/${server.slug}`}
                      className="flex items-center justify-between gap-4 py-3 text-sm hover:text-[var(--arena-green)]"
                    >
                      <span>
                        {index + 1}. {server.name}
                        <span className="block text-xs font-normal text-[var(--arena-muted)]">
                          {reviewStatusLabel(server)} · {confidenceLabel(server)} confidence
                        </span>
                      </span>
                      <span className="font-mono font-semibold">{overallScore(server.score)}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>

        <section className="border-t border-[var(--arena-line)] bg-[color-mix(in_srgb,var(--arena-bg)_86%,white)] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <NewsletterSignup context="homepage" />
          </div>
        </section>
      </main>
    </ArenaShell>
  );
}
