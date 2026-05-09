"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { overallScore } from "@/lib/scoring";
import type { ClientKey, McpServer, RiskLevel } from "@/lib/types";

type SearchWorkbenchProps = {
  servers: McpServer[];
};

export function SearchWorkbench({ servers }: SearchWorkbenchProps) {
  const [query, setQuery] = useState("");
  const [client, setClient] = useState<ClientKey | "all">("all");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");

  const results = useMemo(() => {
    return servers
      .filter((server) => {
        const text = `${server.name} ${server.category} ${server.tagline} ${server.signals.join(" ")}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (client === "all" || server.clients.includes(client)) &&
          (risk === "all" || server.risk === risk)
        );
      })
      .sort((a, b) => overallScore(b.score) - overallScore(a.score));
  }, [client, query, risk, servers]);

  return (
    <section className="rounded-xl border border-[var(--arena-line)] bg-white shadow-[0_10px_35px_rgba(33,29,24,0.05)]">
      <div className="border-b border-[var(--arena-line)] p-4">
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-[#b9ddec] bg-[#edf8fc] px-4">
          <Search size={17} className="text-[var(--arena-muted)]" aria-hidden="true" />
          <span className="sr-only">Search MCP servers</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by workflow, package, client, or risk signal..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={client}
            onChange={(event) => setClient(event.target.value as ClientKey | "all")}
            className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-medium"
          >
            <option value="all">All clients</option>
            <option value="claude">Claude</option>
            <option value="cursor">Cursor</option>
            <option value="codex">Codex</option>
            <option value="vscode">VS Code</option>
          </select>
          <select
            value={risk}
            onChange={(event) => setRisk(event.target.value as RiskLevel | "all")}
            className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-medium"
          >
            <option value="all">All risk levels</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-[var(--arena-line)]">
        {results.map((server) => (
          <Link
            key={server.slug}
            href={`/servers/${server.slug}`}
            className="grid gap-3 p-5 transition hover:bg-[var(--arena-blue-soft)] sm:grid-cols-[1fr_auto]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-2xl font-semibold">{server.name}</h2>
                <span className="rounded-md border border-[var(--arena-line)] px-2 py-1 text-xs font-semibold capitalize text-[var(--arena-muted)]">
                  {server.risk} risk
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--arena-muted)]">{server.tagline}</p>
              <p className="mt-3 font-mono text-xs text-[var(--arena-muted)]">{server.packageName}</p>
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              <span className="font-mono text-2xl font-semibold">{overallScore(server.score)}</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
