import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert, ShieldCheck, Terminal } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { BadgeEmbeds } from "@/components/badge-embeds";
import { ClaimListingLink } from "@/components/claim-listing-link";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { ServerViewTracker } from "@/components/server-view-tracker";
import { TrackedSourceLink } from "@/components/tracked-source-link";
import { WatchlistButton } from "@/components/watchlist-button";
import { getServer, getServers } from "@/lib/data";
import { listReviewSnapshots } from "@/lib/review-snapshots";
import { confidenceLabel, evidenceUpdatedAt, reviewStatusLabel, sourceLinksFor } from "@/lib/server-derived";
import { overallScore, scoreLabels } from "@/lib/scoring";
import type { ReviewSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const servers = await getServers();
  return servers
    .filter((server) => server.status !== "indexed")
    .map((server) => ({ slug: server.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const server = await getServer(slug);
  if (!server) return {};

  return {
    title: `${server.name} Review`,
    description: server.tagline,
  };
}

export default async function ServerPage({ params }: PageProps) {
  const { slug } = await params;
  const server = await getServer(slug);
  if (!server) notFound();

  const total = overallScore(server.score);
  const sourceLinks = sourceLinksFor(server);
  const reviewSnapshots = await listReviewSnapshots(server.slug, server);

  if (server.status === "indexed") {
    return (
      <ArenaShell mode="Indexed Server">
        <ServerViewTracker slug={server.slug} />
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <p className="text-sm font-semibold text-[var(--arena-green)]">{server.category}</p>
              <h1 className="mt-3 font-serif text-5xl font-semibold leading-tight">{server.name}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">{server.tagline}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-md border border-[#b9ddec] bg-[#edf8fc] px-2.5 py-1 text-sm font-semibold text-[var(--arena-ink)]">
                  Indexed
                </span>
                <span className="rounded-md border border-[var(--arena-line)] bg-white px-2.5 py-1 text-sm font-medium text-[var(--arena-muted)]">
                  Low confidence
                </span>
                <span className="rounded-md border border-[var(--arena-line)] bg-white px-2.5 py-1 text-sm font-medium text-[var(--arena-muted)]">
                  Not ranked
                </span>
              </div>
            </div>
            <aside className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">Not yet reviewed</h2>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--arena-muted)]">
                <span>Source provider: {server.sourceProvider || server.source}</span>
                <span>Source kind: {server.sourceKind || "Public source"}</span>
                <span>Imported: {server.importedAt || "Pending import timestamp"}</span>
                <span>Last seen: {evidenceUpdatedAt(server) || "Pending source refresh"}</span>
              </div>
              <WatchlistButton
                item={{
                  slug: server.slug,
                  name: server.name,
                  category: server.category,
                  risk: server.risk,
                  confidence: confidenceLabel(server),
                  status: reviewStatusLabel(server),
                  score: "Indexed",
                }}
              />
              <ClaimListingLink slug={server.slug} />
            </aside>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Indexed from public source</h2>
              <div className="mt-5 grid gap-4 text-sm leading-6 text-[var(--arena-muted)]">
                <div className="flex gap-3">
                  <CircleAlert className="mt-1 shrink-0 text-[var(--arena-amber)]" size={17} />
                  <span>This tool is discoverable in MCP Rank, but it has not received an MCP Rank trust review.</span>
                </div>
                <div className="flex gap-3">
                  <CircleAlert className="mt-1 shrink-0 text-[var(--arena-amber)]" size={17} />
                  <span>It is excluded from public leaderboards, safest lists, and trusted recommendations.</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-1 shrink-0 text-[var(--arena-green)]" size={17} />
                  <span>Submit maintainer evidence, install docs, package links, auth details, or risk notes to help review this listing.</span>
                </div>
              </div>
            </div>

            <aside className="grid content-start gap-5">
              <EvidenceHistoryCard snapshots={reviewSnapshots} indexed />
              <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
                <h2 className="font-serif text-2xl font-semibold">Sources</h2>
                <div className="mt-3 grid gap-3 text-sm">
                  {sourceLinks.map((link) => (
                    <TrackedSourceLink
                      key={`${link.type}-${link.url}`}
                      href={link.url}
                      label={link.label}
                      serverSlug={server.slug}
                      sourceType={link.type}
                    />
                  ))}
                  <p className="leading-6 text-[var(--arena-muted)]">Source trail: {server.source}</p>
                </div>
              </section>
              <NewsletterSignup context={`indexed-server-${server.slug}`} compact />
            </aside>
          </section>
        </main>
      </ArenaShell>
    );
  }

  return (
    <ArenaShell mode="Server Review">
      <ServerViewTracker slug={server.slug} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm font-semibold text-[var(--arena-green)]">{server.category}</p>
            <h1 className="mt-3 font-serif text-5xl font-semibold leading-tight">{server.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">{server.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[reviewStatusLabel(server), `${confidenceLabel(server)} confidence`, `${server.risk} risk`].map((label) => (
                <span
                  key={label}
                  className="rounded-md border border-[#b9ddec] bg-[#edf8fc] px-2.5 py-1 text-sm font-semibold capitalize text-[var(--arena-ink)]"
                >
                  {label}
                </span>
              ))}
              {server.clients.map((client) => (
                <span
                  key={client}
                  className="rounded-md border border-[var(--arena-line)] bg-white px-2.5 py-1 text-sm font-medium capitalize text-[var(--arena-muted)]"
                >
                  {client === "vscode" ? "VS Code" : client}
                </span>
              ))}
            </div>
          </div>
          <aside className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--arena-muted)]">MCP Rank score</span>
              <span className="font-mono text-5xl font-semibold">{total}</span>
            </div>
            <div className="mt-5 grid gap-2 text-sm text-[var(--arena-muted)]">
              <span>Status: {reviewStatusLabel(server)}</span>
              <span>Confidence: {confidenceLabel(server)}</span>
              <span>Last reviewed: {server.lastReviewed || "Not manually reviewed yet"}</span>
              <span>Evidence updated: {evidenceUpdatedAt(server)}</span>
              <span>Stars: {server.stars.toLocaleString()}</span>
              <span>Source: {server.source}</span>
              <span className="capitalize">Risk: {server.risk}</span>
            </div>
            <WatchlistButton
              item={{
                slug: server.slug,
                name: server.name,
                category: server.category,
                risk: server.risk,
                confidence: confidenceLabel(server),
                status: reviewStatusLabel(server),
                score: total,
              }}
            />
            <ClaimListingLink slug={server.slug} />
          </aside>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-8">
            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Score breakdown</h2>
              <div className="mt-5 grid gap-4">
                {Object.entries(scoreLabels).map(([key, label]) => {
                  const value = server.score[key as keyof typeof server.score];
                  return (
                    <div key={key}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-[var(--arena-muted)]">{label}</span>
                        <span className="font-mono font-semibold">{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--arena-surface)]">
                        <div
                          className="h-2 rounded-full bg-[var(--arena-green)]"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <EvidenceHistoryCard snapshots={reviewSnapshots} />

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Evidence notes</h2>
              <div className="mt-5 grid gap-4">
                {server.evidence.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                    <CheckCircle2 className="mt-1 shrink-0 text-[var(--arena-green)]" size={17} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {(server.useCases?.length || server.riskAnalysis?.length) && (
              <section className="grid gap-5 md:grid-cols-2">
                {Boolean(server.useCases?.length) && (
                  <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
                    <h2 className="font-serif text-2xl font-semibold">Best-fit use cases</h2>
                    <div className="mt-5 grid gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                      {server.useCases?.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                {Boolean(server.riskAnalysis?.length) && (
                  <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
                    <h2 className="font-serif text-2xl font-semibold">Risk analysis</h2>
                    <div className="mt-5 grid gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                      {server.riskAnalysis?.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Use-case examples</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {server.examples.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-[var(--arena-line)] bg-[var(--arena-surface)] p-4 text-sm leading-6 text-[var(--arena-muted)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">Review status</h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-1 shrink-0 text-[var(--arena-green)]" size={17} />
                  <span>{reviewStatusLabel(server)} with {confidenceLabel(server).toLowerCase()} confidence.</span>
                </div>
                <p>
                  Top safest rankings exclude low-confidence and unreviewed tools. This page is a review signal, not formal certification.
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">Install test</h2>
              <div className="mt-4 rounded-md bg-[var(--arena-ink)] p-4 text-sm text-white">
                <div className="mb-2 flex items-center gap-2 text-zinc-300">
                  <Terminal size={15} aria-hidden="true" />
                  <span>Command</span>
                </div>
                <code className="break-words font-mono text-xs leading-6">{server.installCommand}</code>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">Risk review</h2>
              <div className="mt-4 grid gap-3">
                {server.cautions.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                    <CircleAlert className="mt-1 shrink-0 text-[var(--arena-amber)]" size={17} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">Sources</h2>
              <div className="mt-3 grid gap-3 text-sm">
                {sourceLinks.map((link) => (
                  <TrackedSourceLink
                    key={`${link.type}-${link.url}`}
                    href={link.url}
                    label={link.label}
                    serverSlug={server.slug}
                    sourceType={link.type}
                  />
                ))}
                <p className="leading-6 text-[var(--arena-muted)]">Source trail: {server.source}</p>
              </div>
            </section>

            <BadgeEmbeds serverName={server.name} serverSlug={server.slug} maintainerVerified={server.maintainerVerified} />
            <NewsletterSignup context={`server-${server.slug}`} compact />
          </aside>
        </section>
      </main>
    </ArenaShell>
  );
}

function formatSnapshotDate(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(timestamp);
}

function scoreMovement(snapshot: ReviewSnapshot) {
  if (snapshot.overallScore === null) return "No score";
  if (snapshot.previousOverallScore === null || snapshot.previousOverallScore === undefined) {
    return String(snapshot.overallScore);
  }
  if (snapshot.previousOverallScore === snapshot.overallScore) return String(snapshot.overallScore);
  return `${snapshot.previousOverallScore} -> ${snapshot.overallScore}`;
}

function EvidenceHistoryCard({ snapshots, indexed = false }: { snapshots: ReviewSnapshot[]; indexed?: boolean }) {
  if (indexed || snapshots.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
        <h2 className="font-serif text-2xl font-semibold">Evidence history</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
          No MCP Rank review history has been captured yet. Indexed listings remain excluded from trusted rankings until a review snapshot records score, confidence, and risk evidence.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Evidence history</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--arena-muted)]">
            Review snapshots show why the current score, confidence, and risk labels changed over time.
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--arena-muted)]">
          {snapshots[0]?.source.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--arena-line)]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-[var(--arena-surface)] text-xs font-semibold text-[var(--arena-muted)]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--arena-line)]">
            {snapshots.map((snapshot) => (
              <tr key={snapshot.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-[var(--arena-muted)]">
                  {formatSnapshotDate(snapshot.capturedAt)}
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">{snapshot.changeSummary}</div>
                  {snapshot.notes && <p className="mt-1 text-xs leading-5 text-[var(--arena-muted)]">{snapshot.notes}</p>}
                  <p className="mt-1 text-xs capitalize text-[var(--arena-muted)]">
                    {snapshot.subjectType} snapshot · {String(snapshot.status).replace(/_/g, " ")}
                  </p>
                </td>
                <td className="px-4 py-4 font-mono font-semibold">{scoreMovement(snapshot)}</td>
                <td className="px-4 py-4 capitalize text-[var(--arena-muted)]">{snapshot.confidence}</td>
                <td className="px-4 py-4 capitalize text-[var(--arena-muted)]">{snapshot.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
