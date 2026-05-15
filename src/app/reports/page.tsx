import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { getWeeklyReports } from "@/lib/data";

export const metadata: Metadata = {
  title: "Public Reports",
  description: "MCP server quality, safety, confidence, and rollout reports.",
};

export default async function ReportsPage() {
  const reports = await getWeeklyReports();

  return (
    <ArenaShell mode="Reports">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl font-semibold">Public reports</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">
          Evidence-led notes on which MCP servers are safest, most useful, and most
          urgent to verify before installation.
        </p>
        <p className="mt-3 text-sm font-semibold text-[var(--arena-green)]">
          {reports.length} reports published
        </p>
        <div className="mt-8 grid gap-4">
          {reports.map((report) => (
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
