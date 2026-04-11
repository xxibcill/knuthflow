export interface SessionState {
  sessionId: string;
  ptySessionId: string;
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
  isValid: boolean;
}

// Session expiration time (24 hours)
// TODO: Make configurable via RalphRuntimeConfig
export const SESSION_EXPIRATION_MS = 24 * 60 * 60 * 1000;
