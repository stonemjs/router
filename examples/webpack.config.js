const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: {
    simple: path.resolve(__dirname, './src/simple/index.mjs'),
    decorator: path.resolve(__dirname, './src/decorators/index.mjs'),
    definition: path.resolve(__dirname, './src/definitions/index.mjs'),
  },
  devtool: 'inline-source-map',
  plugins: [
    new CleanWebpackPlugin(),
    new NodePolyfillPlugin({ excludeAliases: ['console'] }),
  ],
  output: {
    libraryTarget: 'umd',
    filename: '[name].router.example.js',
    globalObject: 'this',
    library: '[name]RouterExample',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.m?js$/,
        use: 'webpack-import-glob'
      },
    ]
  }
}
