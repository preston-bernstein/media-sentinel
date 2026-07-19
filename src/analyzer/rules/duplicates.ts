import type { RuleContext, Issue } from "../../types.js";
import { toIssueLocation, getRuleSeverity } from "./rule-utils.js";

export async function ruleDuplicates(ctx: RuleContext): Promise<Issue[]> {
  const issues: Issue[] = [];
  const sev = getRuleSeverity(ctx, "duplicates", "warning");

  for (const [, movie] of ctx.index.moviesByKey) {
    if (movie.videoFiles.length <= 1) continue;
    issues.push({
      id: `duplicate-movie-video:${movie.key}`,
      kind: "duplicate-file",
      severity: sev,
      message: `Multiple video files for same movie: ${movie.key}`,
      locations: movie.videoFiles.map((x) => toIssueLocation(x)),
      details: { movieKey: movie.key, count: movie.videoFiles.length },
    });
  }

  for (const [, ep] of ctx.index.episodesByKey) {
    if (ep.videoFiles.length <= 1) continue;
    issues.push({
      id: `duplicate-ep-video:${ep.key}`,
      kind: "duplicate-file",
      severity: sev,
      message: `Multiple video files for same episode: ${ep.key}`,
      locations: ep.videoFiles.map((x) => toIssueLocation(x)),
      details: { episodeKey: ep.key, count: ep.videoFiles.length },
    });
  }

  return issues;
}
