import fs from "node:fs/promises";
import { buildReportData, renderMarkdownReport } from "./markdown.js";
import { renderJsonReport } from "./json.js";
import type { AnalysisResult, Config } from "../types.js";
import type { Logger } from "../logging.js";

export interface ReportOptions {
  logger: Logger;
  json: boolean;
  outputPath?: string;
  dryRun: boolean;
}

export async function runReport(
  analysis: AnalysisResult,
  config: Config,
  options: ReportOptions
): Promise<void> {
  const data = buildReportData(analysis, config);
  const out = options.json ? renderJsonReport(data) : renderMarkdownReport(data);
  if (options.outputPath && !options.dryRun) {
    await fs.writeFile(options.outputPath, out, "utf8");
  } else {
    process.stdout.write(out + "\n");
  }
}
