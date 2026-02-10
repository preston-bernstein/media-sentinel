import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/types.ts", "src/index.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 93,
        statements: 100,
      },
    },
  },
});
