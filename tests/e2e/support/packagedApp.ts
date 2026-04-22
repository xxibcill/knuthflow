import fs from 'node:fs';
import path from 'path';

interface PackageMetadata {
  name: string;
  productName?: string;
  // Forge config values (may differ from package.json)
  executableName?: string;
}

const projectRoot = path.resolve(__dirname, '../../..');

function readPackageMetadata(): PackageMetadata {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageMetadata;
}

// Forge configuration values (hardcoded to match forge.config.ts)
// These should be kept in sync with forge.config.ts
const FORGE_PACKAGE_METADATA = {
  name: 'ralph',
  productName: 'Ralph',
  executableName: 'ralph',
};

export function resolvePackagedAppPath(): string {
  const { productName } = readPackageMetadata();
  // Use forge config values for packaged app path (not package.json name)
  const appName = productName ?? FORGE_PACKAGE_METADATA.productName;
  const execName = FORGE_PACKAGE_METADATA.executableName;

  if (process.platform === 'darwin') {
    const packagedDir = path.join(projectRoot, 'out', `${appName}-darwin-arm64`);
    return path.join(packagedDir, `${appName}.app`, 'Contents', 'MacOS', appName);
  }

  // Linux: look for linux-x64 packaged app
  const outDir = path.join(projectRoot, 'out');
  const linuxDir = path.join(outDir, `${appName}-linux-x64`);
  if (fs.existsSync(linuxDir)) {
    // Use executableName from forge config (not package.json name)
    return path.join(linuxDir, execName);
  }

  throw new Error(`Packaged app not found in ${outDir}. Run "npm run package" first.`);
}

export function resolvePackagedAppAsar(): string {
  const { productName } = readPackageMetadata();
  // Use forge config values for packaged app path
  const appName = productName ?? FORGE_PACKAGE_METADATA.productName;

  if (process.platform === 'darwin') {
    return path.join(projectRoot, 'out', `${appName}-darwin-arm64`, `${appName}.app`, 'Contents', 'Resources', 'app.asar');
  }

  // Linux: use linux-x64 path
  return path.join(projectRoot, 'out', `${appName}-linux-x64`, 'resources', 'app.asar');
}
