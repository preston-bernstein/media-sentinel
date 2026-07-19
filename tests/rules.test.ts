import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanMediaLibrary } from "../src/scanner/index.js";
import { analyzeScanResult } from "../src/analyzer/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const noopLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe("rules", () => {
  it("duplicates: flags multiple videos for same movie", async () => {
    const moviesPath = path.join(__dirname, "fixtures", "duplicates-movie");
    const scan = await scanMediaLibrary(
      { roots: [{ name: "movies", path: moviesPath, kind: "movies" }] },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const dup = analysis.issues.filter((i) => i.kind === "duplicate-file");
    expect(dup.length).toBeGreaterThanOrEqual(1);
  });

  it("suspicious-structure: flags episode not under Season folder", async () => {
    const tvPath = path.join(__dirname, "fixtures", "bad-structure");
    const scan = await scanMediaLibrary(
      { roots: [{ name: "tv", path: tvPath, kind: "tv" }] },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const structure = analysis.issues.filter((i) => i.kind === "suspicious-structure");
    expect(structure.length).toBeGreaterThanOrEqual(1);
  });

  it("respects rules.enabled false", async () => {
    const missingPath = path.join(__dirname, "fixtures", "missing-subs", "movies");
    const scan = await scanMediaLibrary(
      {
        roots: [{ name: "movies", path: missingPath, kind: "movies" }],
        rules: { "missing-companions": { enabled: false } },
      },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const missing = analysis.issues.filter((i) => i.kind === "missing-companion");
    expect(missing.length).toBe(0);
  });

  it("respects rules severity override", async () => {
    const missingPath = path.join(__dirname, "fixtures", "missing-subs", "movies");
    const scan = await scanMediaLibrary(
      {
        roots: [{ name: "movies", path: missingPath, kind: "movies" }],
        rules: { "missing-companions": { severity: "error" } },
      },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const missing = analysis.issues.find((i) => i.kind === "missing-companion");
    expect(missing?.severity).toBe("error");
  });

  it("missing-companions: subtitle with no video (movie)", async () => {
    const path = await import("node:path");
    const subOnly = path.join(__dirname, "fixtures", "sub-only-movie");
    const scan = await scanMediaLibrary(
      { roots: [{ name: "movies", path: subOnly, kind: "movies" }] },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const subNoVideo = analysis.issues.filter(
      (i) => i.kind === "missing-companion" && i.message.includes("Subtitle with no video")
    );
    expect(subNoVideo.length).toBeGreaterThanOrEqual(1);
  });

  it("missing-companions: subtitle with no video (episode)", async () => {
    const path = await import("node:path");
    const subOnlyEp = path.join(__dirname, "fixtures", "sub-only-ep");
    const scan = await scanMediaLibrary(
      { roots: [{ name: "tv", path: subOnlyEp, kind: "tv" }] },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const subNoVideo = analysis.issues.filter(
      (i) => i.kind === "missing-companion" && i.message.includes("Subtitle with no video in same episode")
    );
    expect(subNoVideo.length).toBeGreaterThanOrEqual(1);
  });

  it("duplicates: multiple videos for same episode", async () => {
    const path = await import("node:path");
    const dupEp = path.join(__dirname, "fixtures", "duplicates-ep");
    const scan = await scanMediaLibrary(
      { roots: [{ name: "tv", path: dupEp, kind: "tv" }] },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const dup = analysis.issues.filter(
      (i) => i.kind === "duplicate-file" && i.details?.episodeKey
    );
    expect(dup.length).toBeGreaterThanOrEqual(1);
  });
});
