import type { Metadata } from "next";
import { ArenaShell } from "@/components/arena-shell";

export const metadata: Metadata = {
  title: "Privacy",
  description: "MCP Rank privacy and independence notes.",
};

export default function PrivacyPage() {
  return (
    <ArenaShell mode="Privacy">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl font-semibold">Privacy and independence</h1>
        <div className="mt-6 grid gap-5 text-sm leading-7 text-[var(--arena-muted)]">
          <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <h2 className="font-serif text-2xl font-semibold text-[var(--arena-ink)]">Privacy</h2>
            <p className="mt-3">
              MCP Rank does not require an account for public rankings. The evidence assistant processes your prompt to answer from MCP Rank review data and should not be used for secrets, private credentials, or customer data.
            </p>
          </section>
          <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <h2 className="font-serif text-2xl font-semibold text-[var(--arena-ink)]">Independence</h2>
            <p className="mt-3">
              MCP Rank is independent and not affiliated with Anthropic, OpenAI, GitHub, or the official MCP project. Rankings are editorial review signals for developer evaluation, not formal certification, legal advice, or security advice.
            </p>
          </section>
        </div>
      </main>
    </ArenaShell>
  );
}
