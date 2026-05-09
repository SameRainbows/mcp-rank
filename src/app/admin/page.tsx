import type { Metadata } from "next";
import { AdminTools } from "@/components/admin-tools";
import { ArenaShell } from "@/components/arena-shell";
import { listMcpTools } from "@/lib/tool-store";

export const metadata: Metadata = {
  title: "Admin",
  description: "Import, review, score, and enrich MCP tools.",
};

export default async function AdminPage() {
  const tools = await listMcpTools("all");

  return (
    <ArenaShell mode="Admin">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <AdminTools initialTools={tools} persisted={Boolean(process.env.DATABASE_URL)} />
      </main>
    </ArenaShell>
  );
}
