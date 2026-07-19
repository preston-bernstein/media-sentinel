import type { RuleContext, Issue, IssueSeverity } from "../../types.js";
import { toIssueLocation, getRuleSeverity } from "./rule-utils.js";
import type { FileLike } from "./rule-utils.js";

/** Item with key and file lists (movie or episode). Files have id for issue ids. */
interface ItemWithFiles {
  key: string;
  videoFiles: (FileLike & { id: string })[];
  subtitleFiles: (FileLike & { id: string })[];
}

const MESSAGES = {
  movie: {
    missingSub: (key: string) => `Movie has no subtitle file: ${key}`,
    subNoVideo: (key: string) => `Subtitle with no video in same movie folder: ${key}`,
  },
  episode: {
    missingSub: (key: string) => `Episode has no subtitle file: ${key}`,
    subNoVideo: (key: string) => `Subtitle with no video in same episode: ${key}`,
  },
} as const;

function pushMissingCompanionIssues(
  issues: Issue[],
  item: ItemWithFiles,
  sev: IssueSeverity,
  kind: "movie" | "episode"
): void {
  const msgs = MESSAGES[kind];
  const detailKey = kind === "movie" ? "movieKey" : "episodeKey";
  const details = { [detailKey]: item.key };

  if (item.videoFiles.length > 0 && item.subtitleFiles.length === 0) {
    const idPrefix = kind === "movie" ? "missing-sub-movie" : "missing-sub-ep";
    issues.push({
      id: `${idPrefix}:${item.videoFiles[0].id}`,
      kind: "missing-companion",
      severity: sev,
      message: msgs.missingSub(item.key),
      locations: item.videoFiles.map((x) => toIssueLocation(x)),
      details,
    });
  }
  if (item.subtitleFiles.length > 0 && item.videoFiles.length === 0) {
    const idPrefix = kind === "movie" ? "sub-no-video-movie" : "sub-no-video-ep";
    issues.push({
      id: `${idPrefix}:${item.subtitleFiles[0].id}`,
      kind: "missing-companion",
      severity: sev,
      message: msgs.subNoVideo(item.key),
      locations: item.subtitleFiles.map((x) => toIssueLocation(x)),
      details,
    });
  }
}

export async function ruleMissingCompanions(ctx: RuleContext): Promise<Issue[]> {
  const issues: Issue[] = [];
  const sev = getRuleSeverity(ctx, "missing-companions", "info");

  for (const [, movie] of ctx.index.moviesByKey) {
    pushMissingCompanionIssues(issues, movie, sev, "movie");
  }
  for (const [, ep] of ctx.index.episodesByKey) {
    pushMissingCompanionIssues(issues, ep, sev, "episode");
  }

  return issues;
}
