import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { getWeeklyReports } from "@/lib/data";

export const metadata: Metadata = {
  title: "Weekly MCP Reports | MCP Rank",
  description: "Weekly MCP server quality and safety reports.",
};

export default async function ReportsPage() {
  const reports = await getWeeklyReports();

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold">Weekly reports</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600">
          Short, evidence-led notes on which MCP services are safest and most useful
          to install this week.
        </p>
        <div className="mt-8 grid gap-4">
          {reports.map((report) => (
            <Link
              key={report.slug}
              href={`/reports/${report.slug}`}
              className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Week of {report.weekOf}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{report.title}</h2>
                </div>
                <ArrowUpRight className="text-zinc-400" size={20} aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-600">{report.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
