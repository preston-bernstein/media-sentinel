import type { RuleContext, Issue } from "../../types.js";
import { toIssueLocation, getRuleSeverity } from "./rule-utils.js";

/** Plex expects TV: Show Name/Season XX/... */
const SEASON_FOLDER_REGEX = /^Season\s*\d+/i;

export async function ruleSuspiciousStructure(ctx: RuleContext): Promise<Issue[]> {
  const issues: Issue[] = [];
  const sev = getRuleSeverity(ctx, "suspicious-structure", "info");

  for (const [, ep] of ctx.index.episodesByKey) {
    const pathSegments = ep.relativeDir.replace(/\\/g, "/").split("/");
    const hasSeasonFolder = pathSegments.some((s) => SEASON_FOLDER_REGEX.test(s));
    if (!hasSeasonFolder && pathSegments.length >= 1) {
      const firstVideo = ep.videoFiles[0];
      if (firstVideo) {
        issues.push({
          id: `structure-no-season-folder:${ep.key}`,
          kind: "suspicious-structure",
          severity: sev,
          message: `Episode not under a "Season XX" folder: ${ep.key}`,
          locations: ep.videoFiles.map((x) => toIssueLocation(x)),
          details: { episodeKey: ep.key, relativeDir: ep.relativeDir },
        });
      }
    }
  }

  return issues;
}
