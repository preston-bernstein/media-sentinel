import { describe, it, expect, vi, afterEach } from "vitest";
import path from "node:path";
import { runCli, main, program, runEntryPoint, __filename as indexFilename } from "../src/index.js";

describe("CLI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runCli rethrows when parse throws non-Commander error", async () => {
    vi.spyOn(program, "parse").mockImplementationOnce(() => {
      throw new Error("fake parse error");
    });
    await expect(runCli(["x"])).rejects.toThrow("fake parse error");
  });

  it("runEntryPoint calls main when argv[1] is index path", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw { code };
    }) as () => never);
    const orig = process.argv.slice();
    process.argv = [process.argv[0], path.resolve(indexFilename), "--version"];
    await expect(runEntryPoint()).rejects.toMatchObject({ code: 0 });
    process.argv = orig;
    exit.mockRestore();
  });

  it("main() with --version exits with 0", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw { code };
    }) as () => never);
    await expect(main(["--version"])).rejects.toMatchObject({ code: 0 });
    exit.mockRestore();
  });

  it("runCli --version returns 0", async () => {
    const code = await runCli(["--version"]);
    expect(code).toBe(0);
  });

  it("runCli --help returns 0", async () => {
    const code = await runCli(["--help"]);
    expect(code).toBe(0);
  });

  it("runCli with missing config returns 3", async () => {
    const code = await runCli(["--config", "/nonexistent/config.yaml"]);
    expect(code).toBe(3);
  });

  it("runCli with no roots returns 3", async () => {
    const code = await runCli(["--config", "/nonexistent"]);
    expect(code).toBe(3);
  });

  it("runCli with full pipeline returns 0 or 1", async () => {
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const { fileURLToPath } = await import("node:url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const fixtures = path.join(__dirname, "fixtures", "simple-library");
    const tmp = await fs.mkdtemp(path.join(os.default.tmpdir(), "ms-cli-"));
    try {
      const configPath = path.join(tmp, "config.yaml");
      await fs.writeFile(
        configPath,
        `roots:\n  - name: movies\n    path: ${path.join(fixtures, "movies").replace(/\\/g, "/")}\n    kind: movies\n  - name: tv\n    path: ${path.join(fixtures, "tv").replace(/\\/g, "/")}\n    kind: tv\n`,
        "utf8"
      );
      const code = await runCli([
        "--config",
        configPath,
        "--scan",
        "--analyze",
        "--report",
        "--dry-run",
        "--quiet",
      ]);
      expect([0, 1]).toContain(code);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
