import { NextRequest } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { listMcpTools, upsertMcpTools } from "@/lib/tool-store";
import type { McpToolInput } from "@/lib/tool-types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const blocked = assertAdminRequest(request);
  if (blocked) return blocked;

  const status = request.nextUrl.searchParams.get("status") as "reviewed" | "unreviewed" | "all" | null;
  const tools = await listMcpTools(status ?? "all");

  return Response.json({
    persisted: Boolean(process.env.DATABASE_URL),
    tools,
  });
}

export async function POST(request: Request) {
  const blocked = assertAdminRequest(request);
  if (blocked) return blocked;

  const body = (await request.json()) as { tools?: McpToolInput[] };
  const result = await upsertMcpTools(body.tools ?? []);

  return Response.json(result);
}
