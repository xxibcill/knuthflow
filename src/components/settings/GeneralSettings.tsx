import type { AppSettings, Workspace } from '../../shared/preloadTypes';

interface GeneralSettingsProps {
  settings: AppSettings;
  workspaces: Workspace[];
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function GeneralSettings({ settings, workspaces, onSettingChange }: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      {/* CLI Configuration */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">CLI Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Claude Code Path</label>
            <input
              type="text"
              value={settings.cliPath || ''}
              onChange={e => onSettingChange('cliPath', e.target.value || null)}
              placeholder="Auto-detected"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to use auto-detected path</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Arguments</label>
            <input
              type="text"
              value={settings.defaultArgs.join(' ')}
              onChange={e => onSettingChange('defaultArgs', e.target.value.split(' ').filter(s => s))}
              placeholder="--dangerously-skip-permissions"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Space-separated arguments passed to Claude Code</p>
          </div>
        </div>
      </div>

      {/* Launch Behavior */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Launch Behavior</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.launchOnStartup}
              onChange={e => onSettingChange('launchOnStartup', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Launch Claude Code on app startup</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.restoreLastWorkspace}
              onChange={e => onSettingChange('restoreLastWorkspace', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Restore last workspace on startup</span>
          </label>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Workspace</label>
            <select
              value={settings.defaultWorkspaceId || ''}
              onChange={e => onSettingChange('defaultWorkspaceId', e.target.value || null)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">None</option>
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Safety */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Safety</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.confirmBeforeExit}
              onChange={e => onSettingChange('confirmBeforeExit', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Confirm before closing app with active sessions</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.confirmBeforeKill}
              onChange={e => onSettingChange('confirmBeforeKill', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Confirm before stopping running sessions</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSaveSessions}
              onChange={e => onSettingChange('autoSaveSessions', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Automatically save session history</span>
          </label>
        </div>
      </div>
    </div>
  );
}
