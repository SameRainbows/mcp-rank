import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { getWeeklyReports } from "@/lib/data";

export const metadata: Metadata = {
  title: "MCP Trust Reports",
  description: "MCP server quality, safety, confidence, and rollout reports.",
};

export default async function ReportsPage() {
  const reports = await getWeeklyReports();
  const featuredReport = reports.find((report) => report.slug === "first-50-reviewed-mcp-trust-layer") ?? reports[0];
  const remainingReports = reports.filter((report) => report.slug !== featuredReport.slug);

  return (
    <ArenaShell mode="Reports">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl font-semibold">MCP trust reports</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">
          Evidence-led notes on which MCP servers are safest, most useful, and most urgent
          to verify before installation. Each report is meant to be renewed as source
          evidence, maintainer verification, and risk signals change.
        </p>
        <p className="mt-3 text-sm font-semibold text-[var(--arena-green)]">
          {reports.length} reports published
        </p>
        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <p className="text-sm font-semibold text-[var(--arena-green)]">Featured report</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-semibold">{featuredReport.title}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--arena-muted)]">
                MCP Rank&apos;s first trust-layer report covers 50 reviewed or high-risk MCP pages: 20 Deep Reviews,
                22 Source Reviewed listings, 6 install-tested/operational review pages, 2 high-risk reviewed pages,
                and 0 Maintainer Verified listings.
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
                Indexed means discovered from public sources. Source Reviewed means public links and provenance
                signals were checked. Deep Review means MCP Rank performed stronger manual evidence and risk
                analysis. Maintainer Verified still requires maintainer confirmation.
              </p>
            </div>
            <Link
              href={`/reports/${featuredReport.slug}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              Read report
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <div className="mt-8 grid gap-4">
          {remainingReports.map((report) => (
            <Link
              key={report.slug}
              href={`/reports/${report.slug}`}
              className="rounded-lg border border-[var(--arena-line)] bg-white p-6 transition hover:bg-[var(--arena-surface)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--arena-green)]">Week of {report.weekOf}</p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold">{report.title}</h2>
                </div>
                <ArrowUpRight className="text-zinc-400" size={20} aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--arena-muted)]">{report.summary}</p>
            </Link>
          ))}
        </div>
      </main>
    </ArenaShell>
  );
}
