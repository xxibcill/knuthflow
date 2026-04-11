import React, { useState, useCallback, useMemo } from 'react';
import * as Diff from 'diff';

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'unchanged';

export interface DiffFile {
  path: string;
  originalContent: string;
  modifiedContent: string;
  status: FileStatus;
}

export interface DiffLine {
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

function getFileStatusIcon(status: FileStatus): React.ReactElement {
  switch (status) {
    case 'added':
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      );
    case 'modified':
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'deleted':
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case 'renamed':
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
}

function getStatusColor(status: FileStatus): string {
  switch (status) {
    case 'added':
      return 'bg-green-900 text-green-300 border-green-700';
    case 'modified':
      return 'bg-yellow-900 text-yellow-300 border-yellow-700';
    case 'deleted':
      return 'bg-red-900 text-red-300 border-red-700';
    case 'renamed':
      return 'bg-blue-900 text-blue-300 border-blue-700';
    default:
      return 'bg-gray-800 text-gray-300 border-gray-700';
  }
}

function getLineNumberWidth(lines: DiffLine[]): number {
  const maxLineNumber = Math.max(
    ...lines.map(l => Math.max(l.oldLineNumber || 0, l.newLineNumber || 0))
  );
  return Math.max(3, String(maxLineNumber).length + 1);
}

function DiffContent({ lines }: { lines: DiffLine[]; fileStatus: FileStatus }) {
  const lineNumberWidth = getLineNumberWidth(lines);

  return (
    <div className="font-mono text-sm overflow-auto">
      {lines.map((line, index) => {
        let bgColor = 'bg-transparent';
        let textColor = 'text-gray-400';
        let prefix = ' ';

        if (line.type === 'added') {
          bgColor = 'bg-green-900/30';
          textColor = 'text-green-300';
          prefix = '+';
        } else if (line.type === 'removed') {
          bgColor = 'bg-red-900/30';
          textColor = 'text-red-300';
          prefix = '-';
        } else if (line.type === 'header') {
          bgColor = 'bg-gray-800';
          textColor = 'text-gray-300 font-semibold';
        }

        return (
          <div
            key={index}
            className={`flex ${bgColor} ${textColor} hover:bg-opacity-50 transition-colors`}
          >
            {/* Old line number */}
            <span
              className="select-none text-right pr-4 pl-2 border-r border-gray-700 flex-shrink-0"
              style={{ width: `${lineNumberWidth + 1}ch` }}
            >
              {line.type === 'removed' || line.type === 'unchanged' ? line.oldLineNumber : ''}
            </span>
            {/* New line number */}
            <span
              className="select-none text-right pr-4 pl-2 border-r border-gray-700 flex-shrink-0"
              style={{ width: `${lineNumberWidth + 1}ch` }}
            >
              {line.type === 'added' || line.type === 'unchanged' ? line.newLineNumber : ''}
            </span>
            {/* Content */}
            <span className="px-2 flex-1 whitespace-pre">{prefix} {line.content}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DiffViewer({
  files,
  onAccept,
  onDefer,
  onClose,
  className = '',
}: DiffViewerProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set(files.map((_, i) => i)));

  const selectedFile = files[selectedFileIndex];

  const diffLines = useMemo(() => {
    if (!selectedFile) return [];

    const changes = computeDiff(selectedFile.originalContent, selectedFile.modifiedContent);
    const lines: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    // Add header
    lines.push({
      type: 'header',
      content: `--- ${selectedFile.path}`,
    });
    lines.push({
      type: 'header',
      content: `+++ ${selectedFile.path}`,
    });

    for (const change of changes) {
      const changeLines = change.value.split('\n');
      // Remove last empty line from split
      if (changeLines[changeLines.length - 1] === '') {
        changeLines.pop();
      }

      for (const line of changeLines) {
        if (change.added) {
          lines.push({
            type: 'added',
            content: line,
            newLineNumber: newLineNum++,
          });
        } else if (change.removed) {
          lines.push({
            type: 'removed',
            content: line,
            oldLineNumber: oldLineNum++,
          });
        } else {
          lines.push({
            type: 'unchanged',
            content: line,
            oldLineNumber: oldLineNum++,
            newLineNumber: newLineNum++,
          });
        }
      }
    }

    return lines;
  }, [selectedFile]);

  const toggleFileExpanded = useCallback((index: number) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let modified = 0;

    for (const file of files) {
      if (file.status === 'added') added++;
      else if (file.status === 'deleted') removed++;
      else if (file.status === 'modified') modified++;
    }

    return { added, removed, modified, total: files.length };
  }, [files]);

  // Empty state
  if (files.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 ${className}`}>
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">No changes to review</p>
        <p className="text-xs mt-1 text-gray-500">Changes made by Claude Code will appear here</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-white">Changes</h2>
          <div className="flex items-center gap-3 text-xs">
            {stats.added > 0 && (
              <span className="text-green-400">{stats.added} added</span>
            )}
            {stats.modified > 0 && (
              <span className="text-yellow-400">{stats.modified} modified</span>
            )}
            {stats.removed > 0 && (
              <span className="text-red-400">{stats.removed} deleted</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* File list sidebar */}
        <div className="w-64 flex-shrink-0 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          {files.map((file, index) => {
            const isSelected = index === selectedFileIndex;
            const isExpanded = expandedFiles.has(index);

            return (
              <div key={file.path}>
                <div
                  onClick={() => setSelectedFileIndex(index)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFileExpanded(index);
                    }}
                    className="p-0.5 hover:text-white"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {getFileStatusIcon(file.status)}
                  <span className="text-sm truncate flex-1" title={file.path}>
                    {file.path.split('/').pop()}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusColor(file.status)}`}>
                    {file.status}
                  </span>
                </div>

                {/* Expanded path */}
                {isExpanded && (
                  <div className="pl-8 pr-3 pb-2 text-xs text-gray-500 truncate">
                    {file.path}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Diff content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedFile && (
            <>
              {/* File header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                <div className="flex items-center gap-2 min-w-0">
                  {getFileStatusIcon(selectedFile.status)}
                  <span className="text-sm text-white truncate" title={selectedFile.path}>
                    {selectedFile.path}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusColor(selectedFile.status)}`}>
                    {selectedFile.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onAccept && (
                    <button
                      onClick={() => onAccept(selectedFile)}
                      className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    >
                      Accept
                    </button>
                  )}
                  {onDefer && (
                    <button
                      onClick={() => onDefer(selectedFile)}
                      className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                    >
                      Defer
                    </button>
                  )}
                </div>
              </div>

              {/* Diff content */}
              <div className="flex-1 overflow-auto">
                <DiffContent lines={diffLines} fileStatus={selectedFile.status} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiffViewer;
