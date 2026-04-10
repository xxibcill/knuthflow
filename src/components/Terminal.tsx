import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

interface TerminalProps {
  sessionId?: string | null;
  onSessionCreated?: (sessionId: string) => void;
  onSessionExit?: (exitCode: number, signal?: number) => void;
  onResize?: (cols: number, rows: number) => void;
  className?: string;
}

interface PtyDataEvent {
  sessionId: string;
  data: string;
}

interface PtyExitEvent {
  sessionId: string;
  exitCode: number;
  signal?: number;
}

const DEFAULT_THEME = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#ffffff',
  cursorAccent: '#000000',
  selectionBackground: '#264f78',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff',
};

export function Terminal({ sessionId: initialSessionId, onSessionCreated, onSessionExit, onResize, className = '' }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(initialSessionId || null);
  const onSessionExitRef = useRef(onSessionExit);
  const onResizeRef = useRef(onResize);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep refs up to date
  useEffect(() => {
    onSessionExitRef.current = onSessionExit;
  }, [onSessionExit]);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  // Initialize xterm
  useEffect(() => {
    if (!containerRef.current) return;

    const xterm = new XTerm({
      theme: DEFAULT_THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(containerRef.current);

    // Use requestAnimationFrame to ensure the terminal is rendered before fitting
    // Retry a few times in case container becomes visible after a frame
    let fitAttempts = 0;
    const fitTerminal = () => {
      if (fitAddonRef.current && containerRef.current &&
          containerRef.current.offsetWidth > 0 && containerRef.current.offsetHeight > 0) {
        fitAddonRef.current.fit();
      } else if (fitAttempts < 3) {
        fitAttempts++;
        requestAnimationFrame(fitTerminal);
      }
    };
    requestAnimationFrame(fitTerminal);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Initial resize callback
    if (onResizeRef.current) {
      onResizeRef.current(xterm.cols, xterm.rows);
    }

    return () => {
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Create PTY session
  useEffect(() => {
    if (sessionIdRef.current || loading) return;

    setLoading(true);
    window.knuthflow.pty.create().then((id: string) => {
      sessionIdRef.current = id;
      setLoading(false);
      if (onSessionCreated) {
        onSessionCreated(id);
      }
    }).catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, [loading]);

  // Wire PTY data -> xterm
  useEffect(() => {
    if (!sessionIdRef.current || !xtermRef.current) return;

    const currentSessionId = sessionIdRef.current;
    const handleData = (event: PtyDataEvent) => {
      if (event.sessionId === currentSessionId && xtermRef.current) {
        xtermRef.current.write(event.data);
      }
    };

    const unsubscribe = window.knuthflow.pty.onData(handleData);

    return () => {
      unsubscribe();
    };
  }, []);

  // Wire xterm data -> PTY
  useEffect(() => {
    if (!sessionIdRef.current || !xtermRef.current) return;

    const currentSessionId = sessionIdRef.current;
    const xterm = xtermRef.current;
    const dataDisposable = xterm.onData((data: string) => {
      window.knuthflow.pty.write(currentSessionId, data);
    });

    return () => {
      dataDisposable.dispose();
    };
  }, []);

  // Wire PTY exit event
  useEffect(() => {
    if (!sessionIdRef.current) return;

    const currentSessionId = sessionIdRef.current;
    const handleExit = (event: PtyExitEvent) => {
      if (event.sessionId === currentSessionId) {
        if (onSessionExitRef.current) {
          onSessionExitRef.current(event.exitCode, event.signal);
        }
        xtermRef.current?.write('\r\n\x1b[33m[Session exited with code ' + event.exitCode + ']\x1b[0m\r\n');
      }
    };

    const unsubscribe = window.knuthflow.pty.onExit(handleExit);

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle resize - sync xterm dimensions to PTY
  useEffect(() => {
    if (!sessionIdRef.current || !fitAddonRef.current || !xtermRef.current) return;

    const currentSessionId = sessionIdRef.current;
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && containerRef.current) {
        // Only fit if container has actual dimensions
        if (containerRef.current.offsetWidth > 0 && containerRef.current.offsetHeight > 0) {
          fitAddonRef.current.fit();
        }
        const { cols, rows } = xtermRef.current;
        window.knuthflow.pty.resize(currentSessionId, cols, rows);
        if (onResizeRef.current) {
          onResizeRef.current(cols, rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial resize
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Cleanup PTY session on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        window.knuthflow.pty.kill(sessionIdRef.current).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, []);

  return (
    <div className={`terminal-wrapper ${className}`}>
      {loading && (
        <div className="terminal-loading">
          <div className="text-center text-gray-500">
            <div className="text-lg mb-2">Initializing terminal...</div>
          </div>
        </div>
      )}
      {error && (
        <div className="terminal-error">
          <div className="text-center text-red-500">
            <div className="text-lg mb-2">Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="terminal-container"
        style={{
          display: (loading || error) ? 'none' : 'block',
          height: '100%',
          width: '100%',
        }}
      />
    </div>
  );
}

// Styles
const style = document.createElement('style');
style.textContent = `
  .terminal-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    background: #1e1e1e;
  }
  .terminal-error {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e1e1e;
    z-index: 10;
  }
  .terminal-container {
    width: 100%;
    height: 100%;
  }
  .terminal-container .xterm {
    padding: 8px;
  }
  .terminal-container .xterm-viewport {
    overflow-y: auto !important;
  }
`;
document.head.appendChild(style);

export default Terminal;
