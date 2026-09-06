const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);

const resolved = withRorkMetro(config);

// Pin the empty-module path explicitly: metro-config's default require.resolve
// can land in a bun-nested copy (metro-config/node_modules/metro-runtime) that
// disappears on reinstall, leaving Metro with a dead absolute path.
resolved.resolver.emptyModulePath = require.resolve(
  "metro-runtime/src/modules/empty-module.js",
);

module.exports = resolved;
