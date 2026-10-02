import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
export default defineConfig(
  { ignores: ["dist/**", "node_modules/**", "collage-layout.prototype.html"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.jest },
    },
  },
  {
    files: ["src/**/*.tsx"],
    plugins: {
      "react-hooks": { meta: hooks.meta, rules: hooks.rules },
      "jsx-a11y": a11y,
    },
    rules: {
      ...hooks.configs.recommended.rules,
      ...a11y.configs.recommended.rules,
    },
  },
);
