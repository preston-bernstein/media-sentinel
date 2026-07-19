import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("config", () => {
  it("loads YAML config", async () => {
    const config = await loadConfig({
      path: path.join(__dirname, "..", "config.example.yaml"),
    });
    expect(config.roots.length).toBe(3);
    expect(config.roots[0].name).toBe("movies");
    expect(config.roots[0].path).toContain("Media");
    expect(config.roots[1].name).toBe("tv");
    expect(config.roots[2].name).toBe("music");
  });

  it("throws when no roots", async () => {
    await expect(
      loadConfig({})
    ).rejects.toThrow("No media roots");
  });

  it("merges CLI roots over config", async () => {
    const config = await loadConfig({
      rootsFromCli: ["/custom/movies", "/custom/tv"],
    });
    expect(config.roots.length).toBe(2);
    expect(config.roots[0].path).toBe(path.resolve("/custom/movies"));
  });

  it("loads JSON config", async () => {
    const jsonPath = path.join(__dirname, "fixtures", "config.json");
    const config = await loadConfig({ path: jsonPath });
    expect(config.roots.length).toBe(1);
    expect(config.roots[0].name).toBe("movies");
    expect(config.concurrency).toBe(8);
    expect(config.maxDepth).toBe(10);
  });

  it("merges rootsFromCli with fromFile when both path and rootsFromCli", async () => {
    const jsonPath = path.join(__dirname, "fixtures", "config.json");
    const config = await loadConfig({
      path: jsonPath,
      rootsFromCli: ["/custom/path1", "/custom/path2"],
    });
    expect(config.roots.length).toBe(2);
    expect(config.roots[0].path).toBe(path.resolve("/custom/path1"));
    expect(config.roots[1].name).toBe("root-2");
    expect(config.roots[1].kind).toBe("other");
  });
});
