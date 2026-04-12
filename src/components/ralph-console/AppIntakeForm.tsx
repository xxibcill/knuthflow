import { useCallback, useState } from 'react';

export interface AppIntakeFormData {
  appName: string;
  appBrief: string;
  targetPlatform: 'web' | 'desktop' | 'mobile' | 'api';
  successCriteria: string[];
  stackPreferences: string[];
  frameworkConstraints: string[];
  forbiddenPatterns: string[];
  maxBuildTime: number;
  supportedBrowsers: string[];
  deliveryFormat: 'electron' | 'web' | 'mobile' | 'api';
}

export interface AppIntakeFormProps {
  onSubmit: (intake: AppIntakeFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: Partial<AppIntakeFormData>;
}

const PLATFORM_OPTIONS = [
  { value: 'web', label: 'Web Application' },
  { value: 'desktop', label: 'Desktop Application' },
  { value: 'mobile', label: 'Mobile Application' },
  { value: 'api', label: 'API Backend' },
] as const;

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

export function AppIntakeForm({
  onSubmit,
  onCancel,
  isSubmitting,
  initialData,
}: AppIntakeFormProps) {
  const [appName, setAppName] = useState(initialData?.appName ?? '');
  const [appBrief, setAppBrief] = useState(initialData?.appBrief ?? '');
  const [targetPlatform, setTargetPlatform] = useState<AppIntakeFormData['targetPlatform']>(
    initialData?.targetPlatform ?? 'web'
  );
  const [successCriteria, setSuccessCriteria] = useState<string[]>(
    initialData?.successCriteria ?? ['']
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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const intake: AppIntakeFormData = {
      appName: appName.trim(),
      appBrief: appBrief.trim(),
      targetPlatform,
      successCriteria: successCriteria.filter(c => c.trim()),
      stackPreferences,
      frameworkConstraints: [],
      forbiddenPatterns,
      maxBuildTime,
      supportedBrowsers,
      deliveryFormat,
    };

    onSubmit(intake);
  }, [
    appName,
    appBrief,
    targetPlatform,
    successCriteria,
    stackPreferences,
    forbiddenPatterns,
    maxBuildTime,
    supportedBrowsers,
    deliveryFormat,
    onSubmit,
  ]);

  const handlePresetStack = useCallback((preset: string) => {
    if (!stackPreferences.includes(preset)) {
      setStackPreferences(prev => [...prev, preset]);
    }
  }, [stackPreferences]);

  return (
    <form onSubmit={handleSubmit} className="app-intake-form">
      <div className="section-header">
        <h2 className="section-title">Create New App</h2>
        <p className="section-lead">
          Describe your app idea and we'll generate a complete Ralph blueprint for you.
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

        {/* Target Platform */}
        <div className="form-field">
          <label htmlFor="targetPlatform" className="form-label">
            Target Platform <span className="text-red-400">*</span>
          </label>
          <select
            id="targetPlatform"
            value={targetPlatform}
            onChange={e => setTargetPlatform(e.target.value as AppIntakeFormData['targetPlatform'])}
            className="input"
          >
            {PLATFORM_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
              placeholder="Add a success criterion..."
              className="input flex-1"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCriterion();
                }
              }}
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
              placeholder="Add custom stack..."
              className="input flex-1"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddStack();
                }
              }}
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
            Patterns or technologies to avoid (e.g., "no jQuery", "no PHP")
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
              placeholder="Add forbidden pattern..."
              className="input flex-1"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddForbidden();
                }
              }}
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
