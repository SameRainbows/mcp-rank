import type { Metadata } from "next";
import { ArenaShell } from "@/components/arena-shell";
import { WatchlistPageClient } from "@/components/watchlist-page-client";
import { getServers } from "@/lib/data";
import { confidenceLabel, evidenceUpdatedAt, reviewStatusLabel } from "@/lib/server-derived";
import { overallScore } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Save MCP servers you are evaluating before installation.",
};

export default async function WatchlistPage() {
  const servers = await getServers();

  return (
    <ArenaShell mode="Watchlist">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="font-serif text-5xl font-semibold leading-tight text-[var(--arena-muted)]">
            Watch MCP servers before{" "}
            <span className="inline-block bg-[var(--arena-highlight)] px-3 italic text-[var(--arena-ink)] shadow-[8px_8px_0_#dff3fb]">
              install
            </span>
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--arena-muted)]">
            A private browser-side list for the MCP services your team is evaluating. Use it to compare
            trust score, confidence, risk, evidence freshness, and rollout cautions before adding a server to your tools.
          </p>
        </div>

        <div className="mt-8">
          <WatchlistPageClient
            servers={servers.map((server) => ({
              slug: server.slug,
              name: server.name,
              category: server.category,
              tagline: server.tagline,
              risk: server.risk,
              confidence: confidenceLabel(server),
              status: reviewStatusLabel(server),
              score: server.status === "indexed" ? "Indexed" : overallScore(server.score),
              evidenceUpdated: evidenceUpdatedAt(server),
            }))}
          />
        </div>
      </main>
    </ArenaShell>
  );
}
