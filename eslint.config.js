// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import perfectionist from "eslint-plugin-perfectionist"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import storybook from "eslint-plugin-storybook"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores(["dist", "storybook-static"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      tseslint.configs.recommended,
    ],
    plugins: {
      react,
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      "prefer-arrow-callback": "error",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",
    },
  },
  {
    // Node scripts (git hooks, etc.) run outside the browser, so they need Node globals
    // (process, __dirname, ...) instead of the browser globals used by the rest of the app.
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // src/foundation/ token scales are intentionally ordered by size (xs -> 4xl, 50 -> 900),
    // not alphabetically, so only enforce alphabetical prop/destructuring order for components.
    files: ["src/ds-components/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    plugins: {
      perfectionist,
    },
    rules: {
      "perfectionist/sort-object-types": [
        "error",
        {
          type: "alphabetical",
          order: "asc",
          groups: ["required-property", "optional-property"],
        },
      ],
      "perfectionist/sort-objects": [
        "error",
        {
          type: "alphabetical",
          order: "asc",
        },
      ],
    },
  },
  ...storybook.configs["flat/recommended"],
])
