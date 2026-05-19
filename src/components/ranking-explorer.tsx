"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleAlert, Search, SlidersHorizontal } from "lucide-react";
import { confidenceLabel, isRankable, reviewDepthLabel } from "@/lib/server-derived";
import { overallScore, scoreLabels } from "@/lib/scoring";
import type { ClientKey, McpServer, RiskLevel } from "@/lib/types";

const clientOptions: Array<{ key: ClientKey; label: string }> = [
  { key: "claude", label: "Claude" },
  { key: "cursor", label: "Cursor" },
  { key: "codex", label: "Codex" },
  { key: "vscode", label: "VS Code" },
];

type RankingExplorerProps = {
  servers: McpServer[];
  compact?: boolean;
};

export function RankingExplorer({ servers, compact = false }: RankingExplorerProps) {
  const [query, setQuery] = useState("");
  const [client, setClient] = useState<ClientKey | "all">("all");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");

  const ranked = useMemo(() => {
    return servers
      .filter(isRankable)
      .filter((server) => {
        const haystack = `${server.name} ${server.category} ${server.tagline} ${server.packageName}`.toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesClient = client === "all" || server.clients.includes(client);
        const matchesRisk = risk === "all" || server.risk === risk;
        return matchesQuery && matchesClient && matchesRisk;
      })
      .sort((a, b) => overallScore(b.score) - overallScore(a.score));
  }, [client, query, risk, servers]);

  const visibleServers = compact ? ranked.slice(0, 6) : ranked;

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--arena-line)] bg-white">
      <div className="flex flex-col gap-4 border-b border-[var(--arena-line)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold">MCP Leaderboard</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--arena-muted)]">
            Ranked only after a Deep Review or explicit Maintainer Verified review. Source Reviewed and Install Tested listings remain searchable, but are excluded from leaderboards.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex h-10 min-w-64 items-center gap-2 rounded-md border border-[#b9ddec] bg-[#edf8fc] px-3 text-sm text-[var(--arena-muted)]">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search servers</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter servers..."
              className="w-full bg-transparent text-sm text-[var(--arena-ink)] outline-none placeholder:text-zinc-400"
            />
          </label>
          <label className="flex h-10 items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm text-[var(--arena-muted)]">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className="sr-only">Filter by client</span>
            <select
              value={client}
              onChange={(event) => setClient(event.target.value as ClientKey | "all")}
              className="bg-transparent text-sm font-medium text-[var(--arena-ink)] outline-none"
            >
              <option value="all">All clients</option>
              {clientOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <select
            value={risk}
            onChange={(event) => setRisk(event.target.value as RiskLevel | "all")}
            className="h-10 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-medium text-[var(--arena-ink)] outline-none"
          >
            <option value="all">All risk</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead className="bg-[var(--arena-surface)] text-xs font-semibold text-[var(--arena-muted)]">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Server</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Review depth</th>
              {Object.values(scoreLabels).map((label) => (
                <th key={label} className="px-4 py-3">
                  {label}
                  <span className="block font-normal">/100</span>
                </th>
              ))}
              <th className="px-4 py-3">MCP Rank</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--arena-line)]">
            {visibleServers.map((server, index) => {
              const total = overallScore(server.score);
              return (
                <tr key={server.slug} className="align-middle hover:bg-[var(--arena-blue-soft)]">
                  <td className="px-4 py-4 text-sm font-semibold">{index + 1}</td>
                  <td className="max-w-80 px-4 py-4">
                    <Link
                      href={`/servers/${server.slug}`}
                      className="group inline-flex items-center gap-1 font-mono text-sm font-semibold"
                    >
                      {server.name}
                      <ArrowUpRight
                        size={14}
                        className="text-[var(--arena-muted)] group-hover:text-[var(--arena-ink)]"
                        aria-hidden="true"
                      />
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--arena-muted)]">{server.tagline}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--arena-muted)]">{server.category}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className="block font-semibold">{reviewDepthLabel(server)}</span>
                    <span className="text-xs text-[var(--arena-muted)]">{confidenceLabel(server)} confidence</span>
                  </td>
                  {Object.keys(scoreLabels).map((key) => (
                    <td key={key} className="px-4 py-4 font-mono text-sm font-semibold">
                      {server.score[key as keyof McpServer["score"]]}
                    </td>
                  ))}
                  <td className="px-4 py-4">
                    <span className="font-mono text-lg font-semibold">{total}</span>
                    <span className="ml-2 text-xs font-semibold text-[var(--arena-green)]">
                      {total >= 85 ? "Excellent" : total >= 75 ? "Good" : "Watch"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold capitalize ${
                        server.risk === "low"
                          ? "bg-emerald-50 text-[var(--arena-green)]"
                          : server.risk === "medium"
                            ? "bg-amber-50 text-[var(--arena-amber)]"
                            : "bg-red-50 text-[var(--arena-red)]"
                      }`}
                    >
                      {server.risk === "high" ? (
                        <CircleAlert size={13} aria-hidden="true" />
                      ) : (
                        <CheckCircle2 size={13} aria-hidden="true" />
                      )}
                      {server.risk}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
