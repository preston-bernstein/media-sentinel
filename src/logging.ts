import type { PipelineOptions } from "./types.js";

const LEVELS = ["debug", "info", "warn", "error"] as const;

export function createLogger(options: PipelineOptions) {
  const level = options.quiet ? "warn" : options.verbose ? "debug" : "info";

  function shouldLog(requested: string): boolean {
    return LEVELS.indexOf(requested as (typeof LEVELS)[number]) >= LEVELS.indexOf(level);
  }

  function log(lvl: string, msg: string, meta?: unknown) {
    if (!shouldLog(lvl)) return;
    const line =
      JSON.stringify({
        level: lvl,
        msg,
        ...(meta !== undefined && { meta }),
        time: new Date().toISOString(),
      }) + "\n";
    process.stderr.write(line);
  }

  return {
    debug: (m: string, meta?: unknown) => log("debug", m, meta),
    info: (m: string, meta?: unknown) => log("info", m, meta),
    warn: (m: string, meta?: unknown) => log("warn", m, meta),
    error: (m: string, meta?: unknown) => log("error", m, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
