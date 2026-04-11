import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor, type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface EditorPaneProps {
  filePath?: string | null;
  content?: string | null;
  language?: string;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
  onSave?: (path: string, content: string) => Promise<void>;
  className?: string;
  themeVariant?: 'dark' | 'light';
}

interface FileInfo {
  path: string;
  name: string;
  language: string;
  content: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.css': 'css',
  '.html': 'html',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
};

function getLanguageFromPath(filePath: string): string {
  const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return LANGUAGE_MAP[extension] || 'plaintext';
}

function getFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
}

export function EditorPane({
  filePath,
  content,
  language,
  readOnly = true,
  onContentChange,
  onSave,
  className = '',
  themeVariant = 'dark',
}: EditorPaneProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setCurrentFile(null);
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      setError(null);

      try {
        const exists = await window.knuthflow.filesystem.exists(filePath);
        if (!exists) {
          setCurrentFile(null);
          setError(`File not found: ${filePath}`);
          return;
        }

        const fileContent = await window.knuthflow.filesystem.readFile(filePath);
        if (new Blob([fileContent]).size > MAX_FILE_SIZE) {
          setCurrentFile(null);
          setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
          return;
        }

        setCurrentFile({
          path: filePath,
          name: getFileName(filePath),
          language: language || getLanguageFromPath(filePath),
          content: fileContent,
        });
      } catch (err) {
        setCurrentFile(null);
        setError(`Failed to load file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath, language]);

  useEffect(() => {
    if (content !== undefined && content !== null) {
      setCurrentFile(prev => (prev && prev.content !== content ? { ...prev, content } : prev));
    }
  }, [content]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.updateOptions({
      readOnly,
      domReadOnly: readOnly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      wordWrap: 'off',
      automaticLayout: true,
      fontFamily: 'IBM Plex Mono, SFMono-Regular, Consolas, monospace',
      fontLigatures: false,
    });
  }, [readOnly]);

  const handleContentChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      onContentChange?.(value);
    }
  }, [onContentChange]);

  const handleSave = useCallback(async () => {
    if (!onSave || !currentFile || !filePath) return;

    try {
      await onSave(filePath, currentFile.content);
    } catch (err) {
      setError(`Failed to save file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [currentFile, filePath, onSave]);

  if (!currentFile && !loading && !error) {
    return (
      <div className={`empty-state ${className}`}>
        <div>
          <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold">No file selected</h3>
          <p className="mt-2 text-sm text-muted">Open a file from the workspace to inspect source in-place.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`empty-state ${className}`}>
        <div>
          <svg className="empty-state-icon animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3 className="text-lg font-semibold">Loading file</h3>
          <p className="mt-2 text-sm text-muted">Reading editor content and preparing syntax highlighting.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`empty-state ${className}`}>
        <div>
          <svg className="empty-state-icon text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-300">Unable to open file</h3>
          <p className="mt-2 text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`section-shell ${className}`}>
      {currentFile && (
        <div className="section-header !items-center">
          <div className="min-w-0">
            <h2 className="section-title truncate">{currentFile.name}</h2>
            <p className="section-lead text-mono" title={currentFile.path}>
              {currentFile.path}
            </p>
          </div>
          <div className="toolbar-inline">
            <span className="badge badge-neutral">{currentFile.language}</span>
            {readOnly && <span className="badge badge-info">Read Only</span>}
            {!readOnly && onSave && (
              <button onClick={handleSave} className="btn btn-primary">Save</button>
            )}
          </div>
        </div>
      )}

      {currentFile && (
        <div className="list-pane !p-3">
          <div className="h-full code-surface overflow-hidden">
            <Editor
              height="100%"
              language={currentFile.language}
              value={currentFile.content}
              theme={themeVariant === 'light' ? 'vs' : 'vs-dark'}
              onMount={handleEditorMount}
              onChange={handleContentChange}
              options={{
                readOnly,
                domReadOnly: readOnly,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                wordWrap: 'off',
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorPane;
