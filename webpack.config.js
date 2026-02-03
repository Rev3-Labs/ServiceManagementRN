const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    entry: './index.web.js',
    output: {
      path: path.resolve(__dirname, 'web-build'),
      filename: 'index.web.bundle.js',
      publicPath: '/',
    },
    resolve: {
      extensions: ['.web.js', '.web.jsx', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json'],
      modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
      alias: {
        'react-native$': 'react-native-web',
        'react-native-vector-icons': 'react-native-vector-icons/dist',
        '@react-native-async-storage/async-storage': path.resolve(__dirname, 'web-mocks/async-storage.js'),
        '@react-native-community/netinfo': path.resolve(__dirname, 'web-mocks/netinfo.js'),
        '@react-native-vector-icons/material-design-icons': path.resolve(__dirname, 'web-mocks/material-design-icons.js'),
        'react-native-vector-icons/MaterialIcons': path.resolve(__dirname, 'web-mocks/material-design-icons.js'),
        '@expo/vector-icons/MaterialCommunityIcons': path.resolve(__dirname, 'web-mocks/material-community-icons.js'),
        'react-native-webview': path.resolve(__dirname, 'web-mocks/react-native-webview.js'),
        'react-native-signature-canvas': path.resolve(__dirname, 'web-mocks/react-native-signature-canvas.js'),
      },
      fallback: {
        'crypto': false,
        'stream': false,
        'buffer': false,
      },
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules\/(?!(react-native-.*|@react-native.*|@react-navigation.*|expo.*|@react-native-community.*|@babel.*)\/)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['module:@react-native/babel-preset'],
              plugins: [
                // Skip reanimated plugin for web - it can cause blank screens
              ],
              cacheDirectory: true,
            },
          },
        },
        {
          test: /\.(png|jpe?g|gif|svg|bmp|webp|ttf|otf|woff|woff2|eot)$/,
          type: 'asset/resource',
        },
      ],
    },
    optimization: {
      minimize: false,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: true,
      }),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProduction),
        'process.env.NODE_ENV': JSON.stringify(
          isProduction ? 'production' : 'development',
        ),
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'web-build'),
      },
      compress: true,
      port: 8080,
      hot: true,
      open: true,
      historyApiFallback: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
  };
};

