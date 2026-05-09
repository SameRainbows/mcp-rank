"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Database, FileUp, RefreshCw, Save, ShieldCheck } from "lucide-react";
import type { ConfidenceScore, McpTool, McpToolInput, ToolStatus } from "@/lib/tool-types";

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
  "trust_score",
  "confidence_score",
  "last_reviewed_at",
];

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): McpToolInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });
}

type StatusFilter = "all" | "reviewed" | "unreviewed";

type AdminToolsProps = {
  initialTools: McpTool[];
  persisted: boolean;
};

export function AdminTools({ initialTools, persisted }: AdminToolsProps) {
  const [tools, setTools] = useState<McpTool[]>(initialTools);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [message, setMessage] = useState(
    persisted ? "Database persistence active." : "Using local fallback until DATABASE_URL is set.",
  );
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  function adminHeaders() {
    return {
      "Content-Type": "application/json",
      ...(adminToken ? { "x-admin-token": adminToken } : {}),
    };
  }

  async function loadTools(nextFilter = filter) {
    setLoading(true);
    const response = await fetch(`/api/admin/tools?status=${nextFilter}`, { cache: "no-store" });
    const data = (await response.json()) as { tools: McpTool[]; persisted: boolean };
    setTools(data.tools);
    setMessage(data.persisted ? "Database persistence active." : "Using local fallback until DATABASE_URL is set.");
    setLoading(false);
  }

  const reviewedCount = useMemo(() => tools.filter((tool) => tool.status === "reviewed").length, [tools]);
  const unreviewedCount = useMemo(() => tools.filter((tool) => tool.status === "unreviewed").length, [tools]);

  async function handleCsvUpload(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    const response = await fetch("/api/admin/tools", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ tools: rows }),
    });
    const data = (await response.json()) as { count?: number; persisted?: boolean; error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not import CSV.");
      return;
    }
    setMessage(`Imported ${data.count} rows. ${data.persisted ? "Saved to database." : "Saved to local fallback."}`);
    await loadTools(filter);
  }

  async function patchTool(slug: string, patch: McpToolInput) {
    const response = await fetch(`/api/admin/tools/${slug}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(patch),
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
            Start with CSV import, then manually set reviewed status, trust score, and confidence.
            Top safety lists should only include medium or high confidence rows.
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

      <div className="rounded-lg border border-[var(--arena-blue-line)] bg-[var(--arena-blue-soft)] px-4 py-3 text-sm font-medium">
        {loading ? "Loading tools..." : message}
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--arena-line)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
            <thead className="bg-[var(--arena-surface)] text-xs font-semibold text-[var(--arena-muted)]">
              <tr>
                {["Tool", "Source", "GitHub", "Stars", "Last commit", "License", "Status", "Trust", "Confidence", "Review", "Actions"].map(
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
                    <div className="mt-1 max-w-48 truncate text-xs text-[var(--arena-muted)]">{tool.sourceUrl}</div>
                  </td>
                  <td className="max-w-52 px-4 py-4">
                    <div className="truncate text-xs">{tool.githubUrl || "Not linked"}</div>
                    <div className="mt-2 text-xs text-[var(--arena-muted)]">{tool.packageUrl}</div>
                  </td>
                  <td className="px-4 py-4 font-mono">{tool.stars ?? "-"}</td>
                  <td className="px-4 py-4 text-xs">{tool.lastCommit ? tool.lastCommit.slice(0, 10) : "-"}</td>
                  <td className="px-4 py-4">{tool.license || "-"}</td>
                  <td className="px-4 py-4">
                    <select
                      value={tool.status}
                      onChange={(event) => void patchTool(tool.slug, { status: event.target.value as ToolStatus })}
                      className="h-9 rounded-md border border-[var(--arena-line)] bg-white px-2 text-sm"
                    >
                      <option value="unreviewed">Unreviewed</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="deprecated">Deprecated</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={tool.trustScore ?? ""}
                      onBlur={(event) => void patchTool(tool.slug, { trust_score: event.target.value })}
                      className="h-9 w-20 rounded-md border border-[var(--arena-line)] bg-white px-2 font-mono text-sm"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={tool.confidenceScore}
                      onChange={(event) =>
                        void patchTool(tool.slug, { confidenceScore: event.target.value as ConfidenceScore })
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
                        void patchTool(tool.slug, {
                          status: "reviewed",
                          lastReviewedAt: new Date().toISOString(),
                          confidenceScore:
                            tool.confidenceScore === "unreviewed" ? "low" : tool.confidenceScore,
                        })
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
                        onClick={() => void patchTool(tool.slug, { lastReviewedAt: new Date().toISOString() })}
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
