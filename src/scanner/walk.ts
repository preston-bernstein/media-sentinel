import fs from "node:fs/promises";
import path from "node:path";

export interface WalkEntry {
  fullPath: string;
  relativePath: string;
  name: string;
  isDirectory: boolean;
  depth: number;
}

export interface WalkOptions {
  maxDepth?: number;
  excludes?: string[];
}

/**
 * Returns true if relativePath (forward slashes) is excluded by any pattern.
 * Patterns: glob-style segment (path contains segment) or basename-only (name matches).
 */
function isExcluded(relativePath: string, excludes: string[]): boolean {
  if (excludes.length === 0) return false;
  const normalized = relativePath.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);

  for (const pattern of excludes) {
    const p = pattern.replace(/\\/g, "/").replace(/^\*\*\/?/, "").replace(/\/\*\*$/, "");
    if (!p) continue;
    if (p.includes("/")) {
      const needSegments = p.split("/").filter(Boolean);
      for (let i = 0; i <= segments.length - needSegments.length; i++) {
        if (needSegments.every((s, j) => segments[i + j] === s)) return true;
      }
    } else {
      if (segments[segments.length - 1] === p) return true;
      if (segments.includes(p)) return true;
    }
  }
  return false;
}

export async function* walk(
  rootDir: string,
  options: WalkOptions = {}
): AsyncGenerator<WalkEntry> {
  const { maxDepth = Infinity, excludes = [] } = options;
  const resolvedRoot = path.resolve(rootDir);

  async function* visit(
    dir: string,
    relativeDir: string,
    depth: number
  ): AsyncGenerator<WalkEntry> {
    if (depth > maxDepth) return;

    let entries: { name: string; isDirectory: boolean }[];
    try {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      entries = dirents.map((d) => ({ name: d.name, isDirectory: d.isDirectory() }));
    } catch (err) {
      return;
    }

    for (const { name, isDirectory } of entries) {
      const fullPath = path.join(dir, name);
      const relPath = relativeDir ? `${relativeDir}/${name}` : name;

      if (isExcluded(relPath, excludes)) continue;

      yield { fullPath, relativePath: relPath, name, isDirectory, depth };

      if (isDirectory) {
        yield* visit(fullPath, relPath, depth + 1);
      }
    }
  }

  yield* visit(resolvedRoot, "", 0);
}
