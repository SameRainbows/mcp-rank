import {
  claimSubmissionMailto,
  createClaimSubmission,
  normalizeClaimSubmissionInput,
  validateClaimSubmission,
} from "@/lib/claim-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const input = normalizeClaimSubmissionInput(body);
  const errors = validateClaimSubmission(input);

  if (errors.length > 0) {
    return Response.json({ ok: false, errors, mailto: claimSubmissionMailto(input) }, { status: 400 });
  }

  const result = await createClaimSubmission(input);
  if (!result.persisted) {
    return Response.json(
      {
        ok: true,
        persisted: false,
        mailto: result.mailto,
        message:
          "We could not store this request in the database right now, but the prepared email fallback is ready.",
      },
      { status: 202 },
    );
  }

  return Response.json(
    {
      ok: true,
      persisted: true,
      claim: result.claim,
      message: "Claim or correction received. MCP Rank will review the evidence before changing labels.",
    },
    { status: 201 },
  );
}
