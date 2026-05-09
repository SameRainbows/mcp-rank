import type { Metadata } from "next";
import { ArenaShell } from "@/components/arena-shell";
import { LeaderboardOverview } from "@/components/leaderboard-overview";
import { RankingExplorer } from "@/components/ranking-explorer";
import { getServers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Ranked MCP servers scored for quality, trust, safety, compatibility, and usefulness.",
};

export default async function RankingsPage() {
  const servers = await getServers();

  return (
    <ArenaShell mode="Leaderboard">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <h1 className="font-serif text-4xl font-semibold leading-tight">Leaderboard Overview</h1>
          <p className="mt-4 text-base leading-7 text-[var(--arena-muted)]">
            See how MCP servers stack up across install quality, maintenance, auth posture,
            client compatibility, usefulness, and safety. This page is the trust board,
            not a raw directory.
          </p>
        </div>
        <LeaderboardOverview servers={servers} />
        <div className="mt-8">
          <RankingExplorer servers={servers} />
        </div>
      </main>
    </ArenaShell>
  );
}
