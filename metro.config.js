const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Local vendor packages may contain their own development dependencies.
    // React and React Native must resolve to one runtime/event bus in the app.
    resolveRequest: (context, moduleName, platform) => {
      if (/^(react|react-native)(\/|$)/.test(moduleName)) {
        return context.resolveRequest({
          ...context,
          originModulePath: path.join(__dirname, 'package.json'),
        }, moduleName, platform)
      }
      return context.resolveRequest(context, moduleName, platform)
    },
    extraNodeModules: {
      // crypto: require.resolve('react-native-quick-crypto'),
      // stream: require.resolve('stream-browserify'),
      buffer: require.resolve('@craftzdog/react-native-buffer'),
    },
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
