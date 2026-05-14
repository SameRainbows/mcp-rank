import type { Metadata } from "next";
import Link from "next/link";
import { ArenaShell } from "@/components/arena-shell";
import { LeaderboardOverview } from "@/components/leaderboard-overview";
import { RankingExplorer } from "@/components/ranking-explorer";
import { SubmitServerLink } from "@/components/submit-server-link";
import { getServers } from "@/lib/data";
import { isRankable } from "@/lib/server-derived";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Ranked MCP servers scored for quality, trust, safety, compatibility, and usefulness.",
};

export default async function RankingsPage() {
  const servers = await getServers();
  const reviewedServers = servers.filter(isRankable);

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
          <div className="mt-5 flex flex-wrap gap-3">
            <SubmitServerLink className="rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white">
              Submit MCP Server
            </SubmitServerLink>
            <Link href="/methodology" className="rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold">
              Review methodology
            </Link>
          </div>
        </div>
        <LeaderboardOverview servers={reviewedServers} />
        <div className="mt-8">
          <RankingExplorer servers={reviewedServers} />
        </div>
      </main>
    </ArenaShell>
  );
}
