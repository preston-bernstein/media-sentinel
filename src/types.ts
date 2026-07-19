/** Phase flags for the pipeline (stackable). */
export type Phase = "scan" | "analyze" | "report" | "apply";

/** Per-root media library config. */
export interface MediaRootConfig {
  name: string;
  path: string;
  kind: "movies" | "tv" | "music" | "other";
  namingStyle?: "plex-movies" | "plex-tv" | "none";
  episodePatterns?: string[];
  excludeGlobs?: string[];
}

/** Rule on/off and optional severity override. */
export interface RuleConfigEntry {
  enabled?: boolean;
  severity?: IssueSeverity;
}

export type RulesConfig = Record<string, RuleConfigEntry>;

/** Loaded and merged config. */
export interface Config {
  roots: MediaRootConfig[];
  globalExcludes?: string[];
  concurrency?: number;
  maxDepth?: number;
  rules?: RulesConfig;
}

/** Single file under a media root (serialized in ScanResult). */
export interface MediaFile {
  id: string;
  rootName: string;
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
  mtimeMs: number;
  extension: string;
  kind: "video" | "audio" | "subtitle" | "image" | "nfo" | "other";
  folderSegments: string[];
}

export interface ScanStats {
  numFiles: number;
  numDirs: number;
  totalBytes: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface ScanResult {
  kind: "scan";
  version: 1;
  config: Config;
  roots: MediaRootConfig[];
  files: MediaFile[];
  stats: ScanStats;
}

/** Severity for issues. */
export type IssueSeverity = "info" | "warning" | "error";

export type IssueKind =
  | "orphaned-file"
  | "missing-companion"
  | "duplicate-file"
  | "suspicious-structure";

export interface IssueLocation {
  rootName: string;
  relativePath: string;
  absolutePath: string;
}

export interface Issue {
  id: string;
  kind: IssueKind;
  severity: IssueSeverity;
  message: string;
  locations: IssueLocation[];
  details?: Record<string, unknown>;
}

export interface AnalysisStats {
  numIssues: number;
  severities: Record<IssueSeverity, number>;
}

export interface AnalysisResult {
  kind: "analysis";
  version: 1;
  sourceScan: { stats: ScanStats; generatedAt: string };
  issues: Issue[];
  stats: AnalysisStats;
}

/** Logical media item (movies) — used only inside analyze, not serialized. */
export interface MovieItem {
  key: string;
  title: string;
  year?: number;
  rootName: string;
  relativeDir: string;
  videoFiles: MediaFile[];
  subtitleFiles: MediaFile[];
  nfoFiles: MediaFile[];
  otherFiles: MediaFile[];
}

/** Logical media item (episodes) — used only inside analyze, not serialized. */
export interface EpisodeItem {
  key: string;
  seriesTitle: string;
  seriesKey: string;
  seasonNumber: number;
  episodeNumber: number;
  rootName: string;
  relativeDir: string;
  videoFiles: MediaFile[];
  subtitleFiles: MediaFile[];
  nfoFiles: MediaFile[];
  otherFiles: MediaFile[];
}

/** Index built during analyze for rules to use. */
export interface LogicalIndex {
  moviesByKey: Map<string, MovieItem>;
  episodesByKey: Map<string, EpisodeItem>;
  unclassifiedVideos: MediaFile[];
  unclassifiedSubtitles: MediaFile[];
}

/** Context passed to each rule. */
export interface RuleContext {
  scan: ScanResult;
  index: LogicalIndex;
  config: Config;
}

export interface Rule {
  id: string;
  description: string;
  defaultSeverity: IssueSeverity;
  apply(ctx: RuleContext): Promise<Issue[]> | Issue[];
}

/** Report view model for markdown/JSON output. */
export interface ReportSection {
  title: string;
  description?: string;
  issueIds: string[];
}

export interface ReportData {
  generatedAt: string;
  configSummary: { roots: MediaRootConfig[] };
  analysisStats: AnalysisStats;
  sections: ReportSection[];
  issuesById: Record<string, Issue>;
}

/** Options for the pipeline orchestrator. */
export interface PipelineOptions {
  phases: Phase[];
  configPath?: string;
  rootsFromCli?: string[];
  excludeGlobs?: string[];
  inputPath?: string;
  outputPath?: string;
  json: boolean;
  dryRun: boolean;
  verbose: boolean;
  quiet: boolean;
  concurrency?: number;
  maxDepth?: number;
}
