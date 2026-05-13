"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function ServerViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackEvent("server_page_view", { slug });
  }, [slug]);

  return null;
}
