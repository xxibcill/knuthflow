import { useState, useCallback } from 'react';
import type { LaunchProfile, Workspace } from '../shared/preloadTypes';

export function useProfiles() {
  const [profiles, setProfiles] = useState<LaunchProfile[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showAddProfile, setShowAddProfile] = useState(false);

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [profileCliPath, setProfileCliPath] = useState('');
  const [profileArgs, setProfileArgs] = useState('');
  const [profileWorkspaceId, setProfileWorkspaceId] = useState<string | null>(null);
  const [profileIsDefault, setProfileIsDefault] = useState(false);

  const loadProfilesAndWorkspaces = useCallback(async () => {
    const [profilesData, workspacesData] = await Promise.all([
      window.knuthflow.profile.list(),
      window.knuthflow.workspace.list(),
    ]);
    setProfiles(profilesData);
    setWorkspaces(workspacesData);
  }, []);

  const handleAddProfile = useCallback(async () => {
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
  }, [profileName, profileDescription, profileCliPath, profileArgs, profileWorkspaceId, profileIsDefault]);

  const handleDeleteProfile = useCallback(async (id: string) => {
    await window.knuthflow.profile.delete(id);
    const profilesData = await window.knuthflow.profile.list();
    setProfiles(profilesData);
  }, []);

  return {
    profiles,
    workspaces,
    showAddProfile,
    setShowAddProfile,
    profileName,
    setProfileName,
    profileDescription,
    setProfileDescription,
    profileCliPath,
    setProfileCliPath,
    profileArgs,
    setProfileArgs,
    profileWorkspaceId,
    setProfileWorkspaceId,
    profileIsDefault,
    setProfileIsDefault,
    loadProfilesAndWorkspaces,
    handleAddProfile,
    handleDeleteProfile,
  };
}
