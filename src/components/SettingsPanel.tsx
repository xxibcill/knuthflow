import { useState, useEffect } from 'react';
import type { AppSettings, LaunchProfile, Workspace, SystemDiagnostics } from '../shared/preloadTypes';

import { GeneralSettings } from './settings/GeneralSettings';
import { TerminalSettings } from './settings/TerminalSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { ProfilesSettings } from './settings/ProfilesSettings';
import { DiagnosticsSettings } from './settings/DiagnosticsSettings';
import { AboutSettings } from './settings/AboutSettings';

interface SettingsPanelProps {
  onClose: () => void;
}

type TabType = 'general' | 'terminal' | 'security' | 'profiles' | 'diagnostics' | 'about';

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<LaunchProfile[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ cliPath?: string; fontSize?: string; workspace?: string }>({});
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [profileCliPath, setProfileCliPath] = useState('');
  const [profileArgs, setProfileArgs] = useState('');
  const [profileWorkspaceId, setProfileWorkspaceId] = useState<string | null>(null);
  const [profileIsDefault, setProfileIsDefault] = useState(false);
  const [showAddProfile, setShowAddProfile] = useState(false);

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

  const validateSettings = (): boolean => {
    const newErrors: { cliPath?: string; fontSize?: string; workspace?: string } = {};

    if (settings) {
      if (settings.fontSize < 8 || settings.fontSize > 72) {
        newErrors.fontSize = 'Font size must be between 8 and 72';
      }
      if (settings.cliPath && settings.cliPath.trim() !== '') {
        const trimmedPath = settings.cliPath.trim();
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

    setProfileName('');
    setProfileDescription('');
    setProfileCliPath('');
    setProfileArgs('');
    setProfileWorkspaceId(null);
    setProfileIsDefault(false);
    setShowAddProfile(false);

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
          {(['general', 'terminal', 'security', 'profiles', 'diagnostics', 'about'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <GeneralSettings
              settings={settings}
              workspaces={workspaces}
              onSettingChange={handleSettingChange}
            />
          )}

          {activeTab === 'terminal' && (
            <TerminalSettings
              settings={settings}
              errors={errors}
              onSettingChange={handleSettingChange}
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettings />
          )}

          {activeTab === 'profiles' && (
            <ProfilesSettings
              profiles={profiles}
              workspaces={workspaces}
              showAddProfile={showAddProfile}
              profileName={profileName}
              profileDescription={profileDescription}
              profileCliPath={profileCliPath}
              profileArgs={profileArgs}
              profileWorkspaceId={profileWorkspaceId}
              profileIsDefault={profileIsDefault}
              setShowAddProfile={setShowAddProfile}
              setProfileName={setProfileName}
              setProfileDescription={setProfileDescription}
              setProfileCliPath={setProfileCliPath}
              setProfileArgs={setProfileArgs}
              setProfileWorkspaceId={setProfileWorkspaceId}
              setProfileIsDefault={setProfileIsDefault}
              onAddProfile={handleAddProfile}
              onDeleteProfile={handleDeleteProfile}
            />
          )}

          {activeTab === 'diagnostics' && (
            <DiagnosticsSettings diagnostics={diagnostics} />
          )}

          {activeTab === 'about' && (
            <AboutSettings diagnostics={diagnostics} />
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
