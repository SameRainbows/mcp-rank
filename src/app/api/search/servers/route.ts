import { NextResponse } from "next/server";
import { getSearchServers } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const limit = Number(searchParams.get("limit") ?? "200");
  const servers = await getSearchServers(query, Number.isFinite(limit) ? limit : 200);

  return NextResponse.json({ servers });
}
