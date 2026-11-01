const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Supabase Edge Functions run on Deno and import from URLs
    // (https://esm.sh/...), which this Node/Metro resolver can't follow. Every
    // other rule still applies to them.
    files: ["supabase/functions/**/*.ts"],
    rules: { "import/no-unresolved": "off" },
  },
]);
