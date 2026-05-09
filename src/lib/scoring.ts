import type { ScoreBreakdown } from "./types";

export const scoreWeights = {
  installDocs: 0.18,
  maintenance: 0.18,
  auth: 0.16,
  compatibility: 0.16,
  usefulness: 0.2,
  safety: 0.12,
} satisfies Record<keyof ScoreBreakdown, number>;

export const scoreLabels: Record<keyof ScoreBreakdown, string> = {
  installDocs: "Install + docs",
  maintenance: "Maintenance",
  auth: "Auth handling",
  compatibility: "Client compatibility",
  usefulness: "Real usefulness",
  safety: "Safety signals",
};

export function overallScore(score: ScoreBreakdown) {
  const weighted = Object.entries(scoreWeights).reduce((total, [key, weight]) => {
    return total + score[key as keyof ScoreBreakdown] * weight;
  }, 0);

  return Math.round(weighted);
}

export function scoreTone(score: number) {
  if (score >= 85) return "strong";
  if (score >= 72) return "watch";
  return "risk";
}

export function scoreGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
