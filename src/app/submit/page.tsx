import type { Metadata } from "next";
import { ArenaShell } from "@/components/arena-shell";

export const metadata: Metadata = {
  title: "Submit MCP Server",
  description: "Submit an MCP server or claim an existing MCP Rank listing.",
};

type PageProps = {
  searchParams: Promise<{ claim?: string }>;
};

export default async function SubmitPage({ searchParams }: PageProps) {
  const { claim } = await searchParams;
  const subject = claim ? `Claim MCP Rank listing: ${claim}` : "Submit MCP server for MCP Rank review";
  const body = claim
    ? `Listing to claim: ${claim}%0AName:%0ARole/project:%0AEvidence or maintainer links:%0A`
    : "Server name:%0ARepository or package URL:%0AMaintainer email:%0AInstall command:%0AWhy it should be reviewed:%0A";

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
          <form className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Server name
                <input className="h-11 rounded-md border border-[var(--arena-line)] px-3 font-normal" defaultValue={claim ?? ""} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Repository or package URL
                <input className="h-11 rounded-md border border-[var(--arena-line)] px-3 font-normal" placeholder="https://github.com/..." />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Maintainer email
                <input className="h-11 rounded-md border border-[var(--arena-line)] px-3 font-normal" type="email" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Evidence notes
                <textarea className="min-h-32 rounded-md border border-[var(--arena-line)] px-3 py-2 font-normal" placeholder="Install docs, supported clients, auth scopes, notable cautions..." />
              </label>
            </div>
            <a
              href={`mailto:reviews@mcprank.dev?subject=${encodeURIComponent(subject)}&body=${body}`}
              className="mt-5 inline-flex rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white"
            >
              Email review request
            </a>
            <p className="mt-3 text-xs leading-5 text-[var(--arena-muted)]">
              MVP note: this form prepares a review request email while permanent submission storage is being added.
            </p>
          </form>

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
      </main>
    </ArenaShell>
  );
}
