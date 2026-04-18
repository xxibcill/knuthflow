import { useCallback, useState, type FormEvent } from 'react';
import type { AppIntakeDraft, PlatformTarget, PlatformCategory } from '../../shared/preloadTypes';

export type AppIntakeFormData = AppIntakeDraft;

export interface AppIntakeFormProps {
  onSubmit: (intake: AppIntakeFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: Partial<AppIntakeFormData>;
}

const PLATFORM_CATEGORIES: { id: PlatformCategory; label: string; targets: { id: PlatformTarget; label: string }[] }[] = [
  {
    id: 'mobile',
    label: 'Mobile',
    targets: [
      { id: 'ios', label: 'iOS (Capacitor)' },
      { id: 'android', label: 'Android (Capacitor)' },
    ],
  },
  {
    id: 'web',
    label: 'Web',
    targets: [
      { id: 'pwa', label: 'PWA' },
    ],
  },
  {
    id: 'desktop',
    label: 'Desktop',
    targets: [
      { id: 'macos', label: 'macOS' },
      { id: 'windows', label: 'Windows' },
      { id: 'linux', label: 'Linux' },
    ],
  },
];

const DELIVERY_OPTIONS = [
  { value: 'web', label: 'Web (Hostable)' },
  { value: 'electron', label: 'Electron (Desktop)' },
  { value: 'mobile', label: 'Mobile (React Native)' },
  { value: 'api', label: 'API (Deployable)' },
] as const;

const STACK_PRESETS = [
  'React + TypeScript + Vite',
  'Vue + TypeScript + Vite',
  'Next.js (React)',
  'Express + TypeScript',
  'Electron + TypeScript',
  'React Native (Expo)',
];

const BROWSER_OPTIONS = [
  'Chrome 120+',
  'Firefox 121+',
  'Safari 17+',
  'Edge 120+',
];

function getDefaultPlatformConfig(): AppIntakeDraft['platformConfig'] {
  return {
    categories: ['web'],
    targets: ['pwa'],
  };
}

export function AppIntakeForm({
  onSubmit,
  onCancel,
  isSubmitting,
  initialData,
}: AppIntakeFormProps) {
  const [appName, setAppName] = useState(initialData?.appName ?? '');
  const [appBrief, setAppBrief] = useState(initialData?.appBrief ?? '');
  const [platformConfig, setPlatformConfig] = useState<AppIntakeDraft['platformConfig']>(
    initialData?.platformConfig ?? getDefaultPlatformConfig()
  );
  const [successCriteria, setSuccessCriteria] = useState<string[]>(
    initialData?.successCriteria ?? []
  );
  const [stackPreferences, setStackPreferences] = useState<string[]>(
    initialData?.stackPreferences ?? ['React + TypeScript + Vite']
  );
  const [forbiddenPatterns, setForbiddenPatterns] = useState<string[]>(
    initialData?.forbiddenPatterns ?? []
  );
  const [maxBuildTime, setMaxBuildTime] = useState(initialData?.maxBuildTime ?? 30);
  const [supportedBrowsers, setSupportedBrowsers] = useState<string[]>(
    initialData?.supportedBrowsers ?? ['Chrome 120+', 'Firefox 121+', 'Safari 17+']
  );
  const [deliveryFormat, setDeliveryFormat] = useState<AppIntakeFormData['deliveryFormat']>(
    initialData?.deliveryFormat ?? 'web'
  );
  const [newCriterion, setNewCriterion] = useState('');
  const [newStack, setNewStack] = useState('');
  const [newForbidden, setNewForbidden] = useState('');

  const isTargetSelected = useCallback((target: PlatformTarget) => {
    return platformConfig.targets.includes(target);
  }, [platformConfig.targets]);

  const isCategorySelected = useCallback((category: PlatformCategory) => {
    return platformConfig.categories.includes(category);
  }, [platformConfig.categories]);

  const toggleTarget = useCallback((target: PlatformTarget) => {
    setPlatformConfig(prev => {
      const targets = prev.targets.includes(target)
        ? prev.targets.filter(t => t !== target)
        : [...prev.targets, target];

      // Update categories based on selected targets
      const categories: PlatformCategory[] = [];
      if (targets.some(t => t === 'ios' || t === 'android')) categories.push('mobile');
      if (targets.some(t => t === 'pwa')) categories.push('web');
      if (targets.some(t => t === 'macos' || t === 'windows' || t === 'linux')) categories.push('desktop');

      return { categories, targets };
    });
  }, []);

  const toggleCategory = useCallback((category: PlatformCategory) => {
    setPlatformConfig(prev => {
      const categoryTargets = PLATFORM_CATEGORIES.find(c => c.id === category)?.targets.map(t => t.id) ?? [];
      const isSelected = prev.categories.includes(category);

      const categories = isSelected
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];

      const targets = isSelected
        ? prev.targets.filter(t => !categoryTargets.includes(t))
        : [...prev.targets, ...categoryTargets];

      return { categories, targets };
    });
  }, []);

