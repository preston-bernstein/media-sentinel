import { loadConfig } from "./config.js";
import { createLogger } from "./logging.js";
import { readArtifact, writeArtifact } from "./serialization.js";
import { scanMediaLibrary } from "./scanner/index.js";
import { analyzeScanResult } from "./analyzer/index.js";
import { runReport } from "./reporter/index.js";
import { EXIT_OK, EXIT_ISSUES_FOUND } from "./constants.js";
import type {
  PipelineOptions,
  ScanResult,
  AnalysisResult,
} from "./types.js";

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

  let scanResult: ScanResult | undefined;
  let analysisResult: AnalysisResult | undefined;

  // Optional: seed from a previous run’s artifact
  if (options.inputPath) {
    const artifact = await readArtifact(options.inputPath);
    if (artifact.kind === "scan") {
      scanResult = artifact;
    } else {
      analysisResult = artifact;
    }
  }

  // --- Phase: scan
  if (options.phases.includes("scan")) {
    logger.info("Running scan phase...");
    scanResult = await scanMediaLibrary(config, {
      logger,
      concurrency: options.concurrency,
      maxDepth: options.maxDepth,
    });
    logger.info("Scan complete", { fileCount: scanResult.files.length });
  }

  // --- Phase: analyze
  if (options.phases.includes("analyze")) {
    if (!scanResult) {
      throw new Error(
        "Analyze phase requested but no scan result. Use --scan or --input <scan.json>."
      );
    }
    logger.info("Running analyze phase...");
    analysisResult = await analyzeScanResult(scanResult, { logger });
    logger.info("Analyze complete", { issueCount: analysisResult.stats.numIssues });
  }

  // --- Phase: report
  if (options.phases.includes("report")) {
    if (!analysisResult) {
      throw new Error(
        "Report phase requested but no analysis result. Use --analyze or --input <analysis.json>."
      );
    }
    logger.info("Running report phase...");
    await runReport(analysisResult, config, {
      logger,
      json: options.json,
      outputPath: options.outputPath,
      dryRun: options.dryRun,
    });
    logger.info("Report complete");
  }

  // --- Phase: apply (stub)
  if (options.phases.includes("apply")) {
    logger.warn("Apply phase is not implemented. No changes were made.");
  }

  // Write last phase’s artifact when output path is set (report writes its own file)
  const lastPhase = options.phases[options.phases.length - 1];
  if (options.outputPath && lastPhase !== "report") {
    if (lastPhase === "scan" && scanResult) {
      await writeArtifact(options.outputPath, scanResult);
    } else if (lastPhase === "analyze" && analysisResult) {
      await writeArtifact(options.outputPath, analysisResult);
    }
  }

  if (analysisResult && analysisResult.stats.numIssues > 0) {
    return EXIT_ISSUES_FOUND;
  }
  return EXIT_OK;
}
