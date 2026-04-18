import { useCallback, useState, useEffect } from 'react';
import type { Blueprint, BlueprintVersion, BlueprintWithVersion, BlueprintUsageStats } from '../../shared/blueprintTypes';

interface BlueprintBrowserProps {
  onSelect: (blueprint: BlueprintWithVersion) => void;
  onCreateNew: () => void;
  onImport: () => void;
  onExport?: (blueprintId: string) => void;
  selectedBlueprintId?: string | null;
}

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'web-app', label: 'Web App' },
  { id: 'mobile-app', label: 'Mobile App' },
  { id: 'desktop-app', label: 'Desktop App' },
  { id: 'api', label: 'API' },
  { id: 'library', label: 'Library/Package' },
  { id: 'cli-tool', label: 'CLI Tool' },
];

export function BlueprintBrowser({
  onSelect,
  onCreateNew,
  onImport,
  onExport,
  selectedBlueprintId,
}: BlueprintBrowserProps) {
  const [blueprints, setBlueprints] = useState<BlueprintWithVersion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPublished, setShowPublished] = useState(false);

  const loadBlueprints = useCallback(async () => {
    setIsLoading(true);
    try {
      const listResult = await window.knuthflow.blueprint.list({
        category: selectedCategory || undefined,
        isPublished: showPublished || undefined,
        limit: 100,
      });
      const blueprintsWithVersions: BlueprintWithVersion[] = [];

      for (const bp of listResult) {
        try {
          const latestVersion = await window.knuthflow.blueprint.getLatestVersion(bp.id);
          blueprintsWithVersions.push({
            ...bp,
            latestVersion: latestVersion || undefined,
          });
        } catch (err) {
          console.error(`Failed to load version for blueprint ${bp.id}:`, err);
          // Push blueprint without version rather than skipping
          blueprintsWithVersions.push({ ...bp, latestVersion: undefined });
        }
      }

      setBlueprints(blueprintsWithVersions);
      const cats = await window.knuthflow.blueprint.listCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load blueprints:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, showPublished]);

  useEffect(() => {
    loadBlueprints();
  }, [loadBlueprints]);

  const filteredBlueprints = blueprints.filter(bp => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        bp.name.toLowerCase().includes(query) ||
        (bp.description?.toLowerCase().includes(query) ?? false)
      );
    }
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="blueprint-browser">
      <div className="blueprint-browser-header">
        <h3 className="section-title">Blueprint Library</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onImport}
            className="btn btn-ghost btn-sm"
          >
            Import
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="btn btn-primary btn-sm"
          >
            + New Blueprint
          </button>
        </div>
      </div>

      <div className="blueprint-browser-filters">
        <input
          type="text"
          placeholder="Search blueprints..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input input-sm flex-1"
        />
        <select
          value={selectedCategory || ''}
          onChange={e => setSelectedCategory(e.target.value || null)}
          className="input input-sm"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showPublished}
            onChange={e => setShowPublished(e.target.checked)}
          />
          Published only
        </label>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading blueprints...</div>
      ) : filteredBlueprints.length === 0 ? (
        <div className="empty-state">
          <p>No blueprints found.</p>
          <button type="button" onClick={onCreateNew} className="btn btn-primary btn-sm mt-2">
            Create Your First Blueprint
          </button>
        </div>
      ) : (
        <div className="blueprint-grid">
          {filteredBlueprints.map(bp => (
            <div
              key={bp.id}
              className={`blueprint-card ${selectedBlueprintId === bp.id ? 'selected' : ''}`}
              onClick={() => onSelect(bp)}
            >
              <div className="blueprint-card-header">
                <h4 className="blueprint-card-title">{bp.name}</h4>
                <span className="badge badge-info">{bp.category}</span>
              </div>
              <p className="blueprint-card-description">
                {bp.description || 'No description'}
              </p>
              <div className="blueprint-card-meta">
                <span className="text-muted text-sm">
                  v{bp.latestVersion?.version || '0.0.0'}
                </span>
                <span className="text-muted text-sm">
                  {bp.usageCount} uses
                </span>
                {bp.successRate !== null && (
                  <span className="text-muted text-sm">
                    {Math.round(bp.successRate * 100)}% success
                  </span>
                )}
              </div>
              <div className="blueprint-card-footer">
                <span className="text-xs text-muted">
                  Created {formatDate(bp.createdAt)}
                </span>
                {onExport && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onExport(bp.id);
                    }}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Export"
                  >
                    ↓
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BlueprintBrowser;
