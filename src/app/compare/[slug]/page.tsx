import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CircleAlert, Scale } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { ComparisonViewTracker } from "@/components/comparison-view-tracker";
import { getServer } from "@/lib/data";
import { confidenceLabel, reviewStatusLabel } from "@/lib/server-derived";
import { overallScore } from "@/lib/scoring";
import type { McpServer } from "@/lib/types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const comparisons = {
  "github-vs-filesystem": {
    title: "GitHub MCP vs Filesystem",
    left: "github-mcp-server",
    right: "filesystem",
    summary: "Both are core developer tools, but they protect different surfaces: hosted repositories versus local files.",
    recommendation:
      "Choose GitHub MCP when repo, issue, and pull-request context drives the workflow. Choose Filesystem when the agent must inspect local project files, but only with strict path scoping.",
  },
  "stripe-vs-postgres": {
    title: "Stripe MCP vs Postgres",
    left: "stripe-mcp",
    right: "postgres",
    summary: "Both can expose sensitive business data. Stripe adds payment-operation risk; Postgres adds database credential and production-data risk.",
    recommendation:
      "Choose Stripe MCP for billing support with restricted keys and human approval. Choose Postgres for read-only schema and analytics workflows using replica or readonly credentials.",
  },
  "context7-vs-brave-search": {
    title: "Context7 vs Brave Search",
    left: "context7",
    right: "brave-search",
    summary: "Context7 narrows the surface to developer documentation. Brave Search is broader and more current, but search queries can leak sensitive intent.",
    recommendation:
      "Choose Context7 for package-specific coding help. Choose Brave Search when the agent needs current public web context and query logging has been reviewed.",
  },
} as const;

export async function generateStaticParams() {
  return Object.keys(comparisons).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const comparison = comparisons[slug as keyof typeof comparisons];
  if (!comparison) return {};
  return {
    title: comparison.title,
    description: comparison.summary,
  };
}

function SummaryCard({ server }: { server: McpServer }) {
  return (
    <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--arena-green)]">{server.category}</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold">{server.name}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">{server.tagline}</p>
        </div>
        <span className="font-mono text-4xl font-semibold">{overallScore(server.score)}</span>
      </div>
      <div className="mt-5 grid gap-2 text-sm text-[var(--arena-muted)]">
        <span>Status: {reviewStatusLabel(server)}</span>
        <span>Confidence: {confidenceLabel(server)}</span>
        <span className="capitalize">Risk: {server.risk}</span>
        <span>Install: {server.installCommand}</span>
      </div>
      <Link
        href={`/servers/${server.slug}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
      >
        Open full review <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}

export default async function ComparePage({ params }: PageProps) {
  const { slug } = await params;
  const comparison = comparisons[slug as keyof typeof comparisons];
  if (!comparison) notFound();

  const [left, right] = await Promise.all([getServer(comparison.left), getServer(comparison.right)]);
  if (!left || !right) notFound();

  return (
    <ArenaShell mode="Compare">
      <ComparisonViewTracker slug={slug} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#b9ddec] bg-[#edf8fc] px-3 py-2 text-sm font-semibold">
            <Scale size={16} aria-hidden="true" />
            Evidence comparison
          </div>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-tight">{comparison.title}</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--arena-muted)]">{comparison.summary}</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <SummaryCard server={left} />
          <SummaryCard server={right} />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
            <h2 className="font-serif text-2xl font-semibold">Best use case</h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-[var(--arena-muted)]">
              <p><strong>{left.name}:</strong> {left.useCases?.[0] ?? left.examples[0]}</p>
              <p><strong>{right.name}:</strong> {right.useCases?.[0] ?? right.examples[0]}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
            <h2 className="font-serif text-2xl font-semibold">Risk differences</h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-[var(--arena-muted)]">
              {[left, right].map((server) => (
                <p key={server.slug} className="flex gap-2">
                  <CircleAlert className="mt-1 shrink-0 text-[var(--arena-amber)]" size={16} />
                  <span><strong>{server.name}:</strong> {server.cautions[0]}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
            <h2 className="font-serif text-2xl font-semibold">Maintenance notes</h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-[var(--arena-muted)]">
              <p><strong>{left.name}:</strong> {left.maintenanceNotes?.[0] ?? left.signals[1]}</p>
              <p><strong>{right.name}:</strong> {right.maintenanceNotes?.[0] ?? right.signals[1]}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <h2 className="font-serif text-2xl font-semibold">Recommendation</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--arena-muted)]">{comparison.recommendation}</p>
        </section>
      </main>
    </ArenaShell>
  );
}
