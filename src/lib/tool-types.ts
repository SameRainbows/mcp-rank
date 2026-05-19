import type { ReviewDepth } from "./types";

export type ConfidenceScore = "unreviewed" | "low" | "medium" | "high";

export type ToolStatus = "unreviewed" | "reviewed" | "deprecated" | "blocked";

export type ImportSourceKind = "official" | "community" | "package_registry" | "directory" | "manual";

export type ImportSourceProvider = "official_registry" | "smithery" | "glama" | "github_search" | "manual_csv";

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
  reviewDepth: ReviewDepth;
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
  review_depth?: ReviewDepth | string;
  last_commit?: string | null;
  last_reviewed_at?: string | null;
  open_issues?: number | string | null;
  readme_length?: number | string | null;
  changeSummary?: string;
  review_note?: string;
  snapshotSource?: string;
};

export type ImportedMcpToolRecord = {
  name: string;
  description?: string;
  category?: string;
  sourceProvider: ImportSourceProvider;
  sourceKind: ImportSourceKind;
  sourceUrl: string;
  externalId?: string;
  githubUrl?: string;
  packageName?: string;
  packageUrl?: string;
  homepageUrl?: string;
  docsUrl?: string;
  installCommand?: string;
  tags?: string[];
  toolCount?: number | null;
  externalSignals?: string[];
  rawMetadata?: Record<string, unknown>;
};

export type ImportPreviewRow = {
  record: ImportedMcpToolRecord;
  slug: string;
  action: "create" | "update_duplicate" | "skip_invalid";
  duplicateSlug?: string;
  reason?: string;
};

export type ImportResultSummary = {
  dryRun: boolean;
  provider: ImportSourceProvider;
  fetched: number;
  newTools: number;
  duplicates: number;
  updatedSourceLinks: number;
  skippedInvalid: number;
  errors: string[];
  preview: ImportPreviewRow[];
};
