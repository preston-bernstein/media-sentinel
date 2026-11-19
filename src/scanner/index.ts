import fs from "node:fs/promises";
import path from "node:path";
import { walk, type WalkEntry } from "./walk.js";
import { classifyExtension } from "./classify.js";
import { withLimit } from "./concurrency.js";
import { DEFAULT_CONCURRENCY } from "../constants.js";
import type { Config, MediaFile, MediaRootConfig, ScanResult, ScanStats } from "../types.js";
import type { Logger } from "../logging.js";

export interface ScanOptions {
  logger: Logger;
  concurrency?: number;
  maxDepth?: number;
}

interface FileStat {
  entry: WalkEntry;
  size: number;
  mtimeMs: number;
}

function toMediaFile(rootName: string, { entry, size, mtimeMs }: FileStat): MediaFile {
  const ext = path.extname(entry.name).slice(1).toLowerCase();
  return {
    id: `${rootName}:${entry.relativePath}`,
    rootName,
    relativePath: entry.relativePath,
    absolutePath: entry.fullPath,
    sizeBytes: size,
    mtimeMs,
    extension: ext,
    kind: classifyExtension(ext),
    folderSegments: entry.relativePath.replace(/\\/g, "/").split("/").slice(0, -1),
  };
}

/** Walks one root, stat-ing files under the concurrency limit. */
async function statRoot(
  config: Config,
  root: MediaRootConfig,
  options: ScanOptions,
  limiter: { concurrency: number; pending: Set<Promise<unknown>> }
): Promise<{ numDirs: number; fileResults: FileStat[] }> {
  const excludes = [...(config.globalExcludes ?? []), ...(root.excludeGlobs ?? [])];
  const fileResults: FileStat[] = [];
  let numDirs = 0;

  for await (const entry of walk(path.resolve(root.path), {
    maxDepth: options.maxDepth ?? config.maxDepth,
    excludes,
  })) {
    if (entry.isDirectory) {
      numDirs++;
      continue;
    }

    const p = withLimit(limiter.concurrency, limiter.pending, () =>
      fs.stat(entry.fullPath).then((s) => ({ entry, size: s.size, mtimeMs: s.mtimeMs }))
    );
    p.then((r) => fileResults.push(r)).catch((err: unknown) => {
      options.logger.warn("Stat failed, skipping file", { path: entry.fullPath, err });
    });
  }

  await Promise.all([...limiter.pending]);
  return { numDirs, fileResults };
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
    const rootScan = await statRoot(config, root, options, { concurrency, pending });
    numDirs += rootScan.numDirs;
    for (const stat of rootScan.fileResults) {
      totalBytes += stat.size;
      files.push(toMediaFile(root.name, stat));
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
