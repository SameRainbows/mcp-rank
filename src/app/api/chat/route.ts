import { NextRequest } from "next/server";
import { safeChatError, sanitizeChatMessages, streamMcpArenaChat } from "@/lib/azure-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requests = new Map<string, { count: number; resetAt: number }>();
const windowMs = 60_000;
const maxRequests = 12;
const maxTotalChars = 6000;

function getClientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

function checkRateLimit(request: NextRequest) {
  const now = Date.now();
  const key = getClientKey(request);
  const current = requests.get(key);

  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= maxRequests) {
    return Response.json(
      { error: "Too many MCP Rank evidence requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  current.count += 1;
  return null;
}

function checkSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return Response.json({ error: "Same-origin chat requests are required." }, { status: 403 });
  }

  const host = request.headers.get("host");
  if (!host) {
    return Response.json({ error: "Same-origin chat requests are required." }, { status: 403 });
  }

  const expected = `${request.nextUrl.protocol}//${host}`;
  if (origin !== expected) {
    return Response.json({ error: "Cross-origin chat requests are not allowed." }, { status: 403 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  const blockedByOrigin = checkSameOrigin(request);
  if (blockedByOrigin) return blockedByOrigin;

  const blockedByRateLimit = checkRateLimit(request);
  if (blockedByRateLimit) return blockedByRateLimit;

  try {
    const body = (await request.json()) as { messages?: unknown };
    const messages = sanitizeChatMessages(body.messages);
    const totalChars = messages.reduce((total, message) => total + message.content.length, 0);

    if (!messages.length || messages[messages.length - 1]?.role !== "user") {
      return Response.json({ error: "A user message is required." }, { status: 400 });
    }

    if (totalChars > maxTotalChars) {
      return Response.json({ error: "That conversation is too long for this chat box." }, { status: 413 });
    }

    const stream = await streamMcpArenaChat(messages);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const safe = safeChatError(error);
    return Response.json({ error: safe.message }, { status: safe.status });
  }
}