  const handleAddCriterion = useCallback(() => {
    if (newCriterion.trim()) {
      setSuccessCriteria(prev => [...prev, newCriterion.trim()]);
      setNewCriterion('');
    }
  }, [newCriterion]);

  const handleRemoveCriterion = useCallback((index: number) => {
    setSuccessCriteria(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddStack = useCallback(() => {
    if (newStack.trim() && !stackPreferences.includes(newStack.trim())) {
      setStackPreferences(prev => [...prev, newStack.trim()]);
      setNewStack('');
    }
  }, [newStack, stackPreferences]);

  const handleRemoveStack = useCallback((index: number) => {
    setStackPreferences(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddForbidden = useCallback(() => {
    if (newForbidden.trim() && !forbiddenPatterns.includes(newForbidden.trim())) {
      setForbiddenPatterns(prev => [...prev, newForbidden.trim()]);
      setNewForbidden('');
    }
  }, [newForbidden, forbiddenPatterns]);

  const handleRemoveForbidden = useCallback((index: number) => {
    setForbiddenPatterns(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCriterionKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCriterion();
    }
  }, [handleAddCriterion]);

  const handleStackKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStack();
    }
  }, [handleAddStack]);

  const handleForbiddenKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddForbidden();
    }
  }, [handleAddForbidden]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const intake: AppIntakeFormData = {
      appName: appName.trim(),
      appBrief: appBrief.trim(),
      targetPlatform: platformConfig.targets,
      platformConfig,
      successCriteria: successCriteria.filter(c => c.trim()),
      stackPreferences,
      forbiddenPatterns,
      maxBuildTime,
      supportedBrowsers,
      deliveryFormat,
    };

    onSubmit(intake);
  }, [
    appName,
    appBrief,
    platformConfig,
    successCriteria,
    stackPreferences,
    forbiddenPatterns,
    maxBuildTime,
    supportedBrowsers,
    deliveryFormat,
    onSubmit,
  ]);

  const handlePresetStack = useCallback((preset: string) => {
    setStackPreferences(prev => {
      if (prev.includes(preset)) {
        return prev;
      }
      return [...prev, preset];
    });
  }, []);

  return (
    <form onSubmit={handleSubmit} className="app-intake-form">
      <div className="section-header">
        <h2 className="section-title">Create New App</h2>
        <p className="section-lead">
          Describe your app idea and we&apos;ll generate a complete Ralph blueprint for you.
        </p>
      </div>

      <div className="form-grid">
        {/* App Name */}
        <div className="form-field">
          <label htmlFor="appName" className="form-label">
            App Name <span className="text-red-400">*</span>
          </label>
          <input
            id="appName"
            type="text"
            value={appName}
            onChange={e => setAppName(e.target.value)}
            placeholder="My Awesome App"
            required
            className="input"
          />
        </div>

        {/* Platform Target */}
        <div className="form-field col-span-2">
          <label className="form-label">
            Target Platforms <span className="text-red-400">*</span>
          </label>
          <p className="form-hint mb-3">
            Select one or more platforms to target for your app
          </p>
          <div className="space-y-4">
            {PLATFORM_CATEGORIES.map(category => (
              <div key={category.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id={`platform-${category.id}`}
                    checked={isCategorySelected(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="checkbox checkbox-primary"
                  />
                  <label htmlFor={`platform-${category.id}`} className="form-label mb-0 font-semibold">
                    {category.label}
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 ml-8">
                  {category.targets.map(target => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => toggleTarget(target.id)}
                      className={`btn btn-sm ${isTargetSelected(target.id) ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Brief */}
        <div className="form-field col-span-2">
          <label htmlFor="appBrief" className="form-label">
            App Brief <span className="text-red-400">*</span>
          </label>
          <textarea
            id="appBrief"
            value={appBrief}
            onChange={e => setAppBrief(e.target.value)}
            placeholder="Describe what your app should do, who it's for, and what problems it solves..."
            required
            rows={5}
            className="input"
          />
          <p className="form-hint">
            Be specific about features, user interactions, and expected behavior.
          </p>
        </div>

        {/* Delivery Format */}
        <div className="form-field">
          <label htmlFor="deliveryFormat" className="form-label">
            Delivery Format <span className="text-red-400">*</span>
          </label>
          <select
            id="deliveryFormat"
            value={deliveryFormat}
            onChange={e => setDeliveryFormat(e.target.value as AppIntakeFormData['deliveryFormat'])}
            className="input"
          >
            {DELIVERY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Max Build Time */}
        <div className="form-field">
          <label htmlFor="maxBuildTime" className="form-label">
            Max Build Time (minutes)
          </label>
          <input
            id="maxBuildTime"
            type="number"
            value={maxBuildTime}
            onChange={e => setMaxBuildTime(Number(e.target.value))}
            min={5}
            max={120}
            className="input"
          />
        </div>

        {/* Success Criteria */}
        <div className="form-field col-span-2">
          <label className="form-label">Success Criteria</label>
          <div className="space-y-2">
            {successCriteria.map((criterion, index) => (
              <div key={index} className="flex gap-2 items-center">
                <span className="text-sm text-muted flex-1">- {criterion}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCriterion(index)}
                  className="btn btn-ghost btn-icon h-8 w-8"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newCriterion}
              onChange={e => setNewCriterion(e.target.value)}
              placeholder="Add a success criterion... (press Enter)"
              className="input flex-1"
              onKeyDown={handleCriterionKeyDown}
            />
            <button
              type="button"
              onClick={handleAddCriterion}
              className="btn btn-ghost"
            >
              Add
            </button>
          </div>
        </div>

        {/* Stack Preferences */}
        <div className="form-field col-span-2">
          <label className="form-label">Technology Stack</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {STACK_PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetStack(preset)}
                className={`btn btn-sm ${stackPreferences.includes(preset) ? 'btn-primary' : 'btn-ghost'}`}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {stackPreferences.map((stack, index) => (
              <span key={index} className="badge badge-info flex items-center gap-1">
                {stack}
                <button
                  type="button"
                  onClick={() => handleRemoveStack(index)}
                  className="ml-1 text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newStack}
              onChange={e => setNewStack(e.target.value)}
              placeholder="Add custom stack... (press Enter)"
              className="input flex-1"
              onKeyDown={handleStackKeyDown}
            />
            <button
              type="button"
              onClick={handleAddStack}
              className="btn btn-ghost"
            >
              Add
            </button>
          </div>
        </div>

        {/* Forbidden Patterns */}
        <div className="form-field col-span-2">
          <label className="form-label">Forbidden Patterns (Optional)</label>
          <p className="form-hint mb-2">
            Patterns or technologies to avoid (e.g., &quot;no jQuery&quot;, &quot;no PHP&quot;)
          </p>
          <div className="flex flex-wrap gap-2">
            {forbiddenPatterns.map((pattern, index) => (
              <span key={index} className="badge badge-warning flex items-center gap-1">
                {pattern}
                <button
                  type="button"
                  onClick={() => handleRemoveForbidden(index)}
                  className="ml-1 text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newForbidden}
              onChange={e => setNewForbidden(e.target.value)}
              placeholder="Add forbidden pattern... (press Enter)"
              className="input flex-1"
              onKeyDown={handleForbiddenKeyDown}
            />
            <button
              type="button"
              onClick={handleAddForbidden}
              className="btn btn-ghost"
            >
              Add
            </button>
          </div>
        </div>

        {/* Supported Browsers */}
        <div className="form-field col-span-2">
          <label className="form-label">Supported Browsers</label>
          <div className="flex flex-wrap gap-2">
            {BROWSER_OPTIONS.map(browser => (
              <button
                key={browser}
                type="button"
                onClick={() => {
                  if (supportedBrowsers.includes(browser)) {
                    setSupportedBrowsers(prev => prev.filter(b => b !== browser));
                  } else {
                    setSupportedBrowsers(prev => [...prev, browser]);
                  }
                }}
                className={`btn btn-sm ${supportedBrowsers.includes(browser) ? 'btn-primary' : 'btn-ghost'}`}
              >
                {browser}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || !appName.trim() || !appBrief.trim()}
        >
          {isSubmitting ? 'Generating...' : 'Generate Blueprint'}
        </button>
      </div>
    </form>
  );
}

export default AppIntakeForm;
