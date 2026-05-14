"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type NewsletterSignupProps = {
  context: string;
  compact?: boolean;
};

export function NewsletterSignup({ context, compact = false }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setMessage("Enter a valid email to get the weekly MCP trust report.");
      return;
    }

    trackEvent("newsletter_signup_attempt", { context });

    try {
      const saved = JSON.parse(window.localStorage.getItem("mcp-rank-newsletter") || "[]") as string[];
      window.localStorage.setItem("mcp-rank-newsletter", JSON.stringify([...new Set([...saved, normalized])]));
    } catch {
      // Local persistence is a best-effort placeholder until a newsletter provider is wired.
    }

    setEmail("");
    setMessage(
      process.env.NODE_ENV === "development"
        ? "Newsletter backend not configured; saved locally for development."
        : "You're on the weekly MCP trust report list.",
    );
  }

  return (
    <section className={`rounded-lg border border-[#b9ddec] bg-[#edf8fc] ${compact ? "p-4" : "p-5"}`}>
      <div className={compact ? "" : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
        <div>
          <h2 className="font-serif text-2xl font-semibold">Weekly MCP trust report</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--arena-muted)]">
            Reviewed servers, risk notes, new indexed tools, and maintainer verification asks.
          </p>
        </div>
        <form onSubmit={submit} className={`mt-4 flex gap-2 ${compact ? "flex-col" : "sm:mt-0"}`}>
          <label className="sr-only" htmlFor={`newsletter-${context}`}>
            Email
          </label>
          <input
            id={`newsletter-${context}`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="h-10 min-w-0 rounded-md border border-[#b9ddec] bg-white px-3 text-sm outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--arena-ink)] px-4 text-sm font-semibold text-white transition hover:bg-black"
          >
            <Send size={15} aria-hidden="true" />
            Subscribe
          </button>
        </form>
      </div>
      {message && <p className="mt-3 text-xs font-medium text-[var(--arena-muted)]">{message}</p>}
    </section>
  );
}
