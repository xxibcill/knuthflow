import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

interface TerminalProps {
  sessionId?: string | null;
  onSessionCreated?: (sessionId: string) => void;
  onSessionExit?: (exitCode: number, signal?: number) => void;
  onResize?: (cols: number, rows: number) => void;
  className?: string;
  themeVariant?: 'dark' | 'light';
  fontFamily?: string;
  fontSize?: number;
  cursorStyle?: 'block' | 'underline' | 'bar';
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

const DARK_THEME = {
  background: '#101826',
  foreground: '#d7deeb',
  cursor: '#72a8ff',
  cursorAccent: '#101826',
  selectionBackground: '#22467d',
  black: '#18202c',
  red: '#ec6d73',
  green: '#79d2a6',
  yellow: '#f2be6a',
  blue: '#72a8ff',
  magenta: '#bb9af7',
  cyan: '#67d4f1',
  white: '#c9d5e9',
  brightBlack: '#66758f',
  brightRed: '#ff8990',
  brightGreen: '#8be1b5',
  brightYellow: '#ffcf82',
  brightBlue: '#8ebcff',
  brightMagenta: '#cab2ff',
  brightCyan: '#8be7ff',
  brightWhite: '#f3f7ff',
};

const LIGHT_THEME = {
  background: '#f7fbff',
  foreground: '#203042',
  cursor: '#2354b7',
  cursorAccent: '#f7fbff',
  selectionBackground: '#cae0ff',
  black: '#1d2b3f',
  red: '#be3b48',
  green: '#297a52',
  yellow: '#996200',
  blue: '#2354b7',
  magenta: '#8245c6',
  cyan: '#0d7492',
  white: '#eef4fb',
  brightBlack: '#607189',
  brightRed: '#d95863',
  brightGreen: '#328f61',
  brightYellow: '#b27300',
  brightBlue: '#3d67c6',
  brightMagenta: '#9b61d9',
  brightCyan: '#1a88a8',
  brightWhite: '#ffffff',
};

export function Terminal({
  sessionId,
  onSessionCreated,
  onSessionExit,
  onResize,
  className = '',
  themeVariant = 'dark',
  fontFamily = 'IBM Plex Mono, SFMono-Regular, Consolas, monospace',
  fontSize = 14,
  cursorStyle = 'block',
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(sessionId || null);
  const ownedSessionRef = useRef(!sessionId);
  const onSessionExitRef = useRef(onSessionExit);
  const onResizeRef = useRef(onResize);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onSessionExitRef.current = onSessionExit;
  }, [onSessionExit]);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    sessionIdRef.current = sessionId || null;
    ownedSessionRef.current = !sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const xterm = new XTerm({
      theme: themeVariant === 'light' ? LIGHT_THEME : DARK_THEME,
      fontFamily,
      fontSize,
      lineHeight: 1.24,
      cursorBlink: true,
      cursorStyle,
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Only open xterm once container has proper dimensions
    const openTerminal = () => {
      if (!containerRef.current || !xtermRef.current || !fitAddonRef.current) return;

      // Wait for container to have non-zero dimensions
      if (containerRef.current.offsetWidth === 0 || containerRef.current.offsetHeight === 0) {
        requestAnimationFrame(openTerminal);
        return;
      }

      xtermRef.current.open(containerRef.current);

      // Now fit - xterm is fully initialized
      fitAddonRef.current.fit();

      if (onResizeRef.current) {
        onResizeRef.current(xterm.cols, xterm.rows);
      }
    };

    requestAnimationFrame(openTerminal);

    return () => {
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!xtermRef.current) return;

    xtermRef.current.options.theme = themeVariant === 'light' ? LIGHT_THEME : DARK_THEME;
    xtermRef.current.options.fontFamily = fontFamily;
    xtermRef.current.options.fontSize = fontSize;
    xtermRef.current.options.cursorStyle = cursorStyle;
    fitAddonRef.current?.fit();
  }, [cursorStyle, fontFamily, fontSize, themeVariant]);

  useEffect(() => {
    if (sessionIdRef.current || loading) return;

    setLoading(true);
    window.knuthflow.pty.create()
      .then((id: string) => {
        sessionIdRef.current = id;
        ownedSessionRef.current = true;
        setLoading(false);
        onSessionCreated?.(id);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [loading, onSessionCreated]);

  useEffect(() => {
    if (!xtermRef.current) return;

    const unsubscribe = window.knuthflow.pty.onData((event: PtyDataEvent) => {
      if (event.sessionId === sessionIdRef.current) {
        xtermRef.current?.write(event.data);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!xtermRef.current) return;

    const dataDisposable = xtermRef.current.onData((data: string) => {
      if (sessionIdRef.current) {
        window.knuthflow.pty.write(sessionIdRef.current, data);
      }
    });

    return () => dataDisposable.dispose();
  }, []);

  useEffect(() => {
    const unsubscribe = window.knuthflow.pty.onExit((event: PtyExitEvent) => {
      if (event.sessionId !== sessionIdRef.current) return;

      onSessionExitRef.current?.(event.exitCode, event.signal);
      xtermRef.current?.write(`\r\n\x1b[33m[Session exited with code ${event.exitCode}]\x1b[0m\r\n`);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!sessionIdRef.current || !fitAddonRef.current || !xtermRef.current || !containerRef.current) return;
      if (containerRef.current.offsetWidth > 0 && containerRef.current.offsetHeight > 0) {
        fitAddonRef.current.fit();
      }
      const { cols, rows } = xtermRef.current;
      window.knuthflow.pty.resize(sessionIdRef.current, cols, rows);
      onResizeRef.current?.(cols, rows);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current && ownedSessionRef.current) {
        window.knuthflow.pty.kill(sessionIdRef.current).catch(() => undefined);
      }
    };
  }, []);

  return (
    <div className={`terminal-wrapper ${themeVariant} ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 grid place-items-center">
          <div className="surface-panel-inset px-5 py-4 text-center">
            <p className="m-0 text-sm font-semibold">Initializing terminal</p>
            <p className="mt-1 text-xs text-muted">Preparing interactive session state.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 grid place-items-center px-4">
          <div className="surface-panel-inset max-w-sm px-5 py-4 text-center">
            <p className="m-0 text-sm font-semibold text-red-300">Terminal Error</p>
            <p className="mt-1 text-xs leading-5 text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="terminal-shell">
        <div
          ref={containerRef}
          className="terminal-container h-full w-full"
          style={{ display: loading || error ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}

const style = document.createElement('style');
style.textContent = `
  .terminal-container .xterm {
    height: 100%;
    padding: 14px 12px 12px;
  }

  .terminal-container .xterm-viewport {
    overflow-y: auto !important;
  }
`;
document.head.appendChild(style);

export default Terminal;
