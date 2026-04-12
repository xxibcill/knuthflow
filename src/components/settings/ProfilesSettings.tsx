import type { LaunchProfile, Workspace } from '../../shared/preloadTypes';

interface ProfilesSettingsProps {
  profiles: LaunchProfile[];
  workspaces: Workspace[];
  showAddProfile: boolean;
  profileName: string;
  profileDescription: string;
  profileCliPath: string;
  profileArgs: string;
  profileWorkspaceId: string | null;
  profileIsDefault: boolean;
  setShowAddProfile: (show: boolean) => void;
  setProfileName: (name: string) => void;
  setProfileDescription: (description: string) => void;
  setProfileCliPath: (path: string) => void;
  setProfileArgs: (args: string) => void;
  setProfileWorkspaceId: (id: string | null) => void;
  setProfileIsDefault: (isDefault: boolean) => void;
  onAddProfile: () => void;
  onDeleteProfile: (id: string) => void;
}

export function ProfilesSettings({
  profiles,
  workspaces,
  showAddProfile,
  profileName,
  profileDescription,
  profileCliPath,
  profileArgs,
  profileWorkspaceId,
  profileIsDefault,
  setShowAddProfile,
  setProfileName,
  setProfileDescription,
  setProfileCliPath,
  setProfileArgs,
  setProfileWorkspaceId,
  setProfileIsDefault,
  onAddProfile,
  onDeleteProfile,
}: ProfilesSettingsProps) {
  return (
    <div className="stack-lg">
      <section className="surface-panel-muted p-5">
        <div className="toolbar-inline justify-between">
          <div>
            <p className="metric-label">Launch Profiles</p>
            <p className="m-0 text-sm text-muted">Capture argument presets and workspace defaults for repeatable launches.</p>
          </div>
          <button onClick={() => setShowAddProfile(!showAddProfile)} className={`btn ${showAddProfile ? '' : 'btn-primary'}`}>
            {showAddProfile ? 'Hide Form' : 'Add Profile'}
          </button>
        </div>

        {showAddProfile && (
          <div className="mt-5 form-grid">
            <label className="field">
              <span className="field-label">Name</span>
              <input
                type="text"
                value={profileName}
                onChange={event => setProfileName(event.target.value)}
                placeholder="Fast Iteration"
                className="input"
              />
            </label>

            <label className="field">
              <span className="field-label">Description</span>
              <input
                type="text"
                value={profileDescription}
                onChange={event => setProfileDescription(event.target.value)}
                placeholder="Optional description"
                className="input"
              />
            </label>

            <label className="field">
              <span className="field-label">CLI Path Override</span>
              <input
                type="text"
                value={profileCliPath}
                onChange={event => setProfileCliPath(event.target.value)}
                placeholder="Leave empty for app default"
                className="input"
              />
            </label>

            <label className="field">
              <span className="field-label">Arguments</span>
              <input
                type="text"
                value={profileArgs}
                onChange={event => setProfileArgs(event.target.value)}
                placeholder="--dangerously-skip-permissions --print"
                className="input"
              />
            </label>

            <label className="field">
              <span className="field-label">Workspace</span>
              <select
                value={profileWorkspaceId || ''}
                onChange={event => setProfileWorkspaceId(event.target.value || null)}
                className="select"
              >
                <option value="">None</option>
                {workspaces.map(workspace => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={profileIsDefault}
                onChange={event => setProfileIsDefault(event.target.checked)}
              />
              <div>
                <p className="m-0 text-sm font-semibold">Set as default profile</p>
                <p className="mt-1 text-sm text-muted">Use this preset when a launch does not specify a profile explicitly.</p>
              </div>
            </label>

            <div className="flex justify-end">
              <button
                onClick={onAddProfile}
                disabled={!profileName.trim()}
                className="btn btn-primary"
              >
                Create Profile
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="stack-md">
        {profiles.length === 0 && !showAddProfile ? (
          <div className="empty-state surface-panel-muted">
            <div>
              <h3 className="text-lg font-semibold">No profiles configured</h3>
              <p className="mt-2 text-sm text-muted">Create a launch preset for recurring workflows or workspace-specific runtime flags.</p>
            </div>
          </div>
        ) : (
          profiles.map(profile => (
            <div key={profile.id} className="list-card">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="list-card-title">{profile.name}</h3>
                  {profile.isDefault && <span className="badge badge-info">Default</span>}
                </div>
                {profile.description && (
                  <p className="m-0 text-sm text-muted">{profile.description}</p>
                )}
                <p className="mt-2 text-xs text-mono text-muted">
                  {(profile.cliPath || 'Default CLI')} • {(profile.args.join(' ') || 'No args')}
                </p>
              </div>

              <button onClick={() => onDeleteProfile(profile.id)} className="btn btn-ghost btn-icon" title="Delete profile">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
