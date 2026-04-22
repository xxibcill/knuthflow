import { useCallback, useState, useEffect } from 'react';
import type { Blueprint, BlueprintSpec } from '../../shared/blueprintTypes';

interface BlueprintAuthorProps {
  blueprint?: Blueprint;
  parentBlueprintId?: string | null;
  onSave: (blueprint: Blueprint, version: BlueprintSpec) => void;
  onCancel: () => void;
  onExtendBlueprint?: () => void;
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

export function BlueprintAuthor({
  blueprint,
  parentBlueprintId,
  onSave,
  onCancel,
  onExtendBlueprint,
}: BlueprintAuthorProps) {
  const [name, setName] = useState(blueprint?.name || '');
  const [description, setDescription] = useState(blueprint?.description || '');
  const [category, setCategory] = useState(blueprint?.category || 'general');
  const [isPublished, setIsPublished] = useState(blueprint?.isPublished || false);
  const [version, setVersion] = useState('1.0.0');
  const [learnedRules, setLearnedRules] = useState<string[]>([]);
  const [newLearnedRule, setNewLearnedRule] = useState('');

  const [specFileTemplates, setSpecFileTemplates] = useState<Array<{
    id: string;
    title: string;
    description: string;
    content: string;
  }>>([]);
  const [taskPatternDefaults, setTaskPatternDefaults] = useState<Array<{
    id: string;
    title: string;
    pattern: string;
    fixPlanTemplate: string;
  }>>([]);
  const [acceptanceGateTemplates, setAcceptanceGateTemplates] = useState<Array<{
    id: string;
    name: string;
    description: string;
    gate: string;
  }>>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExistingBlueprint = useCallback(async () => {
    if (blueprint) {
      const latestVersion = await window.ralph.blueprint.getLatestVersion(blueprint.id);
      if (latestVersion) {
        setVersion(latestVersion.version);
        setLearnedRules(latestVersion.learnedRules || []);
        const spec = latestVersion.specContent;
        if (spec.specFileTemplates) {
          setSpecFileTemplates(spec.specFileTemplates as typeof specFileTemplates);
        }
        if (spec.taskPatternDefaults) {
          setTaskPatternDefaults(spec.taskPatternDefaults as typeof taskPatternDefaults);
        }
        if (spec.acceptanceGateTemplates) {
          setAcceptanceGateTemplates(spec.acceptanceGateTemplates as typeof acceptanceGateTemplates);
        }
      }
    }
  }, [blueprint?.id]);

  useEffect(() => {
    loadExistingBlueprint();
  }, [loadExistingBlueprint]);

  const handleAddLearnedRule = useCallback(() => {
    if (newLearnedRule.trim()) {
      setLearnedRules(prev => [...prev, newLearnedRule.trim()]);
      setNewLearnedRule('');
    }
  }, [newLearnedRule]);

  const handleRemoveLearnedRule = useCallback((index: number) => {
    setLearnedRules(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddSpecTemplate = useCallback(() => {
    setSpecFileTemplates(prev => [
      ...prev,
      {
        id: `spec-${Date.now()}`,
        title: '',
        description: '',
        content: '',
      },
    ]);
  }, []);

  const handleRemoveSpecTemplate = useCallback((index: number) => {
    setSpecFileTemplates(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateSpecTemplate = useCallback((index: number, field: string, value: string) => {
    setSpecFileTemplates(prev => prev.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    ));
  }, []);

  const handleAddTaskPattern = useCallback(() => {
    setTaskPatternDefaults(prev => [
      ...prev,
      {
        id: `task-${Date.now()}`,
        title: '',
        pattern: '',
        fixPlanTemplate: '',
      },
    ]);
  }, []);

  const handleRemoveTaskPattern = useCallback((index: number) => {
    setTaskPatternDefaults(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateTaskPattern = useCallback((index: number, field: string, value: string) => {
    setTaskPatternDefaults(prev => prev.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    ));
  }, []);

  const handleAddGateTemplate = useCallback(() => {
    setAcceptanceGateTemplates(prev => [
      ...prev,
      {
        id: `gate-${Date.now()}`,
        name: '',
        description: '',
        gate: '',
      },
    ]);
  }, []);

  const handleRemoveGateTemplate = useCallback((index: number) => {
    setAcceptanceGateTemplates(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateGateTemplate = useCallback((index: number, field: string, value: string) => {
    setAcceptanceGateTemplates(prev => prev.map((g, i) =>
      i === index ? { ...g, [field]: value } : g
    ));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Blueprint name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const spec: BlueprintSpec = {
        version,
        name: name.trim(),
        description: description.trim(),
        category,
        starterTemplate: {
          files: {},
        },
        specFileTemplates,
        taskPatternDefaults,
        acceptanceGateTemplates,
        learnedRules,
      };

      const result = await window.ralph.blueprint.import({
        spec: spec as unknown as Record<string, unknown>,
        isPublished,
        parentBlueprintId: parentBlueprintId || blueprint?.parentBlueprintId || null,
      });

      if (!result.success) {
        setError(result.error || 'Failed to save blueprint');
        return;
      }

      onSave(result.blueprint!, spec as unknown as Parameters<typeof onSave>[1]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save blueprint');
    } finally {
      setIsSaving(false);
    }
  }, [
    name, description, category, isPublished, version, learnedRules,
    specFileTemplates, taskPatternDefaults, acceptanceGateTemplates,
    parentBlueprintId, blueprint, onSave,
  ]);

  return (
    <div className="blueprint-author">
      <div className="section-header">
        <h3 className="section-title">
          {blueprint ? 'Edit Blueprint' : 'Create New Blueprint'}
        </h3>
        {parentBlueprintId && (
          <p className="text-muted text-sm">Extending parent blueprint</p>
        )}
      </div>

      {error && (
        <div className="error-banner mb-4">
          {error}
        </div>
      )}

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="bp-name" className="form-label">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            id="bp-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Awesome Blueprint"
            required
            className="input"
          />
        </div>

        <div className="form-field">
          <label htmlFor="bp-category" className="form-label">Category</label>
          <select
            id="bp-category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="input"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="form-field col-span-2">
          <label htmlFor="bp-description" className="form-label">Description</label>
          <textarea
            id="bp-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this blueprint provides..."
            rows={3}
            className="input"
          />
        </div>

        <div className="form-field">
          <label htmlFor="bp-version" className="form-label">Version</label>
          <input
            id="bp-version"
            type="text"
            value={version}
            onChange={e => setVersion(e.target.value)}
            placeholder="1.0.0"
            className="input"
          />
        </div>

        <div className="form-field flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
            />
            Published
          </label>
        </div>
      </div>

      {/* Spec File Templates Section */}
      <div className="blueprint-section mt-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="form-label mb-0">Spec File Templates</h4>
          <button type="button" onClick={handleAddSpecTemplate} className="btn btn-ghost btn-sm">
            + Add Template
          </button>
        </div>
        {specFileTemplates.map((tpl, index) => (
          <div key={tpl.id} className="card mb-2">
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Title"
                  value={tpl.title}
                  onChange={e => handleUpdateSpecTemplate(index, 'title', e.target.value)}
                  className="input input-sm"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={tpl.description}
                  onChange={e => handleUpdateSpecTemplate(index, 'description', e.target.value)}
                  className="input input-sm"
                />
              </div>
              <textarea
                placeholder="Spec content..."
                value={tpl.content}
                onChange={e => handleUpdateSpecTemplate(index, 'content', e.target.value)}
                rows={5}
                className="input input-sm mt-2 w-full"
              />
              <button
                type="button"
                onClick={() => handleRemoveSpecTemplate(index)}
                className="btn btn-ghost btn-sm mt-2 text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Task Pattern Defaults Section */}
      <div className="blueprint-section mt-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="form-label mb-0">Task Pattern Defaults</h4>
          <button type="button" onClick={handleAddTaskPattern} className="btn btn-ghost btn-sm">
            + Add Pattern
          </button>
        </div>
        {taskPatternDefaults.map((tpl, index) => (
          <div key={tpl.id} className="card mb-2">
            <div className="card-body">
              <input
                type="text"
                placeholder="Title"
                value={tpl.title}
                onChange={e => handleUpdateTaskPattern(index, 'title', e.target.value)}
                className="input input-sm w-full mb-2"
              />
              <input
                type="text"
                placeholder="Pattern (regex or keyword)"
                value={tpl.pattern}
                onChange={e => handleUpdateTaskPattern(index, 'pattern', e.target.value)}
                className="input input-sm w-full mb-2"
              />
              <textarea
                placeholder="Fix plan template..."
                value={tpl.fixPlanTemplate}
                onChange={e => handleUpdateTaskPattern(index, 'fixPlanTemplate', e.target.value)}
                rows={3}
                className="input input-sm w-full"
              />
              <button
                type="button"
                onClick={() => handleRemoveTaskPattern(index)}
                className="btn btn-ghost btn-sm mt-2 text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Acceptance Gate Templates Section */}
      <div className="blueprint-section mt-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="form-label mb-0">Acceptance Gate Templates</h4>
          <button type="button" onClick={handleAddGateTemplate} className="btn btn-ghost btn-sm">
            + Add Gate
          </button>
        </div>
        {acceptanceGateTemplates.map((tpl, index) => (
          <div key={tpl.id} className="card mb-2">
            <div className="card-body">
              <input
                type="text"
                placeholder="Gate name"
                value={tpl.name}
                onChange={e => handleUpdateGateTemplate(index, 'name', e.target.value)}
                className="input input-sm w-full mb-2"
              />
              <input
                type="text"
                placeholder="Description"
                value={tpl.description}
                onChange={e => handleUpdateGateTemplate(index, 'description', e.target.value)}
                className="input input-sm w-full mb-2"
              />
              <textarea
                placeholder="Gate definition..."
                value={tpl.gate}
                onChange={e => handleUpdateGateTemplate(index, 'gate', e.target.value)}
                rows={3}
                className="input input-sm w-full"
              />
              <button
                type="button"
                onClick={() => handleRemoveGateTemplate(index)}
                className="btn btn-ghost btn-sm mt-2 text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Learned Rules Section */}
      <div className="blueprint-section mt-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="form-label mb-0">Learned Rules (Countermeasures)</h4>
          <button type="button" onClick={onExtendBlueprint} className="btn btn-ghost btn-sm">
            Import from Parent
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {learnedRules.map((rule, index) => (
            <span key={index} className="badge badge-warning flex items-center gap-1">
              {rule}
              <button
                type="button"
                onClick={() => handleRemoveLearnedRule(index)}
                className="ml-1 text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLearnedRule}
            onChange={e => setNewLearnedRule(e.target.value)}
            placeholder="Add a learned rule..."
            className="input flex-1"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddLearnedRule();
              }
            }}
          />
          <button type="button" onClick={handleAddLearnedRule} className="btn btn-ghost">
            Add
          </button>
        </div>
      </div>

      <div className="form-actions mt-6">
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-primary"
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? 'Saving...' : 'Save Blueprint'}
        </button>
      </div>
    </div>
  );
}

export default BlueprintAuthor;