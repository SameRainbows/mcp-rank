"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

type SubmitServerLinkProps = {
  className: string;
  children: ReactNode;
};

export function SubmitServerLink({ className, children }: SubmitServerLinkProps) {
  return (
    <Link href="/submit" onClick={() => trackEvent("submit_server_click")} className={className}>
      {children}
    </Link>
  );
}
