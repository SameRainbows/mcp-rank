import type { Metadata } from "next";
import Link from "next/link";
import { ArenaShell } from "@/components/arena-shell";

export const metadata: Metadata = {
  title: "About",
  description: "MCP Rank is an independent trust and ranking layer for MCP servers.",
};

export default function AboutPage() {
  return (
    <ArenaShell mode="About">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[var(--arena-green)]">Independent MCP trust index</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">MCP Rank helps teams evaluate servers before install.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">
          MCP servers can connect agents to repositories, databases, browsers, SaaS workspaces, and local files. MCP Rank turns that decision into a reviewed dataset with scores, source links, cautions, confidence levels, and weekly notes.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Trust before adoption", "Rankings emphasize permissions, auth posture, maintenance, and evidence quality."],
            ["Reviewed, not scraped", "Indexed tools can be tracked, but recommendations should come from reviewed evidence."],
            ["Useful to maintainers", "Server authors can submit listings, claim pages, and improve evidence over time."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Independence</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
            MCP Rank is independent and not affiliated with Anthropic, OpenAI, GitHub, or the official MCP project. Scores are editorial review signals, not certifications or legal/security advice.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
            MCP Rank indexes MCP servers from public registries, package metadata, directories, GitHub search, and maintainer submissions.
            Rankings and trust labels are assigned only after MCP Rank review, so imported directory data is attribution, not original review work.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
            Indexed tools are discovery records, not recommendations. External source metadata may come from Glama, the official MCP Registry, Smithery, package registries, or maintainer-submitted links, but external scores or verification signals are not MCP Rank scores.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
            Maintainer Verified is only used when a maintainer has actually claimed or confirmed listing details. MCP Rank does not convert external verification badges into its own verification label.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/methodology" className="rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white">
              Read methodology
            </Link>
            <Link href="/trust-roadmap" className="rounded-md border border-[var(--arena-line)] px-4 py-2 text-sm font-semibold">
              View trust roadmap
            </Link>
            <Link href="/submit" className="rounded-md border border-[var(--arena-line)] px-4 py-2 text-sm font-semibold">
              Submit a server
            </Link>
          </div>
        </section>
      </main>
    </ArenaShell>
  );
}
