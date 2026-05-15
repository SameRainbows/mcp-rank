"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type TrackedSourceLinkProps = {
  href: string;
  label: string;
  serverSlug: string;
  sourceType: string;
};

export function TrackedSourceLink({ href, label, serverSlug, sourceType }: TrackedSourceLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("outbound_source_click", { server: serverSlug, sourceType })}
      className="group grid gap-1 rounded-md border border-[var(--arena-line)] p-3 transition hover:bg-[var(--arena-blue-soft)]"
    >
      <span className="inline-flex items-center gap-2 font-semibold">
        {label}
        <ArrowUpRight size={16} aria-hidden="true" />
      </span>
      <span className="break-all font-mono text-xs font-normal leading-5 text-[var(--arena-muted)]">
        {href}
      </span>
    </Link>
  );
}
