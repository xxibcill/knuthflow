import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface ClaudeCodeStatus {
  installed: boolean;
  executablePath: string | null;
  version: string | null;
  error: string | null;
}

export function detectClaudeCode(): ClaudeCodeStatus {
  // Common installation paths for Claude Code CLI
  const possiblePaths = process.platform === 'darwin'
    ? ['/usr/local/bin/claude', '/opt/homebrew/bin/claude', '/usr/bin/claude']
    : ['/usr/local/bin/claude', '/usr/bin/claude'];

  // Try to find claude in PATH
  const pathEnv = process.env.PATH || '';
  const pathDirs = pathEnv.split(path.delimiter);

  const allPossiblePaths = [...new Set([...possiblePaths, ...pathDirs.map(p => path.join(p, 'claude'))])];

  for (const execPath of allPossiblePaths) {
    try {
      if (fs.existsSync(execPath)) {
        // Try to get version
        try {
          const versionOutput = execSync(`"${execPath}" --version`, {
            encoding: 'utf-8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          // Parse version from output (e.g., "claude 1.0.4" or "Claude Code 1.0.4")
          const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : null;

          return {
            installed: true,
            executablePath: execPath,
            version,
            error: null,
          };
        } catch {
          // Executable exists but --version failed - might still be runnable
          return {
            installed: true,
            executablePath: execPath,
            version: null,
            error: 'Found executable but could not determine version. Claude Code may still be functional.',
          };
        }
      }
    } catch {
      // Skip paths we can't access
    }
  }

  return {
    installed: false,
    executablePath: null,
    version: null,
    error: 'Claude Code CLI not found. Please install Claude Code to use Knuthflow.',
  };
}
