// [pulze-metro] Durable fix — re-applied 2026-09-07.
// The Rork launcher rewrites this file at prep; the launcher's embedded
// template now carries this same content. If this canary disappears,
// the launcher patch was lost — re-apply from repo history.
const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);

// Explicit: Metro must use Watchman (never the Node FallbackWatcher).
config.resolver.useWatchman = true;
if (config.watcher) config.watcher.useWatchman = true;

const rorkConfig = withRorkMetro(config);

// Inspector remap: @rork-ai/toolkit-sdk's sdk53 dev inspector imports RN
// private paths that moved in RN 0.86 (now under devsupport/devmenu).
const pulzeOriginalResolveRequest = rorkConfig.resolver.resolveRequest;
rorkConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.indexOf("react-native/src/private/inspector/") === 0) {
    const remapped =
      "react-native/src/private/devsupport/devmenu/elementinspector/" +
      moduleName.slice("react-native/src/private/inspector/".length);
    try {
      return context.resolveRequest(context, remapped, platform);
    } catch (e) {
      // fall through to the normal chain if the remap target is missing
    }
  }
  if (pulzeOriginalResolveRequest) {
    return pulzeOriginalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = rorkConfig;
