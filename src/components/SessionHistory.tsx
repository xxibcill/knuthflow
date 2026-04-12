import { useEffect, useState } from 'react';
import type { Session, Workspace } from '../preload';

interface SessionHistoryProps {
  onRestore: (session: Session) => void;
  currentWorkspaceId: string | null;
}

function getStatusBadge(status: string) {
  if (status === 'active') return 'badge badge-success';
  if (status === 'failed') return 'badge badge-danger';
  return 'badge badge-neutral';
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

    const workspaceIds = [...new Set(recentSessions.map(session => session.workspaceId).filter(Boolean))];
    const workspaceMap = new Map<string, Workspace>();

    for (const id of workspaceIds) {
      if (!id) continue;
      const workspace = await window.knuthflow.workspace.get(id);
      if (workspace) {
        workspaceMap.set(id, workspace);
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

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateLabel} ${timeLabel}`;
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div>
          <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Loading session history</h3>
          <p className="mt-2 text-sm text-muted">Building the recent run ledger for this workspace.</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
          <h3 className="text-lg font-semibold">No session history yet</h3>
          <p className="mt-2 text-sm text-muted">Start a session and its execution record will show up here.</p>
        </div>
      </div>
    );
  }

  const groupedSessions = sessions.reduce((groups, session) => {
    const dateKey = new Date(session.startTime).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(session);
    return groups;
  }, {} as Record<string, Session[]>);

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Session Ledger</h2>
          <p className="section-lead">
            Review recent runs, elapsed time, and exit results without leaving the current workspace context.
          </p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-neutral">{sessions.length} sessions</span>
        </div>
      </div>

      <div className="list-pane">
        <div className="stack-lg">
          {Object.entries(groupedSessions).map(([dateLabel, group]) => (
            <section key={dateLabel} className="stack-md">
              <div className="toolbar-inline justify-between">
                <div>
                  <p className="metric-label">
                    {dateLabel === new Date().toDateString()
                      ? 'Today'
                      : dateLabel === new Date(Date.now() - 86400000).toDateString()
                      ? 'Yesterday'
                      : dateLabel}
                  </p>
                  <p className="m-0 text-sm text-muted">{group.length} recorded runs</p>
                </div>
              </div>

              <div className="stack-md">
                {group.map(session => {
                  const workspace = session.workspaceId ? workspaces.get(session.workspaceId) : null;
                  return (
                    <div
                      key={session.id}
                      onClick={() => onRestore(session)}
                      className="list-card cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="list-card-title">{session.name}</h3>
                          <span className={getStatusBadge(session.status)}>
                            {session.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                          <span>{formatTime(session.startTime)}</span>
                          <span>{formatDuration(session.startTime, session.endTime)}</span>
                          {workspace && <span>{workspace.name}</span>}
                          {session.status === 'failed' && (
                            <span className="text-red-400">Exit {session.exitCode ?? 'signal'}</span>
                          )}
                          {session.status === 'completed' && session.exitCode !== null && (
                            <span>Exit {session.exitCode}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-dim">
                        <div className="badge badge-neutral">Open</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
