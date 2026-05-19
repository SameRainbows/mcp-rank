"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { confidenceLabel, isRankable, reviewDepthLabel } from "@/lib/server-derived";
import { overallScore } from "@/lib/scoring";
import type { ClientKey, McpServer, ReviewDepth, RiskLevel } from "@/lib/types";

type SearchWorkbenchProps = {
  servers: McpServer[];
};

export function SearchWorkbench({ servers }: SearchWorkbenchProps) {
  const [query, setQuery] = useState("");
  const [client, setClient] = useState<ClientKey | "all">("all");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");
  const [sourceEvidence, setSourceEvidence] = useState<"all" | "ready" | "needs">("all");
  const [reviewDepth, setReviewDepth] = useState<ReviewDepth | "all" | "ranked">("all");

  const results = useMemo(() => {
    const statusWeight = (server: McpServer) => {
      if (server.reviewDepth === "maintainer_verified") return 0;
      if (server.reviewDepth === "deep_review") return 1;
      if (server.reviewDepth === "install_tested") return 2;
      if (server.reviewDepth === "source_reviewed") return 3;
      return 4;
    };

    const confidenceWeight = (server: McpServer) => {
      if (server.confidence === "high") return 0;
      if (server.confidence === "medium") return 1;
      return 2;
    };

    const hasSourceEvidence = (server: McpServer) => {
      return Boolean(server.packageName || server.repositoryUrl || server.sourceLinks.some((link) => link.url));
    };

    return servers
      .filter((server) => {
        const text = `${server.name} ${server.category} ${server.tagline} ${server.signals.join(" ")}`.toLowerCase();
        const needsSourceEvidence = server.status === "indexed" && !hasSourceEvidence(server);
        return (
          text.includes(query.toLowerCase()) &&
          (client === "all" || server.clients.includes(client)) &&
          (risk === "all" || server.risk === risk) &&
            (reviewDepth === "all" ||
            (reviewDepth === "ranked" && isRankable(server)) ||
            server.reviewDepth === reviewDepth) &&
          (sourceEvidence === "all" ||
            (sourceEvidence === "ready" && !needsSourceEvidence) ||
            (sourceEvidence === "needs" && needsSourceEvidence))
        );
      })
      .sort(
        (a, b) =>
          statusWeight(a) - statusWeight(b) ||
          confidenceWeight(a) - confidenceWeight(b) ||
          overallScore(b.score) - overallScore(a.score) ||
          a.name.localeCompare(b.name),
      );
  }, [client, query, reviewDepth, risk, servers, sourceEvidence]);

  return (
    <section className="rounded-xl border border-[var(--arena-line)] bg-white shadow-[0_10px_35px_rgba(33,29,24,0.05)]">
      <div className="border-b border-[var(--arena-line)] p-4">
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-[#b9ddec] bg-[#edf8fc] px-4">
          <Search size={17} className="text-[var(--arena-muted)]" aria-hidden="true" />
          <span className="sr-only">Search MCP servers</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim()) trackEvent("search_query", { length: event.target.value.length });
            }}
            placeholder="Search by workflow, package, client, or risk signal..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={reviewDepth}
            onChange={(event) => setReviewDepth(event.target.value as ReviewDepth | "all" | "ranked")}
            className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-medium"
          >
            <option value="all">Review depth: all</option>
            <option value="ranked">Ranked reviews only</option>
            <option value="maintainer_verified">Maintainer Verified</option>
            <option value="deep_review">Deep Review</option>
            <option value="install_tested">Install Tested</option>
            <option value="source_reviewed">Source Reviewed</option>
            <option value="indexed">Indexed</option>
          </select>
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
          <select
            value={sourceEvidence}
            onChange={(event) => setSourceEvidence(event.target.value as "all" | "ready" | "needs")}
            className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-medium"
          >
            <option value="all">All source evidence</option>
            <option value="ready">Has package/source evidence</option>
            <option value="needs">Needs source evidence</option>
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
                <span className="rounded-md border border-[#b9ddec] bg-[#edf8fc] px-2 py-1 text-xs font-semibold text-[var(--arena-muted)]">
                  {reviewDepthLabel(server)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--arena-muted)]">{server.tagline}</p>
              {!isRankable(server) && (
                <p className="mt-2 text-xs font-semibold text-[var(--arena-muted)]">
                  {reviewDepthLabel(server)} listings are visible for discovery but excluded from public leaderboards.
                </p>
              )}
              <p className="mt-3 font-mono text-xs text-[var(--arena-muted)]">
                {[server.packageName || server.repositoryUrl || (server.reviewDepth === "indexed" ? "Needs source review" : "Source-linked review"), `${confidenceLabel(server)} confidence`].join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              <span className="font-mono text-2xl font-semibold">
                {isRankable(server) ? overallScore(server.score) : reviewDepthLabel(server)}
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
