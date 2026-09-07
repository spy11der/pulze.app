const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);

// Watchman must be selected explicitly at the app level: when Metro starts
// before the watchman daemon is ready, the capability check fails silently
// and Metro falls back to Node's fs.watch (FallbackWatcher), which exhausts
// inotify on node_modules and crash-loops with EINVAL/ENOSPC.
// (App-level so it survives node_modules reinstalls; withRorkMetro keeps it.)
config.resolver.useWatchman = true;

// expo-sqlite's web build imports `wa-sqlite.wasm`; SDK 57's default config
// lists `wasm` in neither assetExts nor sourceExts, so Metro's resolver
// rejects the import (UnableToResolveError -> HTTP 500 web bundle).
config.resolver.assetExts.push("wasm");

module.exports = withRorkMetro(config);
