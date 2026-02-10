import fs from "node:fs/promises";
import path from "node:path";
import { walk, type WalkEntry } from "./walk.js";
import { classifyExtension } from "./classify.js";
import { withLimit } from "./concurrency.js";
import { DEFAULT_CONCURRENCY } from "../constants.js";
import type { Config, MediaFile, ScanResult, ScanStats } from "../types.js";
import type { Logger } from "../logging.js";

export interface ScanOptions {
  logger: Logger;
  concurrency?: number;
  maxDepth?: number;
}

export async function scanMediaLibrary(
  config: Config,
  options: ScanOptions
): Promise<ScanResult> {
  const startedAt = new Date();
  const files: MediaFile[] = [];
  let numDirs = 0;
  let totalBytes = 0;
  const concurrency = Math.max(1, options.concurrency ?? config.concurrency ?? DEFAULT_CONCURRENCY);
  const pending = new Set<Promise<unknown>>();

  for (const root of config.roots) {
    const rootPath = path.resolve(root.path);
    const excludes = [
      ...(config.globalExcludes ?? []),
      ...(root.excludeGlobs ?? []),
    ];

    const fileResults: { entry: WalkEntry; size: number; mtimeMs: number }[] = [];

    for await (const entry of walk(rootPath, {
      maxDepth: options.maxDepth ?? config.maxDepth,
      excludes,
    })) {
      if (entry.isDirectory) {
        numDirs++;
        continue;
      }

      const p = withLimit(concurrency, pending, () =>
        fs.stat(entry.fullPath).then((s) => ({ entry, size: s.size, mtimeMs: s.mtimeMs }))
      );
      p.then((r) => fileResults.push(r)).catch((err) => {
        options.logger.warn("Stat failed, skipping file", { path: entry.fullPath, err });
      });
    }

    await Promise.all([...pending]);

    for (const { entry, size, mtimeMs } of fileResults) {
      totalBytes += size;
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      const folderSegments = entry.relativePath
        .replace(/\\/g, "/")
        .split("/")
        .slice(0, -1);

      files.push({
        id: `${root.name}:${entry.relativePath}`,
        rootName: root.name,
        relativePath: entry.relativePath,
        absolutePath: entry.fullPath,
        sizeBytes: size,
        mtimeMs,
        extension: ext,
        kind: classifyExtension(ext),
        folderSegments,
      });
    }
  }

  const finishedAt = new Date();
  const stats: ScanStats = {
    numFiles: files.length,
    numDirs,
    totalBytes,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  };

  return {
    kind: "scan",
    version: 1,
    config,
    roots: config.roots,
    files,
    stats,
  };
}
