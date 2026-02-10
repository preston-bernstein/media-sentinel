import type { ReportData } from "../types.js";

export function renderJsonReport(data: ReportData): string {
  return JSON.stringify(
    {
      generatedAt: data.generatedAt,
      configSummary: data.configSummary,
      analysisStats: data.analysisStats,
      sections: data.sections,
      issues: Object.values(data.issuesById),
    },
    null,
    2
  );
}
