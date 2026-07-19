import type { RuleContext, IssueSeverity, IssueLocation } from "../../types.js";

/** File-like shape used by rules (MediaFile and index items). */
export interface FileLike {
  rootName: string;
  relativePath: string;
  absolutePath: string;
}

/** Build an issue location from any file-like object. */
export function toIssueLocation(file: FileLike): IssueLocation {
  return {
    rootName: file.rootName,
    relativePath: file.relativePath,
    absolutePath: file.absolutePath,
  };
}

/** Resolve rule severity from config or use default. */
export function getRuleSeverity(
  ctx: RuleContext,
  ruleId: string,
  defaultSeverity: IssueSeverity
): IssueSeverity {
  const entry = ctx.config.rules?.[ruleId];
  return (entry?.severity as IssueSeverity) ?? defaultSeverity;
}
