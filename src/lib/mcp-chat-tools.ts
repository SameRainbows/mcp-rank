import { getServer, getServers, getWeeklyReport } from "./data";
import { confidenceLabel, evidenceUpdatedAt, isRankable, reviewDepthLabel, reviewStatusLabel, serverPath } from "./server-derived";
import { overallScore, scoreLabels, scoreWeights } from "./scoring";
import { getStaticGlamaManifest } from "./static-glama-index";
import { listTopSafeMcpTools } from "./tool-store";
import type { ClientKey, McpServer, RiskLevel } from "./types";

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
};

export type ChatToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
};

type ToolResult = Record<string, unknown> | Array<Record<string, unknown>>;

const clientKeys = ["claude", "cursor", "codex", "vscode"] satisfies ClientKey[];
const riskLevels = ["low", "medium", "high"] satisfies RiskLevel[];

export const mcpChatToolDefinitions: ChatToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_leaderboard",
      description: "List ranked MCP Rank servers, optionally filtered by category, risk, or client.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional exact or partial category filter." },
          risk: { type: "string", enum: riskLevels },
          client: { type: "string", enum: clientKeys },
          limit: { type: "integer", minimum: 1, maximum: 10, default: 10 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_server_review",
      description: "Get the complete MCP Rank review for one server by slug or name.",
      parameters: {
        type: "object",
        properties: {
          server: { type: "string", description: "Server slug or display name." },
        },
        required: ["server"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_servers",
      description: "Compare two to four MCP servers across scores, risk, evidence, cautions, and examples.",
      parameters: {
        type: "object",
        properties: {
          servers: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: { type: "string" },
            description: "Server slugs or names.",
          },
        },
        required: ["servers"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_servers",
      description: "Search MCP Rank server reviews by name, category, package, signal, caution, evidence, or example.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
          limit: { type: "integer", minimum: 1, maximum: 10, default: 6 },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_methodology",
      description: "Explain MCP Rank scoring weights, score labels, and confidence-gated safety ranking rules.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weekly_report",
      description: "Get the current weekly Best MCP Service report, winner, and watch list.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_index_stats",
      description: "Get MCP Rank indexed discovery coverage counts, including static Glama shard counts.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_top_safe_tools",
      description: "List reviewed MCP tools that are allowed in top safety lists because confidence is medium or high.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 10, default: 10 },
        },
        additionalProperties: false,
      },
    },
  },
];

