import type { Metadata } from "next";
import { ArenaShell } from "@/components/arena-shell";
import { ClaimSubmissionForm } from "@/components/claim-submission-form";
import { contactMailtoHref } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Submit MCP Server",
  description: "Submit an MCP server or claim an existing MCP Rank listing.",
};

type PageProps = {
  searchParams: Promise<{ claim?: string }>;
};

export default async function SubmitPage({ searchParams }: PageProps) {
  const { claim } = await searchParams;
  const outreachSubject = "MCP Rank listing verification";
  const outreachBody =
    "Hi,\n\nWe indexed your MCP server on MCP Rank, an independent trust and ranking dataset for MCP tools.\n\nWe are asking maintainers to verify source links, install commands, supported clients, auth scopes, and safety cautions before we mark a listing as maintainer verified.\n\nServer/listing:\nRepository or package URL:\nBest maintainer contact:\nAnything MCP Rank should correct:\n\nThanks.";

  return (
    <ArenaShell mode="Submit">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[var(--arena-green)]">
          {claim ? "Claim listing" : "Submit MCP Server"}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
          {claim ? `Claim the ${claim} listing` : "Get an MCP server into the review queue."}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">
          MCP Rank prioritizes servers with clear install paths, public source evidence, active maintenance, and meaningful safety or compatibility notes.
        </p>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <ClaimSubmissionForm claimSlug={claim ?? ""} />

          <aside className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
            <h2 className="font-serif text-2xl font-semibold">What helps a review?</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--arena-muted)]">
              <li>Public repository, package, or registry source.</li>
              <li>Reproducible install command and supported clients.</li>
              <li>OAuth scopes, token handling, and write-action boundaries.</li>
              <li>Evidence for maintenance, examples, and real-world usefulness.</li>
            </ul>
          </aside>
        </section>

        <section className="mt-8 rounded-lg border border-[var(--arena-line)] bg-white p-6">
          <p className="text-sm font-semibold text-[var(--arena-green)]">Maintainer outreach</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold">Verify a listing before it becomes a badge.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--arena-muted)]">
            MCP Rank Verified is reserved for maintainers who confirm the listing, source URLs, install path,
            supported clients, auth model, and safety cautions. Everyone else gets Listed or Reviewed status,
            not a verification badge.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="rounded-md border border-[var(--arena-line)] bg-[var(--arena-surface)] p-4 font-mono text-xs leading-6 text-[var(--arena-muted)]">
              <p>Subject: MCP Rank listing verification</p>
              <p>Ask: confirm source URLs, install command, supported clients, auth scopes, and safety cautions.</p>
              <p>Outcome: Reviewed by MCP Rank now; MCP Rank Verified only after maintainer evidence review.</p>
            </div>
            <a
              href={contactMailtoHref(outreachSubject, outreachBody)}
              className="inline-flex rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold transition hover:bg-[var(--arena-blue-soft)]"
            >
              Open email template
            </a>
          </div>
        </section>
      </main>
    </ArenaShell>
  );
}
