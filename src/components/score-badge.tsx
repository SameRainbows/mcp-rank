import { scoreGrade, scoreTone } from "@/lib/scoring";

type ScoreBadgeProps = {
  score: number;
  size?: "sm" | "lg";
};

export function ScoreBadge({ score, size = "sm" }: ScoreBadgeProps) {
  const tone = scoreTone(score);
  const styles = {
    strong: "border-emerald-200 bg-emerald-50 text-emerald-800",
    watch: "border-amber-200 bg-amber-50 text-amber-800",
    risk: "border-red-200 bg-red-50 text-red-800",
  }[tone];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-semibold ${styles} ${
        size === "lg" ? "h-14 min-w-20 px-4 text-2xl" : "h-8 min-w-14 px-2 text-sm"
      }`}
    >
      {score}
      <span className="ml-1 text-[0.65em]">{scoreGrade(score)}</span>
    </span>
  );
}
