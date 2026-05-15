import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportDetail } from "@/components/report-detail";
import { getWeeklyReport, getWeeklyReports } from "@/lib/data";

type ReportPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const reports = await getWeeklyReports();
  return reports
    .filter((report) => report.slug !== "weekly-best-mcp-service")
    .map((report) => ({ slug: report.slug }));
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = await getWeeklyReport(slug);
  if (!report) return {};

  return {
    title: report.title,
    description: report.summary,
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { slug } = await params;
  const report = await getWeeklyReport(slug);
  if (!report) notFound();

  return <ReportDetail slug={slug} />;
}
