import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanMediaLibrary } from "../src/scanner/index.js";
import { analyzeScanResult } from "../src/analyzer/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures", "simple-library");
const missingSubs = path.join(__dirname, "fixtures", "missing-subs");

const noopLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe("analyzer", () => {
  it("builds logical index and finds missing-companion when movie has no subtitle", async () => {
    const scan = await scanMediaLibrary(
      {
        roots: [
          { name: "movies", path: path.join(missingSubs, "movies"), kind: "movies" },
        ],
      },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });

    expect(analysis.kind).toBe("analysis");
    const missing = analysis.issues.filter((i) => i.kind === "missing-companion");
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(analysis.stats.numIssues).toBeGreaterThanOrEqual(1);
  });

  it("finds no issues in a well-formed simple library", async () => {
    const scan = await scanMediaLibrary(
      {
        roots: [
          { name: "movies", path: path.join(fixtures, "movies"), kind: "movies" },
          { name: "tv", path: path.join(fixtures, "tv"), kind: "tv" },
        ],
      },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });

    expect(analysis.issues.length).toBe(0);
    expect(analysis.stats.numIssues).toBe(0);
  });

  it("finds orphaned-file issues for unclassified videos and subtitles", async () => {
    const orphansPath = path.join(__dirname, "fixtures", "orphans", "tv");
    const scan = await scanMediaLibrary(
      { roots: [{ name: "tv", path: orphansPath, kind: "tv" }] },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const orphaned = analysis.issues.filter((i) => i.kind === "orphaned-file");
    expect(orphaned.length).toBeGreaterThanOrEqual(2);
  });

  it("finds orphaned video in movies root when file does not match Title (Year)", async () => {
    const orphansMovies = path.join(__dirname, "fixtures", "orphans", "movies");
    const scan = await scanMediaLibrary(
      { roots: [{ name: "movies", path: orphansMovies, kind: "movies" }] },
      { logger: noopLogger }
    );
    const analysis = await analyzeScanResult(scan, { logger: noopLogger });
    const orphaned = analysis.issues.filter((i) => i.kind === "orphaned-file");
    expect(orphaned.length).toBeGreaterThanOrEqual(1);
  });
});
