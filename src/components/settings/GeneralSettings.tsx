import type { AppSettings, Workspace } from '../../shared/preloadTypes';

interface GeneralSettingsProps {
  settings: AppSettings;
  workspaces: Workspace[];
  errors: { cliPath?: string };
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function GeneralSettings({ settings, workspaces, errors, onSettingChange }: GeneralSettingsProps) {
  return (
    <div className="stack-lg">
      <section className="surface-panel-muted p-5">
        <p className="metric-label">CLI Configuration</p>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Claude Code Path</span>
            <input
              type="text"
              value={settings.cliPath || ''}
              onChange={event => onSettingChange('cliPath', event.target.value || null)}
              placeholder="Auto-detected"
              className="input"
            />
            <span className="field-help">Leave blank to use the executable discovered from your environment.</span>
            {errors.cliPath && <span className="field-error">{errors.cliPath}</span>}
          </label>

          <label className="field">
            <span className="field-label">Default Arguments</span>
            <input
              type="text"
              value={settings.defaultArgs.join(' ')}
              onChange={event => onSettingChange('defaultArgs', event.target.value.split(' ').filter(Boolean))}
              placeholder="--dangerously-skip-permissions"
              className="input"
            />
            <span className="field-help">Applied to every launch unless a profile overrides them.</span>
          </label>
        </div>
      </section>

      <section className="surface-panel-muted p-5">
        <p className="metric-label">Startup Behavior</p>
        <div className="stack-sm">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.launchOnStartup}
              onChange={event => onSettingChange('launchOnStartup', event.target.checked)}
            />
            <div>
              <p className="m-0 text-sm font-semibold">Launch Claude Code on startup</p>
              <p className="mt-1 text-sm text-muted">Open the runtime immediately when the desktop app boots.</p>
            </div>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.restoreLastWorkspace}
              onChange={event => onSettingChange('restoreLastWorkspace', event.target.checked)}
            />
            <div>
              <p className="m-0 text-sm font-semibold">Restore last workspace</p>
              <p className="mt-1 text-sm text-muted">Return to the repository you were operating on most recently.</p>
            </div>
          </label>

          <label className="field">
            <span className="field-label">Default Workspace</span>
            <select
              value={settings.defaultWorkspaceId || ''}
              onChange={event => onSettingChange('defaultWorkspaceId', event.target.value || null)}
              className="select"
            >
              <option value="">None</option>
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="surface-panel-muted p-5">
        <p className="metric-label">Safety Defaults</p>
        <div className="stack-sm">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.confirmBeforeExit}
              onChange={event => onSettingChange('confirmBeforeExit', event.target.checked)}
            />
            <div>
              <p className="m-0 text-sm font-semibold">Confirm before closing with active sessions</p>
              <p className="mt-1 text-sm text-muted">Prevents accidental teardown during long-running work.</p>
            </div>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.confirmBeforeKill}
              onChange={event => onSettingChange('confirmBeforeKill', event.target.checked)}
            />
            <div>
              <p className="m-0 text-sm font-semibold">Confirm before stopping running sessions</p>
              <p className="mt-1 text-sm text-muted">Adds a deliberate checkpoint before terminating agent work.</p>
            </div>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.autoSaveSessions}
              onChange={event => onSettingChange('autoSaveSessions', event.target.checked)}
            />
            <div>
              <p className="m-0 text-sm font-semibold">Automatically save session history</p>
              <p className="mt-1 text-sm text-muted">Keeps the execution ledger intact for review and recovery.</p>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
