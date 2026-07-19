import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import { runPipeline } from "../src/run-pipeline.js";
import { writeArtifact } from "../src/serialization.js";
import type { ScanResult } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures", "simple-library");
const noopLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

const minimalScan = (roots: { name: string; path: string; kind: string }[]): ScanResult => ({
  kind: "scan",
  version: 1,
  config: { roots },
  roots,
  files: [],
  stats: { numFiles: 0, numDirs: 0, totalBytes: 0, startedAt: "", finishedAt: "", durationMs: 0 },
});

describe("pipeline", () => {
  it("runs scan → analyze → report and returns exit code 0 when no issues", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      const configPath = path.join(tmp, "config.yaml");
      await fs.writeFile(
        configPath,
        `
roots:
  - name: movies
    path: ${path.join(fixtures, "movies").replace(/\\/g, "/")}
    kind: movies
  - name: tv
    path: ${path.join(fixtures, "tv").replace(/\\/g, "/")}
    kind: tv
`,
        "utf8"
      );
      const exitCode = await runPipeline({
        phases: ["scan", "analyze", "report"],
        configPath,
        json: false,
        dryRun: true,
        verbose: false,
        quiet: true,
      });
      expect(exitCode).toBe(0);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("reads input scan artifact and skips scan phase", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      const configPath = path.join(tmp, "config.yaml");
      const scanPath = path.join(tmp, "scan.json");
      const roots = [{ name: "movies", path: path.join(fixtures, "movies"), kind: "movies" as const }];
      await fs.writeFile(configPath, `roots:\n  - name: movies\n    path: ${path.join(fixtures, "movies").replace(/\\/g, "/")}\n    kind: movies\n`, "utf8");
      await writeArtifact(scanPath, minimalScan(roots));
      const exitCode = await runPipeline({
        phases: ["analyze", "report"],
        configPath,
        inputPath: scanPath,
        json: false,
        dryRun: true,
        verbose: false,
        quiet: true,
      });
      expect(exitCode).toBe(0);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("reads input analysis artifact and runs report only", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      const configPath = path.join(tmp, "config.yaml");
      const analysisPath = path.join(tmp, "analysis.json");
      const roots = [{ name: "movies", path: "/m", kind: "movies" as const }];
      await fs.writeFile(configPath, `roots:\n  - name: movies\n    path: /m\n    kind: movies\n`, "utf8");
      await fs.writeFile(
        analysisPath,
        JSON.stringify({
          kind: "analysis",
          version: 1,
          sourceScan: { stats: minimalScan(roots).stats, generatedAt: "" },
          issues: [],
          stats: { numIssues: 0, severities: { info: 0, warning: 0, error: 0 } },
        }),
        "utf8"
      );
      const exitCode = await runPipeline({
        phases: ["report"],
        configPath,
        inputPath: analysisPath,
        json: false,
        dryRun: true,
        verbose: false,
        quiet: true,
      });
      expect(exitCode).toBe(0);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("throws when analyze requested but no scan result", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      await fs.writeFile(path.join(tmp, "c.yaml"), "roots:\n  - name: r\n    path: /r\n    kind: movies\n", "utf8");
      await expect(
        runPipeline({
          phases: ["analyze"],
          configPath: path.join(tmp, "c.yaml"),
          json: false,
          dryRun: false,
          verbose: false,
          quiet: true,
        })
      ).rejects.toThrow("no scan result");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("throws when report requested but no analysis result", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      await fs.writeFile(path.join(tmp, "c.yaml"), "roots:\n  - name: r\n    path: /r\n    kind: movies\n", "utf8");
      await expect(
        runPipeline({
          phases: ["report"],
          configPath: path.join(tmp, "c.yaml"),
          json: false,
          dryRun: false,
          verbose: false,
          quiet: true,
        })
      ).rejects.toThrow("no analysis result");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("runs apply phase and logs warn", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      await fs.writeFile(path.join(tmp, "c.yaml"), "roots:\n  - name: r\n    path: /r\n    kind: movies\n", "utf8");
      const exitCode = await runPipeline({
        phases: ["apply"],
        configPath: path.join(tmp, "c.yaml"),
        json: false,
        dryRun: false,
        verbose: false,
        quiet: true,
      });
      expect(exitCode).toBe(0);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("writes scan artifact when last phase is scan and outputPath set", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      const configPath = path.join(tmp, "config.yaml");
      const outPath = path.join(tmp, "out.json");
      await fs.writeFile(configPath, `roots:\n  - name: movies\n    path: ${path.join(fixtures, "movies").replace(/\\/g, "/")}\n    kind: movies\n`, "utf8");
      await runPipeline({
        phases: ["scan"],
        configPath,
        outputPath: outPath,
        json: false,
        dryRun: false,
        verbose: false,
        quiet: true,
      });
      const content = await fs.readFile(outPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.kind).toBe("scan");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("writes analysis artifact when last phase is analyze and outputPath set", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      const configPath = path.join(tmp, "config.yaml");
      const outPath = path.join(tmp, "out.json");
      await fs.writeFile(configPath, `roots:\n  - name: movies\n    path: ${path.join(fixtures, "movies").replace(/\\/g, "/")}\n    kind: movies\n`, "utf8");
      await runPipeline({
        phases: ["scan", "analyze"],
        configPath,
        outputPath: outPath,
        json: false,
        dryRun: false,
        verbose: false,
        quiet: true,
      });
      const content = await fs.readFile(outPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.kind).toBe("analysis");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("returns 1 when issues found", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ms-"));
    try {
      const configPath = path.join(tmp, "config.yaml");
      await fs.writeFile(
        configPath,
        `roots:\n  - name: movies\n    path: ${path.join(__dirname, "fixtures", "missing-subs", "movies").replace(/\\/g, "/")}\n    kind: movies\n`,
        "utf8"
      );
      const exitCode = await runPipeline({
        phases: ["scan", "analyze", "report"],
        configPath,
        json: false,
        dryRun: true,
        verbose: false,
        quiet: true,
      });
      expect(exitCode).toBe(1);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
