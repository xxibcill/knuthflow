import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * Detect Claude Code installation
 * Only checks known safe paths to prevent command injection
 */
export function detectClaudeCode(): { installed: boolean; executablePath: string | null; version: string | null } {
  const possiblePaths = process.platform === 'darwin'
    ? ['/usr/local/bin/claude', '/opt/homebrew/bin/claude', '/usr/bin/claude']
    : ['/usr/local/bin/claude', '/usr/bin/claude'];

  // Only check known safe paths - do NOT iterate through PATH directories
  // This prevents potential command injection attacks
  for (const execPath of possiblePaths) {
    try {
      if (fs.existsSync(execPath)) {
        const versionOutput = execSync(`"${execPath}" --version`, {
          encoding: 'utf-8',
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : null;

        return { installed: true, executablePath: execPath, version };
      }
    } catch (err) {
      // Continue searching - log debug info if needed
      console.debug(`[RalphExecution] Claude Code detection failed for ${execPath}:`, err instanceof Error ? err.message : String(err));
    }
  }

  return { installed: false, executablePath: null, version: null };
}
