import { assertAdminRequest } from "@/lib/admin-auth";
import { patchClaimSubmissionStatus, type ClaimSubmissionStatus } from "@/lib/claim-store";

export const runtime = "nodejs";

function normalizeStatus(value: unknown): ClaimSubmissionStatus | null {
  if (value === "new" || value === "triaged" || value === "accepted" || value === "rejected") return value;
  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = assertAdminRequest(request);
  if (blocked) return blocked;

  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    return Response.json({ error: "Invalid claim submission id." }, { status: 400 });
  }

  const body = (await request.json()) as { status?: unknown };
  const status = normalizeStatus(body.status);
  if (!status) return Response.json({ error: "Invalid claim status." }, { status: 400 });

  const claim = await patchClaimSubmissionStatus(numericId, status);
  if (!claim) return Response.json({ error: "Claim submission not found." }, { status: 404 });

  return Response.json({ claim });
}
