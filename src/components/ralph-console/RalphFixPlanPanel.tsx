import type { PlanTask } from './RalphConsole.types';

interface RalphFixPlanPanelProps {
  tasks: PlanTask[];
  selectedItemId?: string | null;
  onSelectItem?: (taskId: string) => void;
  onOpenInEditor?: (filePath: string, lineNumber: number) => void;
  workspacePath: string;
}

export function RalphFixPlanPanel({
  tasks,
  selectedItemId,
  onSelectItem,
  onOpenInEditor,
  workspacePath,
}: RalphFixPlanPanelProps) {
  const getStatusColor = (status: PlanTask['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900 text-green-300';
      case 'in_progress':
        return 'bg-blue-900 text-blue-300';
      case 'deferred':
        return 'bg-gray-700 text-gray-400';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  const getCheckbox = (checkbox: string, status: PlanTask['status']) => {
    switch (status) {
      case 'completed':
        return '[x]';
      case 'deferred':
        return '[-]';
      default:
        return checkbox;
    }
  };

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const deferredCount = tasks.filter(t => t.status === 'deferred').length;

  // Validate workspacePath
  if (!workspacePath) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        Workspace path not available
      </div>
    );
  }

  const fixPlanPath = `${workspacePath}/fix_plan.md`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div>
          <h3 className="text-sm font-medium text-white">Fix Plan</h3>
          <p className="text-xs text-gray-400">{fixPlanPath}</p>
        </div>
        <button
          onClick={() => onOpenInEditor?.(fixPlanPath, 1)}
          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
        >
          Open in Editor
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-850 border-b border-gray-700 text-xs">
        <span className="text-gray-400">
          <span className="text-white font-medium">{pendingCount}</span> pending
        </span>
        <span className="text-gray-400">
          <span className="text-blue-400 font-medium">{inProgressCount}</span> in progress
        </span>
        <span className="text-gray-400">
          <span className="text-green-400 font-medium">{completedCount}</span> done
        </span>
        {deferredCount > 0 && (
          <span className="text-gray-400">
            <span className="text-gray-400 font-medium">{deferredCount}</span> deferred
          </span>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No tasks in fix_plan.md
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => {
              const isSelected = task.id === selectedItemId;
              const indent = task.indentLevel * 16;

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectItem?.(task.id)}
                  className={`
                    flex items-start gap-2 p-2 rounded cursor-pointer
                    transition-colors duration-100
                    ${isSelected ? 'bg-blue-900/40 ring-1 ring-blue-500' : 'hover:bg-gray-800'}
                  `}
                  style={{ paddingLeft: `${indent + 8}px` }}
                >
                  {/* Checkbox */}
                  <span className={`
                    flex-shrink-0 font-mono text-xs w-6 text-center
                    ${task.status === 'completed' ? 'text-green-400' : 'text-gray-500'}
                  `}>
                    {getCheckbox(task.checkbox, task.status)}
                  </span>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`
                        text-sm font-medium
                        ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}
                      `}>
                        {task.title}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Go to line button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenInEditor?.(fixPlanPath, task.lineNumber);
                    }}
                    className="flex-shrink-0 text-xs text-gray-600 hover:text-blue-400"
                    title={`Line ${task.lineNumber}`}
                  >
                    L{task.lineNumber}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

