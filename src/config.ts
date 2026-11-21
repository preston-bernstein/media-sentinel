import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { DEFAULT_CONCURRENCY } from "./constants.js";
import type { Config, MediaRootConfig } from "./types.js";

export interface LoadConfigOptions {
  path?: string;
  rootsFromCli?: string[];
  excludeGlobs?: string[];
}

async function readBaseConfig(file: string | undefined): Promise<Record<string, unknown>> {
  if (!file) return {};
  const raw = await fs.readFile(file, "utf8");
  return file.endsWith(".yaml") || file.endsWith(".yml")
    ? (parseYaml(raw) as Record<string, unknown>)
    : (JSON.parse(raw) as Record<string, unknown>);
}

function rootsFromPaths(paths: string[], rootsFromFile: MediaRootConfig[]): MediaRootConfig[] {
  return paths.map((p, i) => {
    const fromFile = rootsFromFile[i];
    return {
      name: fromFile?.name ?? `root-${i + 1}`,
      path: path.resolve(p),
      kind: fromFile?.kind ?? "other",
      namingStyle: fromFile?.namingStyle,
      episodePatterns: fromFile?.episodePatterns,
      excludeGlobs: fromFile?.excludeGlobs ?? [],
    };
  });
}

function resolveRoots(base: Record<string, unknown>, opts: LoadConfigOptions): MediaRootConfig[] {
  const rootsFromFile = Array.isArray(base.roots) ? (base.roots as MediaRootConfig[]) : [];
  if (opts.rootsFromCli && opts.rootsFromCli.length > 0) {
    return rootsFromPaths(opts.rootsFromCli, rootsFromFile);
  }
  return rootsFromFile.map((r) => ({ ...r, path: path.resolve(r.path) }));
}

export async function loadConfig(opts: LoadConfigOptions): Promise<Config> {
  const base = await readBaseConfig(opts.path);
  const roots = resolveRoots(base, opts);

  if (roots.length === 0) {
    throw new Error("No media roots configured. Use --root <path> or set roots in config.");
  }

  const globalExcludes = [
    ...(Array.isArray(base.globalExcludes) ? (base.globalExcludes as string[]) : []),
    ...(opts.excludeGlobs ?? []),
  ];

  return {
    roots,
    globalExcludes: globalExcludes.length > 0 ? globalExcludes : undefined,
    concurrency:
      typeof base.concurrency === "number" ? base.concurrency : DEFAULT_CONCURRENCY,
    maxDepth:
      typeof base.maxDepth === "number" ? base.maxDepth : undefined,
    rules: (base.rules as Config["rules"]) ?? undefined,
  };
}
