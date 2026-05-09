export type ConfidenceScore = "unreviewed" | "low" | "medium" | "high";

export type ToolStatus = "unreviewed" | "reviewed" | "deprecated" | "blocked";

export type McpTool = {
  name: string;
  slug: string;
  description: string;
  category: string;
  source: string;
  sourceUrl: string;
  githubUrl: string;
  packageUrl: string;
  installCommand: string;
  stars: number | null;
  lastCommit: string | null;
  license: string;
  status: ToolStatus;
  trustScore: number | null;
  confidenceScore: ConfidenceScore;
  openIssues: number | null;
  readmeLength: number | null;
  lastReviewedAt: string | null;
  enrichment?: Record<string, unknown>;
};

export type McpToolInput = Partial<McpTool> & {
  source_url?: string;
  github_url?: string;
  package_url?: string;
  install_command?: string;
  trust_score?: number | string | null;
  confidence_score?: ConfidenceScore | string;
  last_commit?: string | null;
  last_reviewed_at?: string | null;
  open_issues?: number | string | null;
  readme_length?: number | string | null;
};
