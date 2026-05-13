export function hasAdminAccess(token: string | null | undefined) {
  return Boolean(process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN);
}

export function assertAdminRequest(request: Request) {
  if (!process.env.ADMIN_TOKEN) {
    return Response.json(
      { error: "Admin access is not configured." },
      { status: 403 },
    );
  }

  const token = request.headers.get("x-admin-token") || new URL(request.url).searchParams.get("token");
  if (!hasAdminAccess(token)) {
    return Response.json({ error: "Admin token required." }, { status: 401 });
  }

  return null;
}
