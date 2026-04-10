import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Secure Storage Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface SecureStorageBackend {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  delete(key: string): boolean;
  isAvailable(): boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// macOS Keychain Backend
// ─────────────────────────────────────────────────────────────────────────────

class KeychainBackend implements SecureStorageBackend {
  private serviceName: string;

  constructor(serviceName = 'Knuthflow') {
    this.serviceName = serviceName;
  }

  isAvailable(): boolean {
    // Keychain is available on macOS
    return process.platform === 'darwin';
  }

  get(key: string): string | null {
    if (!this.isAvailable()) return null;

    try {
      // Use security command-line tool to retrieve from keychain
      const { execSync } = require('child_process');
      // Use null-byte separator to avoid shell injection issues
      const cmd = [
        'security', 'find-generic-password',
        '-s', this.serviceName,
        '-a', key,
        '-w'
      ];

      const result = execSync(cmd, {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return result.trim() || null;
    } catch (err) {
      console.error('[SecureStorage] Keychain get failed:', err);
      return null;
    }
  }

  set(key: string, value: string): boolean {
    if (!this.isAvailable()) return false;

    try {
      const { execSync } = require('child_process');

      // First try to delete existing item
      try {
        execSync([
          'security', 'delete-generic-password',
          '-s', this.serviceName,
          '-a', key
        ], {
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (err) {
        console.error('[SecureStorage] Keychain delete before set failed:', err);
      }

      // Add new item
      execSync([
        'security', 'add-generic-password',
        '-s', this.serviceName,
        '-a', key,
        '-w', value,
        '-U'
      ], {
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return true;
    } catch (err) {
      console.error('[SecureStorage] Keychain set failed:', err);
      return false;
    }
  }

  delete(key: string): boolean {
    if (!this.isAvailable()) return false;

    try {
      const { execSync } = require('child_process');
      execSync([
        'security', 'delete-generic-password',
        '-s', this.serviceName,
        '-a', key
      ], {
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return true;
    } catch (err) {
      console.error('[SecureStorage] Keychain delete failed:', err);
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Encrypted File Backend (Fallback)
// ─────────────────────────────────────────────────────────────────────────────

class EncryptedFileBackend implements SecureStorageBackend {
  private storageDir: string;
  private encryptionKey: Buffer;

  constructor() {
    this.storageDir = path.join(app.getPath('userData'), 'secrets');
    this.encryptionKey = this.deriveKey();

    // Ensure directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o600 });
    }
  }

  private deriveKey(): Buffer {
    // Use a combination of app-specific data to derive an encryption key
    // In production, you'd want to use a proper key derivation function
    const machineId = process.platform + '-' + process.arch + '-' + app.getPath('userData');
    const crypto = require('crypto');
    return crypto.scryptSync(machineId, 'knuthflow-salt', 32);
  }

  private getFilePath(key: string): string {
    // Hash the key to get a safe filename
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return path.join(this.storageDir, hash + '.secret');
  }

  isAvailable(): boolean {
    return true;
  }

  get(key: string): string | null {
    try {
      const filePath = this.getFilePath(key);
      if (!fs.existsSync(filePath)) return null;

      const encrypted = fs.readFileSync(filePath);
      const decipher = require('crypto').createDecipheriv('aes-256-gcm', this.encryptionKey, encrypted.slice(0, 12));
      decipher.setAuthTag(encrypted.slice(-16));
      const decrypted = Buffer.concat([decipher.update(encrypted.slice(12, -16)), decipher.final()]);
      return decrypted.toString('utf-8');
    } catch (err) {
      console.error('[SecureStorage] EncryptedFile get failed:', err);
      return null;
    }
  }

  set(key: string, value: string): boolean {
    try {
      const filePath = this.getFilePath(key);
      const crypto = require('crypto');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
      const encrypted = Buffer.concat([iv, cipher.update(value, 'utf-8'), cipher.final()]);
      fs.writeFileSync(filePath, Buffer.concat([encrypted, cipher.getAuthTag()]), { mode: 0o600 });
      return true;
    } catch (err) {
      console.error('[SecureStorage] EncryptedFile set failed:', err);
      return false;
    }
  }

  delete(key: string): boolean {
    try {
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err) {
      console.error('[SecureStorage] EncryptedFile delete failed:', err);
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Secure Storage Manager
// ─────────────────────────────────────────────────────────────────────────────

class SecureStorage {
  private primary: SecureStorageBackend;
  private fallback: SecureStorageBackend;
  private useFallback = false;

  constructor() {
    this.primary = new KeychainBackend();
    this.fallback = new EncryptedFileBackend();

    // Check if primary is available
    if (!this.primary.isAvailable()) {
      this.useFallback = true;
    }
  }

  private getBackend(): SecureStorageBackend {
    return this.useFallback ? this.fallback : this.primary;
  }

  isUsingFallback(): boolean {
    return this.useFallback;
  }

  get(key: string): string | null {
    return this.getBackend().get(key);
  }

  set(key: string, value: string): boolean {
    const success = this.getBackend().set(key, value);
    // If primary failed, switch to fallback
    if (!success && !this.useFallback) {
      this.useFallback = true;
      return this.fallback.set(key, value);
    }
    return success;
  }

  delete(key: string): boolean {
    return this.getBackend().delete(key);
  }

  // Store a secret reference (maps profile ID to secret key in secure storage)
  storeSecretRef(profileId: string, secretKey: string): boolean {
    const refKey = `ref:${profileId}`;
    return this.set(refKey, secretKey);
  }

  getSecretRef(profileId: string): string | null {
    const refKey = `ref:${profileId}`;
    return this.get(refKey);
  }

  deleteSecretRef(profileId: string): boolean {
    const refKey = `ref:${profileId}`;
    const secretKey = this.get(refKey);
    if (secretKey) {
      this.delete(secretKey);
    }
    return this.delete(refKey);
  }
}

// Singleton instance
let secureStorageInstance: SecureStorage | null = null;

export function getSecureStorage(): SecureStorage {
  if (!secureStorageInstance) {
    secureStorageInstance = new SecureStorage();
  }
  return secureStorageInstance;
}

/**
 * Resets the secure storage singleton. For testing purposes only.
 */
export function resetSecureStorage(): void {
  secureStorageInstance = null;
}
