import type { Configuration } from 'webpack';
import webpack from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader' },
    { loader: 'postcss-loader' },
  ],
});

// Inject __dirname shim for renderer bundle
const bannerPlugin = new webpack.BannerPlugin({
  banner: 'var __dirname = "/";',
  raw: true,
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins: [bannerPlugin, ...plugins],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
