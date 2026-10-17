const fs = require("node:fs");
const path = require("node:path");

const excludedPackage = "@notifiable/react-native";

function withNotifiable(config) {
  const excluded = excludeReactNative(config);

  try {
    const plugins = require("@expo/config-plugins");
    const withNativeConfig = plugins.withDangerousMod(excluded, [
      "ios",
      (modConfig) => {
        ensureReactNativeConfig(modConfig.modRequest.projectRoot);
        return modConfig;
      },
    ]);

    try {
      return plugins.withPlugins(withNativeConfig, ["expo-notifications"]);
    } catch {
      return withNativeConfig;
    }
  } catch {
    return excluded;
  }
}

function excludeReactNative(config) {
  const autolinking = { ...(config.autolinking ?? {}) };
  const current = Array.isArray(autolinking.exclude)
    ? autolinking.exclude
    : [];

  if (!current.includes(excludedPackage)) {
    autolinking.exclude = [...current, excludedPackage];
  }

  config.autolinking = autolinking;
  return config;
}

function ensureReactNativeConfig(projectRoot) {
  if (typeof projectRoot !== "string" || projectRoot.length === 0) {
    return;
  }

  const file = path.join(projectRoot, "react-native.config.js");

  if (fs.existsSync(file)) {
    return;
  }

  fs.writeFileSync(
    file,
    [
      "module.exports = {",
      "  dependencies: {",
      '    "@notifiable/react-native": {',
      "      platforms: {",
      "        ios: null,",
      "        android: null,",
      "      },",
      "    },",
      "  },",
      "};",
      "",
    ].join("\n"),
  );
}

module.exports = withNotifiable;
