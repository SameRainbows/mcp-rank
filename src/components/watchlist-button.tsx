"use client";

import { useEffect, useState } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { addWatchlistItem, isInWatchlist, removeWatchlistItem, WATCHLIST_EVENT } from "@/lib/watchlist";

type WatchlistButtonProps = {
  item: {
    slug: string;
    name: string;
    category: string;
    risk: string;
    confidence: string;
    status: string;
    score: number | string;
  };
  variant?: "primary" | "compact";
};

export function WatchlistButton({ item, variant = "primary" }: WatchlistButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function syncSaved() {
      setSaved(isInWatchlist(item.slug));
    }

    syncSaved();
    window.addEventListener(WATCHLIST_EVENT, syncSaved);
    window.addEventListener("storage", syncSaved);
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, syncSaved);
      window.removeEventListener("storage", syncSaved);
    };
  }, [item.slug]);

  function toggleWatchlist() {
    if (saved) {
      removeWatchlistItem(item.slug);
      trackEvent("watchlist_remove", { server: item.slug, surface: variant });
      setSaved(false);
      return;
    }

    addWatchlistItem(item);
    trackEvent("watchlist_add", { server: item.slug, surface: variant });
    setSaved(true);
  }

  const Icon = saved ? BookmarkCheck : BookmarkPlus;
  const compact = variant === "compact";

  return (
    <button
      type="button"
      onClick={toggleWatchlist}
      className={
        compact
          ? "inline-flex items-center gap-1.5 rounded-md border border-[#b9ddec] bg-[#edf8fc] px-2.5 py-1 text-xs font-semibold text-[var(--arena-ink)] transition hover:bg-white"
          : "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#b9ddec] bg-[#edf8fc] px-4 py-2 text-sm font-semibold text-[var(--arena-ink)] transition hover:bg-white"
      }
      aria-pressed={saved}
      aria-label={`${saved ? "Remove from" : "Add to"} MCP Rank watchlist`}
    >
      <Icon size={compact ? 14 : 16} aria-hidden="true" />
      {saved ? "In watchlist" : compact ? "Watch" : "Add to watchlist"}
    </button>
  );
}
