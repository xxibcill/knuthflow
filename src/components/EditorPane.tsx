import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

interface EditorPaneProps {
  filePath?: string | null;
  content?: string | null;
  language?: string;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
  onFileOpen?: (path: string) => void;
  className?: string;
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
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return LANGUAGE_MAP[ext] || 'plaintext';
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
  onFileOpen,
  className = '',
}: EditorPaneProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load file content when filePath changes
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
          setError(`File not found: ${filePath}`);
          setCurrentFile(null);
          return;
        }

        const fileContent = await window.knuthflow.filesystem.readFile(filePath);
        const fileName = getFileName(filePath);
        const detectedLanguage = language || getLanguageFromPath(filePath);

        setCurrentFile({
          path: filePath,
          name: fileName,
          language: detectedLanguage,
          content: fileContent,
        });
      } catch (err) {
        setError(`Failed to load file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setCurrentFile(null);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath, language]);

  // Update content when prop changes (for diff viewer)
  useEffect(() => {
    if (content !== undefined && content !== null && currentFile) {
      setCurrentFile(prev => prev ? { ...prev, content } : null);
    }
  }, [content]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    // Configure editor for read-only mode
    if (readOnly) {
      editor.updateOptions({
        readOnly: true,
        domReadOnly: true,
      });
    }

    // Configure editor settings
    editor.updateOptions({
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
    });
  }, [readOnly]);

  const handleContentChange = useCallback((value: string | undefined) => {
    if (value !== undefined && onContentChange) {
      onContentChange(value);
    }
  }, [onContentChange]);

  const handleOpenFile = useCallback(async () => {
    if (onFileOpen) {
      onFileOpen(filePath || '');
    }
  }, [filePath, onFileOpen]);

  // Empty state
  if (!currentFile && !loading && !error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 ${className}`}>
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">No file open</p>
        <p className="text-xs mt-1 text-gray-500">Select a file to view its contents</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-sm">Loading file...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gray-900 text-red-400 ${className}`}>
        <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm font-medium">Error</p>
        <p className="text-xs mt-1 text-red-500 max-w-xs text-center">{error}</p>
      </div>
    );
  }

  // Editor with file
  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* File header */}
      {currentFile && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-300 truncate" title={currentFile.path}>
              {currentFile.name}
            </span>
            {readOnly && (
              <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-700 rounded">
                Read-only
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{currentFile.language}</span>
            {!readOnly && (
              <button
                onClick={handleOpenFile}
                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1"
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}

      {/* Monaco Editor */}
      {currentFile && (
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={currentFile.language}
            value={currentFile.content}
            theme="vs-dark"
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
              fontSize: 14,
              fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
            }}
            loading={
              <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

// Styles
const style = document.createElement('style');
style.textContent = `
  .editor-pane-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
`;
document.head.appendChild(style);

export default EditorPane;
