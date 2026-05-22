import { NextRequest } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { listClaimSubmissions, type ClaimSubmissionStatus } from "@/lib/claim-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const blocked = assertAdminRequest(request);
  if (blocked) return blocked;

  const requestedStatus = request.nextUrl.searchParams.get("status");
  const status: ClaimSubmissionStatus | "all" =
    requestedStatus === "new" ||
    requestedStatus === "triaged" ||
    requestedStatus === "accepted" ||
    requestedStatus === "rejected"
      ? requestedStatus
      : "all";
  const result = await listClaimSubmissions(status);

  return Response.json(result);
}
