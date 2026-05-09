export type ClientKey = "claude" | "cursor" | "codex" | "vscode";

export type RiskLevel = "low" | "medium" | "high";

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
  category: string;
  tagline: string;
  source: string;
  packageName: string;
  installCommand: string;
  repositoryUrl: string;
  stars: number;
  lastReviewed: string;
  transports: string[];
  clients: ClientKey[];
  risk: RiskLevel;
  score: ScoreBreakdown;
  signals: string[];
  evidence: string[];
  cautions: string[];
  examples: string[];
};

export type WeeklyReport = {
  slug: string;
  title: string;
  weekOf: string;
  winnerSlug: string;
  summary: string;
  whyItWon: string[];
  watchList: string[];
};
