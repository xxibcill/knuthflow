import type { AppSettings } from '../../shared/preloadTypes';

interface TerminalSettingsProps {
  settings: AppSettings;
  errors: { fontSize?: string };
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function TerminalSettings({ settings, errors, onSettingChange }: TerminalSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Appearance</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Font Size</label>
            <input
              type="number"
              min={8}
              max={72}
              value={settings.fontSize}
              onChange={e => onSettingChange('fontSize', parseInt(e.target.value) || 14)}
              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            />
            {errors.fontSize && (
              <p className="text-xs text-red-400 mt-1">{errors.fontSize}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Font Family</label>
            <input
              type="text"
              value={settings.fontFamily}
              onChange={e => onSettingChange('fontFamily', e.target.value)}
              placeholder="Menlo, Monaco, monospace"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Cursor Style</label>
            <select
              value={settings.cursorStyle}
              onChange={e => onSettingChange('cursorStyle', e.target.value as 'block' | 'underline' | 'bar')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="block">Block</option>
              <option value="underline">Underline</option>
              <option value="bar">Bar</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Layout</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showTabBar}
              onChange={e => onSettingChange('showTabBar', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show tab bar</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showStatusBar}
              onChange={e => onSettingChange('showStatusBar', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show status bar</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Theme</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={settings.theme === 'dark'}
              onChange={() => onSettingChange('theme', 'dark')}
              className="w-4 h-4 border-gray-600 bg-gray-700 text-blue-500"
            />
            <span className="text-sm text-gray-300">Dark</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={settings.theme === 'light'}
              onChange={() => onSettingChange('theme', 'light')}
              className="w-4 h-4 border-gray-600 bg-gray-700 text-blue-500"
            />
            <span className="text-sm text-gray-300">Light</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="system"
              checked={settings.theme === 'system'}
              onChange={() => onSettingChange('theme', 'system')}
              className="w-4 h-4 border-gray-600 bg-gray-700 text-blue-500"
            />
            <span className="text-sm text-gray-300">System</span>
          </label>
        </div>
      </div>
    </div>
  );
}
