import type { RuleContext, Issue } from "../../types.js";
import { toIssueLocation, getRuleSeverity } from "./rule-utils.js";

export async function ruleOrphanedFiles(ctx: RuleContext): Promise<Issue[]> {
  const issues: Issue[] = [];
  const sev = getRuleSeverity(ctx, "orphaned-files", "warning");

  for (const file of ctx.index.unclassifiedVideos) {
    issues.push({
      id: `orphaned-video:${file.id}`,
      kind: "orphaned-file",
      severity: sev,
      message: `Video file not in a recognized movie/episode structure: ${file.relativePath}`,
      locations: [toIssueLocation(file)],
      details: { rootName: file.rootName },
    });
  }

  for (const file of ctx.index.unclassifiedSubtitles) {
    issues.push({
      id: `orphaned-subtitle:${file.id}`,
      kind: "orphaned-file",
      severity: sev,
      message: `Subtitle file with no matching video in structure: ${file.relativePath}`,
      locations: [toIssueLocation(file)],
      details: { rootName: file.rootName },
    });
  }

  return issues;
}
