import type { McpServer } from "./types";

export const defaultReviewStatus = "Reviewed";
export const defaultConfidence = "Medium";

export function evidenceUpdatedAt(server: McpServer) {
  return server.lastReviewed;
}

export function packageUrlFor(server: McpServer) {
  if (server.packageName.startsWith("@")) {
    return `https://www.npmjs.com/package/${server.packageName}`;
  }

  if (server.packageName.includes("/")) return "";
  return server.packageName ? `https://www.npmjs.com/package/${server.packageName}` : "";
}

export function serverPath(server: McpServer) {
  return `/servers/${server.slug}`;
}
