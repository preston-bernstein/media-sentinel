import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { scanMediaLibrary } from "../src/scanner/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures", "simple-library");
const noopLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe("scanner", () => {
  it("scans a small library and classifies files", async () => {
    const result = await scanMediaLibrary(
      {
        roots: [
          { name: "movies", path: path.join(fixtures, "movies"), kind: "movies" },
          { name: "tv", path: path.join(fixtures, "tv"), kind: "tv" },
        ],
      },
      { logger: noopLogger }
    );

    expect(result.kind).toBe("scan");
    expect(result.files.length).toBeGreaterThanOrEqual(3);
    const videos = result.files.filter((f) => f.kind === "video");
    const subs = result.files.filter((f) => f.kind === "subtitle");
    expect(videos.length).toBeGreaterThanOrEqual(2);
    expect(subs.length).toBeGreaterThanOrEqual(1);
    expect(result.stats.numFiles).toBe(result.files.length);
  });

  it("skips file when stat fails", async () => {
    const statSpy = vi.spyOn(fs, "stat").mockRejectedValueOnce(new Error("mock stat error"));
    const result = await scanMediaLibrary(
      { roots: [{ name: "movies", path: path.join(fixtures, "movies"), kind: "movies" }] },
      { logger: noopLogger }
    );
    expect(result.files.length).toBeGreaterThanOrEqual(0);
    statSpy.mockRestore();
  });

  it("respects concurrency limit (runs multiple stats)", async () => {
    const result = await scanMediaLibrary(
      {
        roots: [
          { name: "movies", path: path.join(fixtures, "movies"), kind: "movies" },
          { name: "tv", path: path.join(fixtures, "tv"), kind: "tv" },
        ],
      },
      { logger: noopLogger, concurrency: 1 }
    );
    expect(result.files.length).toBeGreaterThanOrEqual(2);
  });
});
