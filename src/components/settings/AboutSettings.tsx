import type { SystemDiagnostics } from '../../shared/preloadTypes';

interface AboutSettingsProps {
  diagnostics: SystemDiagnostics | null;
}

export function AboutSettings({ diagnostics }: AboutSettingsProps) {
  return (
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
  );
}
