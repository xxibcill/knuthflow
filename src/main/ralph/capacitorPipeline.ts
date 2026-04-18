import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { DeliveryArtifact, ReleaseGate } from '../../shared/deliveryTypes';

const execAsync = promisify(exec);

export type MobilePlatform = 'ios' | 'android';

export interface CapacitorBuildResult {
  success: boolean;
  platform: MobilePlatform;
  artifacts: DeliveryArtifact[];
  gates: ReleaseGate[];
  error?: string;
}

export interface CapacitorPipelineOptions {
  workspacePath: string;
  platformTargets: MobilePlatform[];
}

/**
 * Check if Capacitor is initialized for a platform
 */
function isCapacitorInitialized(workspacePath: string, platform: MobilePlatform): boolean {
  const capacitorDir = path.join(workspacePath, `cap/${platform}`);
  return fs.existsSync(capacitorDir);
}

/**
 * Check if the web app has been built (dist directory exists)
 */
function isWebAppBuilt(workspacePath: string): boolean {
  const distPath = path.join(workspacePath, 'dist');
  return fs.existsSync(distPath);
}

/**
 * Initialize Capacitor for iOS platform
 */
async function initializeIOS(workspacePath: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    // First check if @capacitor/core is installed
    const pkgPath = path.join(workspacePath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return { success: false, output: '', error: 'package.json not found' };
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Install @capacitor/core and @capacitor/cli if not present
    if (!deps['@capacitor/core']) {
      await execAsync('npm install @capacitor/core @capacitor/cli', { cwd: workspacePath, timeout: 120000 });
    }

    // Initialize Capacitor with app name and ID
    const appName = pkg.name || 'app';
    const appId = `com.app.${appName.replace(/[^a-zA-Z0-9]/g, '')}`;

    try {
      await execAsync(`npx cap init "${appName}" "${appId}" --web-dir=dist`, { cwd: workspacePath, timeout: 60000 });
    } catch {
      // cap init might fail if already initialized, continue anyway
    }

    // Add iOS platform
    await execAsync('npx cap add ios', { cwd: workspacePath, timeout: 120000 });

    return { success: true, output: 'iOS platform added successfully' };
  } catch (error) {
    return { success: false, output: '', error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Initialize Capacitor for Android platform
 */
async function initializeAndroid(workspacePath: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    // First check if @capacitor/core is installed
    const pkgPath = path.join(workspacePath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return { success: false, output: '', error: 'package.json not found' };
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Install @capacitor/core and @capacitor/cli if not present
    if (!deps['@capacitor/core']) {
      await execAsync('npm install @capacitor/core @capacitor/cli', { cwd: workspacePath, timeout: 120000 });
    }

    // Initialize Capacitor with app name and ID
    const appName = pkg.name || 'app';
    const appId = `com.app.${appName.replace(/[^a-zA-Z0-9]/g, '')}`;

    try {
      await execAsync(`npx cap init "${appName}" "${appId}" --web-dir=dist`, { cwd: workspacePath, timeout: 60000 });
    } catch {
      // cap init might fail if already initialized, continue anyway
    }

    // Add Android platform
    await execAsync('npx cap add android', { cwd: workspacePath, timeout: 120000 });

    return { success: true, output: 'Android platform added successfully' };
  } catch (error) {
    return { success: false, output: '', error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Sync Capacitor with web assets
 */
async function syncCapacitor(workspacePath: string, platform: MobilePlatform): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    // First build the web app if not built
    if (!isWebAppBuilt(workspacePath)) {
      const pkgPath = path.join(workspacePath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.scripts?.build) {
          await execAsync('npm run build', { cwd: workspacePath, timeout: 180000 });
        }
      }
    }

    // Sync to the platform
    await execAsync(`npx cap sync ${platform}`, { cwd: workspacePath, timeout: 120000 });

    return { success: true, output: `${platform} synced successfully` };
  } catch (error) {
    return { success: false, output: '', error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Build iOS app using xcodebuild
 */
async function buildIOS(workspacePath: string): Promise<{ success: boolean; output: string; artifactPath?: string; error?: string }> {
  const iosDir = path.join(workspacePath, 'ios');

  if (!fs.existsSync(iosDir)) {
    return { success: false, output: '', error: 'iOS directory not found. Run sync first.' };
  }

  try {
    // Find the xcworkspace
    const iosContents = fs.readdirSync(iosDir);
    const workspaceDir = iosContents.find(f => f.endsWith('.xcworkspace'));
    const scheme = iosContents.find(f => f.endsWith('.xcodeproj'));

    if (!workspaceDir && !scheme) {
      return { success: false, output: '', error: 'No Xcode workspace or project found' };
    }

    // Get available simulators
    let simulatorDestination = 'platform=iOS Simulator,name=iPhone 15';
    try {
      const { stdout } = await execAsync('xcrun simctl list devices available | grep -E "iPhone|iPad" | head -5');
      const devices = stdout.trim().split('\n');
      if (devices.length > 0) {
        const deviceLine = devices[0];
        const match = deviceLine.match(/--device (.*?) \(/);
        if (match) {
          simulatorDestination = `platform=iOS Simulator,id=${match[1]}`;
        }
      }
    } catch {
      // Use default simulator if detection fails
    }

    // Build the iOS project
    const buildCmd = workspaceDir
      ? `xcodebuild -workspace "${path.join(iosDir, workspaceDir)}" -scheme App -configuration Release -destination '${simulatorDestination}' archive -archivePath "${path.join(workspacePath, 'dist', 'app.xcarchive')}" CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO`
      : `xcodebuild -project "${path.join(iosDir, scheme!)}" -scheme App -configuration Release -destination '${simulatorDestination}' archive -archivePath "${path.join(workspacePath, 'dist', 'app.xcarchive')}" CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO`;

    await execAsync(buildCmd, { cwd: iosDir, timeout: 600000 });

    // Export to IPA
    const archivePath = path.join(workspacePath, 'dist', 'app.xcarchive');
    const ipaPath = path.join(workspacePath, 'dist', 'app.ipa');

    await execAsync(`xcodebuild -exportArchive -archivePath "${archivePath}" -exportPath "${path.join(workspacePath, 'dist')}" -exportOptionsPlist '{"method":"enterprise","signingIdentity":"","signingCertificate":""}' CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO`, { cwd: workspacePath, timeout: 120000 });

    return {
      success: true,
      output: 'iOS build successful',
      artifactPath: fs.existsSync(ipaPath) ? ipaPath : archivePath,
    };
  } catch (error) {
    return { success: false, output: '', error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Build Android app using gradle
 */
async function buildAndroid(workspacePath: string): Promise<{ success: boolean; output: string; artifactPath?: string; error?: string }> {
  const androidDir = path.join(workspacePath, 'android');

  if (!fs.existsSync(androidDir)) {
    return { success: false, output: '', error: 'Android directory not found. Run sync first.' };
  }

  try {
    // Build the Android project
    await execAsync('./gradlew assembleRelease', { cwd: androidDir, timeout: 600000 });

    // Find the APK
    const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    const debugApkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

    const finalApkPath = fs.existsSync(apkPath) ? apkPath : (fs.existsSync(debugApkPath) ? debugApkPath : null);

    if (!finalApkPath) {
      // Try to find any APK
      const outputsDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk');
      if (fs.existsSync(outputsDir)) {
        const findApk = (dir: string): string | null => {
          const items = fs.readdirSync(dir, { withFileTypes: true });
          for (const item of items) {
            if (item.isDirectory()) {
              const result = findApk(path.join(dir, item.name));
              if (result) return result;
            } else if (item.name.endsWith('.apk')) {
              return path.join(dir, item.name);
            }
          }
          return null;
        };
        const foundApk = findApk(outputsDir);
        if (foundApk) {
          return { success: true, output: 'Android build successful', artifactPath: foundApk };
        }
      }
      return { success: false, output: '', error: 'APK not found after build' };
    }

    // Copy APK to dist folder for easier access
    const distDir = path.join(workspacePath, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    const destApk = path.join(distDir, path.basename(finalApkPath));
    fs.copyFileSync(finalApkPath, destApk);

    return { success: true, output: 'Android build successful', artifactPath: destApk };
  } catch (error) {
    return { success: false, output: '', error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Collect mobile artifacts from the workspace
 */
function collectMobileArtifacts(workspacePath: string, platform: MobilePlatform): DeliveryArtifact[] {
  const artifacts: DeliveryArtifact[] = [];

  if (platform === 'ios') {
    // Check for xcarchive
    const xcarchivePath = path.join(workspacePath, 'dist', 'app.xcarchive');
    if (fs.existsSync(xcarchivePath)) {
      const stats = fs.statSync(xcarchivePath);
      artifacts.push({
        id: 'ios-xcarchive',
        name: 'app.xcarchive',
        type: 'package',
        path: xcarchivePath,
        size: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
        validated: true,
        validatedAt: Date.now(),
        gate: 'ios-build',
        platformTarget: 'ios',
      });
    }

    // Check for IPA
    const ipaPath = path.join(workspacePath, 'dist', 'app.ipa');
    if (fs.existsSync(ipaPath)) {
      const stats = fs.statSync(ipaPath);
      artifacts.push({
        id: 'ios-ipa',
        name: 'app.ipa',
        type: 'package',
        path: ipaPath,
        size: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
        validated: true,
        validatedAt: Date.now(),
        gate: 'ios-build',
        platformTarget: 'ios',
      });
    }

    // Check for ios directory
    const iosDir = path.join(workspacePath, 'ios');
    if (fs.existsSync(iosDir)) {
      artifacts.push({
        id: 'ios-project',
        name: 'ios/',
        type: 'package',
        path: iosDir,
        validated: true,
        validatedAt: Date.now(),
        gate: 'ios-sync',
        platformTarget: 'ios',
      });
    }
  } else if (platform === 'android') {
    // Check for android directory
    const androidDir = path.join(workspacePath, 'android');
    if (fs.existsSync(androidDir)) {
      artifacts.push({
        id: 'android-project',
        name: 'android/',
        type: 'package',
        path: androidDir,
        validated: true,
        validatedAt: Date.now(),
        gate: 'android-sync',
        platformTarget: 'android',
      });
    }

    // Find all APK files
    const findApks = (dir: string, results: string[] = []): string[] => {
      if (!fs.existsSync(dir)) return results;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          findApks(fullPath, results);
        } else if (item.name.endsWith('.apk')) {
          results.push(fullPath);
        }
      }
      return results;
    };

    const apks = findApks(path.join(androidDir, 'app', 'build', 'outputs'));
    for (const apk of apks) {
      const stats = fs.statSync(apk);
      artifacts.push({
        id: `android-apk-${path.basename(path.dirname(path.dirname(path.dirname(apk))))}`,
        name: path.basename(apk),
        type: 'package',
        path: apk,
        size: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
        validated: true,
        validatedAt: Date.now(),
        gate: 'android-build',
        platformTarget: 'android',
      });
    }
  }

  return artifacts;
}

/**
 * Create release gates for mobile platforms
 */
function createMobileGates(platform: MobilePlatform, initResult: { success: boolean; output: string; error?: string }, syncResult: { success: boolean; output: string; error?: string }, buildResult: { success: boolean; output: string; artifactPath?: string; error?: string }): ReleaseGate[] {
  const gates: ReleaseGate[] = [];

  // Gate: Capacitor initialization
  gates.push({
    id: `gate-capacitor-${platform}-init`,
    name: `Capacitor ${platform} Init`,
    description: `Initialize Capacitor for ${platform}`,
    status: initResult.success ? 'passed' : 'failed',
    evidence: initResult.success ? initResult.output : initResult.error,
    passedAt: initResult.success ? Date.now() : undefined,
    platformTarget: platform,
  });

  // Gate: Sync
  gates.push({
    id: `gate-capacitor-${platform}-sync`,
    name: `Capacitor ${platform} Sync`,
    description: `Sync web assets to ${platform}`,
    status: syncResult.success ? 'passed' : 'failed',
    evidence: syncResult.success ? syncResult.output : syncResult.error,
    passedAt: syncResult.success ? Date.now() : undefined,
    platformTarget: platform,
  });

  // Gate: Build
  gates.push({
    id: `gate-capacitor-${platform}-build`,
    name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Build`,
    description: platform === 'ios' ? 'Build iOS app with xcodebuild' : 'Build Android app with gradle',
    status: buildResult.success ? 'passed' : 'failed',
    evidence: buildResult.success
      ? `Build successful: ${buildResult.artifactPath || 'no artifact path'}`
      : buildResult.error,
    passedAt: buildResult.success ? Date.now() : undefined,
    platformTarget: platform,
  });

  return gates;
}

/**
 * Build Capacitor mobile platforms
 */
export async function buildCapacitorMobile(options: CapacitorPipelineOptions): Promise<CapacitorBuildResult[]> {
  const { workspacePath, platformTargets } = options;
  const results: CapacitorBuildResult[] = [];

  // Ensure dist directory exists for Capacitor web assets
  const distDir = path.join(workspacePath, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  for (const platform of platformTargets) {
    const initResult = isCapacitorInitialized(workspacePath, platform)
      ? { success: true, output: `${platform} already initialized` }
      : platform === 'ios'
        ? await initializeIOS(workspacePath)
        : await initializeAndroid(workspacePath);

    const syncResult = await syncCapacitor(workspacePath, platform);

    const buildResult = platform === 'ios'
      ? await buildIOS(workspacePath)
      : await buildAndroid(workspacePath);

    const artifacts = collectMobileArtifacts(workspacePath, platform);
    const gates = createMobileGates(platform, initResult, syncResult, buildResult);

    results.push({
      success: buildResult.success,
      platform,
      artifacts,
      gates,
      error: !buildResult.success ? buildResult.error : undefined,
    });
  }

  return results;
}

/**
 * Get Capacitor build status for a workspace
 */
export function getCapacitorStatus(workspacePath: string): { initialized: MobilePlatform[]; missing: MobilePlatform[] } {
  const initialized: MobilePlatform[] = [];
  const missing: MobilePlatform[] = ['ios', 'android'];

  for (const platform of missing) {
    if (isCapacitorInitialized(workspacePath, platform)) {
      initialized.push(platform);
    }
  }

  return {
    initialized,
    missing: missing.filter(p => !initialized.includes(p)),
  };
}
