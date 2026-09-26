const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);

// expo-sqlite's web worker imports wa-sqlite.wasm. The file ships in the
// package, but Metro's default assetExts does not include `wasm`, so web
// bundling fails to resolve it and no web build is possible at all. Reached
// from AuthProvider -> services/localCleanup -> expo-sqlite, so it blocks the
// whole app rather than one screen.
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, "wasm"])];

module.exports = withRorkMetro(config);
