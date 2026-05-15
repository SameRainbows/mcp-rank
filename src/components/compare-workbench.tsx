"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, CircleAlert, Scale } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { confidenceLabel, reviewStatusLabel } from "@/lib/server-derived";
import { overallScore } from "@/lib/scoring";
import type { McpServer } from "@/lib/types";

type CompareWorkbenchProps = {
  servers: McpServer[];
};

const presets = [
  {
    label: "Web search",
    description: "Public web and retrieval servers where query privacy and freshness matter.",
    slugs: ["brave-search", "fetch", "exa", "perplexity-api-platform"],
  },
  {
    label: "Code context",
    description: "Servers that help coding agents inspect repos, docs, or project files.",
    slugs: ["github-mcp-server", "context7", "filesystem", "git"],
  },
  {
    label: "Data access",
    description: "Database and persistence tools where credentials and environment boundaries matter.",
    slugs: ["postgres", "sqlite", "memory"],
  },
  {
    label: "Business systems",
    description: "Higher-risk SaaS and operational systems that need tighter rollout controls.",
    slugs: ["stripe-mcp", "slack-mcp", "gitlab"],
  },
];

function scoreText(server: McpServer) {
  return server.status === "indexed" ? "Indexed" : String(overallScore(server.score));
}

function evidenceText(server: McpServer) {
  if (server.sourceLinks?.[0]?.url) return server.sourceLinks[0].url;
  if (server.repositoryUrl) return server.repositoryUrl;
  if (server.packageName) return server.packageName;
  return "Needs source evidence";
}

function ServerSnapshot({ server }: { server: McpServer }) {
  return (
    <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--arena-green)]">{server.category}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold">{server.name}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--arena-muted)]">{server.tagline}</p>
        </div>
        <span className="font-mono text-3xl font-semibold">{scoreText(server)}</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-md border border-[#b9ddec] bg-[#edf8fc] px-2 py-1">
          {reviewStatusLabel(server)}
        </span>
        <span className="rounded-md border border-[var(--arena-line)] px-2 py-1">
          {confidenceLabel(server)} confidence
        </span>
        <span className="rounded-md border border-[var(--arena-line)] px-2 py-1 capitalize">
          {server.risk} risk
        </span>
      </div>
      <dl className="mt-5 grid gap-3 text-sm">
        <div>
          <dt className="font-semibold">Best use</dt>
          <dd className="mt-1 leading-6 text-[var(--arena-muted)]">
            {server.useCases?.[0] ?? server.examples[0] ?? "Use case review pending."}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Main caution</dt>
          <dd className="mt-1 flex gap-2 leading-6 text-[var(--arena-muted)]">
            <CircleAlert className="mt-1 shrink-0 text-[var(--arena-amber)]" size={15} aria-hidden="true" />
            <span>{server.cautions[0] ?? "Risk review pending."}</span>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Evidence</dt>
          <dd className="mt-1 break-all font-mono text-xs leading-5 text-[var(--arena-muted)]">{evidenceText(server)}</dd>
        </div>
      </dl>
      <Link
        href={`/servers/${server.slug}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
      >
        Full review <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}

export function CompareWorkbench({ servers }: CompareWorkbenchProps) {
  const orderedServers = useMemo(
    () => [...servers].sort((a, b) => overallScore(b.score) - overallScore(a.score) || a.name.localeCompare(b.name)),
    [servers],
  );
  const [leftSlug, setLeftSlug] = useState("brave-search");
  const [rightSlug, setRightSlug] = useState("fetch");

  const left = orderedServers.find((server) => server.slug === leftSlug) ?? orderedServers[0];
  const right = orderedServers.find((server) => server.slug === rightSlug) ?? orderedServers[1] ?? orderedServers[0];

  function applyPreset(slugs: string[]) {
    const available = slugs.filter((slug) => orderedServers.some((server) => server.slug === slug));
    if (available[0]) setLeftSlug(available[0]);
    if (available[1]) setRightSlug(available[1]);
    trackEvent("comparison_page_view", { preset: available.join(",") });
  }

  return (
    <section className="mt-8 rounded-xl border border-[var(--arena-line)] bg-[color-mix(in_srgb,var(--arena-bg)_78%,white)] p-4 shadow-[0_10px_35px_rgba(33,29,24,0.05)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-[#b9ddec] bg-[#edf8fc] px-3 py-2 text-sm font-semibold">
            <Scale size={16} aria-hidden="true" />
            Comparison workspace
          </div>
          <h2 className="mt-4 font-serif text-3xl font-semibold">Compare servers by niche, score, and risk.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--arena-muted)]">
            Use this for practical installation decisions: pick two servers in the same workflow, then inspect score,
            confidence, source evidence, and the caution that should shape rollout.
          </p>
        </div>
        <Link
          href="/compare/github-vs-filesystem"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
        >
          Open saved comparisons <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.slugs)}
            className="rounded-lg border border-[var(--arena-line)] bg-white p-4 text-left transition hover:border-[var(--arena-blue-line)] hover:bg-[var(--arena-blue-soft)]"
          >
            <span className="font-semibold">{preset.label}</span>
            <span className="mt-2 block text-xs leading-5 text-[var(--arena-muted)]">{preset.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-semibold">
          Server A
          <select
            value={left.slug}
            onChange={(event) => setLeftSlug(event.target.value)}
            className="h-11 w-full rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm"
          >
            {orderedServers.map((server) => (
              <option key={server.slug} value={server.slug}>
                {server.name} - {server.category}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-semibold">
          Server B
          <select
            value={right.slug}
            onChange={(event) => setRightSlug(event.target.value)}
            className="h-11 w-full rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm"
          >
            {orderedServers.map((server) => (
              <option key={server.slug} value={server.slug}>
                {server.name} - {server.category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ServerSnapshot server={left} />
        <ServerSnapshot server={right} />
      </div>

      <div className="mt-5 rounded-lg border border-[var(--arena-line)] bg-white p-5">
        <h3 className="font-serif text-2xl font-semibold">Decision note</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--arena-muted)]">
          Prefer the higher-confidence, lower-risk server when both satisfy the same workflow. If either side is indexed
          only, treat the comparison as discovery, not a recommendation, until source evidence and a manual review are complete.
        </p>
      </div>
    </section>
  );
}
