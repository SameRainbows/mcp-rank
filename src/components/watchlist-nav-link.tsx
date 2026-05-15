"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookmarkCheck } from "lucide-react";
import { getWatchlistItems, WATCHLIST_EVENT } from "@/lib/watchlist";

export function WatchlistNavLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function syncCount() {
      setCount(getWatchlistItems().length);
    }

    syncCount();
    window.addEventListener(WATCHLIST_EVENT, syncCount);
    window.addEventListener("storage", syncCount);
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, syncCount);
      window.removeEventListener("storage", syncCount);
    };
  }, []);

  return (
    <Link
      href="/watchlist"
      className="group relative flex size-9 items-center justify-center rounded-md text-[var(--arena-muted)] transition hover:bg-[var(--arena-blue-soft)] hover:text-[var(--arena-ink)]"
      aria-label={count ? `Watchlist with ${count} saved MCP servers` : "Watchlist"}
      title="Watchlist"
    >
      <BookmarkCheck size={17} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute right-1 top-1 size-2 rounded-full bg-[var(--arena-highlight)] ring-2 ring-[var(--arena-bg)]" />
      )}
      <span className="pointer-events-none absolute left-10 z-20 hidden whitespace-nowrap rounded-md border border-[var(--arena-line)] bg-white px-2 py-1 text-xs font-medium text-[var(--arena-ink)] shadow-sm group-hover:block">
        {count ? `Watchlist (${count})` : "Watchlist"}
      </span>
    </Link>
  );
}
