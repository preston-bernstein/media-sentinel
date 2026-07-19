import { describe, it, expect, vi, afterEach } from "vitest";
import { createLogger } from "../src/logging.js";

describe("logging", () => {
  const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

  afterEach(() => {
    stderrWrite.mockClear();
  });

  it("quiet: only warn and error are logged", async () => {
    const logger = createLogger({
      phases: [],
      quiet: true,
      json: false,
      dryRun: false,
      verbose: false,
    });
    logger.debug("d");
    logger.info("i");
    expect(stderrWrite).not.toHaveBeenCalled();
    logger.warn("w");
    logger.error("e");
    expect(stderrWrite).toHaveBeenCalledTimes(2);
  });

  it("verbose: debug is logged", async () => {
    const logger = createLogger({
      phases: [],
      quiet: false,
      json: false,
      dryRun: false,
      verbose: true,
    });
    logger.debug("d", { foo: 1 });
    expect(stderrWrite).toHaveBeenCalled();
    const out = stderrWrite.mock.calls[0][0] as string;
    expect(out).toContain("debug");
    expect(out).toContain("foo");
  });

  it("info level: includes meta when provided", async () => {
    const logger = createLogger({
      phases: [],
      quiet: false,
      json: false,
      dryRun: false,
      verbose: true,
    });
    logger.info("msg", { count: 42 });
    const out = stderrWrite.mock.calls[0][0] as string;
    expect(JSON.parse(out).meta).toEqual({ count: 42 });
  });
});
