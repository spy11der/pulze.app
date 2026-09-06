const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);

const resolved = withRorkMetro(config);

// The Rork toolkit's Metro transformer injects its dev inspector via
// '@rork-ai/toolkit-sdk/v53' for every Expo SDK except "54" — including 57.
// The v53 inspector requires react-native/src/private/inspector/*, which was
// removed in React Native 0.86, breaking every bundle at resolution time.
// The v54 entry requires react-native/src/private/devsupport/devmenu/
// elementinspector/*, which still exists in RN 0.86, so remap v53 -> v54.
const rorkResolveRequest = resolved.resolver.resolveRequest;
resolved.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@rork-ai/toolkit-sdk/v53") {
    moduleName = "@rork-ai/toolkit-sdk/v54";
  }
  return rorkResolveRequest
    ? rorkResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

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

// Native prebuild trees are never imported by JS but contain tens of
// thousands of files/directories. Excluding them keeps the file-map crawl
// (and any filesystem watcher) far below the kernel's inotify limits even
// if the fs.watch fallback watcher is ever selected again. Built as a plain
// RegExp because metro-config does not export exclusionList via its
// package "exports" map.
const nativeExclusions = [
  "\\.xcframework/",
  "\\.framework/",
  "/prebuilds/",
  "node_modules/(?:@[^/]+/)?[^/]+/android/src/",
  "node_modules/(?:@[^/]+/)?[^/]+/ios/",
];
const baseBlockList = resolved.resolver.blockList;
const baseSource =
  baseBlockList instanceof RegExp
    ? baseBlockList.source
    : typeof baseBlockList === "string"
      ? baseBlockList
      : "";
resolved.resolver.blockList = new RegExp(
  [...(baseSource ? [baseSource] : []), ...nativeExclusions]
    .map((source) => `(${source})`)
    .join("|"),
);

// Canary: if this line is missing from launch logs, the template
// metro.config.js was restored and this customization is not active.
console.log(
  "[pulze-metro] custom metro.config.js active — useWatchman =",
  resolved.resolver.useWatchman,
);

module.exports = resolved;
