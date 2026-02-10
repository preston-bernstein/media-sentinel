import { describe, it, expect, vi, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { buildReportData, renderMarkdownReport } from "../src/reporter/markdown.js";
import { renderJsonReport } from "../src/reporter/json.js";
import { runReport } from "../src/reporter/index.js";
import type { AnalysisResult, Config } from "../src/types.js";

const sampleAnalysis: AnalysisResult = {
  kind: "analysis",
  version: 1,
  sourceScan: {
    stats: { numFiles: 10, numDirs: 5, totalBytes: 1000, startedAt: "", finishedAt: "", durationMs: 100 },
    generatedAt: new Date().toISOString(),
  },
  issues: [
    {
      id: "test-1",
      kind: "orphaned-file",
      severity: "warning",
      message: "Orphaned video",
      locations: [{ rootName: "movies", relativePath: "x.mkv", absolutePath: "/a/x.mkv" }],
    },
  ],
  stats: { numIssues: 1, severities: { info: 0, warning: 1, error: 0 } },
};

const sampleConfig: Config = {
  roots: [{ name: "movies", path: "/media/movies", kind: "movies" }],
};

const noopLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe("reporter", () => {
  it("buildReportData groups issues by kind", () => {
    const data = buildReportData(sampleAnalysis, sampleConfig);
    expect(data.analysisStats.numIssues).toBe(1);
    expect(data.sections.length).toBeGreaterThanOrEqual(1);
    expect(data.issuesById["test-1"]).toBeDefined();
  });

  it("renderMarkdownReport produces markdown", () => {
    const data = buildReportData(sampleAnalysis, sampleConfig);
    const md = renderMarkdownReport(data);
    expect(md).toContain("# Media Sentinel Report");
    expect(md).toContain("Orphaned");
    expect(md).toContain("x.mkv");
  });

  it("renderJsonReport produces valid JSON", () => {
    const data = buildReportData(sampleAnalysis, sampleConfig);
    const json = renderJsonReport(data);
    const parsed = JSON.parse(json);
    expect(parsed.analysisStats.numIssues).toBe(1);
    expect(Array.isArray(parsed.issues)).toBe(true);
  });

  it("runReport writes JSON to file when json and outputPath and !dryRun", async () => {
    const tmp = path.join(os.tmpdir(), `ms-report-json-${Date.now()}.json`);
    await runReport(sampleAnalysis, sampleConfig, {
      logger: noopLogger,
      json: true,
      outputPath: tmp,
      dryRun: false,
    });
    const content = await fs.readFile(tmp, "utf8");
    expect(JSON.parse(content).analysisStats.numIssues).toBe(1);
    await fs.rm(tmp, { force: true });
  });

  it("runReport writes JSON to stdout when json and dryRun", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await runReport(sampleAnalysis, sampleConfig, {
        logger: noopLogger,
        json: true,
        dryRun: true,
      });
      expect(write).toHaveBeenCalled();
      const out = write.mock.calls[0][0] as string;
      expect(JSON.parse(out).analysisStats.numIssues).toBe(1);
    } finally {
      write.mockRestore();
    }
  });

  it("runReport writes markdown to file when !json and outputPath and !dryRun", async () => {
    const tmp = path.join(os.tmpdir(), `ms-report-md-${Date.now()}.md`);
    await runReport(sampleAnalysis, sampleConfig, {
      logger: noopLogger,
      json: false,
      outputPath: tmp,
      dryRun: false,
    });
    const content = await fs.readFile(tmp, "utf8");
    expect(content).toContain("# Media Sentinel Report");
    await fs.rm(tmp, { force: true });
  });
});
