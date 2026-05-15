import { NextRequest } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { runMcpToolImport } from "@/lib/import-manager";
import type { ImportSourceProvider } from "@/lib/tool-types";

export const runtime = "nodejs";

const providers: ImportSourceProvider[] = ["official_registry", "smithery", "glama", "github_search", "manual_csv"];

function isProvider(value: unknown): value is ImportSourceProvider {
  return typeof value === "string" && providers.includes(value as ImportSourceProvider);
}

function safeError(error: unknown) {
  if (!(error instanceof Error)) return "Import failed.";
  return error.message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]").slice(0, 240);
}

export async function POST(request: NextRequest) {
  const blocked = assertAdminRequest(request);
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as {
      provider?: unknown;
      limit?: number;
      query?: string;
      dryRun?: boolean;
      csvText?: string;
    };
    if (!isProvider(body.provider)) {
      return Response.json({ error: "Unknown import provider." }, { status: 400 });
    }

    const result = await runMcpToolImport({
      provider: body.provider,
      limit: body.limit,
      query: body.query,
      dryRun: body.dryRun ?? true,
      csvText: body.csvText,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}
