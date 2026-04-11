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
  setProfileDescription: (desc: string) => void;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Launch Profiles</h3>
        <button
          onClick={() => setShowAddProfile(!showAddProfile)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          {showAddProfile ? 'Cancel' : 'Add Profile'}
        </button>
      </div>

      {showAddProfile && (
        <div className="bg-gray-700 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="My Profile"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={profileDescription}
              onChange={e => setProfileDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">CLI Path Override</label>
            <input
              type="text"
              value={profileCliPath}
              onChange={e => setProfileCliPath(e.target.value)}
              placeholder="Leave empty for default"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Arguments</label>
            <input
              type="text"
              value={profileArgs}
              onChange={e => setProfileArgs(e.target.value)}
              placeholder="--dangerously-skip-permissions --print"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Workspace</label>
            <select
              value={profileWorkspaceId || ''}
              onChange={e => setProfileWorkspaceId(e.target.value || null)}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">None</option>
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profileIsDefault}
              onChange={e => setProfileIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-gray-500 bg-gray-600 text-blue-500"
            />
            <span className="text-sm text-gray-300">Set as default profile</span>
          </label>
          <button
            onClick={onAddProfile}
            disabled={!profileName.trim()}
            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            Create Profile
          </button>
        </div>
      )}

      <div className="space-y-2">
        {profiles.length === 0 && !showAddProfile && (
          <div className="text-center text-gray-400 py-8">
            No profiles configured. Create a profile to save preset configurations.
          </div>
        )}
        {profiles.map(profile => (
          <div
            key={profile.id}
            className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{profile.name}</span>
                {profile.isDefault && (
                  <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">Default</span>
                )}
              </div>
              {profile.description && (
                <p className="text-sm text-gray-400">{profile.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {profile.cliPath || 'Default CLI'} • {profile.args.join(' ') || 'No args'}
              </p>
            </div>
            <button
              onClick={() => onDeleteProfile(profile.id)}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
