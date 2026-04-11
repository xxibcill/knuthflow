import type { Tab } from '../hooks/useSessionTabs';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex-none bg-gray-800 border-b border-gray-700 px-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-t cursor-pointer transition-colors min-w-0 ${
              activeTabId === tab.id
                ? 'bg-gray-900 text-white border-b-2 border-blue-500'
                : tab.crashed
                ? 'bg-gray-700 hover:bg-gray-600 text-red-300'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {tab.crashed ? (
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="Session crashed" />
            ) : (
              <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            )}
            <span className="truncate text-sm">{tab.name}</span>
            <button
              onClick={e => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="p-0.5 hover:text-red-400 flex-shrink-0"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
