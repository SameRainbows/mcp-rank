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

    return tools
      .filter((tool) => tool.status === "unreviewed")
      .sort((a, b) => sourceQuality(a) - sourceQuality(b) || riskWeight(a) - riskWeight(b) || a.name.localeCompare(b.name))
      .slice(0, 12);
  }, [tools]);

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
            Leaderboards only use Deep Review or Maintainer Verified rows.
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
              Prioritized by source quality, source evidence, category importance, and rough risk surface. Promotion to reviewed remains manual.
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
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {reviewQueue.map((tool) => {
            const needsSourceEvidence = !tool.githubUrl && !tool.packageUrl && !tool.sourceUrl;
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
                  <span>Source: {tool.source || "Manual/imported"}</span>
                  <span>Repo: {tool.githubUrl ? "yes" : "pending"} · Package: {tool.packageUrl ? "yes" : "pending"}</span>
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
                      <option value="maintainer_verified">Maintainer Verified</option>
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
                        void patchTool(
                          tool.slug,
                          {
                            status: "reviewed",
                            reviewDepth: tool.reviewDepth === "indexed" ? "source_reviewed" : tool.reviewDepth,
                            lastReviewedAt: new Date().toISOString(),
                            confidenceScore:
                              tool.confidenceScore === "unreviewed" ? "low" : tool.confidenceScore,
                          },
                          "Marked reviewed in admin review.",
                        )
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-semibold"
                    >
                      <ShieldCheck size={15} aria-hidden="true" />
                      Mark reviewed
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
                          void patchTool(
                            tool.slug,
                            { lastReviewedAt: new Date().toISOString() },
                            "Review timestamp stamped in admin.",
                          )
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-3 text-sm font-semibold"
                      >
                        <Save size={15} aria-hidden="true" />
                        Stamp
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
