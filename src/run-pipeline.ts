import { loadConfig } from "./config.js";
import { createLogger } from "./logging.js";
import { readArtifact, writeArtifact } from "./serialization.js";
import { scanMediaLibrary } from "./scanner/index.js";
import { analyzeScanResult } from "./analyzer/index.js";
import { runReport } from "./reporter/index.js";
import { EXIT_OK, EXIT_ISSUES_FOUND } from "./constants.js";
import type { Logger } from "./logging.js";
import type {
  Config,
  PipelineOptions,
  ScanResult,
  AnalysisResult,
} from "./types.js";

interface PipelineState {
  scanResult?: ScanResult;
  analysisResult?: AnalysisResult;
}

async function seedFromInput(inputPath: string, state: PipelineState): Promise<void> {
  const artifact = await readArtifact(inputPath);
  if (artifact.kind === "scan") {
    state.scanResult = artifact;
  } else {
    state.analysisResult = artifact;
  }
}

async function runScanPhase(
  config: Config,
  options: PipelineOptions,
  logger: Logger,
  state: PipelineState
): Promise<void> {
  logger.info("Running scan phase...");
  state.scanResult = await scanMediaLibrary(config, {
    logger,
    concurrency: options.concurrency,
    maxDepth: options.maxDepth,
  });
  logger.info("Scan complete", { fileCount: state.scanResult.files.length });
}

async function runAnalyzePhase(logger: Logger, state: PipelineState): Promise<void> {
  if (!state.scanResult) {
    throw new Error(
      "Analyze phase requested but no scan result. Use --scan or --input <scan.json>."
    );
  }
  logger.info("Running analyze phase...");
  state.analysisResult = await analyzeScanResult(state.scanResult, { logger });
  logger.info("Analyze complete", { issueCount: state.analysisResult.stats.numIssues });
}

async function runReportPhase(
  config: Config,
  options: PipelineOptions,
  logger: Logger,
  state: PipelineState
): Promise<void> {
  if (!state.analysisResult) {
    throw new Error(
      "Report phase requested but no analysis result. Use --analyze or --input <analysis.json>."
    );
  }
  logger.info("Running report phase...");
  await runReport(state.analysisResult, config, {
    logger,
    json: options.json,
    outputPath: options.outputPath,
    dryRun: options.dryRun,
  });
  logger.info("Report complete");
}

/** Writes the last phase's artifact when an output path is set (report writes its own file). */
async function writeLastArtifact(options: PipelineOptions, state: PipelineState): Promise<void> {
  const lastPhase = options.phases[options.phases.length - 1];
  if (!options.outputPath || lastPhase === "report") return;
  if (lastPhase === "scan" && state.scanResult) {
    await writeArtifact(options.outputPath, state.scanResult);
  } else if (lastPhase === "analyze" && state.analysisResult) {
    await writeArtifact(options.outputPath, state.analysisResult);
  }
}

/**
 * Runs the media-sentinel pipeline: load config, then execute requested
 * phases (scan → analyze → report, optionally apply). Supports resuming
 * from --input artifact and writing --output for the last phase.
 * @returns Exit code: EXIT_OK (0) no issues, EXIT_ISSUES_FOUND (1) issues found, EXIT_RUNTIME_ERROR (3) on error
 */
export async function runPipeline(options: PipelineOptions): Promise<number> {
  const logger = createLogger(options);

  logger.info("Starting media-sentinel pipeline", { phases: options.phases });

  const config = await loadConfig({
    path: options.configPath,
    rootsFromCli: options.rootsFromCli,
    excludeGlobs: options.excludeGlobs,
  });

  const state: PipelineState = {};

  // Optional: seed from a previous run’s artifact
  if (options.inputPath) await seedFromInput(options.inputPath, state);

  if (options.phases.includes("scan")) await runScanPhase(config, options, logger, state);
  if (options.phases.includes("analyze")) await runAnalyzePhase(logger, state);
  if (options.phases.includes("report")) await runReportPhase(config, options, logger, state);

  // Apply is a stub
  if (options.phases.includes("apply")) {
    logger.warn("Apply phase is not implemented. No changes were made.");
  }

  await writeLastArtifact(options, state);

  if (state.analysisResult && state.analysisResult.stats.numIssues > 0) {
    return EXIT_ISSUES_FOUND;
  }
  return EXIT_OK;
}
