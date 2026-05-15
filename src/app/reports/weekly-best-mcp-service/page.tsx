import type { Metadata } from "next";
import { ReportDetail } from "@/components/report-detail";

export const metadata: Metadata = {
  title: "Best MCP Server This Week",
  description: "The weekly MCP Rank report on the safest and most useful MCP server to install.",
};

export default function WeeklyBestReportPage() {
  return <ReportDetail slug="weekly-best-mcp-service" />;
}
