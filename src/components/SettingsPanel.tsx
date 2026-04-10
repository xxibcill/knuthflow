import { useState, useEffect } from 'react';
import type { AppSettings, LaunchProfile, Workspace, SystemDiagnostics, LogEntry } from '../preload';

interface SettingsPanelProps {
  onClose: () => void;
}

interface ValidationErrors {
  cliPath?: string;
  fontSize?: string;
  workspace?: string;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<LaunchProfile[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [activeTab, setActiveTab] = useState<'general' | 'terminal' | 'security' | 'profiles' | 'diagnostics' | 'about'>('general');
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [profileCliPath, setProfileCliPath] = useState('');
  const [profileArgs, setProfileArgs] = useState('');
  const [profileWorkspaceId, setProfileWorkspaceId] = useState<string | null>(null);
  const [profileIsDefault, setProfileIsDefault] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [settingsData, profilesData, workspacesData, diagnosticsData] = await Promise.all([
      window.knuthflow.settings.getAll(),
      window.knuthflow.profile.list(),
      window.knuthflow.workspace.list(),
      window.knuthflow.diagnostics.getSystemInfo(),
    ]);
    setSettings(settingsData);
    setProfiles(profilesData);
    setWorkspaces(workspacesData);
    setDiagnostics(diagnosticsData);
    setLoading(false);
  };

  const loadLogs = async () => {
    const logsData = await window.knuthflow.logs.get(100);
    setLogs(logsData);
  };

  useEffect(() => {
    if (activeTab === 'diagnostics') {
      loadLogs();
    }
  }, [activeTab]);

