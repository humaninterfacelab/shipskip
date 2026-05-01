import js from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".agents/**", "coverage/**", "dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "no-undef": "off",
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",
    },
  },
);
