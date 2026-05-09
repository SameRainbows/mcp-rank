import Link from "next/link";
import { Clock3, Trophy } from "lucide-react";
import { overallScore } from "@/lib/scoring";
import type { McpServer } from "@/lib/types";

const arenas = [
  { title: "Overall", match: () => true },
  { title: "Developer Tools", match: (server: McpServer) => server.category === "Developer tools" },
  { title: "Data", match: (server: McpServer) => ["Databases", "Documentation"].includes(server.category) },
  { title: "Safety Watch", match: (server: McpServer) => server.risk !== "low" },
];

type LeaderboardOverviewProps = {
  servers: McpServer[];
};

export function LeaderboardOverview({ servers }: LeaderboardOverviewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {arenas.map((arena) => {
        const ranked = servers
          .filter(arena.match)
          .sort((a, b) => overallScore(b.score) - overallScore(a.score))
          .slice(0, 6);

        return (
          <section key={arena.title} className="overflow-hidden rounded-lg border border-[var(--arena-line)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--arena-line)] px-5 py-4">
              <div className="flex items-center gap-3">
                <Trophy size={17} aria-hidden="true" />
                <h2 className="font-serif text-2xl font-semibold">{arena.title}</h2>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-[var(--arena-muted)]">
                <Clock3 size={14} aria-hidden="true" />
                updated today
              </span>
            </div>
            <table className="w-full border-collapse text-left">
              <thead className="text-xs font-semibold text-[var(--arena-muted)]">
                <tr>
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Server</th>
                  <th className="px-5 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--arena-line)]">
                {ranked.map((server, index) => (
                  <tr key={server.slug} className="hover:bg-[var(--arena-blue-soft)]">
                    <td className="w-20 px-5 py-3 text-sm font-semibold">{index + 1}</td>
                    <td className="px-5 py-3">
                      <Link href={`/servers/${server.slug}`} className="font-mono text-sm font-medium hover:underline">
                        {server.name}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--arena-muted)]">{server.category}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm font-semibold">
                      {overallScore(server.score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link
              href="/rankings"
              className="block border-t border-[var(--arena-line)] py-3 text-center text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
            >
              View all
            </Link>
          </section>
        );
      })}
    </div>
  );
}