  const validateSettings = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (settings) {
      if (settings.fontSize < 8 || settings.fontSize > 72) {
        newErrors.fontSize = 'Font size must be between 8 and 72';
      }
      // Validate cliPath if provided - must be a valid path
      if (settings.cliPath && settings.cliPath.trim() !== '') {
        const trimmedPath = settings.cliPath.trim();
        // Check for path traversal attempts or empty-looking paths
        if (trimmedPath.includes('..') || /^\s*$/.test(trimmedPath)) {
          newErrors.cliPath = 'Invalid CLI path';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings() || !settings) return;

    setSaving(true);
    try {
      // Save all settings in a single batch call
      await window.knuthflow.settings.setAll(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const handleAddProfile = async () => {
    if (!profileName.trim()) return;

    await window.knuthflow.profile.create({
      name: profileName.trim(),
      description: profileDescription.trim(),
      cliPath: profileCliPath.trim() || null,
      args: profileArgs.split(' ').map(arg => arg.trim()).filter(arg => arg.length > 0),
      env: {},
      workspaceId: profileWorkspaceId,
      isDefault: profileIsDefault,
    });

    // Reset form
    setProfileName('');
    setProfileDescription('');
    setProfileCliPath('');
    setProfileArgs('');
    setProfileWorkspaceId(null);
    setProfileIsDefault(false);
    setShowAddProfile(false);

    // Reload profiles
    const profilesData = await window.knuthflow.profile.list();
    setProfiles(profilesData);
  };

  const handleDeleteProfile = async (id: string) => {
    await window.knuthflow.profile.delete(id);
    const profilesData = await window.knuthflow.profile.list();
    setProfiles(profilesData);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="text-white">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="text-red-400">Failed to load settings</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[700px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'terminal'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'profiles'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Profiles
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'about'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            About
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
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
                      onChange={e => handleSettingChange('cliPath', e.target.value || null)}
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
                      onChange={e => handleSettingChange('defaultArgs', e.target.value.split(' ').filter(s => s))}
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
                      onChange={e => handleSettingChange('launchOnStartup', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Launch Claude Code on app startup</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.restoreLastWorkspace}
                      onChange={e => handleSettingChange('restoreLastWorkspace', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Restore last workspace on startup</span>
                  </label>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Default Workspace</label>
                    <select
                      value={settings.defaultWorkspaceId || ''}
                      onChange={e => handleSettingChange('defaultWorkspaceId', e.target.value || null)}
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
                      onChange={e => handleSettingChange('confirmBeforeExit', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Confirm before closing app with active sessions</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.confirmBeforeKill}
                      onChange={e => handleSettingChange('confirmBeforeKill', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Confirm before stopping running sessions</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSaveSessions}
                      onChange={e => handleSettingChange('autoSaveSessions', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Automatically save session history</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
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
                      onChange={e => handleSettingChange('fontSize', parseInt(e.target.value) || 14)}
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
                      onChange={e => handleSettingChange('fontFamily', e.target.value)}
                      placeholder="Menlo, Monaco, monospace"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Cursor Style</label>
                    <select
                      value={settings.cursorStyle}
                      onChange={e => handleSettingChange('cursorStyle', e.target.value as 'block' | 'underline' | 'bar')}
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
                      onChange={e => handleSettingChange('showTabBar', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Show tab bar</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showStatusBar}
                      onChange={e => handleSettingChange('showStatusBar', e.target.checked)}
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
                      onChange={() => handleSettingChange('theme', 'dark')}
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
                      onChange={() => handleSettingChange('theme', 'light')}
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
                      onChange={() => handleSettingChange('theme', 'system')}
                      className="w-4 h-4 border-gray-600 bg-gray-700 text-blue-500"
                    />
                    <span className="text-sm text-gray-300">System</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Secure Storage</h3>
                <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-300">Storage Backend</p>
                      <p className="text-xs text-gray-500 mt-1">Where sensitive data is stored</p>
                    </div>
                    <span className="px-3 py-1 bg-green-600 text-white text-sm rounded">
                      {navigator.platform === 'darwin' ? 'macOS Keychain' : 'Encrypted File'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Sensitive Data</h3>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-3">
                    Sensitive values like API keys and tokens are stored securely using OS-level encryption.
                    They are never stored in plaintext or in the session database.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Your secrets are encrypted and protected by your OS</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">System Info</h3>
                {diagnostics && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">App Version:</span>
                        <span className="text-white ml-2">{diagnostics.app.version}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Platform:</span>
                        <span className="text-white ml-2">{diagnostics.app.platform} ({diagnostics.app.arch})</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Electron:</span>
                        <span className="text-white ml-2">{diagnostics.app.electronVersion}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Node:</span>
                        <span className="text-white ml-2">{diagnostics.app.nodeVersion}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Claude Code Status</h3>
                {diagnostics && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${diagnostics.claude.installed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-white">{diagnostics.claude.installed ? 'Installed' : 'Not Found'}</span>
                    </div>
                    {diagnostics.claude.path && (
                      <p className="text-xs text-gray-400 mb-1">Path: {diagnostics.claude.path}</p>
                    )}
                    {diagnostics.claude.version && (
                      <p className="text-xs text-gray-400">Version: {diagnostics.claude.version}</p>
                    )}
                    {diagnostics.claude.error && (
                      <p className="text-xs text-red-400 mt-1">{diagnostics.claude.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Storage</h3>
                {diagnostics && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Secure Storage Backend</span>
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        {diagnostics.storage.backend}
                        {diagnostics.storage.usingFallback && ' (Fallback)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Log Files</h3>
                {diagnostics && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    {diagnostics.logFiles.length > 0 ? (
                      <div className="space-y-1">
                        {diagnostics.logFiles.slice(0, 5).map((filePath, i) => {
                          const fileName = filePath.split(/[/\\]/).pop() || filePath;
                          return (
                            <div key={i} className="text-xs text-gray-400 font-mono">{fileName}</div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No log files found</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Logs</h3>
                <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {logs.length > 0 ? (
                    <div className="space-y-1 font-mono text-xs">
                      {logs.slice(0, 50).map((log, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className={`uppercase ${
                            log.level === 'error' ? 'text-red-400' :
                            log.level === 'warn' ? 'text-yellow-400' :
                            log.level === 'info' ? 'text-blue-400' : 'text-gray-400'
                          }`}>[{log.level}]</span>
                          <span className="text-gray-400">[{log.category}]</span>
                          <span className="text-white">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No logs available</p>
                  )}
                </div>
              </div>

              <button
                onClick={async () => {
                  const exported = await window.knuthflow.logs.export('text');
                  // Create a blob and download
                  const blob = new Blob([exported], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `knuthflow-logs-${Date.now()}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                Export Logs
              </button>
            </div>
          )}

          {activeTab === 'profiles' && (
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
                    onClick={handleAddProfile}
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
                      onClick={() => handleDeleteProfile(profile.id)}
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
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <h1 className="text-2xl font-bold text-white mb-2">Knuthflow</h1>
                <p className="text-gray-400">Version {diagnostics?.app.version ?? 'Unknown'}</p>
                <p className="text-sm text-gray-500 mt-4">Desktop wrapper for Claude Code CLI</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-300">System Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-400">Platform:</span>
                  <span className="text-white">{navigator.platform}</span>
                  <span className="text-gray-400">Electron:</span>
                  <span className="text-white">{diagnostics?.app.electronVersion ?? 'Unknown'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(errors).length > 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;

