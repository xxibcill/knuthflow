import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  /**
   * Mark node-pty as external so webpack doesn't try to bundle the native module.
   * The native module will be loaded from node_modules at runtime.
   *
   * Mark playwright as external too - it has complex native dependencies
   * (chromium-bidi, etc.) that cannot be bundled reliably.
   */
  externals: {
    'node-pty': 'commonjs node-pty',
    'playwright': 'commonjs playwright',
    'playwright-core': 'commonjs playwright-core',
  },
};
