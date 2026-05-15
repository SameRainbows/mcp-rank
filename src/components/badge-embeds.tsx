"use client";

import { Copy } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type BadgeEmbedsProps = {
  serverName: string;
  serverSlug: string;
  maintainerVerified: boolean;
};

export function BadgeEmbeds({ serverName, serverSlug, maintainerVerified }: BadgeEmbedsProps) {
  const badges = [
    { label: "Listed on MCP Rank", value: `[![Listed on MCP Rank](https://mcp-rank-tau.vercel.app/badges/listed.svg)](https://mcp-rank-tau.vercel.app/servers/${serverSlug})` },
    { label: "Reviewed by MCP Rank", value: `[![Reviewed by MCP Rank](https://mcp-rank-tau.vercel.app/badges/reviewed.svg)](https://mcp-rank-tau.vercel.app/servers/${serverSlug})` },
    ...(maintainerVerified
      ? [{ label: "MCP Rank Verified", value: `[![MCP Rank Verified](https://mcp-rank-tau.vercel.app/badges/verified.svg)](https://mcp-rank-tau.vercel.app/servers/${serverSlug})` }]
      : []),
  ];

  async function copyBadge(label: string, value: string) {
    await navigator.clipboard?.writeText(value);
    trackEvent("badge_copy_click", { server: serverSlug, badge: label });
  }

  return (
    <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
      <h2 className="font-serif text-2xl font-semibold">Badges</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--arena-muted)]">
        Maintainers can share {maintainerVerified ? "verified" : "reviewed"} listing status for {serverName}.
      </p>
      <div className="mt-4 grid gap-2">
        {badges.map((badge) => (
          <button
            key={badge.label}
            type="button"
            onClick={() => void copyBadge(badge.label, badge.value)}
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--arena-line)] px-3 py-2 text-left text-sm font-semibold transition hover:bg-[var(--arena-blue-soft)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span>{badge.label}</span>
            <Copy size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
