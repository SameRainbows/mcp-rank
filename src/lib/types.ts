export type ClientKey = "claude" | "cursor" | "codex" | "vscode";

export type RiskLevel = "low" | "medium" | "high";

export type ReviewStatus = "indexed" | "reviewed" | "maintainer_verified" | "deprecated" | "high_risk";

export type ConfidenceLevel = "low" | "medium" | "high";

export type ReviewDepth = "indexed" | "source_reviewed" | "install_tested" | "deep_review" | "maintainer_verified";

export type SourceLink = {
  label: string;
  type: "repository" | "docs" | "package" | "registry" | "smithery" | "glama" | "website" | "source";
  url: string;
};

export type ScoreBreakdown = {
  installDocs: number;
  maintenance: number;
  auth: number;
  compatibility: number;
  usefulness: number;
  safety: number;
};

export type McpServer = {
  slug: string;
  name: string;
  description: string;
  category: string;
  tagline: string;
  source: string;
  sourceLinks: SourceLink[];
  packageName: string;
  installCommand: string;
  repositoryUrl: string;
  stars: number;
  lastReviewed: string;
  evidenceUpdated: string;
  status: ReviewStatus;
  reviewDepth: ReviewDepth;
  confidence: ConfidenceLevel;
  maintainerVerified: boolean;
  maintainerVerifiedAt?: string;
  transports: string[];
  clients: ClientKey[];
  risk: RiskLevel;
  score: ScoreBreakdown;
  trustScore?: number;
  importedAt?: string;
  sourceProvider?: string;
  sourceKind?: string;
  signals: string[];
  evidence: string[];
  cautions: string[];
  examples: string[];
  useCases?: string[];
  riskAnalysis?: string[];
  maintenanceNotes?: string[];
};

export type ReviewSnapshot = {
  id: string;
  slug: string;
  subjectType: "server" | "tool" | "seed";
  score: Partial<ScoreBreakdown>;
  overallScore: number | null;
  previousOverallScore?: number | null;
  status: ReviewStatus | "unreviewed" | "blocked";
  confidence: ConfidenceLevel | "unreviewed";
  risk: RiskLevel;
  reviewDepth?: ReviewDepth;
  changeSummary: string;
  source: string;
  notes?: string;
  capturedAt: string;
};

export type WeeklyReport = {
  slug: string;
  title: string;
  weekOf: string;
  winnerSlug: string;
  summary: string;
  whyItWon: string[];
  watchList: string[];
  biggestRiskNote?: string;
  newlyIndexed?: string[];
  newlyReviewed?: string[];
  needsVerification?: string[];
  changes?: string[];
};
