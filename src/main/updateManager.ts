import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateInfo {
  available: boolean;
  version: string | null;
  releaseDate: string | null;
  releaseNotes: string | null;
  downloadUrl: string | null;
  isMandatory: boolean;
}

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdateError {
  message: string;
  code?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UpdateManager
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateManager {
  private readonly GITHUB_REPO = 'xxibcill/knuthflow';
  private readonly UPDATE_API_URL = `https://api.github.com/repos/${this.GITHUB_REPO}/releases/latest`;

  /**
   * Get the current app version
   */
  getCurrentVersion(): string {
    return app.getVersion();
  }

  /**
   * Check for updates by fetching the latest GitHub release
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = this.getCurrentVersion();

    try {
      // Fetch latest release from GitHub API
      const latestRelease = await this.fetchLatestRelease();

      if (!latestRelease) {
        return {
          available: false,
          version: null,
          releaseDate: null,
          releaseNotes: null,
          downloadUrl: null,
          isMandatory: false,
        };
      }

      const latestVersion = latestRelease.tag_name?.replace(/^v/, '') || '';
      const isNewer = this.isNewerVersion(latestVersion, currentVersion);

      return {
        available: isNewer,
        version: latestVersion,
        releaseDate: latestRelease.published_at || null,
        releaseNotes: latestRelease.body || null,
        downloadUrl: latestRelease.html_url || null,
        isMandatory: false, // Could be set based on release tag or body content
      };
    } catch (error) {
      console.error('[UpdateManager] Failed to check for updates:', error);
      return {
        available: false,
        version: null,
        releaseDate: null,
        releaseNotes: null,
        downloadUrl: null,
        isMandatory: false,
      };
    }
  }

  /**
   * Fetch the latest release from GitHub API
   */
  private async fetchLatestRelease(): Promise<{
    tag_name: string | null;
    published_at: string | null;
    body: string | null;
    html_url: string | null;
  } | null> {
    try {
      const curl = `curl -sL "${this.UPDATE_API_URL}" -H "Accept: application/vnd.github.v3+json"`;
      const output = execSync(curl, { encoding: 'utf-8', timeout: 10000 }) as string;
      const parsed = JSON.parse(output);
      return {
        tag_name: parsed.tag_name || null,
        published_at: parsed.published_at || null,
        body: parsed.body || null,
        html_url: parsed.html_url || null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Compare two semantic versions
   * Returns true if v1 > v2
   */
  private isNewerVersion(v1: string, v2: string): boolean {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return true;
      if (p1 < p2) return false;
    }
    return false;
  }

  /**
   * Open the download URL in the default browser
   */
  openDownloadPage(downloadUrl: string): void {
    const { shell } = require('electron');
    shell.openExternal(downloadUrl);
  }

  /**
   * Format release notes for display
   */
  formatReleaseNotes(notes: string | null, maxLength = 500): string | null {
    if (!notes) return null;

    // Strip markdown formatting for plain text display
    let formatted = notes
      .replace(/#{1,6}\s*/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/`(.+?)`/g, '$1') // Remove code spans
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Convert links to text
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .trim();

    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength) + '...';
    }

    return formatted;
  }

  /**
   * Get the platform-specific download URL
   */
  getPlatformDownloadUrl(baseUrl: string): string {
    const platform = process.platform;
    const arch = process.arch;

    // GitHub releases page - user can download appropriate asset
    return baseUrl;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level singleton instance
// ─────────────────────────────────────────────────────────────────────────────

let updateManagerInstance: UpdateManager | null = null;

export function getUpdateManager(): UpdateManager {
  if (!updateManagerInstance) {
    updateManagerInstance = new UpdateManager();
  }
  return updateManagerInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers Registration
// ─────────────────────────────────────────────────────────────────────────────

export function registerUpdateHandlers(): void {
  const updateManager = getUpdateManager();

  ipcMain.handle('update:check', async () => {
    return updateManager.checkForUpdates();
  });

  ipcMain.handle('update:getVersion', async () => {
    return updateManager.getCurrentVersion();
  });

  ipcMain.handle('update:openDownload', async (_event, downloadUrl: string) => {
    updateManager.openDownloadPage(downloadUrl);
    return { success: true };
  });

  ipcMain.handle('update:formatNotes', async (_event, notes: string | null) => {
    return updateManager.formatReleaseNotes(notes);
  });
}
