import type { Metadata } from "next";
import { AdminTools } from "@/components/admin-tools";
import { ArenaShell } from "@/components/arena-shell";
import { hasAdminAccess } from "@/lib/admin-auth";
import { listClaimSubmissions } from "@/lib/claim-store";
import { listMcpTools } from "@/lib/tool-store";

export const metadata: Metadata = {
  title: "Admin",
  description: "Import, review, score, and enrich MCP tools.",
};

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!hasAdminAccess(token)) {
    return (
      <ArenaShell mode="Admin access">
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
            <p className="text-sm font-semibold text-[var(--arena-muted)]">Private workspace</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold">Admin access required</h1>
            <p className="mt-4 text-sm leading-6 text-[var(--arena-muted)]">
              Import, enrichment, and manual scoring tools are private so public visitors only see reviewed MCP Rank evidence.
            </p>
          </section>
        </main>
      </ArenaShell>
    );
  }

  const [tools, claimResult] = await Promise.all([listMcpTools("all"), listClaimSubmissions("all")]);

  return (
    <ArenaShell mode="Admin">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <AdminTools
          initialTools={tools}
          initialClaims={claimResult.claims}
          persisted={Boolean(process.env.DATABASE_URL)}
          initialAdminToken={token ?? ""}
        />
      </main>
    </ArenaShell>
  );
}
