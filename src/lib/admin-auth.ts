export function assertAdminRequest(request: Request) {
  const configuredToken = process.env.ADMIN_TOKEN;
  const requiresToken = process.env.NODE_ENV === "production" || Boolean(process.env.DATABASE_URL);

  if (!requiresToken) return null;

  if (!configuredToken) {
    return Response.json(
      { error: "ADMIN_TOKEN must be configured before admin writes are enabled." },
      { status: 403 },
    );
  }

  if (request.headers.get("x-admin-token") !== configuredToken) {
    return Response.json({ error: "Admin token required." }, { status: 401 });
  }

  return null;
}
