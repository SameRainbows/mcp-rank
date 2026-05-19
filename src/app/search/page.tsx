import type { Metadata } from "next";
import { ArenaPrompt } from "@/components/arena-prompt";
import { ArenaShell } from "@/components/arena-shell";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SearchWorkbench } from "@/components/search-workbench";
import { SubmitServerLink } from "@/components/submit-server-link";
import { getServers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Search",
  description: "Search MCP servers by workflow, risk signal, package, and client compatibility.",
};

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const servers = await getServers();

  return (
    <ArenaShell mode="Search">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-5xl leading-tight text-[var(--arena-muted)] sm:text-7xl">
            Search the{" "}
            <span className="inline-block bg-[var(--arena-highlight)] px-3 italic text-[var(--arena-ink)] shadow-[8px_8px_0_#dff3fb]">
              evidence
            </span>
          </h1>
          <p className="mt-5 text-base leading-7 text-[var(--arena-muted)]">
            Use filters first, then ask the evidence assistant when you need a sourced comparison.
          </p>
          <div className="mt-10">
            <ArenaPrompt />
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <SubmitServerLink className="rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]">
            Submit MCP Server
          </SubmitServerLink>
        </div>
        <div className="mt-10">
          <SearchWorkbench servers={servers} />
        </div>
        <div className="mt-8">
          <NewsletterSignup context="search" />
        </div>
      </main>
    </ArenaShell>
  );
}
