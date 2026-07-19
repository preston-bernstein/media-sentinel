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

export async function loadConfig(opts: LoadConfigOptions): Promise<Config> {
  let base: Record<string, unknown> = {};

  if (opts.path) {
    const raw = await fs.readFile(opts.path, "utf8");
    base =
      opts.path.endsWith(".yaml") || opts.path.endsWith(".yml")
        ? (parseYaml(raw) as Record<string, unknown>)
        : (JSON.parse(raw) as Record<string, unknown>);
  }

  const rootsFromFile = Array.isArray(base.roots)
    ? (base.roots as MediaRootConfig[])
    : [];

  let roots: MediaRootConfig[];

  if (opts.rootsFromCli && opts.rootsFromCli.length > 0) {
    roots = opts.rootsFromCli.map((p, i) => {
      const resolved = path.resolve(p);
      const fromFile = rootsFromFile[i];
      return {
        name: (fromFile?.name as string) ?? `root-${i + 1}`,
        path: resolved,
        kind: (fromFile?.kind as MediaRootConfig["kind"]) ?? "other",
        namingStyle: fromFile?.namingStyle,
        episodePatterns: fromFile?.episodePatterns,
        excludeGlobs: fromFile?.excludeGlobs ?? [],
      };
    });
  } else {
    roots = rootsFromFile.map((r) => ({
      ...r,
      path: path.resolve(r.path),
    }));
  }

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
