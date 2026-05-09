import Link from "next/link";
import { ArrowUpRight, CalendarDays, Database, GitBranch, ShieldAlert } from "lucide-react";
import { overallScore } from "@/lib/scoring";
import type { McpServer, WeeklyReport } from "@/lib/types";
import { ScoreBadge } from "./score-badge";

type ServerSummaryProps = {
  server: McpServer;
  report: WeeklyReport;
};

export function ServerSummary({ server, report }: ServerSummaryProps) {
  return (
    <aside className="grid gap-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Current leader</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950">{server.name}</h2>
          </div>
          <ScoreBadge score={overallScore(server.score)} size="lg" />
        </div>
        <p className="mt-4 text-sm leading-6 text-zinc-600">{server.tagline}</p>
        <div className="mt-5 grid gap-3 text-sm text-zinc-700">
          <span className="flex items-center gap-2">
            <GitBranch size={16} className="text-zinc-400" aria-hidden="true" />
            {server.stars.toLocaleString()} GitHub stars
          </span>
          <span className="flex items-center gap-2">
            <Database size={16} className="text-zinc-400" aria-hidden="true" />
            {server.transports.join(", ")}
          </span>
          <span className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-zinc-400" aria-hidden="true" />
            {server.risk} risk profile
          </span>
        </div>
        <Link
          href={`/servers/${server.slug}`}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Open review
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
          <CalendarDays size={16} aria-hidden="true" />
          Week of {report.weekOf}
        </div>
        <h2 className="mt-3 text-xl font-semibold text-zinc-950">{report.title}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{report.summary}</p>
        <Link
          href={`/reports/${report.slug}`}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-950"
        >
          Read weekly report
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </aside>
  );
}
