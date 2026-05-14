"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const storageKey = "mcp-rank-home-evidence-notice-closed";

export function HomeEvidenceNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(window.localStorage.getItem(storageKey) !== "true");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function closeNotice() {
    window.localStorage.setItem(storageKey, "true");
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <div className="mx-auto flex max-w-2xl items-center divide-x divide-[#b9ddec] rounded-lg border border-[#9fd2e6] bg-[#edf8fc] text-sm text-[var(--arena-ink)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={closeNotice}
          className="rounded p-1 transition hover:bg-white"
          aria-label="Hide evidence notice"
        >
          <X size={14} aria-hidden="true" />
        </button>
        <span>Reviewed MCP rankings, source evidence, risk, and confidence</span>
      </div>
      <Link href="/methodology" className="px-3 py-2 font-semibold hover:bg-white">
        Method
      </Link>
    </div>
  );
}
