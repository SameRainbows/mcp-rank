"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function ComparisonViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackEvent("comparison_page_view", { slug });
  }, [slug]);

  return null;
}
