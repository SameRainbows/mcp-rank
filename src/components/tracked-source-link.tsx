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
      className="inline-flex items-center gap-2 font-semibold"
    >
      {label}
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}
