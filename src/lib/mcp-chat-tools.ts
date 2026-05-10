import { getServer, getServers, getWeeklyReport } from "./data";
import { overallScore, scoreLabels, scoreWeights } from "./scoring";
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
      description: "List ranked MCP Arena servers, optionally filtered by category, risk, or client.",
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
      description: "Get the complete MCP Arena review for one server by slug or name.",
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
      description: "Search MCP Arena server reviews by name, category, package, signal, caution, evidence, or example.",
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
      description: "Explain MCP Arena scoring weights, score labels, and confidence-gated safety ranking rules.",
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
    tagline: server.tagline,
    topSignals: server.signals.slice(0, 4),
    cautions: server.cautions.slice(0, 3),
  };
}

async function findServer(value: unknown) {
  const query = normalize(String(value ?? ""));
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
    const category = normalize(String(args.category ?? ""));
    const risk = riskLevels.includes(args.risk as RiskLevel) ? (args.risk as RiskLevel) : null;
    const client = clientKeys.includes(args.client as ClientKey) ? (args.client as ClientKey) : null;
    const limit = clampLimit(args.limit, 10);

    return rankedServers(servers)
      .filter((server) => !category || normalize(server.category).includes(category))
      .filter((server) => !risk || server.risk === risk)
      .filter((server) => !client || server.clients.includes(client))
      .slice(0, limit)
      .map((server, index) => ({ rank: index + 1, ...compactServer(server), scoreBreakdown: server.score }));
  }

  if (name === "get_server_review") {
    const server = await findServer(args.server);
    if (!server) return { found: false, message: "No MCP Arena server review matched that name or slug." };

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
    const query = normalize(String(args.query ?? ""));
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
        "Top safest lists must exclude unreviewed and low-confidence rows.",
        "Use list_top_safe_tools for confidence-gated safety recommendations from mcp_tools.",
        "If MCP Arena has no evidence for a server, say so instead of guessing.",
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

  return { error: `Unknown MCP Arena tool: ${name}` };
}
