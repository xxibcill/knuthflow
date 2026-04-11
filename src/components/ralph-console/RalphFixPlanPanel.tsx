import type { PlanTask } from './RalphConsole.types';

interface RalphFixPlanPanelProps {
  tasks: PlanTask[];
  selectedItemId?: string | null;
  onSelectItem?: (taskId: string) => void;
  onOpenInEditor?: (filePath: string, lineNumber: number) => void;
  workspacePath: string;
}

function getStatusBadge(status: PlanTask['status']) {
  if (status === 'completed') return 'badge badge-success';
  if (status === 'in_progress') return 'badge badge-info';
  if (status === 'deferred') return 'badge badge-neutral';
  return 'badge badge-warning';
}

export function RalphFixPlanPanel({
  tasks,
  selectedItemId,
  onSelectItem,
  onOpenInEditor,
  workspacePath,
}: RalphFixPlanPanelProps) {
  const pendingCount = tasks.filter(task => task.status === 'pending').length;
  const inProgressCount = tasks.filter(task => task.status === 'in_progress').length;
  const completedCount = tasks.filter(task => task.status === 'completed').length;
  const deferredCount = tasks.filter(task => task.status === 'deferred').length;

  if (!workspacePath) {
    return (
      <div className="empty-state">
        <div>
          <h3 className="text-lg font-semibold">Workspace path unavailable</h3>
          <p className="mt-2 text-sm text-muted">The Ralph run needs a workspace root before fix plan locations can be resolved.</p>
        </div>
      </div>
    );
  }

  const fixPlanPath = `${workspacePath}/fix_plan.md`;

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Fix Plan</h2>
          <p className="section-lead text-mono" title={fixPlanPath}>{fixPlanPath}</p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-warning">{pendingCount} pending</span>
          <span className="badge badge-info">{inProgressCount} active</span>
          <span className="badge badge-success">{completedCount} done</span>
          {deferredCount > 0 && <span className="badge badge-neutral">{deferredCount} deferred</span>}
          <button onClick={() => onOpenInEditor?.(fixPlanPath, 1)} className="btn">Open</button>
        </div>
      </div>

      <div className="list-pane">
        {tasks.length === 0 ? (
          <div className="empty-state surface-panel-muted">
            <div>
              <h3 className="text-lg font-semibold">No tasks in fix plan</h3>
              <p className="mt-2 text-sm text-muted">Ralph has not materialized a parsable task list in `fix_plan.md` yet.</p>
            </div>
          </div>
        ) : (
          <div className="stack-sm">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => onSelectItem?.(task.id)}
                className={`list-card cursor-pointer ${task.id === selectedItemId ? 'selected' : ''}`}
                style={{ marginLeft: `${task.indentLevel * 16}px` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-mono text-xs text-dim">
                      {task.status === 'completed' ? '[x]' : task.status === 'deferred' ? '[-]' : task.checkbox}
                    </span>
                    <h3 className={`list-card-title ${task.status === 'completed' ? 'line-through text-[var(--text-dim)]' : ''}`}>
                      {task.title}
                    </h3>
                    <span className={getStatusBadge(task.status)}>{task.status}</span>
                  </div>
                  {task.description && <p className="text-sm text-muted">{task.description}</p>}
                </div>

                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenInEditor?.(fixPlanPath, task.lineNumber);
                  }}
                  className="btn btn-ghost"
                  title={`Jump to line ${task.lineNumber}`}
                >
                  L{task.lineNumber}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
