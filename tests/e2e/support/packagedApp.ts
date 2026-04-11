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

function resolvePackagedOutputDir(productName: string): string {
  const outDir = path.join(projectRoot, 'out');
  const preferredDir = path.join(outDir, `${productName}-${process.platform}-${process.arch}`);
  if (fs.existsSync(preferredDir)) {
    return preferredDir;
  }

  const matchingDirs = fs.readdirSync(outDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith(`${productName}-${process.platform}-`))
    .map(entry => path.join(outDir, entry.name))
    .sort();

  if (matchingDirs.length > 0) {
    // Pick the most recently modified directory
    return matchingDirs
      .map(dir => ({ dir, mtime: fs.statSync(dir).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0].dir;
  }

  throw new Error(`Packaged app not found in ${outDir}. Run "npm run package" before Playwright.`);
}

export function resolvePackagedAppAsar(): string {
  const { productName, name } = readPackageMetadata();
  const appName = productName ?? name;
  const packagedDir = resolvePackagedOutputDir(appName);

  if (process.platform === 'darwin') {
    return path.join(packagedDir, `${appName}.app`, 'Contents', 'Resources', 'app.asar');
  }

  return path.join(packagedDir, 'resources', 'app.asar');
}
