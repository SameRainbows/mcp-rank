import type { Metadata } from "next";
import { Header } from "@/components/header";
import { RankingExplorer } from "@/components/ranking-explorer";
import { getServers } from "@/lib/data";

export const metadata: Metadata = {
  title: "MCP Server Rankings | MCP Rank",
  description: "Ranked MCP servers scored for quality, trust, safety, compatibility, and usefulness.",
};

export default async function RankingsPage() {
  const servers = await getServers();

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <Header />
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight">
            MCP server rankings
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600">
            Scores combine manual install review, maintenance signals, auth risk,
            client compatibility, examples, and community usefulness. The first
            dataset is intentionally small so each ranking has evidence behind it.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <RankingExplorer servers={servers} />
      </section>
    </main>
  );
}
