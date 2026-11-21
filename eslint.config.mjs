// Typed linting for TypeScript. Pack: typescript, rules ts-typed-linting, ts-no-any, ts-no-floating-promises,
// ts-no-suppress, ts-type-imports, ts-exhaustive-switch, ts-error-handling. Needs ESLint 9.30+ (flat config),
// typescript-eslint, and a TypeScript the plugin supports. Merge into the project's existing eslint.config.mjs.
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import { defineConfig } from "eslint/config"
import globals from "globals"

export default defineConfig(
  { ignores: ["dist", "coverage", "node_modules"] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { project: ["./tsconfig.eslint.json"], tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "separate-type-imports" }],
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as", objectLiteralTypeAssertions: "never" }],
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": true,
        minimumDescriptionLength: 10,
      }],
    },
  },
  {
    // Plain JS config files are not in the TS project.
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: { ...globals.node } },
    extends: [tseslint.configs.disableTypeChecked],
  },
)
