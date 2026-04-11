import type { AppSettings } from '../../shared/preloadTypes';

interface TerminalSettingsProps {
  settings: AppSettings;
  errors: { fontSize?: string };
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function TerminalSettings({ settings, errors, onSettingChange }: TerminalSettingsProps) {
  return (
    <div className="stack-lg">
      <section className="surface-panel-muted p-5">
        <p className="metric-label">Typography</p>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Font Size</span>
            <input
              type="number"
              min={8}
              max={72}
              value={settings.fontSize}
              onChange={event => onSettingChange('fontSize', parseInt(event.target.value, 10) || 14)}
              className="input max-w-[140px]"
            />
            {errors.fontSize && <span className="field-error">{errors.fontSize}</span>}
          </label>

          <label className="field">
            <span className="field-label">Font Family</span>
            <input
              type="text"
              value={settings.fontFamily}
              onChange={event => onSettingChange('fontFamily', event.target.value)}
              placeholder="IBM Plex Mono, SFMono-Regular, monospace"
              className="input"
            />
            <span className="field-help">Applied to xterm and any code-oriented surfaces in the renderer.</span>
          </label>

          <label className="field">
            <span className="field-label">Cursor Style</span>
            <select
              value={settings.cursorStyle}
              onChange={event => onSettingChange('cursorStyle', event.target.value as 'block' | 'underline' | 'bar')}
              className="select"
            >
              <option value="block">Block</option>
              <option value="underline">Underline</option>
              <option value="bar">Bar</option>
            </select>
          </label>
        </div>
      </section>

      <section className="surface-panel-muted p-5">
        <p className="metric-label">Layout Visibility</p>
        <div className="stack-sm">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.showTabBar}
              onChange={event => onSettingChange('showTabBar', event.target.checked)}
            />
            <div>
              <p className="m-0 text-sm font-semibold">Show session tab bar</p>
              <p className="mt-1 text-sm text-muted">Keep multiple active runs visible and directly accessible.</p>
            </div>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.showStatusBar}
              onChange={event => onSettingChange('showStatusBar', event.target.checked)}
            />
            <div>
              <p className="m-0 text-sm font-semibold">Show terminal status bar</p>
              <p className="mt-1 text-sm text-muted">Expose workspace path and run state in the terminal view footer.</p>
            </div>
          </label>
        </div>
      </section>

      <section className="surface-panel-muted p-5">
        <p className="metric-label">Theme</p>
        <div className="stack-sm">
          {([
            { value: 'dark', label: 'Dark', description: 'Low-glare control room styling for longer operator sessions.' },
            { value: 'light', label: 'Light', description: 'Higher-contrast daytime mode with the same layout structure.' },
            { value: 'system', label: 'System', description: 'Follow the OS appearance setting automatically.' },
          ] as const).map(option => (
            <label key={option.value} className="choice-row">
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={settings.theme === option.value}
                onChange={() => onSettingChange('theme', option.value)}
              />
              <div>
                <p className="m-0 text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-sm text-muted">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
