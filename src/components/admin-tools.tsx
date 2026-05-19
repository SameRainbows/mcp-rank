"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Database, FileUp, RefreshCw, Save, ShieldCheck } from "lucide-react";
import type { ConfidenceScore, ImportResultSummary, ImportSourceProvider, McpTool, McpToolInput, ToolStatus } from "@/lib/tool-types";
import type { ReviewDepth } from "@/lib/types";

const csvColumns = [
  "name",
  "slug",
  "description",
  "category",
  "source",
  "source_url",
  "github_url",
  "package_url",
  "install_command",
  "stars",
  "last_commit",
  "license",
  "status",
  "review_depth",
  "trust_score",
  "confidence_score",
  "last_reviewed_at",
];

type StatusFilter = "all" | "reviewed" | "unreviewed";
type QueueSourceFilter = "all" | "glama" | "official" | "smithery" | "github" | "manual";
type QueueEvidenceFilter = "all" | "github" | "package" | "missing_source";
type QueueSort = "priority" | "stars" | "last_seen" | "name";

type AdminToolsProps = {
  initialTools: McpTool[];
  persisted: boolean;
  initialAdminToken?: string;
};

export function AdminTools({ initialTools, persisted, initialAdminToken = "" }: AdminToolsProps) {
  const [tools, setTools] = useState<McpTool[]>(initialTools);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [message, setMessage] = useState(
    persisted ? "Database persistence active." : "Private seed-data mode active.",
  );
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState(initialAdminToken);
  const [reviewNote, setReviewNote] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [riskValue, setRiskValue] = useState<"low" | "medium" | "high">("medium");
  const [queueSource, setQueueSource] = useState<QueueSourceFilter>("all");
  const [queueEvidence, setQueueEvidence] = useState<QueueEvidenceFilter>("all");
  const [queueSort, setQueueSort] = useState<QueueSort>("priority");
  const [importProvider, setImportProvider] = useState<ImportSourceProvider>("official_registry");
  const [importLimit, setImportLimit] = useState(100);
  const [importQuery, setImportQuery] = useState("");
  const [importCsv, setImportCsv] = useState("");
  const [importPreview, setImportPreview] = useState<ImportResultSummary | null>(null);

  function adminHeaders() {
    return {
      "Content-Type": "application/json",
      ...(adminToken ? { "x-admin-token": adminToken } : {}),
    };
  }

  async function loadTools(nextFilter = filter) {
    setLoading(true);
    const response = await fetch(`/api/admin/tools?status=${nextFilter}`, { cache: "no-store", headers: adminHeaders() });
    const data = (await response.json()) as { tools: McpTool[]; persisted: boolean };
    setTools(data.tools);
    setMessage(data.persisted ? "Database persistence active." : "Private seed-data mode active.");
    setLoading(false);
  }

  const reviewedCount = useMemo(() => tools.filter((tool) => tool.status === "reviewed").length, [tools]);
  const unreviewedCount = useMemo(() => tools.filter((tool) => tool.status === "unreviewed").length, [tools]);
  function toolReviewState(tool: McpTool) {
    const state = typeof tool.enrichment?.reviewQueueState === "string" ? tool.enrichment.reviewQueueState : "needs_review";
    return state.replace(/_/g, " ");
  }

  function toolLastSeen(tool: McpTool) {
    const value = tool.enrichment?.lastSeenAt ?? tool.enrichment?.importedAt ?? tool.lastReviewedAt;
    return typeof value === "string" ? value : "";
  }

  function toolCount(tool: McpTool) {
    const count = tool.enrichment?.toolCount;
    return typeof count === "number" ? count : null;
  }

  function evidenceLinks(tool: McpTool) {
    const links = Array.isArray(tool.enrichment?.evidenceLinks) ? tool.enrichment.evidenceLinks : [];
    return links.filter((link): link is string => typeof link === "string" && link.length > 0);
  }

  function rawImportFor(tool: McpTool) {
    const rawImports = tool.enrichment?.rawImports;
    if (!rawImports || typeof rawImports !== "object") return null;
    const providers = Object.keys(rawImports);
    if (!providers.length) return null;
    return JSON.stringify(rawImports, null, 2).slice(0, 1800);
  }

  function patchWithReviewMetadata(
    tool: McpTool,
    patch: McpToolInput,
    fallbackNote: string,
    extraEnrichment: Record<string, unknown> = {},
  ) {
    const nextEvidenceLinks = evidenceLink.trim()
      ? Array.from(new Set([...evidenceLinks(tool), evidenceLink.trim()]))
      : evidenceLinks(tool);

    return patchTool(
      tool.slug,
      {
        ...patch,
        enrichment: {
          ...(tool.enrichment ?? {}),
          reviewNotes: reviewNote.trim() || tool.enrichment?.reviewNotes || "",
          evidenceLinks: nextEvidenceLinks,
          reviewRisk: riskValue,
          ...extraEnrichment,
        },
      },
      fallbackNote,
    );
  }

  const reviewQueue = useMemo(() => {
    function sourceQuality(tool: McpTool) {
      const source = `${tool.source} ${tool.sourceUrl}`.toLowerCase();
      if (source.includes("official")) return 0;
      if (tool.githubUrl && tool.packageUrl) return 1;
      if (tool.githubUrl || tool.packageUrl) return 2;
      return 3;
    }

    function riskWeight(tool: McpTool) {
      const category = tool.category.toLowerCase();
      if (/security|finance|marketing|communication|data/.test(category)) return 0;
      if (/developer|documentation|web/.test(category)) return 1;
      return 2;
    }

    function matchesSource(tool: McpTool) {
      const source = `${tool.source} ${tool.sourceUrl}`.toLowerCase();
      if (queueSource === "all") return true;
      if (queueSource === "github") return Boolean(tool.githubUrl || source.includes("github"));
      return source.includes(queueSource);
    }

    function matchesEvidence(tool: McpTool) {
      if (queueEvidence === "all") return true;
      if (queueEvidence === "github") return Boolean(tool.githubUrl);
      if (queueEvidence === "package") return Boolean(tool.packageUrl || tool.installCommand);
      return !tool.githubUrl && !tool.packageUrl && !tool.sourceUrl;
    }

    function sortTools(a: McpTool, b: McpTool) {
      if (queueSort === "stars") return (b.stars ?? -1) - (a.stars ?? -1) || a.name.localeCompare(b.name);
      if (queueSort === "last_seen") return Date.parse(toolLastSeen(b) || "0") - Date.parse(toolLastSeen(a) || "0") || a.name.localeCompare(b.name);
      if (queueSort === "name") return a.name.localeCompare(b.name);
      return sourceQuality(a) - sourceQuality(b) || riskWeight(a) - riskWeight(b) || (b.stars ?? -1) - (a.stars ?? -1) || a.name.localeCompare(b.name);
    }

    return tools
      .filter((tool) => tool.status === "unreviewed")
      .filter(matchesSource)
      .filter(matchesEvidence)
      .sort(sortTools)
      .slice(0, 24);
  }, [queueEvidence, queueSort, queueSource, tools]);

  async function handleCsvUpload(file: File) {
    const text = await file.text();
    const response = await fetch("/api/admin/import", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ provider: "manual_csv", csvText: text, limit: 1000, dryRun: true }),
    });
    const data = (await response.json()) as ImportResultSummary & { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not preview CSV import.");
      return;
    }
    setImportProvider("manual_csv");
    setImportCsv(text);
    setImportPreview(data);
    setMessage(`CSV preview ready: ${data.newTools} new, ${data.duplicates} duplicates, ${data.skippedInvalid} skipped.`);
  }

  async function patchTool(slug: string, patch: McpToolInput, fallbackNote = "Admin review metadata updated.") {
    const response = await fetch(`/api/admin/tools/${slug}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({
        ...patch,
        changeSummary: reviewNote.trim() || fallbackNote,
      }),
    });
    const data = (await response.json()) as { tool?: McpTool; error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not save tool update.");
      return;
    }
    if (!data.tool) return;
    setTools((current) => current.map((tool) => (tool.slug === slug ? data.tool! : tool)));
    setMessage(`Saved ${data.tool.name}.`);
  }

  async function enrichTool(slug: string) {
    setMessage("Fetching GitHub enrichment...");
    const response = await fetch(`/api/admin/tools/${slug}/enrich`, {
      method: "POST",
      headers: adminToken ? { "x-admin-token": adminToken } : {},
    });
    const data = (await response.json()) as { tool?: McpTool; error?: string };
    if (!response.ok || !data.tool) {
      setMessage(data.error ?? "Could not enrich tool.");
      return;
    }
    setTools((current) => current.map((tool) => (tool.slug === slug ? data.tool! : tool)));
    setMessage(`Enriched ${data.tool.name}.`);
  }

  async function runImport(dryRun: boolean) {
    setLoading(true);
    setMessage(dryRun ? "Running import preview..." : "Importing indexed tools...");
    const response = await fetch("/api/admin/import", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        provider: importProvider,
        limit: importLimit,
        query: importQuery,
        csvText: importCsv,
        dryRun,
      }),
    });
    const data = (await response.json()) as ImportResultSummary & { error?: string };
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Import failed.");
      return;
    }
    setImportPreview(data);
    setMessage(
      `${dryRun ? "Previewed" : "Imported"} ${data.fetched} records: ${data.newTools} new, ${data.duplicates} duplicates, ${data.skippedInvalid} skipped.`,
    );
    if (!dryRun) await loadTools(filter);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-[var(--arena-line)] bg-white p-5 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--arena-blue)]">
            <Database size={16} aria-hidden="true" />
            Canonical table: mcp_tools
          </div>
          <h1 className="mt-3 font-serif text-4xl font-semibold">Admin import and review</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--arena-muted)]">
            Import broadly as Indexed, then manually promote review depth only after MCP Rank review evidence exists.
            Maintainer Verified is reserved for listings with explicit maintainer claim or confirmation evidence.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link
            href="/templates/mcp-tools-import-template.csv"
            className="rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold"
          >
            CSV template
          </Link>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white">
            <FileUp size={16} aria-hidden="true" />
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleCsvUpload(file);
              }}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-[var(--arena-line)] bg-white p-4 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="text-sm font-semibold">Admin write token</div>
          <p className="mt-1 text-sm text-[var(--arena-muted)]">
            Production writes require the value configured as <code className="font-mono">ADMIN_TOKEN</code>.
          </p>
        </div>
        <input
          type="password"
          value={adminToken}
          onChange={(event) => setAdminToken(event.target.value)}
          placeholder="Paste token for imports and edits"
          className="h-10 min-w-72 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm"
        />
      </section>

      <section className="grid gap-3 rounded-lg border border-[var(--arena-line)] bg-white p-4 sm:grid-cols-[1fr_420px]">
        <div>
          <div className="text-sm font-semibold">Evidence change note</div>
          <p className="mt-1 text-sm leading-6 text-[var(--arena-muted)]">
            This note is captured in review history when status, trust score, confidence, or review timestamp changes.
          </p>
        </div>
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={3}
          maxLength={280}
          placeholder="Example: Raised confidence after source and package provenance review."
          className="w-full rounded-md border border-[var(--arena-line)] bg-white px-3 py-2 text-sm"
        />
        <div className="sm:col-start-2 grid gap-2 sm:grid-cols-[1fr_140px]">
          <input
            value={evidenceLink}
            onChange={(event) => setEvidenceLink(event.target.value)}
            placeholder="Optional evidence URL to attach to review actions"
            className="h-10 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm"
          />
          <select
            value={riskValue}
            onChange={(event) => setRiskValue(event.target.value as "low" | "medium" | "high")}
            className="h-10 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm"
          >
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-[var(--arena-line)] bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="text-sm font-semibold text-[var(--arena-blue)]">Aggregation importer</div>
            <h2 className="mt-2 font-serif text-3xl font-semibold">Import public MCP sources safely</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--arena-muted)]">
              Imports default to Indexed, low-confidence, unreviewed records. Duplicates only refresh source metadata and never overwrite MCP Rank review fields.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={() => void runImport(true)}
              className="rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
            >
              Dry-run preview
            </button>
            <button
              type="button"
              onClick={() => void runImport(false)}
              className="rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white"
            >
              Commit import
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-semibold">
            Source
            <select
              value={importProvider}
              onChange={(event) => setImportProvider(event.target.value as ImportSourceProvider)}
              className="h-10 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm"
            >
              <option value="official_registry">Official MCP Registry</option>
              <option value="smithery">Smithery API</option>
              <option value="glama">Glama API</option>
              <option value="github_search">GitHub search</option>
              <option value="manual_csv">Manual CSV paste</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Limit
            <input
              type="number"
              min="1"
              max="1000"
              value={importLimit}
              onChange={(event) => setImportLimit(Number(event.target.value))}
              className="h-10 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold md:col-span-2">
            Query
            <input
              value={importQuery}
              onChange={(event) => setImportQuery(event.target.value)}
              placeholder="Optional source-specific query"
              className="h-10 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm"
            />
          </label>
        </div>

        {importProvider === "manual_csv" && (
          <textarea
            value={importCsv}
            onChange={(event) => setImportCsv(event.target.value)}
            rows={5}
            placeholder="name,description,category,source_url,github_url,package_url,install_command,external_id,source_kind"
            className="w-full rounded-md border border-[var(--arena-line)] bg-white p-3 font-mono text-xs"
          />
        )}

        {importPreview && (
          <div className="rounded-lg border border-[#b9ddec] bg-[#edf8fc] p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-5">
              <div><span className="block font-mono text-2xl">{importPreview.newTools}</span>New</div>
              <div><span className="block font-mono text-2xl">{importPreview.duplicates}</span>Duplicates</div>
              <div><span className="block font-mono text-2xl">{importPreview.updatedSourceLinks}</span>Source updates</div>
              <div><span className="block font-mono text-2xl">{importPreview.skippedInvalid}</span>Skipped</div>
              <div><span className="block font-mono text-2xl">{importPreview.errors.length}</span>Errors</div>
            </div>
            {importPreview.errors.length > 0 && (
              <div className="mt-3 grid gap-1 text-sm text-[var(--arena-red)]">
                {importPreview.errors.map((error) => <p key={error}>{error}</p>)}
              </div>
            )}
            <div className="mt-4 max-h-64 overflow-auto rounded-md border border-[var(--arena-line)] bg-white">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[var(--arena-surface)]">
                  <tr>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Slug</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--arena-line)]">
                  {importPreview.preview.slice(0, 25).map((row, index) => (
                    <tr key={`${row.slug}-${index}`}>
                      <td className="px-3 py-2">{row.action}</td>
                      <td className="px-3 py-2">{row.record.name}</td>
                      <td className="px-3 py-2">{row.duplicateSlug ?? row.slug}</td>
                      <td className="px-3 py-2">{row.record.sourceProvider}</td>
                      <td className="px-3 py-2">{row.reason ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-lg border border-[var(--arena-line)] bg-white p-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            setFilter("all");
            void loadTools("all");
          }}
          className="rounded-md border border-[var(--arena-line)] px-3 py-2 text-left text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
        >
          All tools
          <span className="block font-mono text-2xl">{tools.length}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFilter("reviewed");
            void loadTools("reviewed");
          }}
          className="rounded-md border border-[var(--arena-line)] px-3 py-2 text-left text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
        >
          Reviewed
          <span className="block font-mono text-2xl">{reviewedCount}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFilter("unreviewed");
            void loadTools("unreviewed");
          }}
          className="rounded-md border border-[var(--arena-line)] px-3 py-2 text-left text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
        >
          Unreviewed
          <span className="block font-mono text-2xl">{unreviewedCount}</span>
        </button>
      </section>

      <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-semibold">Internal review queue</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--arena-muted)]">
              Filter imported/indexed records, attach evidence, and promote only when MCP Rank review evidence exists.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilter("unreviewed");
              void loadTools("unreviewed");
            }}
            className="rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
          >
            Load unreviewed
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold text-[var(--arena-muted)]">
            Indexed source
            <select
              value={queueSource}
              onChange={(event) => setQueueSource(event.target.value as QueueSourceFilter)}
              className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-2 text-sm text-[var(--arena-ink)]"
            >
              <option value="all">All sources</option>
              <option value="glama">Glama</option>
              <option value="official">Official registry</option>
              <option value="smithery">Smithery</option>
              <option value="github">GitHub</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--arena-muted)]">
            Evidence
            <select
              value={queueEvidence}
              onChange={(event) => setQueueEvidence(event.target.value as QueueEvidenceFilter)}
              className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-2 text-sm text-[var(--arena-ink)]"
            >
              <option value="all">All evidence states</option>
              <option value="github">Has GitHub repo</option>
              <option value="package">Has package/install</option>
              <option value="missing_source">Needs source evidence</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--arena-muted)]">
            Sort
            <select
              value={queueSort}
              onChange={(event) => setQueueSort(event.target.value as QueueSort)}
              className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-2 text-sm text-[var(--arena-ink)]"
            >
              <option value="priority">Review priority</option>
              <option value="stars">Stars/popularity</option>
              <option value="last_seen">Last seen/imported</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {reviewQueue.map((tool) => {
            const needsSourceEvidence = !tool.githubUrl && !tool.packageUrl && !tool.sourceUrl;
            const rawImport = rawImportFor(tool);
            return (
              <div key={tool.slug} className="rounded-lg border border-[var(--arena-line)] bg-[var(--arena-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{tool.name}</h3>
                    <p className="mt-1 text-xs text-[var(--arena-muted)]">{tool.category}</p>
                  </div>
                  <span className="rounded-md border border-[#b9ddec] bg-[#edf8fc] px-2 py-1 text-xs font-semibold">
                    {needsSourceEvidence ? "Needs source evidence" : "Source linked"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--arena-muted)]">{tool.description}</p>
                <div className="mt-3 grid gap-1 text-xs text-[var(--arena-muted)]">
                  <span>Slug: <span className="font-mono">{tool.slug}</span></span>
                  <span>Source: {tool.source || "Manual/imported"}</span>
                  <span>Repo: {tool.githubUrl ? "yes" : "pending"} · Package/install: {tool.packageUrl || tool.installCommand ? "yes" : "pending"}</span>
                  <span>License: {tool.license || "pending"} · Tools: {toolCount(tool) ?? "unknown"}</span>
                  <span>Stars: {tool.stars ?? "unknown"} · Last seen: {toolLastSeen(tool).slice(0, 10) || "unknown"}</span>
                  <span className="capitalize">Queue state: {toolReviewState(tool)}</span>
                  {tool.sourceUrl && <a href={tool.sourceUrl} className="truncate font-semibold text-[var(--arena-blue)]" target="_blank" rel="noreferrer">Source URL</a>}
                  {tool.githubUrl && <a href={tool.githubUrl} className="truncate font-semibold text-[var(--arena-blue)]" target="_blank" rel="noreferrer">Repository URL</a>}
                </div>
                {rawImport && (
                  <details className="mt-3 rounded-md border border-[var(--arena-line)] bg-white p-2 text-xs">
                    <summary className="cursor-pointer font-semibold">Raw/imported metadata</summary>
                    <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-[var(--arena-muted)]">{rawImport}</pre>
                  </details>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void patchWithReviewMetadata(
                        tool,
                        { status: "reviewed", reviewDepth: "source_reviewed", confidenceScore: tool.confidenceScore === "unreviewed" ? "low" : tool.confidenceScore, lastReviewedAt: new Date().toISOString() },
                        "Marked MCP Rank source reviewed from review queue.",
                        { reviewQueueState: "mcp_rank_reviewed" },
                      )
                    }
                    className="rounded-md border border-[var(--arena-line)] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    MCP Rank Reviewed
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void patchWithReviewMetadata(
                        tool,
                        { status: "reviewed", reviewDepth: "deep_review", confidenceScore: "high", lastReviewedAt: new Date().toISOString() },
                        "Promoted to Deep Review from review queue.",
                        { reviewQueueState: "deep_review" },
                      )
                    }
                    className="rounded-md bg-[var(--arena-ink)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Deep Review
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void patchWithReviewMetadata(
                        tool,
                        { status: "unreviewed", reviewDepth: "indexed", confidenceScore: "low" },
                        "Marked needs more evidence in review queue.",
                        { reviewQueueState: "needs_more_evidence" },
                      )
                    }
                    className="rounded-md border border-[var(--arena-line)] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    Needs More Evidence
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-lg border border-[var(--arena-blue-line)] bg-[var(--arena-blue-soft)] px-4 py-3 text-sm font-medium">
        {loading ? "Loading tools..." : message}
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--arena-line)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1440px] border-collapse text-left text-sm">
            <thead className="bg-[var(--arena-surface)] text-xs font-semibold text-[var(--arena-muted)]">
              <tr>
                {["Tool", "Source", "GitHub", "Stars", "Last commit", "License", "Status", "Depth", "Trust", "Confidence", "Review", "Actions"].map(
                  (header) => (
                    <th key={header} className="px-4 py-3">
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--arena-line)]">
              {tools.map((tool) => (
                <tr key={tool.slug} className="align-top hover:bg-[var(--arena-blue-soft)]">
                  <td className="max-w-80 px-4 py-4">
                    <div className="font-mono font-semibold">{tool.name}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--arena-muted)]">
                      {tool.description}
                    </div>
                    <div className="mt-2 text-xs text-[var(--arena-muted)]">{tool.category}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div>{tool.source || "Manual"}</div>
                    <div className="mt-1 max-w-48 truncate text-xs text-[var(--arena-muted)]">
                      {tool.sourceUrl || "Source evidence pending"}
                    </div>
                  </td>
                  <td className="max-w-52 px-4 py-4">
                    <div className="truncate text-xs">{tool.githubUrl || "Repository evidence pending"}</div>
                    <div className="mt-2 text-xs text-[var(--arena-muted)]">
                      {tool.packageUrl || "Package evidence pending"}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono">{tool.stars ?? "-"}</td>
                  <td className="px-4 py-4 text-xs">{tool.lastCommit ? tool.lastCommit.slice(0, 10) : "-"}</td>
                  <td className="px-4 py-4">{tool.license || "-"}</td>
                  <td className="px-4 py-4">
                    <select
                      value={tool.status}
                      onChange={(event) =>
                        void patchTool(tool.slug, { status: event.target.value as ToolStatus }, "Status changed in admin review.")
                      }
                      className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-2 text-sm"
                    >
                      <option value="unreviewed">Unreviewed</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="deprecated">Deprecated</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={tool.reviewDepth}
                      onChange={(event) =>
                        void patchTool(
                          tool.slug,
                          { reviewDepth: event.target.value as ReviewDepth },
                          "Review depth changed in admin review.",
                        )
                      }
                      className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-2 text-sm"
                    >
                      <option value="indexed">Indexed</option>
                      <option value="source_reviewed">Source Reviewed</option>
                      <option value="install_tested">Install Tested</option>
                      <option value="deep_review">Deep Review</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={tool.trustScore ?? ""}
                      onBlur={(event) =>
                        void patchTool(tool.slug, { trust_score: event.target.value }, "Trust score adjusted in admin review.")
                      }
                      className="h-9 w-20 rounded-md border border-[var(--arena-line)] bg-white px-2 font-mono text-sm"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={tool.confidenceScore}
                      onChange={(event) =>
                        void patchTool(
                          tool.slug,
                          { confidenceScore: event.target.value as ConfidenceScore },
                          "Confidence changed in admin review.",
                        )
                      }
                      className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-2 text-sm"
                    >
                      <option value="unreviewed">Unreviewed</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        void patchWithReviewMetadata(
                          tool,
                          {
                            status: "reviewed",
                            reviewDepth: tool.reviewDepth === "indexed" ? "source_reviewed" : tool.reviewDepth,
                            lastReviewedAt: new Date().toISOString(),
                            confidenceScore:
                              tool.confidenceScore === "unreviewed" ? "low" : tool.confidenceScore,
                          },
                          "Marked reviewed in admin review.",
                          { reviewQueueState: "mcp_rank_reviewed" },
                        )
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-semibold"
                    >
                      <ShieldCheck size={15} aria-hidden="true" />
                      Mark reviewed
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void patchWithReviewMetadata(
                          tool,
                          {
                            status: "reviewed",
                            reviewDepth: "deep_review",
                            confidenceScore: "high",
                            lastReviewedAt: new Date().toISOString(),
                          },
                          "Promoted to Deep Review in admin review.",
                          { reviewQueueState: "deep_review" },
                        )
                      }
                      className="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--arena-ink)] px-3 text-sm font-semibold text-white"
                    >
                      Deep review
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void enrichTool(tool.slug)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-semibold"
                      >
                        <RefreshCw size={15} aria-hidden="true" />
                        Enrich
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void patchWithReviewMetadata(
                            tool,
                            { status: "unreviewed", reviewDepth: "indexed", confidenceScore: "low" },
                            "Marked needs more evidence in admin review.",
                            { reviewQueueState: "needs_more_evidence" },
                          )
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-semibold"
                      >
                        <Save size={15} aria-hidden="true" />
                        Needs evidence
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
        <h2 className="font-serif text-2xl font-semibold">CSV columns</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--arena-muted)]">
          Expected headers: <code className="font-mono">{csvColumns.join(", ")}</code>
        </p>
      </section>
    </div>
  );
}
