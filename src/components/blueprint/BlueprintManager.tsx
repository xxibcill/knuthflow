import { useState, useCallback } from 'react';
import { BlueprintBrowser } from './BlueprintBrowser';
import { BlueprintAuthor } from './BlueprintAuthor';
import { BlueprintImportExport } from './BlueprintImportExport';
import { BlueprintDetailView } from './BlueprintDetailView';
import type { BlueprintWithVersion } from './BlueprintBrowser';

type BlueprintViewState = 'browser' | 'author' | 'detail' | 'import';

export function BlueprintManager() {
  const [viewState, setViewState] = useState<BlueprintViewState>('browser');
  const [selectedBlueprint, setSelectedBlueprint] = useState<BlueprintWithVersion | null>(null);
  const [parentBlueprintId, setParentBlueprintId] = useState<string | null>(null);

  const handleSelectBlueprint = useCallback((blueprint: BlueprintWithVersion) => {
    setSelectedBlueprint(blueprint);
    setViewState('detail');
  }, []);

  const handleCreateNew = useCallback(() => {
    setSelectedBlueprint(null);
    setParentBlueprintId(null);
    setViewState('author');
  }, []);

  const handleImport = useCallback(() => {
    setViewState('import');
  }, []);

  const handleExport = useCallback(async (blueprintId: string) => {
    const result = await window.knuthflow.blueprint.export(blueprintId);
    if (result.success && result.spec) {
      const specContent = JSON.stringify(result.spec, null, 2);
      const saveResult = await window.knuthflow.dialog.saveFile({
        defaultPath: `${result.spec.name.replace(/\s+/g, '-').toLowerCase()}-blueprint.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!saveResult.canceled && saveResult.filePath) {
        await window.knuthflow.filesystem.writeFile(saveResult.filePath, specContent);
      }
    }
  }, []);

  const handleEdit = useCallback((blueprint: BlueprintWithVersion) => {
    setSelectedBlueprint(blueprint);
    setViewState('author');
  }, []);

  const handleDelete = useCallback((_blueprintId: string) => {
    setViewState('browser');
    setSelectedBlueprint(null);
  }, []);

  const handleCreateVersion = useCallback(async (blueprintId: string, newVersion: string) => {
    await window.knuthflow.blueprint.createNewVersion(blueprintId, newVersion);
  }, []);

  const handleBack = useCallback(() => {
    setViewState('browser');
    setSelectedBlueprint(null);
  }, []);

  const handleExtendBlueprint = useCallback((blueprint: BlueprintWithVersion) => {
    setParentBlueprintId(blueprint.id);
    setSelectedBlueprint(null);
    setViewState('author');
  }, []);

  const handleSaveBlueprint = useCallback((blueprint: Parameters<typeof handleSelectBlueprint>[0], _spec: unknown) => {
    if (blueprint) {
      setSelectedBlueprint({
        ...blueprint,
        latestVersion: undefined,
      });
    }
    setViewState('browser');
  }, []);

  const handleCancelAuthor = useCallback(() => {
    setViewState('browser');
    setParentBlueprintId(null);
  }, []);

  const handleImportComplete = useCallback(() => {
    setViewState('browser');
  }, []);

  return (
    <div className="blueprint-manager">
      {viewState === 'browser' && (
        <BlueprintBrowser
          onSelect={handleSelectBlueprint}
          onCreateNew={handleCreateNew}
          onImport={handleImport}
          onExport={handleExport}
          selectedBlueprintId={selectedBlueprint?.id}
        />
      )}

      {viewState === 'author' && (
        <BlueprintAuthor
          blueprint={selectedBlueprint || undefined}
          parentBlueprintId={parentBlueprintId}
          onSave={handleSaveBlueprint}
          onCancel={handleCancelAuthor}
          onExtendBlueprint={
            selectedBlueprint
              ? () => handleExtendBlueprint(selectedBlueprint)
              : undefined
          }
        />
      )}

      {viewState === 'detail' && selectedBlueprint && (
        <BlueprintDetailView
          blueprint={selectedBlueprint}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateVersion={handleCreateVersion}
          onBack={handleBack}
        />
      )}

      {viewState === 'import' && (
        <BlueprintImportExport
          onImportComplete={handleImportComplete}
          onCancel={handleBack}
        />
      )}
    </div>
  );
}

export default BlueprintManager;
