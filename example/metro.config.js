const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");
const path = require("node:path");

const projectRoot = __dirname;
const expoPackage = path.resolve(projectRoot, "..");
const reactNativePackage = path.resolve(projectRoot, "../../react-native");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [expoPackage, reactNativePackage];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(expoPackage, "node_modules"),
];
config.resolver.extraNodeModules = {
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  react: path.resolve(projectRoot, "node_modules/react"),
};

const upstream = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const next = upstream ?? context.resolveRequest;
  try {
    return next(context, moduleName, platform);
  } catch (error) {
    if (
      moduleName === "react" ||
      moduleName === "react-native" ||
      moduleName.startsWith("react/") ||
      moduleName.startsWith("react-native/")
    ) {
      throw error;
    }
    return resolve(
      {
        ...context,
        disableHierarchicalLookup: false,
        nodeModulesPaths: [],
        extraNodeModules: {},
        resolveRequest: resolve,
      },
      moduleName,
      platform,
    );
  }
};

module.exports = config;
