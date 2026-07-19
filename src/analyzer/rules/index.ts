import type { Rule } from "../../types.js";
import { ruleOrphanedFiles } from "./orphaned-files.js";
import { ruleMissingCompanions } from "./missing-companions.js";
import { ruleDuplicates } from "./duplicates.js";
import { ruleSuspiciousStructure } from "./structure.js";

export const RULES: Rule[] = [
  {
    id: "orphaned-files",
    description: "Videos or subtitles not in a recognized movie/episode structure",
    defaultSeverity: "warning",
    apply: ruleOrphanedFiles,
  },
  {
    id: "missing-companions",
    description: "Video without subtitle or subtitle without video",
    defaultSeverity: "info",
    apply: ruleMissingCompanions,
  },
  {
    id: "duplicates",
    description: "Multiple video files for the same movie or episode",
    defaultSeverity: "warning",
    apply: ruleDuplicates,
  },
  {
    id: "suspicious-structure",
    description: "Episode not under a Season XX folder",
    defaultSeverity: "info",
    apply: ruleSuspiciousStructure,
  },
];
