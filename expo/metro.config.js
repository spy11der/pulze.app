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

// Use watchman when available: @expo/metro-config forces
// resolver.useWatchman = null, which disables watchman and pushes Metro onto
// the fs.watch FallbackWatcher — that watcher exhausts the kernel's inotify
// watch limit on large node_modules (ENOSPC) and Metro never becomes ready.
resolved.resolver.useWatchman = true;

module.exports = resolved;
