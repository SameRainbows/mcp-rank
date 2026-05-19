import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { CompareWorkbench } from "@/components/compare-workbench";
import { getServers } from "@/lib/data";
import { isRankable } from "@/lib/server-derived";

export const metadata: Metadata = {
  title: "Compare MCP Servers",
  description: "Compare MCP servers by niche, trust score, confidence, risk, and source evidence.",
};

export default async function CompareIndexPage() {
  const servers = (await getServers()).filter(isRankable);

  return (
    <ArenaShell mode="Compare">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-5xl leading-tight text-[var(--arena-muted)] sm:text-7xl">
            Compare MCP servers before{" "}
            <span className="inline-block bg-[var(--arena-highlight)] px-3 italic text-[var(--arena-ink)] shadow-[8px_8px_0_#dff3fb]">
              rollout
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">
            Pick tools inside the same workflow and compare source evidence, confidence, risk, and rollout notes.
            The goal is installation judgment, not a generic directory browse.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/compare/context7-vs-brave-search"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
            >
              Context7 vs Brave Search <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/compare/stripe-vs-postgres"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
            >
              Stripe vs Postgres <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <CompareWorkbench servers={servers} />
      </main>
    </ArenaShell>
  );
}
