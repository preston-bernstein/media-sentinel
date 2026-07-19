import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { walk } from "../src/scanner/walk.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures", "simple-library");

describe("walk", () => {
  it("excludes by segment pattern", async () => {
    const entries: string[] = [];
    for await (const e of walk(path.join(fixtures, "movies"), {
      excludes: ["Inception (2010)"],
    })) {
      entries.push(e.relativePath);
    }
    expect(entries.some((p) => p.includes("Inception"))).toBe(false);
  });

  it("excludes by path-style pattern (segment/segment)", async () => {
    const entries: string[] = [];
    for await (const e of walk(path.join(fixtures, "tv"), {
      excludes: ["Breaking Bad/Season 01"],
    })) {
      entries.push(e.relativePath);
    }
    expect(entries.some((p) => p.includes("Season 01"))).toBe(false);
  });

  it("excludes by basename", async () => {
    const entries: string[] = [];
    for await (const e of walk(path.join(fixtures, "movies"), {
      excludes: ["Inception (2010).mkv"],
    })) {
      entries.push(e.relativePath);
    }
    expect(entries.some((p) => p.endsWith("Inception (2010).mkv"))).toBe(false);
  });

  it("respects maxDepth", async () => {
    const entries: string[] = [];
    for await (const e of walk(path.join(fixtures, "tv"), { maxDepth: 0 })) {
      entries.push(e.relativePath);
    }
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((p) => p.split("/").length <= 1)).toBe(true);
  });

  it("yields directories and files", async () => {
    let dirs = 0;
    let files = 0;
    for await (const e of walk(path.join(fixtures, "movies"))) {
      if (e.isDirectory) dirs++;
      else files++;
    }
    expect(dirs).toBeGreaterThan(0);
    expect(files).toBeGreaterThan(0);
  });

  it("skips directory when readdir fails", async () => {
    const readdirSpy = vi.spyOn(fs, "readdir").mockRejectedValueOnce(new Error("mock readdir"));
    const entries: string[] = [];
    for await (const e of walk(path.join(fixtures, "movies"))) {
      entries.push(e.relativePath);
    }
    readdirSpy.mockRestore();
    expect(entries.length).toBe(0);
  });
});
