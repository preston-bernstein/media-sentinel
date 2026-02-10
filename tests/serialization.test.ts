import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { readArtifact, writeArtifact } from "../src/serialization.js";
import type { ScanResult, AnalysisResult } from "../src/types.js";

const minimalScan: ScanResult = {
  kind: "scan",
  version: 1,
  config: { roots: [{ name: "r", path: "/r", kind: "movies" }] },
  roots: [{ name: "r", path: "/r", kind: "movies" }],
  files: [],
  stats: {
    numFiles: 0,
    numDirs: 0,
    totalBytes: 0,
    startedAt: "",
    finishedAt: "",
    durationMs: 0,
  },
};

const minimalAnalysis: AnalysisResult = {
  kind: "analysis",
  version: 1,
  sourceScan: { stats: minimalScan.stats, generatedAt: "" },
  issues: [],
  stats: { numIssues: 0, severities: { info: 0, warning: 0, error: 0 } },
};

describe("serialization", () => {
  it("writeArtifact and readArtifact round-trip scan", async () => {
    const tmp = path.join(os.tmpdir(), `ms-serial-${Date.now()}.json`);
    await writeArtifact(tmp, minimalScan);
    const read = await readArtifact(tmp);
    expect(read.kind).toBe("scan");
    await fs.rm(tmp, { force: true });
  });

  it("writeArtifact and readArtifact round-trip analysis", async () => {
    const tmp = path.join(os.tmpdir(), `ms-serial-a-${Date.now()}.json`);
    await writeArtifact(tmp, minimalAnalysis);
    const read = await readArtifact(tmp);
    expect(read.kind).toBe("analysis");
    await fs.rm(tmp, { force: true });
  });

  it("readArtifact throws on unsupported kind", async () => {
    const tmp = path.join(os.tmpdir(), `ms-serial-bad-${Date.now()}.json`);
    await fs.writeFile(tmp, JSON.stringify({ kind: "unknown" }), "utf8");
    await expect(readArtifact(tmp)).rejects.toThrow("Unsupported artifact kind");
    await fs.rm(tmp, { force: true });
  });
});
