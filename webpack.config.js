const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

const extensions = ['.tsx', '.ts', '.js'];

module.exports = {
  // mode: 'production',
  mode: 'development',
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions,
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  performance: {
    hints: false,
  },
  plugins: [
    new ESLintPlugin({extensions}),
  ],
};