function clampLimit(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function cleanToolText(value: unknown, maxLength = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function rankedServers(servers: McpServer[]) {
  return [...servers].sort((a, b) => overallScore(b.score) - overallScore(a.score));
}

function compactServer(server: McpServer) {
  return {
    slug: server.slug,
    name: server.name,
    category: server.category,
    packageName: server.packageName,
    overallScore: overallScore(server.score),
    risk: server.risk,
    clients: server.clients,
    stars: server.stars,
    lastReviewed: server.lastReviewed,
    evidenceUpdated: evidenceUpdatedAt(server),
    status: reviewStatusLabel(server),
    reviewDepth: reviewDepthLabel(server),
    confidence: confidenceLabel(server),
    pagePath: serverPath(server),
    tagline: server.tagline,
    topSignals: server.signals.slice(0, 4),
    cautions: server.cautions.slice(0, 3),
  };
}

async function findServer(value: unknown) {
  const query = normalize(cleanToolText(value, 120));
  if (!query) return null;

  const servers = await getServers();
  return (
    servers.find((server) => normalize(server.slug) === query) ??
    servers.find((server) => normalize(server.name) === query) ??
    servers.find((server) => normalize(server.name).includes(query) || normalize(server.slug).includes(query)) ??
    null
  );
}

export async function executeMcpChatTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  if (name === "list_leaderboard") {
    const servers = await getServers();
    const category = normalize(cleanToolText(args.category, 80));
    const risk = riskLevels.includes(args.risk as RiskLevel) ? (args.risk as RiskLevel) : null;
    const client = clientKeys.includes(args.client as ClientKey) ? (args.client as ClientKey) : null;
    const limit = clampLimit(args.limit, 10);

    return rankedServers(servers)
      .filter(isRankable)
      .filter((server) => !category || normalize(server.category).includes(category))
      .filter((server) => !risk || server.risk === risk)
      .filter((server) => !client || server.clients.includes(client))
      .slice(0, limit)
      .map((server, index) => ({ rank: index + 1, ...compactServer(server), scoreBreakdown: server.score }));
  }

  if (name === "get_server_review") {
    const server = await findServer(args.server);
    if (!server) {
      return {
        found: false,
        message: "I don't have enough reviewed evidence yet for that MCP server. Check the leaderboard or submit it for review.",
      };
    }

    return {
      found: true,
      ...compactServer(server),
      source: server.source,
      installCommand: server.installCommand,
      repositoryUrl: server.repositoryUrl,
      transports: server.transports,
      scoreBreakdown: server.score,
      evidence: server.evidence,
      cautions: server.cautions,
      examples: server.examples,
    };
  }

  if (name === "compare_servers") {
    const requested = Array.isArray(args.servers) ? args.servers.slice(0, 4) : [];
    const resolved = await Promise.all(requested.map((server) => findServer(server)));
    return {
      found: resolved.filter(Boolean).map((server) => ({
        ...compactServer(server as McpServer),
        scoreBreakdown: (server as McpServer).score,
        evidence: (server as McpServer).evidence,
        cautions: (server as McpServer).cautions,
        examples: (server as McpServer).examples,
      })),
      missing: requested.filter((_, index) => !resolved[index]),
    };
  }

  if (name === "search_servers") {
    const query = normalize(cleanToolText(args.query, 160));
    const limit = clampLimit(args.limit, 6);
    if (!query) return [];

    const servers = await getServers();
    return rankedServers(servers)
      .filter((server) => {
        const haystack = [
          server.name,
          server.slug,
          server.category,
          server.tagline,
          server.packageName,
          server.source,
          ...server.signals,
          ...server.evidence,
          ...server.cautions,
          ...server.examples,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, limit)
      .map(compactServer);
  }

  if (name === "get_methodology") {
    return {
      scoreLabels,
      scoreWeights,
      confidenceRules: [
        "Trust score and confidence score are separate.",
        "Leaderboards include only Deep Review or Maintainer Verified entries.",
        "Source Reviewed and Install Tested rows are discovery evidence, not ranked recommendations.",
        "Top trusted lists must exclude low-confidence and high-risk rows.",
        "Use list_top_safe_tools for confidence-gated safety recommendations from mcp_tools.",
        "If MCP Rank has no reviewed evidence for a server, say: I don't have enough reviewed evidence yet.",
      ],
      reviewedSignals: [
        "Install success and documentation quality",
        "Maintenance activity and security risk signals",
        "Auth and OAuth handling",
        "Client compatibility",
        "Real usefulness based on examples and community mentions",
      ],
    };
  }

  if (name === "get_weekly_report") {
    const report = await getWeeklyReport("weekly-best-mcp-service");
    if (!report) return { found: false };
    const winner = await getServer(report.winnerSlug);
    return {
      found: true,
      title: report.title,
      weekOf: report.weekOf,
      winner: winner ? compactServer(winner) : report.winnerSlug,
      summary: report.summary,
      whyItWon: report.whyItWon,
      watchList: report.watchList,
    };
  }

  if (name === "get_index_stats") {
    const manifest = getStaticGlamaManifest();
    const servers = await getServers();
    const rankableCount = servers.filter(isRankable).length;

    return {
      staticGlamaIndexedRecords: manifest?.count ?? 0,
      staticGlamaFetchedRecords: manifest?.fetched ?? 0,
      staticGlamaDuplicates: manifest?.duplicates ?? 0,
      staticGlamaGeneratedAt: manifest?.generatedAt ?? null,
      reviewedOrRankableServers: rankableCount,
      note:
        "Static Glama records are indexed discovery records only. They are not MCP Rank reviews and are excluded from leaderboards until reviewed.",
    };
  }

  if (name === "list_top_safe_tools") {
    const limit = clampLimit(args.limit, 10);
    const tools = await listTopSafeMcpTools(limit);
    return tools.map((tool, index) => ({
      rank: index + 1,
      slug: tool.slug,
      name: tool.name,
      category: tool.category,
      source: tool.source,
      trustScore: tool.trustScore,
      confidenceScore: tool.confidenceScore,
      status: tool.status,
      stars: tool.stars,
      lastCommit: tool.lastCommit,
      lastReviewedAt: tool.lastReviewedAt,
      description: tool.description,
      caution: "Included because status is reviewed and confidence is medium or high.",
    }));
  }

  return { error: `Unknown MCP Rank tool: ${name}` };
}

export async function buildLocalMcpArenaAnswer(prompt: string) {
  const query = prompt.toLowerCase();

  if (
    query.includes("how many") &&
    (query.includes("indexed") || query.includes("index")) &&
    query.includes("server")
  ) {
    const stats = (await executeMcpChatTool("get_index_stats", {})) as Record<string, unknown>;
    return `MCP Rank currently has ${stats.staticGlamaIndexedRecords} static Glama indexed discovery records from ${stats.staticGlamaFetchedRecords} fetched Glama records.\n\nThese are indexed-only discovery records, not MCP Rank reviews. Reviewed/rankable servers are kept separate and only Deep Review or Maintainer Verified entries are eligible for leaderboards.`;
  }

  if (query.includes("slack")) {
    const review = (await executeMcpChatTool("get_server_review", { server: "slack" })) as Record<string, unknown>;
    if (review.found) {
      const cautions = Array.isArray(review.cautions) ? review.cautions.slice(0, 2).join(" ") : "";
      return `MCP Rank reviewed evidence does not support calling Slack safe.\n\nSlack MCP Server is listed at ${review.pagePath} with score ${review.overallScore}/100, ${review.risk} risk, ${review.confidence} confidence, and status ${review.status}. Reviewed date: ${review.lastReviewed}.\n\nCautions: ${cautions}`;
    }
  }

  if (
    query.includes("safe") ||
    query.includes("safest") ||
    query.includes("leaderboard") ||
    query.includes("rank") ||
    query.includes("latest")
  ) {
    const leaderboard = (await executeMcpChatTool("list_leaderboard", {
      client: query.includes("codex") ? "codex" : undefined,
      limit: 5,
    })) as Array<Record<string, unknown>>;

    const topSafe = (await executeMcpChatTool("list_top_safe_tools", { limit: 5 })) as Array<Record<string, unknown>>;
    const leaderboardRows = leaderboard
      .map((server) => `- ${server.name}: ${server.overallScore}/100, ${server.risk} risk`)
      .join("\n");
    const safeRows = topSafe
      .map((tool) => `- ${tool.name}: trust ${tool.trustScore}, confidence ${tool.confidenceScore}`)
      .join("\n");

    return `MCP Rank is using local evidence mode for this preview.\n\nCurrent MCP Rank leaderboard evidence:\n${leaderboardRows}\n\nConfidence-gated safe-tool list:\n${safeRows}\n\nI am only using reviewed MCP Rank data here. The full model-backed reviewer will use these same read-only tools for deeper natural-language analysis.`;
  }

  if (query.includes("compare") || (query.includes("context7") && query.includes("filesystem"))) {
    const comparison = (await executeMcpChatTool("compare_servers", {
      servers: query.includes("context7") || query.includes("filesystem") ? ["Context7", "Filesystem"] : [],
    })) as { found?: Array<Record<string, unknown>> };

    if (comparison.found?.length) {
      const rows = comparison.found
        .map((server) => {
          const score = server.overallScore ?? "unscored";
          const risk = server.risk ?? "unknown risk";
          const cautions = Array.isArray(server.cautions) ? server.cautions.slice(0, 2).join(" ") : "";
          return `- ${server.name}: ${score}/100, ${risk} risk. ${cautions}`;
        })
        .join("\n");

      return `MCP Rank is using local evidence mode for this preview.\n\n${rows}\n\nFor a rollout decision, prefer the lower-risk documentation server when you need library context, and treat local file access as higher blast radius because path scoping controls the real safety profile.`;
    }
  }

  if (query.includes("method") || query.includes("trust score") || query.includes("confidence")) {
    const methodology = (await executeMcpChatTool("get_methodology", {})) as Record<string, unknown>;
    return `MCP Rank is using local evidence mode for this preview.\n\nMCP Rank separates trust score from confidence. A tool can have a strong draft score but still be excluded from safest lists when confidence is low or unreviewed.\n\nCurrent weighted categories: ${Object.entries(methodology.scoreWeights as Record<string, number>)
      .map(([key, weight]) => `${key} ${Math.round(weight * 100)}%`)
      .join(", ")}.`;
  }

  const search = (await executeMcpChatTool("search_servers", { query: prompt, limit: 5 })) as Array<Record<string, unknown>>;
  const rows = search.length
    ? search.map((server) => `- ${server.name}: ${server.overallScore}/100, ${server.risk} risk`).join("\n")
    : "- I don't have enough reviewed evidence yet for that MCP server.";

  return `MCP Rank is using local evidence mode for this preview.\n\nClosest MCP Rank evidence:\n${rows}\n\nI am only using reviewed MCP Rank data here. The full model-backed reviewer will use these same read-only tools for deeper natural-language analysis.`;
}
