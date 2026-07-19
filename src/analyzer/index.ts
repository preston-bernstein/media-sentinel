import { buildLogicalIndex } from "./normalization/build-index.js";
import { RULES } from "./rules/index.js";
import type {
  ScanResult,
  AnalysisResult,
  Issue,
  AnalysisStats,
  RuleContext,
} from "../types.js";
import type { Logger } from "../logging.js";

export interface AnalyzeOptions {
  logger: Logger;
}

export async function analyzeScanResult(
  scan: ScanResult,
  options: AnalyzeOptions
): Promise<AnalysisResult> {
  const index = buildLogicalIndex(scan, scan.config);
  const ctx: RuleContext = { scan, index, config: scan.config };

  const issues: Issue[] = [];
  for (const rule of RULES) {
    const enabled = scan.config.rules?.[rule.id]?.enabled !== false;
    if (!enabled) continue;
    options.logger.debug(`Running rule: ${rule.id}`);
    const result = await rule.apply(ctx);
    issues.push(...result);
  }

  const severities: AnalysisStats["severities"] = {
    info: issues.filter((i) => i.severity === "info").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    error: issues.filter((i) => i.severity === "error").length,
  };

  return {
    kind: "analysis",
    version: 1,
    sourceScan: {
      stats: scan.stats,
      generatedAt: new Date().toISOString(),
    },
    issues,
    stats: {
      numIssues: issues.length,
      severities,
    },
  };
}
