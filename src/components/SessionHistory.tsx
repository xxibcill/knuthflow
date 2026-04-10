import { useState, useEffect } from 'react';
import type { Session, Workspace } from '../preload';

interface SessionHistoryProps {
  onRestore: (session: Session) => void;
  currentWorkspaceId: string | null;
}

export function SessionHistory({ onRestore, currentWorkspaceId }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [workspaces, setWorkspaces] = useState<Map<string, Workspace>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [currentWorkspaceId]);

  const loadSessions = async () => {
    setLoading(true);
    const recentSessions = await window.knuthflow.session.listRecent(currentWorkspaceId, 50);
    setSessions(recentSessions);

    // Load workspace info for each session
    const workspaceIds = [...new Set(recentSessions.map(s => s.workspaceId).filter(Boolean))];
    const workspaceMap = new Map<string, Workspace>();
    for (const id of workspaceIds) {
      if (id) {
        const ws = await window.knuthflow.workspace.get(id);
        if (ws) {
          workspaceMap.set(id, ws);
        }
      }
    }
    setWorkspaces(workspaceMap);
    setLoading(false);
  };

  const formatDuration = (start: number, end: number | null) => {
    const endTime = end || Date.now();
    const durationMs = endTime - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${dateStr} ${timeStr}`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 bg-green-900 text-green-300 rounded text-xs">Active</span>;
      case 'completed':
        return <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">Completed</span>;
      case 'failed':
        return <span className="px-2 py-0.5 bg-red-900 text-red-300 rounded text-xs">Failed</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading session history...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No session history yet</p>
        <p className="text-sm mt-2">Start a session to see it appear here</p>
      </div>
    );
  }

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const date = new Date(session.startTime).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, Session[]>);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Session History</h2>
        <p className="text-sm text-gray-400">Click a session to view details</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedSessions).map(([dateStr, dateSessions]) => (
          <div key={dateStr}>
            <div className="px-4 py-2 bg-gray-800 text-sm text-gray-400 sticky top-0">
              {dateStr === new Date().toDateString() ? 'Today' :
                dateStr === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                  dateStr}
            </div>
            <div className="space-y-1 px-4 pb-4">
              {dateSessions.map(session => {
                const workspace = session.workspaceId ? workspaces.get(session.workspaceId) : null;
                return (
                  <div
                    key={session.id}
                    onClick={() => onRestore(session)}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.name}</span>
                        {getStatusBadge(session.status)}
                      </div>
                      <span className="text-sm text-gray-400">
                        {formatDuration(session.startTime, session.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-400">
                        <span>{formatTime(session.startTime)}</span>
                        {workspace && (
                          <span className="ml-2"> - {workspace.name}</span>
                        )}
                      </div>
                      {session.status === 'completed' && session.exitCode !== null && (
                        <span className="text-gray-400">Exit: {session.exitCode}</span>
                      )}
                      {session.status === 'failed' && (
                        <span className="text-red-400">Exit: {session.exitCode ?? 'signal'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
