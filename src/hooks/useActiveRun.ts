import { useState, useCallback } from 'react';
import type { ClaudeRunState } from '../shared/preloadTypes';

export interface ActiveRun {
  runId: string;
  sessionId: string;
  state: ClaudeRunState;
  exitCode?: number;
  signal?: number;
  error?: string;
}

export function useActiveRun() {
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);

  const startRun = useCallback((runId: string, sessionId: string) => {
    setActiveRun({
      runId,
      sessionId,
      state: 'starting',
    });
  }, []);

  const updateRun = useCallback((data: Partial<ActiveRun> & { runId: string }) => {
    setActiveRun(prev => prev && data.runId === prev.runId ? { ...prev, ...data } : prev);
  }, []);

  const stopRun = useCallback(() => {
    setActiveRun(null);
  }, []);

  return {
    activeRun,
    startRun,
    updateRun,
    stopRun,
  };
}
