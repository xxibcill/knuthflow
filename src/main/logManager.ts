import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Log Entry Types
// ─────────────────────────────────────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  // Privacy-aware: no sensitive data should be in data field
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Manager
// ─────────────────────────────────────────────────────────────────────────────

class LogManager {
  private logDir: string;
  private currentLogFile: string;
  private maxLogSize = 5 * 1024 * 1024; // 5MB
  private maxLogFiles = 5;
  private logs: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.ensureLogDir();
    this.currentLogFile = this.getLogFileName(new Date());
    this.rotateLogsIfNeeded();
    this.loadRecentLogs();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true, mode: 0o700 });
    }
  }

  private getLogFileName(date: Date): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `knuthflow-${dateStr}.log`);
  }

  private rotateLogsIfNeeded(): void {
    try {
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size > this.maxLogSize) {
          this.rotateLog();
        }
      }
    } catch (err) {
      console.error('[LogManager] Failed to check log rotation:', err);
    }
  }

  private rotateLog(): void {
    const timestamp = Date.now();
    const archiveName = path.join(this.logDir, `knuthflow-${timestamp}.log`);
    try {
      if (fs.existsSync(this.currentLogFile)) {
        fs.renameSync(this.currentLogFile, archiveName);
      }
    } catch (err) {
      console.error('[LogManager] Failed to rotate log:', err);
    }
    this.cleanOldLogs();
  }

  private cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('knuthflow-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
          time: fs.statSync(path.join(this.logDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      // Remove old files beyond maxLogFiles
      for (let i = this.maxLogFiles; i < files.length; i++) {
        try {
          fs.unlinkSync(files[i].path);
        } catch (err) {
          console.error('[LogManager] Failed to remove old log file:', files[i].path, err);
        }
      }
    } catch (err) {
      console.error('[LogManager] Failed to clean old logs:', err);
    }
  }

  private loadRecentLogs(): void {
    try {
      const todayLog = this.getLogFileName(new Date());
      if (fs.existsSync(todayLog)) {
        const content = fs.readFileSync(todayLog, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        // Load last 100 entries
        const recentLines = lines.slice(-100);
        this.logs = recentLines.map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        }).filter((l): l is LogEntry => l !== null);
      }
    } catch (err) {
      console.error('[LogManager] Failed to load recent logs:', err);
      this.logs = [];
    }
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  log(level: LogLevel, category: string, message: string, data?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
    };

    this.logs.push(entry);

    // Keep in-memory logs bounded
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }

    // Async write to file
    this.scheduleFlush();

    return entry;
  }

  private sanitizeData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!data) return undefined;

    // Remove potentially sensitive fields
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential', 'api_key', 'apikey'];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flushToFile();
      this.flushTimer = null;
    }, this.flushInterval);
  }

  private flushToFile(): void {
    try {
      const lines = this.logs.map(l => JSON.stringify(l)).join('\n') + '\n';
      fs.appendFileSync(this.currentLogFile, lines, 'utf-8');
    } catch (err) {
      // Log to console for diagnostics system failures
      console.error('[LogManager] Failed to flush logs to file:', err);
    }
  }

  debug(category: string, message: string, data?: Record<string, unknown>): LogEntry {
    return this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: Record<string, unknown>): LogEntry {
    return this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: Record<string, unknown>): LogEntry {
    return this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: Record<string, unknown>): LogEntry {
    return this.log(LogLevel.ERROR, category, message, data);
  }

  getLogs(limit = 100, level?: LogLevel): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter(l => l.level === level);
    }
    return filtered.slice(-limit).reverse();
  }

  getLogsByCategory(category: string, limit = 50): LogEntry[] {
    return this.logs
      .filter(l => l.category === category)
      .slice(-limit)
      .reverse();
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(format: 'json' | 'text' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    // Text format
    return this.logs.map(l => {
      const date = new Date(l.timestamp).toISOString();
      return `[${date}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`;
    }).join('\n');
  }

  getLogFilePaths(): string[] {
    try {
      return fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('knuthflow-') && f.endsWith('.log'))
        .map(f => path.join(this.logDir, f))
        .sort()
        .reverse();
    } catch (err) {
      console.error('[LogManager] Failed to get log file paths:', err);
      return [];
    }
  }
}

// Singleton instance
let logManagerInstance: LogManager | null = null;

export function getLogManager(): LogManager {
  if (!logManagerInstance) {
    logManagerInstance = new LogManager();
  }
  return logManagerInstance;
}

/**
 * Resets the log manager singleton. For testing purposes only.
 */
export function resetLogManager(): void {
  if (logManagerInstance) {
    logManagerInstance.clearLogs();
    logManagerInstance = null;
  }
}

