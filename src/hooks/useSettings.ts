import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../shared/preloadTypes';

interface ValidationErrors {
  cliPath?: string;
  fontSize?: string;
  workspace?: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const settingsData = await window.knuthflow.settings.getAll();
    setSettings(settingsData);
    setLoading(false);
  };

  const validateSettings = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

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
  }, [settings]);

  const handleSettingChange = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  }, [settings]);

  const handleSave = useCallback(async (onClose: () => void) => {
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
  }, [settings, validateSettings]);

  return {
    settings,
    loading,
    saving,
    errors,
    handleSettingChange,
    handleSave,
    validateSettings,
  };
}
