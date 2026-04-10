import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalSession } from './TerminalSession';

interface TerminalProps {
  session?: TerminalSession | null;
  onResize?: (cols: number, rows: number) => void;
  className?: string;
}

interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

const DEFAULT_THEME: TerminalTheme = {
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

export function Terminal({ session, onResize, className = '' }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);

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
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;
    setIsReady(true);

    // Initial resize callback
    if (onResize) {
      onResize(xterm.cols, xterm.rows);
    }

    // Cleanup on unmount
    return () => {
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      setIsReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        if (onResize) {
          onResize(cols, rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Also handle resize events from the container
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [onResize]);

  // Attach session data handlers when session changes
  useEffect(() => {
    if (!xtermRef.current || !isReady) return;

    const xterm = xtermRef.current;
    let dataDisposable: { dispose: () => void } | null = null;

    if (session) {
      // Send data to terminal
      const handleData = (data: string) => {
        session.write(data);
      };
      dataDisposable = xterm.onData(handleData);

      // Receive data from session
      const handleSessionData = (data: string) => {
        xterm.write(data);
      };
      session.onData(handleSessionData);

      // Handle session close
      const handleSessionClose = () => {
        xterm.write('\r\n\x1b[33m[Session closed]\x1b[0m\r\n');
      };
      session.onClose(handleSessionClose);

      return () => {
        if (dataDisposable) {
          dataDisposable.dispose();
        }
        session.offData(handleSessionData);
        session.offClose(handleSessionClose);
      };
    }
  }, [session, isReady]);

  const writeToTerminal = useCallback((data: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(data);
    }
  }, []);

  // Expose write method via ref for external use
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { write: (data: string) => void }).write = writeToTerminal;
    }
  }, [writeToTerminal]);

  return (
    <div className={`terminal-wrapper ${className}`}>
      {!session && (
        <div className="terminal-empty-state">
          <div className="text-center text-gray-500">
            <div className="text-lg mb-2">No session attached</div>
            <div className="text-sm">Start a session to see terminal output</div>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="terminal-container"
        style={{
          display: session ? 'block' : 'none',
          height: '100%',
          width: '100%',
        }}
      />
    </div>
  );
}

// Empty state styles (can be moved to CSS)
const style = document.createElement('style');
style.textContent = `
  .terminal-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    background: #1e1e1e;
  }
  .terminal-empty-state {
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
