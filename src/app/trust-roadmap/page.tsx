import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { getServers } from "@/lib/data";
import glamaManifest from "../../../public/indexes/glama/manifest.json";

export const metadata: Metadata = {
  title: "Trust Roadmap",
  description: "How MCP Rank turns MCP discovery records into reviewed, corrected, and maintainer-confirmed trust evidence.",
};

export default async function TrustRoadmapPage() {
  const servers = await getServers();
  const indexedCount = glamaManifest.count.toLocaleString();
  const sourceReviewedCount = servers.filter((server) => server.reviewDepth === "source_reviewed").length;
  const deepReviewedCount = servers.filter((server) => server.reviewDepth === "deep_review").length;
  const maintainerVerifiedCount = servers.filter((server) => server.maintainerVerified).length;

  const trustSteps = [
    {
      title: "1. Index the ecosystem",
      metric: `${indexedCount}+ discovery records`,
      body: "Public directories and registries help MCP Rank see the market, but indexed records stay separate from recommendations.",
    },
    {
      title: "2. Check public evidence",
      metric: `${sourceReviewedCount} source reviewed`,
      body: "Source review checks repository, package, docs, and provenance signals without pretending that public metadata is maintainer confirmation.",
    },
    {
      title: "3. Deep review risky surfaces",
      metric: `${deepReviewedCount} deep reviewed`,
      body: "Deep reviews focus on install paths, auth behavior, write actions, local access, data movement, and operational blast radius.",
    },
    {
      title: "4. Confirm with maintainers",
      metric: `${maintainerVerifiedCount} maintainer verified`,
      body: "Maintainer Verified stays rare until a maintainer explicitly confirms listing details and MCP Rank records the evidence.",
    },
  ];

  return (
    <ArenaShell mode="Trust roadmap">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[var(--arena-green)]">Trust roadmap</p>
        <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
          <div>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight">
              MCP Rank is building a trust loop, not a scraped leaderboard.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">
              The market only matters if teams, maintainers, and tool builders can use MCP Rank to reduce uncertainty before a server gets installed into a repo, browser, database, cloud account, or customer workspace.
            </p>
          </div>
          <aside className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--arena-green)]" aria-hidden="true" />
              <h2 className="font-serif text-2xl font-semibold">Current proof</h2>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              {[
                ["Indexed", `${indexedCount}+`],
                ["Source reviewed", sourceReviewedCount],
                ["Deep reviewed", deepReviewedCount],
                ["Maintainer verified", maintainerVerifiedCount],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-t border-[var(--arena-line)] pt-3 first:border-t-0 first:pt-0">
                  <dt className="text-[var(--arena-muted)]">{label}</dt>
                  <dd className="font-mono font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {trustSteps.map((step) => (
            <article key={step.title} className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <p className="font-mono text-sm font-semibold text-[var(--arena-green)]">{step.metric}</p>
              <h2 className="mt-3 font-serif text-2xl font-semibold">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">What makes this worth pursuing?</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["A growing protocol surface", "MCP servers now touch sensitive systems: code, local files, SaaS workspaces, payments, browsers, analytics, and cloud infrastructure."],
              ["A messy discovery layer", "Directories are useful, but broken links, endpoint-only listings, stale metadata, and copied badges make install decisions harder."],
              ["A clear wedge", "MCP Rank can win by being strict about evidence, transparent about uncertainty, and useful to maintainers who want listings corrected."],
            ].map(([title, body]) => (
              <div key={title} className="border-t border-[var(--arena-line)] pt-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-1 shrink-0 text-[var(--arena-green)]" size={16} aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--arena-muted)]">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <h2 className="font-serif text-2xl font-semibold">Next product milestone</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
              Convert the first maintainer replies into visible corrections, then publish a follow-up report that shows MCP Rank can improve the ecosystem rather than only criticize it.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <h2 className="font-serif text-2xl font-semibold">Next acquisition signal</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
              Earn public references from maintainers, security builders, or MCP directory operators. Acquirers care less about raw rows and more about trust, distribution, and correction workflow ownership.
            </p>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/reports/first-50-reviewed-mcp-trust-layer"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
          >
            Read first report
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/submit"
            className="inline-flex rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold transition hover:bg-[var(--arena-blue-soft)]"
          >
            Claim or correct a listing
          </Link>
        </div>
      </main>
    </ArenaShell>
  );
}
