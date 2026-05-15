"use client";

export const WATCHLIST_STORAGE_KEY = "mcp-rank-watchlist";
export const WATCHLIST_EVENT = "mcp-rank:watchlist-change";

export type WatchlistItem = {
  slug: string;
  name: string;
  category: string;
  risk: string;
  confidence: string;
  status: string;
  score: number | string;
  addedAt: string;
};

function readRawItems(): WatchlistItem[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is WatchlistItem => {
      return Boolean(item && typeof item.slug === "string" && typeof item.name === "string");
    });
  } catch {
    return [];
  }
}

function writeItems(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT, { detail: { count: items.length } }));
}

export function getWatchlistItems() {
  return readRawItems();
}

export function isInWatchlist(slug: string) {
  return readRawItems().some((item) => item.slug === slug);
}

export function addWatchlistItem(item: Omit<WatchlistItem, "addedAt">) {
  const items = readRawItems();
  if (items.some((existing) => existing.slug === item.slug)) return items;

  const nextItems = [{ ...item, addedAt: new Date().toISOString() }, ...items];
  writeItems(nextItems);
  return nextItems;
}

export function removeWatchlistItem(slug: string) {
  const nextItems = readRawItems().filter((item) => item.slug !== slug);
  writeItems(nextItems);
  return nextItems;
}

export function clearWatchlist() {
  writeItems([]);
}
