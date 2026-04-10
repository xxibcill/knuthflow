# IPC Contract - Process Boundaries and IPC Design

## Overview

This document defines the explicit boundaries between the main process, preload layer, and renderer process in the Knuthflow Electron application.

## Process Model

```
┌─────────────────────────────────────────────────────────┐
│                     Main Process                        │
│  - Process control (spawning Claude Code CLI)          │
│  - Storage and persistence                              │
│  - Filesystem access                                    │
│  - App lifecycle management                             │
│  - IPC handler registration                            │
└─────────────────────────────────────────────────────────┘
                           │ IPC
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Preload                            │
│  - Context bridge (secure API exposure)                 │
│  - Input validation                                     │
│  - Type-safe channel interface                         │
└─────────────────────────────────────────────────────────┘
                           │ contextBridge
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Renderer Process                      │
│  - React UI                                             │
│  - User interaction handling                            │
│  - Display logic only                                  │
└─────────────────────────────────────────────────────────┘
```

## Ownership Rules

### Main Process (Exclusive Responsibilities)

| Responsibility | Rationale |
|---------------|-----------|
| Spawning child processes (Claude Code CLI) | OS-level process management, security isolation |
| Reading/writing to filesystem | Direct filesystem access required |
| Persistent storage (settings, session state) | Data integrity and atomicity |
| App window management | Electron API access required |
| System-level operations | Native APIs only available in main |

### Renderer Process (Exclusive Responsibilities)

| Responsibility | Rationale |
|---------------|-----------|
| React component rendering | ReactDOM tied to renderer |
| User input handling | DOM event listeners |
| UI state management | React state/context |
| Display logic | Pure presentation concerns |

### Preload (Minimal API Surface)

The preload exposes ONLY typed IPC invoke methods. No direct Electron APIs are accessible from the renderer.

## IPC Channel Naming Convention

```
pattern: {domain}:{action}

domains:
  - process    → Claude Code CLI process management
  - storage     → Persistent storage operations
  - filesystem  → File operations
  - app         → Application-level operations
```

### Channel Definitions

#### Process Management (`process:*`)

| Channel | Direction | Payload | Response | Purpose |
|---------|-----------|---------|----------|---------|
| `process:spawn` | Renderer → Main | `{ args: string[], cwd?: string }` | `{ pid: number }` | Spawn Claude Code session |
| `process:send` | Renderer → Main | `{ pid: number, input: string }` | `void` | Send input to process |
| `process:kill` | Renderer → Main | `{ pid: number }` | `void` | Terminate process |
| `process:list` | Renderer → Main | `void` | `{ pid: number, status: string }[]` | List active processes |

#### Storage Operations (`storage:*`)

| Channel | Direction | Payload | Response | Purpose |
|---------|-----------|---------|----------|---------|
| `storage:get` | Renderer → Main | `{ key: string }` | `unknown` | Get stored value |
| `storage:set` | Renderer → Main | `{ key: string, value: unknown }` | `void` | Store value |
| `storage:delete` | Renderer → Main | `{ key: string }` | `void` | Delete stored value |

#### Filesystem Operations (`filesystem:*`)

| Channel | Direction | Payload | Response | Purpose |
|---------|-----------|---------|----------|---------|
| `filesystem:readFile` | Renderer → Main | `{ path: string, encoding?: string }` | `string` | Read file contents |
| `filesystem:writeFile` | Renderer → Main | `{ path: string, content: string }` | `void` | Write file contents |
| `filesystem:exists` | Renderer → Main | `{ path: string }` | `boolean` | Check file existence |

#### App Operations (`app:*`)

| Channel | Direction | Payload | Response | Purpose |
|---------|-----------|---------|----------|---------|
| `app:getVersion` | Renderer → Main | `void` | `string` | Get app version |

## Typed API Surface (Preload)

```typescript
interface KnuthflowAPI {
  // Process management
  process: {
    spawn(args: string[], cwd?: string): Promise<{ pid: number }>;
    send(pid: number, input: string): Promise<void>;
    kill(pid: number): Promise<void>;
    list(): Promise<Array<{ pid: number; status: string }>>;
  };
  // Storage operations
  storage: {
    get<T = unknown>(key: string): Promise<T>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };
  // Filesystem operations
  filesystem: {
    readFile(path: string, encoding?: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
  };
  // App operations
  app: {
    getVersion(): Promise<string>;
  };
}
```

## Safe Expansion Guidelines

When adding new IPC channels:

1. **Justify necessity** - Can the renderer do this without main process?
2. **Use typed payloads** - All channels must have TypeScript interfaces
3. **Document in this file** - Add new channels to the tables above
4. **Implement in main handlers** - Follow existing pattern in main process
5. **Expose via preload** - Add to KnuthflowAPI interface
6. **Validate input** - Never trust renderer data, validate in main handler

## Security Configuration

The following security-sensitive defaults are enforced in the main process window creation:

### BrowserWindow WebPreferences

| Setting | Value | Purpose |
|---------|-------|---------|
| `contextIsolation` | `true` | Renderer has isolated JavaScript context - preload and renderer share no scope |
| `nodeIntegration` | `false` | Renderer cannot access Node.js APIs directly |
| `sandbox` | `true` | Renderer runs in sandboxed OS process |
| `webSecurity` | `true` | Enforces same-origin policy and prevents CORS bypasses |
| `allowRunningInsecureContent` | `false` | Blocks loading mixed HTTP/HTTPS content |

### Navigation Constraints

| Handler | Behavior |
|---------|----------|
| `setWindowOpenHandler` | Denies all `window.open()` calls from renderer |
| `will-navigate` | Prevents navigation to any origin except `file://` (app origin) |

### Content Security Policy

Set in `index.html` via CSP header:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

This policy restricts loading to same-origin scripts and allows inline styles (required for Tailwind).

## Implementation Notes

- All IPC uses `ipcMain.handle` for invoke/response pattern
- Preload uses `contextBridge.exposeInMainWorld` for secure API exposure
- Renderer receives no direct Electron API access
- No `ipcRenderer.on` listeners in renderer (单向数据流)