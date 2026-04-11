import { useMemo, useState } from 'react';
import * as Diff from 'diff';

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'unchanged';

export interface DiffFile {
  path: string;
  originalContent: string;
  modifiedContent: string;
  status: FileStatus;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffViewerProps {
  files: DiffFile[];
  onAccept?: (file: DiffFile) => void;
  onDefer?: (file: DiffFile) => void;
  onClose?: () => void;
  className?: string;
}

function computeDiff(original: string, modified: string): Diff.Change[] {
  return Diff.diffLines(original, modified);
}

function getStatusBadge(status: FileStatus) {
  if (status === 'added') return 'badge badge-success';
  if (status === 'deleted') return 'badge badge-danger';
  if (status === 'modified') return 'badge badge-warning';
  if (status === 'renamed') return 'badge badge-info';
  return 'badge badge-neutral';
}

function getLineNumberWidth(lines: DiffLine[]) {
  const max = Math.max(...lines.map(line => Math.max(line.oldLineNumber || 0, line.newLineNumber || 0)));
  return Math.max(3, String(max).length + 1);
}

export function DiffViewer({
  files,
  onClose,
  className = '',
}: DiffViewerProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const selectedFile = files[selectedFileIndex];

  const diffLines = useMemo(() => {
    if (!selectedFile) return [];

    const changes = computeDiff(selectedFile.originalContent, selectedFile.modifiedContent);
    const lines: DiffLine[] = [
      { type: 'header', content: `--- ${selectedFile.path}` },
      { type: 'header', content: `+++ ${selectedFile.path}` },
    ];

    let oldLineNumber = 1;
    let newLineNumber = 1;

    for (const change of changes) {
      const changeLines = change.value.split('\n');
      if (changeLines[changeLines.length - 1] === '') {
        changeLines.pop();
      }

      for (const line of changeLines) {
        if (change.added) {
          lines.push({ type: 'added', content: line, newLineNumber: newLineNumber++ });
          continue;
        }

        if (change.removed) {
          lines.push({ type: 'removed', content: line, oldLineNumber: oldLineNumber++ });
          continue;
        }

        lines.push({
          type: 'unchanged',
          content: line,
          oldLineNumber: oldLineNumber++,
          newLineNumber: newLineNumber++,
        });
      }
    }

    return lines;
  }, [selectedFile]);

  const stats = useMemo(() => ({
    added: files.filter(file => file.status === 'added').length,
    modified: files.filter(file => file.status === 'modified').length,
    removed: files.filter(file => file.status === 'deleted').length,
    total: files.length,
  }), [files]);

  if (files.length === 0) {
    return (
      <div className={`empty-state ${className}`}>
        <div>
          <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold">No changes to review</h3>
          <p className="mt-2 text-sm text-muted">Claude output will show up here once files diverge.</p>
        </div>
      </div>
    );
  }

  const lineNumberWidth = getLineNumberWidth(diffLines);

  return (
    <div className={`section-shell ${className}`}>
      <div className="section-header">
        <div>
          <h2 className="section-title">Diff Review</h2>
          <p className="section-lead">Inspect file-level changes before you accept or continue the run.</p>
        </div>
        <div className="toolbar-inline">
          {stats.added > 0 && <span className="badge badge-success">{stats.added} added</span>}
          {stats.modified > 0 && <span className="badge badge-warning">{stats.modified} modified</span>}
          {stats.removed > 0 && <span className="badge badge-danger">{stats.removed} deleted</span>}
          {onClose && <button onClick={onClose} className="btn">Close</button>}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 flex-shrink-0 border-r border-[var(--border-subtle)] p-3">
          <div className="stack-sm">
            {files.map((file, index) => (
              <button
                key={`${file.path}-${index}`}
                onClick={() => setSelectedFileIndex(index)}
                className={`list-card text-left ${selectedFileIndex === index ? 'selected' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={getStatusBadge(file.status)}>{file.status}</span>
                  </div>
                  <p className="m-0 truncate text-sm font-semibold">{file.path.split('/').pop()}</p>
                  <p className="mt-1 truncate text-xs text-mono text-muted" title={file.path}>{file.path}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col p-3">
          {selectedFile && (
            <div className="mb-3 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold">{selectedFile.path.split('/').pop()}</p>
                <p className="mt-1 truncate text-xs text-mono text-muted" title={selectedFile.path}>{selectedFile.path}</p>
              </div>
              <span className={getStatusBadge(selectedFile.status)}>{selectedFile.status}</span>
            </div>
          )}

          <div className="code-surface min-h-0 flex-1 overflow-auto">
            <div className="text-mono text-xs">
              {diffLines.map((line, index) => {
                const isAdded = line.type === 'added';
                const isRemoved = line.type === 'removed';
                const isHeader = line.type === 'header';

                return (
                  <div
                    key={`${line.type}-${index}`}
                    className={[
                      'flex border-b border-[var(--border-subtle)]',
                      isHeader ? 'bg-[var(--surface-2)] text-[var(--text-secondary)]' : '',
                      isAdded ? 'bg-[color:var(--success-soft)] text-[color:var(--success)]' : '',
                      isRemoved ? 'bg-[color:var(--danger-soft)] text-[color:var(--danger)]' : '',
                      !isHeader && !isAdded && !isRemoved ? 'text-[var(--text-secondary)]' : '',
                    ].join(' ')}
                  >
                    <span
                      className="select-none border-r border-[var(--border-subtle)] px-2 py-1 text-right text-[var(--text-dim)]"
                      style={{ width: `${lineNumberWidth + 1}ch` }}
                    >
                      {line.type === 'removed' || line.type === 'unchanged' ? line.oldLineNumber : ''}
                    </span>
                    <span
                      className="select-none border-r border-[var(--border-subtle)] px-2 py-1 text-right text-[var(--text-dim)]"
                      style={{ width: `${lineNumberWidth + 1}ch` }}
                    >
                      {line.type === 'added' || line.type === 'unchanged' ? line.newLineNumber : ''}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre px-3 py-1">
                      {isHeader ? '' : isAdded ? '+ ' : isRemoved ? '- ' : '  '}
                      {line.content}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
