const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build imports `wa-sqlite.wasm`; SDK 57's default config
// lists `wasm` in neither assetExts nor sourceExts, so Metro's resolver
// rejects the import (UnableToResolveError → HTTP 500 web bundle).
config.resolver.assetExts.push("wasm");

module.exports = withRorkMetro(config);
