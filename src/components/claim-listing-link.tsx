"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export function ClaimListingLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/submit?claim=${slug}`}
      onClick={() => trackEvent("claim_listing_click", { slug })}
      className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
    >
      Claim this listing
    </Link>
  );
}
