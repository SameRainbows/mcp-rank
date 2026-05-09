import type { Metadata } from "next";
import { ArenaPrompt } from "@/components/arena-prompt";
import { ArenaShell } from "@/components/arena-shell";
import { SearchWorkbench } from "@/components/search-workbench";
import { getServers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Search",
  description: "Search MCP servers by workflow, risk signal, package, and client compatibility.",
};

export default async function SearchPage() {
  const servers = await getServers();

  return (
    <ArenaShell mode="Search">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="font-serif text-3xl font-semibold">▥ MCP Arena</div>
          <h1 className="mt-8 font-serif text-5xl leading-tight text-[var(--arena-muted)]">
            Search the{" "}
            <span className="inline-block bg-[var(--arena-highlight)] px-3 italic text-[var(--arena-ink)]">
              registry
            </span>
          </h1>
          <div className="mt-10">
            <ArenaPrompt />
          </div>
        </div>
        <div className="mt-10">
          <SearchWorkbench servers={servers} />
        </div>
      </main>
    </ArenaShell>
  );
}
