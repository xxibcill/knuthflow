import { useState, useCallback } from 'react';

interface BlueprintImportExportProps {
  onImportComplete: () => void;
  onCancel: () => void;
}

type ImportMode = 'gist' | 'tarball';
type ExportMode = 'gist' | 'tarball';

export function BlueprintImportExport({
  onImportComplete,
  onCancel,
}: BlueprintImportExportProps) {
  const [mode, setMode] = useState<'import' | 'export'>('import');
  const [importMode, setImportMode] = useState<ImportMode>('gist');
  const [exportMode, setExportMode] = useState<ExportMode>('tarball');
  const [gistUrl, setGistUrl] = useState('');
  const [blueprintIdToExport, setBlueprintIdToExport] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImportFromGist = useCallback(async () => {
    if (!gistUrl.trim()) {
      setError('Gist URL is required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Extract gist ID from URL
      const gistIdMatch = gistUrl.match(/\/gist\/([a-f0-9]+)/i);
      if (!gistIdMatch) {
        setError('Invalid gist URL');
        return;
      }

      const gistId = gistIdMatch[1];
      const response = await fetch(`https://api.github.com/gists/${gistId}`);
      if (!response.ok) {
        setError('Failed to fetch gist');
        return;
      }

      const gistData = await response.json();
      const files = Object.values(gistData.files) as Array<{
        filename: string;
        content: string;
      }>;

      const specFile = files.find(f => f.filename.endsWith('.json') || f.filename === 'blueprint-spec.json');
      if (!specFile) {
        setError('No blueprint spec found in gist');
        return;
      }

      const spec = JSON.parse(specFile.content);
      const validation = await window.knuthflow.blueprint.validateSpec(spec);

      if (!validation.valid) {
        setError(`Invalid blueprint spec: ${validation.errors.join(', ')}`);
        return;
      }

      const result = await window.knuthflow.blueprint.import({
        spec: spec as Record<string, unknown>,
        isPublished: true,
      });

      if (!result.success) {
        if (result.existingBlueprintId) {
          setError(`Blueprint "${spec.name}" already exists. Use a different name or overwrite.`);
        } else {
          setError(result.error || 'Failed to import blueprint');
        }
        return;
      }

      setSuccess(`Successfully imported "${spec.name}"!`);
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from gist');
    } finally {
      setIsProcessing(false);
    }
  }, [gistUrl, onImportComplete]);

  const handleImportFromTarball = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await window.knuthflow.dialog.openFile({
        filters: [
          { name: 'Tarball', extensions: ['tar.gz', 'tgz'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        setIsProcessing(false);
        return;
      }

      const content = await window.knuthflow.filesystem.readFile(result.filePath);
      const spec = JSON.parse(content);

      const validation = await window.knuthflow.blueprint.validateSpec(spec);
      if (!validation.valid) {
        setError(`Invalid blueprint spec: ${validation.errors.join(', ')}`);
        return;
      }

      const importResult = await window.knuthflow.blueprint.import({
        spec: spec as Record<string, unknown>,
      });

      if (!importResult.success) {
        setError(importResult.error || 'Failed to import blueprint');
        return;
      }

      setSuccess(`Successfully imported "${spec.name}"!`);
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from tarball');
    } finally {
      setIsProcessing(false);
    }
  }, [onImportComplete]);

  const handleExportToGist = useCallback(async () => {
    if (!blueprintIdToExport.trim()) {
      setError('Blueprint ID is required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await window.knuthflow.blueprint.export(blueprintIdToExport);
      if (!result.success || !result.spec) {
        setError(result.error || 'Failed to export blueprint');
        return;
      }

      const specContent = JSON.stringify(result.spec, null, 2);
      const files = {
        'blueprint-spec.json': specContent,
      };

      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `Blueprint: ${result.spec.name}`,
          public: false,
          files,
        }),
      });

      if (!response.ok) {
        setError('Failed to create gist');
        return;
      }

      const gistData = await response.json();
      setSuccess(`Exported to gist: ${gistData.html_url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export to gist');
    } finally {
      setIsProcessing(false);
    }
  }, [blueprintIdToExport]);

  const handleExportToTarball = useCallback(async () => {
    if (!blueprintIdToExport.trim()) {
      setError('Blueprint ID is required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await window.knuthflow.blueprint.export(blueprintIdToExport);
      if (!result.success || !result.spec) {
        setError(result.error || 'Failed to export blueprint');
        return;
      }

      const specContent = JSON.stringify(result.spec, null, 2);
      const saveResult = await window.knuthflow.dialog.saveFile({
        defaultPath: `${result.spec.name.replace(/\s+/g, '-').toLowerCase()}-blueprint.json`,
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        setIsProcessing(false);
        return;
      }

      await window.knuthflow.filesystem.writeFile(saveResult.filePath, specContent);
      setSuccess(`Exported to ${saveResult.filePath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export to tarball');
    } finally {
      setIsProcessing(false);
    }
  }, [blueprintIdToExport]);

  return (
    <div className="blueprint-import-export">
      <div className="section-header">
        <h3 className="section-title">
          {mode === 'import' ? 'Import Blueprint' : 'Export Blueprint'}
        </h3>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setMode('import')}
          className={`btn ${mode === 'import' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => setMode('export')}
          className={`btn ${mode === 'export' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Export
        </button>
      </div>

      {error && (
        <div className="error-banner mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="success-banner mb-4">
          {success}
        </div>
      )}

      {mode === 'import' ? (
        <div className="import-section">
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setImportMode('gist')}
              className={`btn ${importMode === 'gist' ? 'btn-primary' : 'btn-ghost'}`}
            >
              From Gist
            </button>
            <button
              type="button"
              onClick={() => setImportMode('tarball')}
              className={`btn ${importMode === 'tarball' ? 'btn-primary' : 'btn-ghost'}`}
            >
              From File
            </button>
          </div>

          {importMode === 'gist' ? (
            <div className="form-field">
              <label htmlFor="gist-url" className="form-label">GitHub Gist URL</label>
              <input
                id="gist-url"
                type="text"
                value={gistUrl}
                onChange={e => setGistUrl(e.target.value)}
                placeholder="https://gist.github.com/username/gist-id"
                className="input w-full"
              />
              <button
                type="button"
                onClick={handleImportFromGist}
                disabled={isProcessing}
                className="btn btn-primary mt-3"
              >
                {isProcessing ? 'Importing...' : 'Import from Gist'}
              </button>
            </div>
          ) : (
            <div className="form-field">
              <p className="text-muted mb-3">
                Select a blueprint spec JSON file or .tar.gz archive to import.
              </p>
              <button
                type="button"
                onClick={handleImportFromTarball}
                disabled={isProcessing}
                className="btn btn-primary"
              >
                {isProcessing ? 'Processing...' : 'Select File to Import'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="export-section">
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setExportMode('gist')}
              className={`btn ${exportMode === 'gist' ? 'btn-primary' : 'btn-ghost'}`}
            >
              To Gist
            </button>
            <button
              type="button"
              onClick={() => setExportMode('tarball')}
              className={`btn ${exportMode === 'tarball' ? 'btn-primary' : 'btn-ghost'}`}
            >
              To File
            </button>
          </div>

          <div className="form-field">
            <label htmlFor="export-bp-id" className="form-label">Blueprint ID</label>
            <input
              id="export-bp-id"
              type="text"
              value={blueprintIdToExport}
              onChange={e => setBlueprintIdToExport(e.target.value)}
              placeholder="bp-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="input w-full"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={exportMode === 'gist' ? handleExportToGist : handleExportToTarball}
              disabled={isProcessing || !blueprintIdToExport.trim()}
              className="btn btn-primary"
            >
              {isProcessing ? 'Exporting...' : `Export to ${exportMode === 'gist' ? 'Gist' : 'File'}`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlueprintImportExport;