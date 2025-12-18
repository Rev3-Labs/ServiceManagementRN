const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    sourceExts: process.env.RN_SRC_EXT
      ? process.env.RN_SRC_EXT.split(',').concat(['tsx', 'ts', 'jsx', 'js', 'json', 'web.tsx', 'web.ts', 'web.jsx', 'web.js'])
      : ['tsx', 'ts', 'jsx', 'js', 'json', 'web.tsx', 'web.ts', 'web.jsx', 'web.js'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

