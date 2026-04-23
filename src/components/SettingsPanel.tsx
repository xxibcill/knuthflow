import { useEffect, useState } from 'react';
import type { AppSettings, LaunchProfile, Workspace, SystemDiagnostics } from '../shared/preloadTypes';
import { GeneralSettings } from './settings/GeneralSettings';
import { TerminalSettings } from './settings/TerminalSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { ProfilesSettings } from './settings/ProfilesSettings';
import { DiagnosticsSettings } from './settings/DiagnosticsSettings';
import { AboutSettings } from './settings/AboutSettings';

interface SettingsPanelProps {
  onClose: () => void;
  onSaved?: (settings: AppSettings) => void;
  onReplayOnboarding?: () => void;
}

type TabType = 'general' | 'terminal' | 'security' | 'profiles' | 'diagnostics' | 'about';

const TAB_COPY: Record<TabType, { title: string; summary: string }> = {
  general: {
    title: 'General',
    summary: 'CLI pathing, startup behavior, defaults, and session safety.',
  },
  terminal: {
    title: 'Terminal',
    summary: 'Theme, typography, cursor behavior, and layout toggles.',
  },
  security: {
    title: 'Security',
    summary: 'How credentials and sensitive state are protected on this machine.',
  },
  profiles: {
    title: 'Profiles',
    summary: 'Reusable launch presets for different workspaces or runtime arguments.',
  },
  diagnostics: {
    title: 'Diagnostics',
    summary: 'System state, Claude detection, log visibility, and export tools.',
  },
  about: {
    title: 'About',
    summary: 'Versioning and platform details for the current build.',
  },
};

export function SettingsPanel({ onClose, onSaved, onReplayOnboarding }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<LaunchProfile[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ cliPath?: string; fontSize?: string; workspace?: string }>({});
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

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

  const validateSettings = () => {
    const nextErrors: { cliPath?: string; fontSize?: string; workspace?: string } = {};

    if (settings) {
      if (settings.fontSize < 8 || settings.fontSize > 72) {
        nextErrors.fontSize = 'Font size must be between 8 and 72.';
      }

      if (settings.cliPath && settings.cliPath.trim() !== '') {
        const trimmedPath = settings.cliPath.trim();
        if (trimmedPath.includes('..') || /^\s*$/.test(trimmedPath)) {
          nextErrors.cliPath = 'Invalid CLI path.';
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!settings || !validateSettings()) return;

    setSaving(true);
    try {
      await window.knuthflow.settings.setAll(settings);
      onSaved?.(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleAddProfile = async () => {
    if (!profileName.trim()) return;

    await window.knuthflow.profile.create({
      name: profileName.trim(),
      description: profileDescription.trim(),
      cliPath: profileCliPath.trim() || null,
      args: profileArgs.split(' ').map(arg => arg.trim()).filter(Boolean),
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
      <div className="modal-scrim">
        <div className="surface-panel modal-panel empty-state">
          <div>
            <h3 className="text-lg font-semibold">Loading settings</h3>
            <p className="mt-2 text-sm text-muted">Collecting configuration, diagnostics, and saved profiles.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="modal-scrim">
        <div className="surface-panel modal-panel empty-state">
          <div>
            <h3 className="text-lg font-semibold text-red-300">Failed to load settings</h3>
            <p className="mt-2 text-sm text-red-400">The settings service did not return a valid configuration payload.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-scrim">
      <div className="surface-panel modal-panel">
        <div className="section-header !items-center">
          <div>
            <p className="brand-kicker">Configuration</p>
            <h2 className="section-title text-[1.35rem]">{TAB_COPY[activeTab].title}</h2>
            <p className="section-lead">{TAB_COPY[activeTab].summary}</p>
          </div>
          <div className="toolbar-inline">
            <button onClick={onClose} className="btn btn-ghost btn-icon" title="Close settings">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="modal-body">
          <nav className="modal-nav">
            {(Object.keys(TAB_COPY) as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`modal-nav-button ${activeTab === tab ? 'active' : ''}`}
              >
                <span>{TAB_COPY[tab].title}</span>
                {tab === 'profiles' && profiles.length > 0 && <span className="badge badge-neutral">{profiles.length}</span>}
              </button>
            ))}
          </nav>

          <div className="list-pane">
            {activeTab === 'general' && (
              <GeneralSettings
                settings={settings}
                workspaces={workspaces}
                errors={errors}
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

            {activeTab === 'security' && <SecuritySettings />}

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

            {activeTab === 'diagnostics' && <DiagnosticsSettings diagnostics={diagnostics} />}
            {activeTab === 'about' && <AboutSettings diagnostics={diagnostics} onReplayOnboarding={onReplayOnboarding} />}
          </div>
        </div>

        <div className="section-header !items-center !border-t !border-b-0">
          <div>
            <p className="m-0 text-sm text-muted">Changes apply immediately after save.</p>
          </div>
          <div className="toolbar-inline">
            <button onClick={onClose} className="btn">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(errors).length > 0}
              className="btn btn-primary"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
