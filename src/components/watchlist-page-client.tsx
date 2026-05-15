"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookmarkCheck, CircleAlert, Trash2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { clearWatchlist, getWatchlistItems, removeWatchlistItem, WATCHLIST_EVENT, type WatchlistItem } from "@/lib/watchlist";

type ServerSummary = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  risk: string;
  confidence: string;
  status: string;
  score: number | string;
  evidenceUpdated: string;
};

type WatchlistPageClientProps = {
  servers: ServerSummary[];
};

export function WatchlistPageClient({ servers }: WatchlistPageClientProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const serverMap = useMemo(() => new Map(servers.map((server) => [server.slug, server])), [servers]);

  useEffect(() => {
    function syncItems() {
      setItems(getWatchlistItems());
    }

    syncItems();
    trackEvent("watchlist_view", { count: getWatchlistItems().length });
    window.addEventListener(WATCHLIST_EVENT, syncItems);
    window.addEventListener("storage", syncItems);
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, syncItems);
      window.removeEventListener("storage", syncItems);
    };
  }, []);

  function removeItem(slug: string) {
    removeWatchlistItem(slug);
    trackEvent("watchlist_remove", { server: slug, surface: "watchlist" });
  }

  function clearItems() {
    clearWatchlist();
  }

  const enrichedItems = items.map((item) => ({ item, server: serverMap.get(item.slug) }));

  if (!items.length) {
    return (
      <section className="rounded-xl border border-[var(--arena-line)] bg-white p-8 text-center shadow-[0_10px_35px_rgba(33,29,24,0.05)]">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-[#b9ddec] bg-[#edf8fc]">
          <BookmarkCheck size={20} aria-hidden="true" />
        </div>
        <h2 className="mt-5 font-serif text-3xl font-semibold">Your evaluation list is empty.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--arena-muted)]">
          Save MCP servers while reviewing scores, source evidence, and rollout cautions. This stays in your browser for now,
          which keeps the feature useful without requiring an account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/rankings" className="rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white">
            View Leaderboard
          </Link>
          <Link
            href="/search"
            className="rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
          >
            Search Evidence
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--arena-line)] bg-white shadow-[0_10px_35px_rgba(33,29,24,0.05)]">
      <div className="flex flex-col gap-3 border-b border-[var(--arena-line)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Saved MCP servers</h2>
          <p className="mt-1 text-sm text-[var(--arena-muted)]">
            {items.length} server{items.length === 1 ? "" : "s"} saved for install review.
          </p>
        </div>
        <button
          type="button"
          onClick={clearItems}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
        >
          <Trash2 size={15} aria-hidden="true" />
          Clear list
        </button>
      </div>

      <div className="divide-y divide-[var(--arena-line)]">
        {enrichedItems.map(({ item, server }) => (
          <article key={item.slug} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-2xl font-semibold">{server?.name ?? item.name}</h3>
                <span className="rounded-md border border-[#b9ddec] bg-[#edf8fc] px-2 py-1 text-xs font-semibold">
                  {server?.status ?? item.status}
                </span>
                <span className="rounded-md border border-[var(--arena-line)] px-2 py-1 text-xs font-semibold">
                  {server?.confidence ?? item.confidence} confidence
                </span>
                <span className="rounded-md border border-[var(--arena-line)] px-2 py-1 text-xs font-semibold capitalize">
                  {server?.risk ?? item.risk} risk
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--arena-muted)]">
                {server?.tagline ?? "Saved server is not present in the current MCP Rank dataset."}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-[var(--arena-muted)]">
                <span>Score: {server?.score ?? item.score}</span>
                <span>Category: {server?.category ?? item.category}</span>
                {server?.evidenceUpdated && <span>Evidence updated: {server.evidenceUpdated}</span>}
                <span>Saved: {new Date(item.addedAt).toLocaleDateString()}</span>
              </div>
              {(server?.status === "indexed" || item.status === "indexed") && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-[var(--arena-blue-soft)] px-3 py-2 text-xs font-semibold text-[var(--arena-muted)]">
                  <CircleAlert size={14} aria-hidden="true" />
                  Discovery only until manual review is complete.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link
                href={`/servers/${item.slug}`}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--arena-ink)] px-3 py-2 text-sm font-semibold text-white"
              >
                Open review <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => removeItem(item.slug)}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
              >
                <Trash2 size={15} aria-hidden="true" />
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
