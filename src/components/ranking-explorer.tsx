"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleAlert, Filter, Search } from "lucide-react";
import { overallScore, scoreLabels } from "@/lib/scoring";
import type { ClientKey, McpServer } from "@/lib/types";
import { ScoreBadge } from "./score-badge";

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

  const ranked = useMemo(() => {
    return servers
      .filter((server) => {
        const matchesQuery =
          server.name.toLowerCase().includes(query.toLowerCase()) ||
          server.category.toLowerCase().includes(query.toLowerCase()) ||
          server.tagline.toLowerCase().includes(query.toLowerCase());
        const matchesClient = client === "all" || server.clients.includes(client);
        return matchesQuery && matchesClient;
      })
      .sort((a, b) => overallScore(b.score) - overallScore(a.score));
  }, [client, query, servers]);

  const visibleServers = compact ? ranked.slice(0, 5) : ranked;

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">Ranked MCP servers</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Manual trust review today, automation hooks tomorrow.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex h-10 min-w-64 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-500">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search servers</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search server or category"
              className="w-full bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
            />
          </label>
          <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-500">
            <Filter size={16} aria-hidden="true" />
            <span className="sr-only">Filter by client</span>
            <select
              value={client}
              onChange={(event) => setClient(event.target.value as ClientKey | "all")}
              className="bg-transparent text-sm font-medium text-zinc-800 outline-none"
            >
              <option value="all">All clients</option>
              {clientOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Server</th>
              <th className="px-4 py-3">Overall</th>
              {Object.values(scoreLabels).map((label) => (
                <th key={label} className="px-4 py-3">
                  {label}
                </th>
              ))}
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visibleServers.map((server, index) => {
              const total = overallScore(server.score);
              return (
                <tr key={server.slug} className="align-top hover:bg-zinc-50/70">
                  <td className="px-4 py-4 text-sm font-semibold text-zinc-500">#{index + 1}</td>
                  <td className="max-w-72 px-4 py-4">
                    <Link
                      href={`/servers/${server.slug}`}
                      className="group inline-flex items-center gap-1 text-sm font-semibold text-zinc-950"
                    >
                      {server.name}
                      <ArrowUpRight
                        size={14}
                        className="text-zinc-400 group-hover:text-zinc-950"
                        aria-hidden="true"
                      />
                    </Link>
                    <p className="mt-1 text-sm leading-5 text-zinc-600">{server.tagline}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {server.clients.map((item) => (
                        <span
                          key={item}
                          className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs font-medium capitalize text-zinc-600"
                        >
                          {item === "vscode" ? "VS Code" : item}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <ScoreBadge score={total} />
                  </td>
                  {Object.keys(scoreLabels).map((key) => (
                    <td key={key} className="px-4 py-4 text-sm font-semibold text-zinc-700">
                      {server.score[key as keyof McpServer["score"]]}
                    </td>
                  ))}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold capitalize ${
                        server.risk === "low"
                          ? "bg-emerald-50 text-emerald-700"
                          : server.risk === "medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
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
