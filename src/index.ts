#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { runPipeline } from "./run-pipeline.js";
import { EXIT_RUNTIME_ERROR } from "./constants.js";
import type { Phase } from "./types.js";

export const __filename = fileURLToPath(import.meta.url);

export const program = new Command();

program
  .name("media-sentinel")
  .description("Media library integrity checker for Synology NAS (Plex-oriented)")
  .option("--root <path...>", "Media root folder(s)")
  .option("--config <file>", "Config file (JSON or YAML)")
  .option("--exclude <glob...>", "Extra exclude patterns")
  .option("--scan", "Run scan phase")
  .option("--analyze", "Run analyze phase")
  .option("--report", "Run report phase")
  .option("--apply", "Run apply phase (not implemented)")
  .option("--input <file>", "Input artifact (scan or analysis JSON)")
  .option("--output <file>", "Output artifact or report file")
  .option("--json", "Emit JSON for last phase")
  .option("--dry-run", "Do not write files")
  .option("--verbose", "Verbose logging")
  .option("--quiet", "Minimal logging")
  .option("--concurrency <n>", "Max concurrent fs operations", (v) => parseInt(v, 10))
  .option("--max-depth <n>", "Max directory depth", (v) => parseInt(v, 10))
  .version("0.1.0")
  .exitOverride((err) => {
    throw err;
  });

/**
 * Parse argv and run the pipeline. Returns exit code (EXIT_OK, EXIT_ISSUES_FOUND, EXIT_RUNTIME_ERROR, or Commander's 2 for usage).
 * Exported for tests.
 */
export async function runCli(argv: string[]): Promise<number> {
  try {
    program.parse(argv, { from: "user" });
  } catch (err: unknown) {
    const exitErr = err as { exitCode?: number };
    if (typeof exitErr?.exitCode === "number") return exitErr.exitCode;
    throw err;
  }

  const opts = program.opts();

  const phases: Phase[] = [];
  if (opts.scan) phases.push("scan");
  if (opts.analyze) phases.push("analyze");
  if (opts.report) phases.push("report");
  if (opts.apply) phases.push("apply");

  const chosenPhases: Phase[] =
    phases.length === 0 ? (["scan", "analyze", "report"] as Phase[]) : phases;

  try {
    const exitCode = await runPipeline({
      phases: chosenPhases,
      configPath: opts.config,
      rootsFromCli: opts.root,
      excludeGlobs: opts.exclude,
      inputPath: opts.input,
      outputPath: opts.output,
      json: Boolean(opts.json),
      dryRun: Boolean(opts.dryRun),
      verbose: Boolean(opts.verbose),
      quiet: Boolean(opts.quiet),
      concurrency: opts.concurrency,
      maxDepth: opts.maxDepth,
    });
    return exitCode;
  } catch (err: unknown) {
    const exitErr = err as { exitCode?: number };
    if (typeof exitErr?.exitCode === "number") return exitErr.exitCode;
    console.error("[media-sentinel] Fatal error:", err);
    return EXIT_RUNTIME_ERROR;
  }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<never> {
  const code = await runCli(argv);
  process.exit(code);
}

export async function runEntryPoint(): Promise<void> {
  if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    await main();
  }
}

runEntryPoint();
