import type { Metadata } from "next";
import { ArenaShell } from "@/components/arena-shell";
import { scoreLabels, scoreWeights } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How MCP Rank scores MCP servers for quality, trust, safety, and usefulness.",
};

const sources = [
  "Official MCP registry",
  "Smithery",
  "GLama and other MCP directories",
  "GitHub search and repository metadata",
  "npm and PyPI package metadata",
];

export default function MethodologyPage() {
  return (
    <ArenaShell mode="Methodology">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl font-semibold">Scoring methodology</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">
          MCP Rank starts with manual and semi-automated review because trust data needs
          judgment. The automation pipeline is designed to gather signals, not pretend
          every risk can be reduced to a star count.
        </p>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Weighted score categories</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Object.entries(scoreLabels).map(([key, label]) => (
              <div key={key} className="rounded-md border border-[var(--arena-line)] bg-[var(--arena-surface)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold">{label}</h3>
                  <span className="font-mono text-sm text-[var(--arena-muted)]">
                    {Math.round(scoreWeights[key as keyof typeof scoreWeights] * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--arena-muted)]">
                  {categoryDescription(key)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Status and confidence rules</h2>
          <div className="mt-5 grid gap-4 text-sm leading-6 text-[var(--arena-muted)] sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-[var(--arena-ink)]">Review depth gates rankings</h3>
              <p className="mt-2">
                Only Deep Review and Maintainer Verified entries appear in leaderboards. Indexed, Source Reviewed, and Install Tested listings remain searchable but unranked.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--arena-ink)]">Safest lists require confidence</h3>
              <p className="mt-2">
                Top trusted rankings require high confidence and exclude high-risk tools, even when the underlying server is useful.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--arena-ink)]">Maintainer verified is stronger evidence</h3>
              <p className="mt-2">
                Maintainer verification means provenance or listing details have been checked more directly, not that the server is formally certified.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--arena-ink)]">High risk can still be reviewed</h3>
              <p className="mt-2">
                Payments, chat, databases, browsers, and file systems can be valuable, but they need prominent cautions and rollout controls.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Data sources</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
            MCP Rank indexes MCP servers from public registries, package metadata, directories, GitHub search,
            and maintainer submissions. Rankings are assigned only after Deep Review or Maintainer Verified review depth.
          </p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-[var(--arena-muted)]">
            {sources.map((source) => (
              <li key={source} className="border-l-2 border-[var(--arena-green)] pl-3">
                {source}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Viable product path</h2>
          <ol className="mt-5 grid gap-4 text-sm leading-6 text-[var(--arena-muted)]">
            <li>Normalize registry, Smithery, GLama, GitHub, npm, and PyPI candidates.</li>
            <li>Run reproducible install checks and collect client compatibility notes.</li>
            <li>Refresh GitHub stars and maintenance signals daily through Vercel Cron.</li>
            <li>Store scoring snapshots in Neon so every score change is explainable.</li>
            <li>Add side-by-side comparisons for install success, scopes, examples, and data exposure.</li>
            <li>Publish weekly reports that separate recommendation from raw popularity.</li>
          </ol>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Independence disclaimer</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">
            MCP Rank is independent and not affiliated with Anthropic, OpenAI, GitHub, or the official MCP project. Scores are review signals, not certifications.
          </p>
        </section>
      </main>
    </ArenaShell>
  );
}

function categoryDescription(key: string) {
  switch (key) {
    case "installDocs":
      return "Can a developer install it cleanly, understand prerequisites, and reproduce examples?";
    case "maintenance":
      return "Recent commits, releases, issue response, package health, and ownership clarity.";
    case "auth":
      return "OAuth or token scope handling, secret storage guidance, and write-action guardrails.";
    case "compatibility":
      return "Evidence that the server works across Claude, Cursor, Codex, VS Code, and common transports.";
    case "usefulness":
      return "Real workflows, concrete examples, community mentions, and repeated daily value.";
    case "safety":
      return "Permission surface, local or account data exposure, dependency risk, and abuse potential.";
    default:
      return "";
  }
}
