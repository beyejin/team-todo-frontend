import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...nextVitals,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    ".next-qa/**",
    "out/**",
    "coverage/**",
    "next-env.d.ts",
    "src/themes/generated/**",
    ".husky/_/**",
  ]),
]);
