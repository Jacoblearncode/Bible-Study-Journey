const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push(
  // Adds support for `.db` files so the bundled Bible SQLite database can be
  // loaded via require() and expo-sqlite's assetSource.
  'db',
  // expo-sqlite's web implementation runs SQLite compiled to WebAssembly.
  'wasm'
);

module.exports = config;
