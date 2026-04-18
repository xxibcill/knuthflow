import fs from 'node:fs';
import path from 'node:path';

interface PackageMetadata {
  name: string;
  productName?: string;
}

const projectRoot = path.resolve(__dirname, '../../..');

function readPackageMetadata(): PackageMetadata {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageMetadata;
}

export function resolvePackagedAppPath(): string {
  const { productName, name } = readPackageMetadata();
  const appName = productName ?? name;
  const execName = name; // executableName from package.json (lowercase)

  if (process.platform === 'darwin') {
    const packagedDir = path.join(projectRoot, 'out', `${appName}-darwin-arm64`);
    return path.join(packagedDir, `${appName}.app`, 'Contents', 'MacOS', appName);
  }

  // Linux: look for linux-x64 packaged app
  const outDir = path.join(projectRoot, 'out');
  const linuxDir = path.join(outDir, `${appName}-linux-x64`);
  if (fs.existsSync(linuxDir)) {
    // Use executableName (name field, lowercase) for the binary
    return path.join(linuxDir, execName);
  }

  throw new Error(`Packaged app not found in ${outDir}. Run "npm run package" first.`);
}

export function resolvePackagedAppAsar(): string {
  const { productName, name } = readPackageMetadata();
  const appName = productName ?? name;

  if (process.platform === 'darwin') {
    return path.join(projectRoot, 'out', `${appName}-darwin-arm64`, `${appName}.app`, 'Contents', 'Resources', 'app.asar');
  }

  // Linux: use linux-x64 path
  return path.join(projectRoot, 'out', `${appName}-linux-x64`, 'resources', 'app.asar');
}
