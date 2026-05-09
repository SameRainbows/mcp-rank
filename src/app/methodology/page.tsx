import type { Metadata } from "next";
import { ArenaShell } from "@/components/arena-shell";
import { scoreLabels, scoreWeights } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How MCP Arena scores MCP servers for quality, trust, safety, and usefulness.",
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
          MCP Arena starts with manual and semi-automated review because trust data needs
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
          <h2 className="font-serif text-2xl font-semibold">Data sources</h2>
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
            <li>1. Normalize registry, Smithery, GLama, GitHub, npm, and PyPI candidates.</li>
            <li>2. Run reproducible install checks and collect client compatibility notes.</li>
            <li>3. Refresh GitHub stars and maintenance signals daily through Vercel Cron.</li>
            <li>4. Store scoring snapshots in Neon so every score change is explainable.</li>
            <li>5. Add side-by-side battles for install success, scopes, examples, and data exposure.</li>
            <li>6. Publish weekly reports that separate recommendation from raw popularity.</li>
          </ol>
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
