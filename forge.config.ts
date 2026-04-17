import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

// Package metadata - these values are used for all platforms
const packageMetadata = {
  name: 'knuthflow',
  productName: 'Knuthflow',
  version: '1.0.0', // Synced from package.json - update package.json version
  description: 'Desktop wrapper for Claude Code CLI',
  author: {
    name: 'xxibcill',
    email: 'cchayanin@hotmail.com',
  },
  license: 'MIT',
};

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: packageMetadata.productName,
    executableName: packageMetadata.name,
    appBundleId: 'com.knuthflow.app',
    appCategoryType: 'public.app-category.developer-tools',
    // macOS-specific
    osxSign: {
      identity: process.env.APPLE_SIGNING_IDENTITY || undefined,
      optionsForFile: () => ({
        entitlements: './entitlements.plist',
      }),
    },
    osxNotarize: process.env.APPLE_ID ? {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      appleId: process.env.APPLE_ID!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      appleIdPassword: process.env.APPLE_APP_PASSWORD!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      teamId: process.env.APPLE_TEAM_ID!,
    } : undefined,
    // Windows-specific
    windowsSign: process.env.WIN_CERTIFICATE ? {
      certificateFile: Buffer.from(process.env.WIN_CERTIFICATE, 'base64'),
      password: process.env.WIN_PASSWORD,
    } : undefined,
  },
  rebuildConfig: {},
  makers: [
    // Windows Squirrel installer
    new MakerSquirrel({
      name: packageMetadata.productName,
      setupExe: `${packageMetadata.productName}-Setup-${packageMetadata.version}.exe`,
      noMsi: true,
    }),
    // macOS ZIP archive
    new MakerZIP({}, ['darwin']),
    // Linux RPM package
    new MakerRpm({
      options: {
        name: packageMetadata.name,
        productName: packageMetadata.productName,
        version: packageMetadata.version,
        description: packageMetadata.description,
        homepage: 'https://github.com/xxibcill/knuthflow',
        categories: ['Development', 'Utility'],
      },
    }),
    // Linux DEB package
    new MakerDeb({
      options: {
        name: packageMetadata.name,
        productName: packageMetadata.productName,
        version: packageMetadata.version,
        description: packageMetadata.description,
        homepage: 'https://github.com/xxibcill/knuthflow',
        categories: ['Development', 'Utility'],
        mantainer: `${packageMetadata.author.name} <${packageMetadata.author.email}>`,
      },
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.tsx',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
