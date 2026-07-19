import type { AnalysisResult, Config, ReportData, ReportSection } from "../types.js";

export function buildReportData(analysis: AnalysisResult, config: Config): ReportData {
  const byKind = new Map<string, string[]>();
  for (const issue of analysis.issues) {
    const list = byKind.get(issue.kind) ?? [];
    list.push(issue.id);
    byKind.set(issue.kind, list);
  }

  const sections: ReportSection[] = [];
  const kindOrder: ReportSection[] = [
    { title: "Orphaned files", description: "Videos or subtitles not in a recognized structure", issueIds: byKind.get("orphaned-file") ?? [] },
    { title: "Missing companions", description: "Video without subtitle or subtitle without video", issueIds: byKind.get("missing-companion") ?? [] },
    { title: "Duplicate files", description: "Multiple videos for the same movie/episode", issueIds: byKind.get("duplicate-file") ?? [] },
    { title: "Suspicious structure", description: "Episode not under Season XX folder", issueIds: byKind.get("suspicious-structure") ?? [] },
  ];
  for (const sec of kindOrder) {
    if (sec.issueIds.length > 0) sections.push(sec);
  }

  const issuesById: ReportData["issuesById"] = {};
  for (const i of analysis.issues) issuesById[i.id] = i;

  return {
    generatedAt: new Date().toISOString(),
    configSummary: { roots: config.roots },
    analysisStats: analysis.stats,
    sections,
    issuesById,
  };
}

export function renderMarkdownReport(data: ReportData): string {
  const lines: string[] = [
    "# Media Sentinel Report",
    "",
    `Generated: ${data.generatedAt}`,
    "",
    "## Summary",
    "",
    `- **Total issues:** ${data.analysisStats.numIssues}`,
    `- Info: ${data.analysisStats.severities.info}, Warning: ${data.analysisStats.severities.warning}, Error: ${data.analysisStats.severities.error}`,
    "",
    "## Roots",
    "",
    ...data.configSummary.roots.map((r) => `- \`${r.name}\`: ${r.path}`),
    "",
  ];

  for (const section of data.sections) {
    lines.push(`## ${section.title}`, "");
    if (section.description) lines.push(`${section.description}`, "");
    for (const id of section.issueIds) {
      const issue = data.issuesById[id];
      if (!issue) continue;
      lines.push(`- **${issue.severity}** ${issue.message}`);
      for (const loc of issue.locations) {
        lines.push(`  - \`${loc.relativePath}\``);
      }
      lines.push("");
    }
  }

  if (data.sections.length === 0) {
    lines.push("No issues found.", "");
  }

  return lines.join("\n");
}
