import { assertAdminRequest } from "@/lib/admin-auth";
import { patchMcpTool } from "@/lib/tool-store";
import type { McpToolInput } from "@/lib/tool-types";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const blocked = assertAdminRequest(request);
  if (blocked) return blocked;

  const { slug } = await context.params;
  const body = (await request.json()) as McpToolInput;
  const tool = await patchMcpTool(slug, body, {
    changeSummary: body.changeSummary ?? body.review_note,
    source: body.snapshotSource ?? "admin",
  });

  if (!tool) return Response.json({ error: "Tool not found" }, { status: 404 });

  return Response.json({ tool });
}
