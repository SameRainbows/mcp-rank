import { assertAdminRequest } from "@/lib/admin-auth";
import { enrichMcpTool } from "@/lib/tool-store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const blocked = assertAdminRequest(request);
  if (blocked) return blocked;

  const { slug } = await context.params;

  try {
    const tool = await enrichMcpTool(slug);
    if (!tool) return Response.json({ error: "Tool has no GitHub URL to enrich" }, { status: 400 });
    return Response.json({ tool });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to enrich tool" },
      { status: 502 },
    );
  }
}
