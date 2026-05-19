import type { McpServer } from "./types";

export const statusLabels = {
  indexed: "Indexed",
  reviewed: "MCP Rank Reviewed",
  maintainer_verified: "Maintainer Verified",
  deprecated: "Deprecated",
  high_risk: "High Risk",
} as const;

export const confidenceLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

export const reviewDepthLabels = {
  indexed: "Indexed",
  source_reviewed: "Source Reviewed",
  install_tested: "Install Tested",
  deep_review: "Deep Review",
  maintainer_verified: "Maintainer Verified",
} as const;

export function hasMaintainerVerification(server: McpServer) {
  return Boolean(server.maintainerVerified && server.maintainerVerifiedAt);
}

export function evidenceUpdatedAt(server: McpServer) {
  return server.evidenceUpdated || server.lastReviewed;
}

export function reviewStatusLabel(server: McpServer) {
  if (server.status === "maintainer_verified" && !hasMaintainerVerification(server)) return "MCP Rank Reviewed";
  return statusLabels[server.status] ?? "Indexed";
}

export function confidenceLabel(server: McpServer) {
  return confidenceLabels[server.confidence] ?? "Low";
}

export function reviewDepthLabel(server: McpServer) {
  if (server.reviewDepth === "maintainer_verified" && !hasMaintainerVerification(server)) return "Deep Review";
  return reviewDepthLabels[server.reviewDepth] ?? "Indexed";
}

export function isReviewedForLeaderboards(server: McpServer) {
  return server.reviewDepth === "deep_review" || (server.reviewDepth === "maintainer_verified" && hasMaintainerVerification(server));
}

export function isRankable(server: McpServer) {
  return isReviewedForLeaderboards(server);
}

export function isTrustedRankable(server: McpServer) {
  return (
    isRankable(server) &&
    server.confidence === "high" &&
    server.risk !== "high"
  );
}

export function packageUrlFor(server: McpServer) {
  if (server.installCommand.startsWith("uvx ") && server.packageName) {
    return `https://pypi.org/project/${server.packageName}/`;
  }

  if (server.packageName.startsWith("docker.io/")) {
    const image = server.packageName.replace("docker.io/", "").split(":")[0];
    return `https://hub.docker.com/r/${image}`;
  }

  if (server.packageName.startsWith("ghcr.io/")) {
    return `https://github.com/${server.packageName.replace("ghcr.io/", "").split(":")[0]}`;
  }

  if (server.packageName.startsWith("@")) {
    return `https://www.npmjs.com/package/${server.packageName}`;
  }

  if (server.packageName.includes("/")) return "";
  return server.packageName ? `https://www.npmjs.com/package/${server.packageName}` : "";
}

export function sourceLinksFor(server: McpServer) {
  const links = [...(server.sourceLinks ?? [])];
  const packageUrl = packageUrlFor(server);

  if (server.repositoryUrl && !links.some((link) => link.url === server.repositoryUrl)) {
    links.unshift({ label: "GitHub repo", type: "repository", url: server.repositoryUrl });
  }

  if (packageUrl && !links.some((link) => link.url === packageUrl)) {
    links.push({ label: "Package page", type: "package", url: packageUrl });
  }

  const shouldAddOfficialRegistry =
    server.source.toLowerCase().includes("official mcp registry") ||
    server.sourceProvider?.toLowerCase().includes("official");

  if (shouldAddOfficialRegistry && !links.some((link) => link.url === "https://registry.modelcontextprotocol.io/")) {
    links.push({ label: "Official MCP registry", type: "registry", url: "https://registry.modelcontextprotocol.io/" });
  }

  return links.filter((link) => link.url);
}

export function serverPath(server: McpServer) {
  return `/servers/${server.slug}`;
}
