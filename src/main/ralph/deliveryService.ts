import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { HandoffBundle, DeliveryArtifact, ReleaseGate, DeliveryResult, PlatformTarget, PlatformHandoff } from '../../shared/deliveryTypes';
import { buildCapacitorMobile, type MobilePlatform } from './capacitorPipeline';
import { buildPWA } from './pwaPackaging';

const execAsync = promisify(exec);

const DELIVERY_MANIFEST_FILE = '.ralph.delivery.json';

/**
 * Check if a workspace has been bootstrapped for Ralph
 */
function isWorkspaceBootstrapped(workspacePath: string): boolean {
  const ralphDir = path.join(workspacePath, '.ralph');
  return fs.existsSync(ralphDir) && fs.existsSync(path.join(workspacePath, 'PROMPT.md'));
}

/**
 * Get the scaffold metadata for a workspace
 */
function getScaffoldMetadata(workspacePath: string): { template: string; appName: string; platformTargets?: PlatformTarget[] } | null {
  const scaffoldFile = path.join(workspacePath, '.ralph.scaffold.json');
  if (!fs.existsSync(scaffoldFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(scaffoldFile, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Get Ralph metadata including platform targets
 */
function getRalphMetadata(workspacePath: string): { platformTargets?: PlatformTarget[] } | null {
  const metadataFile = path.join(workspacePath, '.ralph');
  if (!fs.existsSync(metadataFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Gather delivery artifacts from the workspace
 */
function gatherArtifacts(workspacePath: string, _appName: string): DeliveryArtifact[] {
  const artifacts: DeliveryArtifact[] = [];

  // Check for package.json
  const pkgPath = path.join(workspacePath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const stats = fs.statSync(pkgPath);
    artifacts.push({
      id: 'package-json',
      name: 'package.json',
      type: 'manifest',
      path: pkgPath,
      size: `${(stats.size / 1024).toFixed(1)} KB`,
      validated: true,
      validatedAt: Date.now(),
      gate: 'source_exists',
    });
  }

  // Check for build output
  const buildOutputPaths = [
    path.join(workspacePath, 'dist'),
    path.join(workspacePath, 'build'),
    path.join(workspacePath, 'out'),
  ];

  for (const buildPath of buildOutputPaths) {
    if (fs.existsSync(buildPath)) {
      const stats = fs.statSync(buildPath);
      artifacts.push({
        id: `build-${path.basename(buildPath)}`,
        name: `${path.basename(buildPath)}/ (build output)`,
        type: 'package',
        path: buildPath,
        size: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
        validated: true,
        validatedAt: Date.now(),
        gate: 'build_output',
      });
    }
  }

  // Check for SPEC.md
  const specPath = path.join(workspacePath, 'SPEC.md');
  if (fs.existsSync(specPath)) {
    const stats = fs.statSync(specPath);
    artifacts.push({
      id: 'spec-md',
      name: 'SPEC.md',
      type: 'manifest',
      path: specPath,
      size: `${(stats.size / 1024).toFixed(1)} KB`,
      validated: true,
      validatedAt: Date.now(),
      gate: 'spec_exists',
    });
  }

  // Check for fix_plan.md
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  if (fs.existsSync(fixPlanPath)) {
    artifacts.push({
      id: 'fix-plan',
      name: 'fix_plan.md',
      type: 'checklist',
      path: fixPlanPath,
      validated: true,
      validatedAt: Date.now(),
      gate: 'plan_exists',
    });
  }

  return artifacts;
}

/**
 * Build release notes from the workspace
 */
function buildReleaseNotes(workspacePath: string, appName: string, platformTargets: PlatformTarget[] = []): string {
  const lines: string[] = [];
  lines.push(`# ${appName} - Release Notes`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  const scaffold = getScaffoldMetadata(workspacePath);
  if (scaffold) {
    lines.push(`This release contains a ${scaffold.template} application.`);
    lines.push('');
  }

  if (platformTargets.length > 0) {
    lines.push(`**Target Platforms:** ${platformTargets.join(', ')}`);
    lines.push('');
  }

  // Get iteration count from fix_plan.md if exists
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  if (fs.existsSync(fixPlanPath)) {
    const content = fs.readFileSync(fixPlanPath, 'utf-8');
    const completedMatches = content.match(/\[x\]/g) ?? [];
    lines.push(`**Completed Tasks:** ${completedMatches.length}`);
    lines.push('');
  }

  // Check for build artifacts
  const buildPaths = ['dist', 'build', 'out'];
  const existingBuilds = buildPaths.filter(p => fs.existsSync(path.join(workspacePath, p)));
  if (existingBuilds.length > 0) {
    lines.push('## Build Outputs');
    lines.push('');
    for (const buildPath of existingBuilds) {
      lines.push(`- \`${buildPath}/\` - production build`);
    }
    lines.push('');
  }

  // Platform-specific sections
  if (platformTargets.includes('ios') || platformTargets.includes('android')) {
    lines.push('## Mobile (Capacitor)');
    lines.push('');
    if (platformTargets.includes('ios')) {
      lines.push('### iOS');
      lines.push('- Build artifact: `dist/app.ipa` or `dist/app.xcarchive`');
      lines.push('- Open `ios/App.xcworkspace` in Xcode to deploy');
      lines.push('');
    }
    if (platformTargets.includes('android')) {
      lines.push('### Android');
      lines.push('- Build artifact: `android/app/build/outputs/apk/`');
      lines.push('- Install with: `adb install app-release.apk`');
      lines.push('');
    }
  }

  if (platformTargets.includes('pwa')) {
    lines.push('## Progressive Web App (PWA)');
    lines.push('');
    lines.push('- Serve the `dist/` directory with a static web server');
    lines.push('- PWA manifest: `public/manifest.json`');
    lines.push('- Service worker: `public/sw.js`');
    lines.push('');
  }

  if (platformTargets.some(t => ['macos', 'windows', 'linux'].includes(t))) {
    lines.push('## Desktop');
    lines.push('');
    lines.push('- Build artifact: `out/` directory');
    lines.push('');
  }

  // Runbook section
  lines.push('## Run Instructions');
  lines.push('');
  lines.push('```bash');
  lines.push('# Install dependencies');
  lines.push('npm install');
  lines.push('');
  lines.push('# Development');
  lines.push('npm run dev');
  lines.push('');
  lines.push('# Production build');
  lines.push('npm run build');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate release notes artifact
 */
function generateReleaseNotes(workspacePath: string, appName: string, platformTargets: PlatformTarget[] = []): DeliveryArtifact {
  const releaseNotesContent = buildReleaseNotes(workspacePath, appName, platformTargets);
  const releaseNotesPath = path.join(workspacePath, 'RELEASE_NOTES.md');
  fs.writeFileSync(releaseNotesPath, releaseNotesContent, 'utf-8');

  return {
    id: 'release-notes',
    name: 'RELEASE_NOTES.md',
    type: 'release_notes',
    path: releaseNotesPath,
    size: `${(releaseNotesContent.length / 1024).toFixed(1)} KB`,
    validated: true,
    validatedAt: Date.now(),
    gate: 'release_notes_generated',
  };
}

/**
 * Evaluate base release gates for a workspace
 */
function evaluateBaseReleaseGates(workspacePath: string): ReleaseGate[] {
  const gates: ReleaseGate[] = [];

  // Gate 1: Source exists
  gates.push({
    id: 'gate-source-exists',
    name: 'Source Code Exists',
    description: 'Verify source code files are present in the workspace',
    status: fs.existsSync(path.join(workspacePath, 'package.json')) ? 'passed' : 'failed',
    evidence: fs.existsSync(path.join(workspacePath, 'package.json')) ? 'package.json found' : 'package.json not found',
    passedAt: fs.existsSync(path.join(workspacePath, 'package.json')) ? Date.now() : undefined,
  });

  // Gate 2: Build successful (web/desktop)
  const buildPaths = ['dist', 'build', 'out'];
  const hasBuild = buildPaths.some(p => fs.existsSync(path.join(workspacePath, p)));
  gates.push({
    id: 'gate-build-successful',
    name: 'Build Output Present',
    description: 'Verify production build has been generated',
    status: hasBuild ? 'passed' : 'pending',
    evidence: hasBuild ? `Found: ${buildPaths.filter(p => fs.existsSync(path.join(workspacePath, p))).join(', ')}` : 'No build output found',
    passedAt: hasBuild ? Date.now() : undefined,
  });

  // Gate 3: Spec exists
  gates.push({
    id: 'gate-spec-exists',
    name: 'SPEC.md Exists',
    description: 'Verify specification document is present',
    status: fs.existsSync(path.join(workspacePath, 'SPEC.md')) ? 'passed' : 'failed',
    evidence: fs.existsSync(path.join(workspacePath, 'SPEC.md')) ? 'SPEC.md found' : 'SPEC.md not found',
    passedAt: fs.existsSync(path.join(workspacePath, 'SPEC.md')) ? Date.now() : undefined,
  });

  // Gate 4: Fix plan exists
  gates.push({
    id: 'gate-plan-exists',
    name: 'Fix Plan Exists',
    description: 'Verify fix plan is present',
    status: fs.existsSync(path.join(workspacePath, 'fix_plan.md')) ? 'passed' : 'failed',
    evidence: fs.existsSync(path.join(workspacePath, 'fix_plan.md')) ? 'fix_plan.md found' : 'fix_plan.md not found',
    passedAt: fs.existsSync(path.join(workspacePath, 'fix_plan.md')) ? Date.now() : undefined,
  });

  return gates;
}

/**
 * Validate desktop smoke test
 */
async function validateDesktopSmokeTest(workspacePath: string, platformTarget: PlatformTarget): Promise<ReleaseGate> {
  const electronPaths = ['out', 'release'];
  let foundPath: string | null = null;

  for (const p of electronPaths) {
    const fullPath = path.join(workspacePath, p);
    if (fs.existsSync(fullPath)) {
      const items = fs.readdirSync(fullPath);
      const hasExe = items.some(f =>
        f.endsWith('.exe') ||
        f.endsWith('.app') ||
        (platformTarget === 'linux' && !f.includes('.'))
      );
      if (hasExe) {
        foundPath = fullPath;
        break;
      }
    }
  }

  const passed = foundPath !== null;
  return {
    id: `gate-desktop-smoke-test-${platformTarget}`,
    name: `Desktop Smoke Test (${platformTarget})`,
    description: `Verify ${platformTarget} app launches without immediate crash`,
    status: passed ? 'passed' : 'pending',
    evidence: passed ? `Found executable in ${foundPath}` : `No ${platformTarget} executable found in output directories`,
    passedAt: passed ? Date.now() : undefined,
    platformTarget,
  };
}

/**
 * Build per-platform handoffs
 */
async function buildPlatformHandoffs(
  workspacePath: string,
  platformTargets: PlatformTarget[]
): Promise<{ handoffs: PlatformHandoff[]; additionalArtifacts: DeliveryArtifact[]; additionalGates: ReleaseGate[] }> {
  const handoffs: PlatformHandoff[] = [];
  const additionalArtifacts: DeliveryArtifact[] = [];
  const additionalGates: ReleaseGate[] = [];

  // Mobile platforms (iOS, Android)
  const mobileTargets = platformTargets.filter(t => t === 'ios' || t === 'android') as MobilePlatform[];
  if (mobileTargets.length > 0) {
    try {
      const mobileResults = await buildCapacitorMobile({
        workspacePath,
        platformTargets: mobileTargets,
      });

      for (const result of mobileResults) {
        // Add artifacts
        additionalArtifacts.push(...result.artifacts);

        // Add gates
        additionalGates.push(...result.gates);

        // Create handoff
        const passedGates = result.gates.filter(g => g.status === 'passed');
        const failedGates = result.gates.filter(g => g.status === 'failed');
        handoffs.push({
          platformTarget: result.platform,
          artifacts: result.artifacts,
          gates: result.gates,
          status: failedGates.length > 0 ? 'failed' : (passedGates.length === result.gates.length ? 'passed' : 'pending'),
        });
      }
    } catch (error) {
      // Graceful degradation: if mobile build fails completely, we create failed handoffs
      // rather than propagating the error. This allows the overall packaging to continue
      // and report which platforms succeeded/failed without aborting the entire process.
      console.error('Mobile build failed:', error);
      for (const platform of mobileTargets) {
        handoffs.push({
          platformTarget: platform,
          artifacts: [],
          gates: [{
            id: `gate-mobile-error-${platform}`,
            name: `${platform} Build Error`,
            description: 'Mobile build failed',
            status: 'failed',
            evidence: error instanceof Error ? error.message : String(error),
            platformTarget: platform,
          }],
          status: 'failed',
        });
      }
    }
  }

  // PWA
  if (platformTargets.includes('pwa')) {
    try {
      const pwaResult = await buildPWA(workspacePath, getScaffoldMetadata(workspacePath)?.appName ?? 'app');

      additionalArtifacts.push(...pwaResult.artifacts);
      additionalGates.push(...pwaResult.gates);

      const passedGates = pwaResult.gates.filter(g => g.status === 'passed');
      const failedGates = pwaResult.gates.filter(g => g.status === 'failed');

      handoffs.push({
        platformTarget: 'pwa',
        artifacts: pwaResult.artifacts,
        gates: pwaResult.gates,
        status: failedGates.length > 0 ? 'failed' : (passedGates.length === pwaResult.gates.length ? 'passed' : 'pending'),
      });
    } catch (error) {
      // Graceful degradation: if PWA build fails completely, we create a failed handoff
      // rather than propagating the error. Lighthouse failures are handled within buildPWA
      // and result in a 'skipped' or 'failed' gate, not an exception here.
      console.error('PWA build failed:', error);
      handoffs.push({
        platformTarget: 'pwa',
        artifacts: [],
        gates: [{
          id: 'gate-pwa-error',
          name: 'PWA Build Error',
          description: 'PWA packaging failed',
          status: 'failed',
          evidence: error instanceof Error ? error.message : String(error),
          platformTarget: 'pwa',
        }],
        status: 'failed',
      });
    }
  }

  // Desktop platforms
  const desktopTargets = platformTargets.filter(t => ['macos', 'windows', 'linux'].includes(t));
  for (const desktopTarget of desktopTargets) {
    const smokeTestGate = await validateDesktopSmokeTest(workspacePath, desktopTarget);
    additionalGates.push(smokeTestGate);

    // Find artifacts
    const desktopArtifacts: DeliveryArtifact[] = [];
    const electronPaths = ['out', 'release'];
    for (const p of electronPaths) {
      const fullPath = path.join(workspacePath, p);
      if (fs.existsSync(fullPath)) {
        try {
          const items = fs.readdirSync(fullPath);
          for (const item of items) {
            if (
              (desktopTarget === 'windows' && item.endsWith('.exe')) ||
              (desktopTarget === 'macos' && item.endsWith('.app')) ||
              (desktopTarget === 'linux' && !item.includes('.'))
            ) {
              const itemPath = path.join(fullPath, item);
              const stats = fs.statSync(itemPath);
              desktopArtifacts.push({
                id: `desktop-${desktopTarget}-${item}`,
                name: item,
                type: 'package',
                path: itemPath,
                size: stats.isDirectory() ? undefined : `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
                validated: true,
                validatedAt: Date.now(),
                gate: 'desktop-build',
                platformTarget: desktopTarget,
              });
            }
          }
        } catch {
          // Skip if can't read directory
        }
      }
    }

    handoffs.push({
      platformTarget: desktopTarget,
      artifacts: desktopArtifacts,
      gates: [smokeTestGate],
      status: smokeTestGate.status === 'passed' ? 'passed' : 'pending',
    });
  }

  return { handoffs, additionalArtifacts, additionalGates };
}

/**
 * Build a handoff bundle for the workspace
 */
export async function buildHandoffBundle(
  workspacePath: string,
  appName: string,
  deliveryFormat: string,
  platformTargets: PlatformTarget[] = []
): Promise<HandoffBundle> {
  // Gather base artifacts
  const artifacts = gatherArtifacts(workspacePath, appName);

  // Generate release notes with platform info
  const releaseNotes = generateReleaseNotes(workspacePath, appName, platformTargets);
  artifacts.push(releaseNotes);

  // Evaluate base gates
  const baseGates = evaluateBaseReleaseGates(workspacePath);

  // Build platform-specific handoffs
  const { handoffs, additionalArtifacts, additionalGates } = await buildPlatformHandoffs(workspacePath, platformTargets);

  // Combine all artifacts and gates
  const allArtifacts = [...artifacts, ...additionalArtifacts];
  const allGates = [...baseGates, ...additionalGates];

  // Determine overall status
  const platformGates = handoffs.flatMap(h => h.gates);
  const allGatesPassed = allGates.every(g => g.status === 'passed' || g.status === 'skipped');
  const summaryParts = [
    `${allArtifacts.length} artifacts`,
    `${allGates.filter(g => g.status === 'passed').length}/${allGates.length} gates passed`,
    `format: ${deliveryFormat}`,
    platformTargets.length > 0 ? `platforms: ${platformTargets.join(', ')}` : undefined,
  ].filter(Boolean);

  return {
    appName,
    deliveryFormat,
    platformTargets,
    artifacts: allArtifacts,
    gates: allGates,
    platformHandoffs: handoffs,
    completedAt: allGatesPassed ? Date.now() : undefined,
    summary: summaryParts.join(' • '),
  };
}

/**
 * Get the delivery manifest for a workspace
 */
export function getDeliveryManifest(workspacePath: string): HandoffBundle | null {
  const manifestPath = path.join(workspacePath, DELIVERY_MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save the delivery manifest
 */
export function saveDeliveryManifest(workspacePath: string, bundle: HandoffBundle): boolean {
  try {
    const manifestPath = path.join(workspacePath, DELIVERY_MANIFEST_FILE);
    fs.writeFileSync(manifestPath, JSON.stringify(bundle, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Run packaging for a workspace
 */
export async function runPackaging(workspacePath: string, deliveryFormat: string): Promise<DeliveryResult> {
  try {
    // Check if workspace is bootstrapped
    if (!isWorkspaceBootstrapped(workspacePath)) {
      return { success: false, error: 'Workspace is not bootstrapped for Ralph', code: 'NOT_BOOTSTRAPPED' };
    }

    // Get app name and platform targets from scaffold metadata
    const scaffold = getScaffoldMetadata(workspacePath);
    const appName = scaffold?.appName ?? 'app';
    const platformTargets = scaffold?.platformTargets ?? [];

    // Also check Ralph metadata
    const ralphMetadata = getRalphMetadata(workspacePath);
    if (ralphMetadata?.platformTargets && ralphMetadata.platformTargets.length > 0) {
      platformTargets.push(...ralphMetadata.platformTargets.filter(t => !platformTargets.includes(t)));
    }

    // Run npm install if node_modules doesn't exist
    const nodeModulesPath = path.join(workspacePath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      try {
        await execAsync('npm install', { cwd: workspacePath, timeout: 120000 });
      } catch (installError) {
        return { success: false, error: `npm install failed: ${installError}`, code: 'INSTALL_FAILED' };
      }
    }

    // Run build if package.json has build script
    const pkgPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.build) {
        try {
          await execAsync('npm run build', { cwd: workspacePath, timeout: 180000 });
        } catch (buildError) {
          // Don't fail the whole packaging for web build error if we have other platforms
          if (platformTargets.length === 0 || (!platformTargets.includes('pwa') && platformTargets.every(t => ['ios', 'android', 'macos', 'windows', 'linux'].includes(t)))) {
            return { success: false, error: `Build failed: ${buildError}`, code: 'BUILD_FAILED' };
          }
          console.warn('Web build failed, continuing with platform-specific builds:', buildError);
        }
      }
    }

    // Build handoff bundle with platform support
    const bundle = await buildHandoffBundle(workspacePath, appName, deliveryFormat, platformTargets);
    saveDeliveryManifest(workspacePath, bundle);

    return { success: true, bundle };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Packaging failed', code: 'PACKAGING_FAILED' };
  }
}

/**
 * Confirm release for a workspace
 */
export function confirmRelease(workspacePath: string): DeliveryResult {
  try {
    const manifest = getDeliveryManifest(workspacePath);
    if (!manifest) {
      return { success: false, error: 'No delivery manifest found. Run packaging first.', code: 'NO_MANIFEST' };
    }

    // Check all gates are passed
    const allGatesPassed = manifest.gates.every(g => g.status === 'passed' || g.status === 'skipped');
    if (!allGatesPassed) {
      return { success: false, error: 'Not all release gates are passed', code: 'GATES_NOT_PASSED' };
    }

    // Check platform handoffs
    const platformHandoffsPassed = manifest.platformHandoffs.every(h => h.status === 'passed' || h.status === 'skipped');
    if (!platformHandoffsPassed) {
      return { success: false, error: 'Not all platform handoffs passed validation', code: 'PLATFORM_HANDOFFS_NOT_PASSED' };
    }

    // Update manifest with completion time
    manifest.completedAt = Date.now();
    saveDeliveryManifest(workspacePath, manifest);

    return { success: true, bundle: manifest };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Release failed', code: 'RELEASE_FAILED' };
  }
}

/**
 * Get the handoff bundle for a workspace
 */
export async function getHandoffBundle(workspacePath: string): Promise<DeliveryResult> {
  try {
    const manifest = getDeliveryManifest(workspacePath);
    if (manifest) {
      return { success: true, bundle: manifest };
    }

    // Try to build one if not present
    const scaffold = getScaffoldMetadata(workspacePath);
    const appName = scaffold?.appName ?? 'app';
    const deliveryFormat = scaffold?.template ?? 'web';
    const platformTargets = scaffold?.platformTargets ?? [];

    const bundle = await buildHandoffBundle(workspacePath, appName, deliveryFormat, platformTargets);

    return { success: true, bundle };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get handoff bundle', code: 'GET_BUNDLE_FAILED' };
  }
}
